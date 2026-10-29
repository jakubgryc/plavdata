"""
Admin-only endpoints syncing plavdata trainings and attendance to Yarmill (ČSPS).

Morning groups (Group.is_morning_group) sync per swimmer instead of group-wide;
sync them AFTER regular groups — the FullOverwrite plan copy might clobber
per-swimmer cells. Endpoints are plain `def` so the long bursts of blocking
`requests` calls run in the threadpool, not on the event loop. The Yarmill
bearer token comes per request and is never persisted.
"""

from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.admin_attendance import get_season_for_date
from app.auth import get_current_admin
from app.constants import (
    YarmillActivityItem,
    YarmillAttendanceItem,
    YarmillAttendanceValue,
    YarmillAttributeId,
)
from app.db import get_db
from app.models import (
    Attendance,
    Group,
    SeasonGroupMember,
    Swimmer,
    Training,
    TrainingSchedule,
    User,
)
from app.services.yarmill import YarmillClient, YarmillError

router = APIRouter(tags=["yarmill"], prefix="/yarmill")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class SyncPlanRequest(BaseModel):
    group_id: int
    week_start: date  # must be a Monday
    # Days to sync (cells + publish copy); None/empty = the whole week.
    days: list[date] | None = None
    yarmill_token: str


class SyncPlanResponse(BaseModel):
    synced_days: int
    skipped_swimmers: int
    details: str


class SyncAttendanceRequest(BaseModel):
    group_id: int
    date: date
    yarmill_token: str


class CopyRealityRequest(BaseModel):
    group_id: int
    week_start: date  # must be a Monday
    yarmill_token: str


class CopyRealityResponse(BaseModel):
    details: str


class SyncAttendanceResponse(BaseModel):
    synced: int
    skipped: int
    details: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_client(token: str) -> YarmillClient:
    try:
        return YarmillClient(token)
    except YarmillError as exc:
        raise HTTPException(status_code=400, detail=exc.message) from exc


def _description_html(description: str) -> str:
    """Yarmill stores the training text as HTML (observed: '<p>…</p>')."""
    return "<p>" + description.replace("\n", "<br>") + "</p>"


def _km(meters: int) -> float:
    return round(meters / 1000, 2)


def _effective_duration_minutes(db: Session, training: Training) -> int | None:
    """Coach-entered duration wins; otherwise derived from the schedule slot."""
    if training.duration_minutes is not None:
        return training.duration_minutes

    sched = (
        db.query(TrainingSchedule)
        .filter(
            TrainingSchedule.season_id == training.season_id,
            TrainingSchedule.group_id == training.group_id,
            TrainingSchedule.weekday == training.date.isoweekday(),
        )
        .first()
    )
    if sched is None:
        return None

    start_h, start_m = (int(p) for p in sched.start_time.split(":"))
    end_h, end_m = (int(p) for p in sched.end_time.split(":"))
    minutes = (end_h * 60 + end_m) - (start_h * 60 + start_m)
    if minutes <= 0:
        minutes += 24 * 60
    return minutes


def _regular_plan_cells(
    training: Training, duration_minutes: int | None
) -> list[tuple[YarmillActivityItem, int | float]]:
    """Group-wide afternoon cells for one training; None fields are skipped."""
    cells: list[tuple[YarmillActivityItem, int | float]] = [
        (YarmillActivityItem.DZ, 1),
        # Per-swimmer morning writes override this to 2 for morning attendees.
        (YarmillActivityItem.JZ_VODA, 1),
    ]
    if duration_minutes is not None:
        cells.append((YarmillActivityItem.HZ_VODA_ODPO, duration_minutes))
    if training.total_meters is not None:
        cells.append((YarmillActivityItem.KM_ODPO, _km(training.total_meters)))
    if training.kick_meters is not None:
        cells.append((YarmillActivityItem.NOHY_ODPO, _km(training.kick_meters)))
    if training.drill_meters is not None:
        cells.append((YarmillActivityItem.TECHNIKA_ODPO, _km(training.drill_meters)))
    return cells


def _morning_plan_cells(
    training: Training, jz_value: int, duration_minutes: int | None
) -> list[tuple[YarmillActivityItem, int | float]]:
    """Per-swimmer morning cells for one training; None fields are skipped."""
    cells: list[tuple[YarmillActivityItem, int | float]] = [
        (YarmillActivityItem.DZ, 1),
        (YarmillActivityItem.JZ_VODA, jz_value),
    ]
    if duration_minutes is not None:
        cells.append((YarmillActivityItem.HZ_VODA_DOPO, duration_minutes))
    if training.total_meters is not None:
        cells.append((YarmillActivityItem.KM_DOPO, _km(training.total_meters)))
    if training.kick_meters is not None:
        cells.append((YarmillActivityItem.NOHY_DOPO, _km(training.kick_meters)))
    if training.drill_meters is not None:
        cells.append((YarmillActivityItem.TECHNIKA_DOPO, _km(training.drill_meters)))
    return cells


def _home_group_trains_that_day(
    db: Session, home_group_id: int | None, day: date
) -> bool:
    if home_group_id is None:
        return False
    return (
        db.query(Training.id)
        .filter(Training.group_id == home_group_id, Training.date == day)
        .first()
        is not None
    )


def _morning_listed_swimmer_ids(db: Session, day: date) -> set[int]:
    """Swimmer ids on ANY morning group's participant list for the given day."""
    morning_group_ids = [
        gid
        for (gid,) in db.query(Group.id).filter(Group.is_morning_group.is_(True)).all()
    ]
    if not morning_group_ids:
        return set()
    training_ids = [
        tid
        for (tid,) in db.query(Training.id)
        .filter(
            Training.group_id.in_(morning_group_ids),
            Training.date == day,
        )
        .all()
    ]
    if not training_ids:
        return set()
    return {
        sid
        for (sid,) in db.query(Attendance.swimmer_id)
        .filter(Attendance.training_id.in_(training_ids))
        .all()
    }


def _season_group_members(db: Session, season_id: int, group_id: int) -> list[Swimmer]:
    return (
        db.query(Swimmer)
        .join(SeasonGroupMember, SeasonGroupMember.swimmer_id == Swimmer.id)
        .filter(
            SeasonGroupMember.season_id == season_id,
            SeasonGroupMember.group_id == group_id,
        )
        .all()
    )


# ---------------------------------------------------------------------------
# Plan sync
# ---------------------------------------------------------------------------


def _sync_regular_plan(
    db: Session,
    client: YarmillClient,
    group: Group,
    season_id: int,
    trainings: list[Training],
    days: list[date],
) -> SyncPlanResponse:
    """Group-wide grid (one POST per cell per day) + one publish copy."""
    if not group.yarmill_group_id:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Skupina „{group.display_name_cs}“ nemá nastavené Yarmill ID — "
                "doplň ho v nastavení skupin."
            ),
        )

    synced_days = 0
    for training in trainings:
        duration = _effective_duration_minutes(db, training)
        try:
            for item, value in _regular_plan_cells(training, duration):
                client.save_training_day_activity(
                    item, training.date, value, user_group_id=group.yarmill_group_id
                )
            if training.description:
                client.save_training_day_attribute(
                    YarmillAttributeId.AFTERNOON,
                    training.date,
                    _description_html(training.description),
                    user_group_id=group.yarmill_group_id,
                )
        except YarmillError as exc:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Zápis plánu selhal {training.date.isoformat()} "
                    f"(zapsáno {synced_days} z {len(trainings)} tréninkových dní). "
                    f"{exc.message} Opakovaný pokus je bezpečný — Yarmill hodnoty přepíše."
                ),
            ) from exc
        synced_days += 1

    # Before this copy the swimmers see nothing.
    members = _season_group_members(db, season_id, group.id)
    target_ids = [s.yarmill_user_id for s in members if s.yarmill_user_id is not None]
    skipped = len(members) - len(target_ids)

    if not target_ids:
        return SyncPlanResponse(
            synced_days=synced_days,
            skipped_swimmers=skipped,
            details=(
                f"Plán zapsán pro {synced_days} dní; žádný plavec skupiny nemá "
                "Yarmill ID — kopie na plavce přeskočena."
            ),
        )

    try:
        client.copy_group_plan_to_users(days, target_ids, group.yarmill_group_id)
    except YarmillError as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Plán byl zapsán pro {synced_days} dní, ale kopie na plavce selhala. "
                f"{exc.message} Spusť synchronizaci znovu — plán se přepíše a kopie proběhne."
            ),
        ) from exc

    details = (
        f"Plán zapsán pro {synced_days} dní a zkopírován na {len(target_ids)} plavců."
    )
    if skipped:
        details += f" Přeskočeno {skipped} plavců bez Yarmill ID."
    return SyncPlanResponse(
        synced_days=synced_days, skipped_swimmers=skipped, details=details
    )


def _sync_morning_plan(
    db: Session, client: YarmillClient, trainings: list[Training]
) -> SyncPlanResponse:
    """Per-swimmer plan writes for a morning group (no GroupToUsers copy).

    Participants = each training's Attendance list. JZ_VODA is 2 when the
    swimmer's home group also trains that day, else 1.
    """
    synced_days = 0
    skipped = 0
    written = 0
    for training in trainings:
        rows = db.query(Attendance).filter(Attendance.training_id == training.id).all()
        if not rows:
            continue
        duration = _effective_duration_minutes(db, training)
        swimmers = (
            db.query(Swimmer).filter(Swimmer.id.in_([r.swimmer_id for r in rows])).all()
        )
        for swimmer in swimmers:
            if swimmer.yarmill_user_id is None:
                skipped += 1
                continue
            jz_value = (
                2
                if _home_group_trains_that_day(db, swimmer.group_id, training.date)
                else 1
            )
            try:
                for item, value in _morning_plan_cells(training, jz_value, duration):
                    client.save_training_day_activity(
                        item, training.date, value, user_id=swimmer.yarmill_user_id
                    )
                if training.description:
                    client.save_training_day_attribute(
                        YarmillAttributeId.MORNING,
                        training.date,
                        _description_html(training.description),
                        user_id=swimmer.yarmill_user_id,
                    )
            except YarmillError as exc:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Zápis ranního plánu selhal {training.date.isoformat()} pro plavce "
                        f"{swimmer.name} {swimmer.surname} (dosud zapsáno {written} zápisů). "
                        f"{exc.message} Opakovaný pokus je bezpečný — Yarmill hodnoty přepíše."
                    ),
                ) from exc
            written += 1
        synced_days += 1

    details = (
        f"Ranní plán zapsán po jednotlivých plavcích: {written} zápisů "
        f"(plavec × den) pro {synced_days} dní."
    )
    if skipped:
        details += f" Přeskočeno {skipped} plavců bez Yarmill ID."
    return SyncPlanResponse(
        synced_days=synced_days, skipped_swimmers=skipped, details=details
    )


@router.post("/sync-plan", response_model=SyncPlanResponse)
def sync_plan(
    payload: SyncPlanRequest,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Sync a group's week plan to Yarmill (grid cells + publish copy)."""
    client = _make_client(payload.yarmill_token)

    if payload.week_start.isoweekday() != 1:
        raise HTTPException(status_code=400, detail="week_start musí být pondělí.")

    group = db.query(Group).filter(Group.id == payload.group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Skupina nenalezena.")

    season = get_season_for_date(db, payload.week_start)
    if season is None:
        raise HTTPException(status_code=400, detail="Týden nespadá do žádné sezóny.")

    days = [payload.week_start + timedelta(days=i) for i in range(7)]
    if payload.days:
        selected = sorted(set(payload.days))
        if any(d not in days for d in selected):
            raise HTTPException(
                status_code=400,
                detail="Vybrané dny nespadají do zadaného týdne.",
            )
        days = selected

    trainings = (
        db.query(Training)
        .filter(Training.group_id == group.id, Training.date.in_(days))
        .order_by(Training.date)
        .all()
    )
    if not trainings:
        raise HTTPException(
            status_code=400,
            detail=(
                "V tomto týdnu skupina nemá žádné uložené tréninky — "
                "nejprve vyplň docházku."
            ),
        )

    if group.is_morning_group:
        return _sync_morning_plan(db, client, trainings)
    return _sync_regular_plan(db, client, group, season.id, trainings, days)


# ---------------------------------------------------------------------------
# Attendance sync
# ---------------------------------------------------------------------------


def _sync_regular_attendance(
    db: Session, client: YarmillClient, group: Group, day: date
) -> SyncAttendanceResponse:
    """Afternoon attendance for one group's training: present→1, absent→3.

    Also writes MORNING=FREE (2) as the day's default for the same swimmers —
    except those on a morning group's list that day; their morning value is
    owned by the morning sync (1/3), so this stays order-independent.
    """
    training = (
        db.query(Training)
        .filter(Training.group_id == group.id, Training.date == day)
        .first()
    )
    if training is None:
        raise HTTPException(
            status_code=400,
            detail="Na tento den nemá skupina uložený trénink — nejprve vyplň docházku.",
        )

    rows = db.query(Attendance).filter(Attendance.training_id == training.id).all()
    if not rows:
        raise HTTPException(
            status_code=400, detail="Trénink nemá uloženou žádnou docházku."
        )

    swimmers_by_id = {
        s.id: s
        for s in db.query(Swimmer)
        .filter(Swimmer.id.in_([r.swimmer_id for r in rows]))
        .all()
    }

    morning_listed = _morning_listed_swimmer_ids(db, day)

    synced = 0
    skipped = 0
    morning_defaults = 0
    for row in rows:
        swimmer = swimmers_by_id.get(row.swimmer_id)
        if swimmer is None or swimmer.yarmill_user_id is None:
            skipped += 1
            continue
        value = (
            YarmillAttendanceValue.ATTEND
            if row.present
            else YarmillAttendanceValue.EXCUSED
        )
        try:
            client.save_user_attendance(
                swimmer.yarmill_user_id,
                YarmillAttendanceItem.AFTERNOON,
                day,
                value,
            )
            if swimmer.id not in morning_listed:
                client.save_user_attendance(
                    swimmer.yarmill_user_id,
                    YarmillAttendanceItem.MORNING,
                    day,
                    YarmillAttendanceValue.FREE,
                )
                morning_defaults += 1
        except YarmillError as exc:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Zápis docházky selhal pro plavce {swimmer.name} {swimmer.surname} "
                    f"(zapsáno {synced} z {len(rows)} plavců). {exc.message} "
                    "Opakovaný pokus je bezpečný — Yarmill hodnoty přepíše."
                ),
            ) from exc
        synced += 1

    details = (
        f"Odpolední docházka zapsána pro {synced} plavců, "
        f"ranní volno jako výchozí pro {morning_defaults}."
    )
    if skipped:
        details += f" Přeskočeno {skipped} plavců bez Yarmill ID."
    return SyncAttendanceResponse(synced=synced, skipped=skipped, details=details)


def _sync_morning_attendance(
    db: Session, client: YarmillClient, season_id: int, day: date
) -> SyncAttendanceResponse:
    """Whole-club morning attendance for one day.

    Combines the participant lists of ALL morning groups for the date: listed
    swimmers get ATTEND/EXCUSED, every other mapped season swimmer gets FREE.
    Idempotent regardless of which morning group triggered it.
    """
    morning_group_ids = [
        gid
        for (gid,) in db.query(Group.id).filter(Group.is_morning_group.is_(True)).all()
    ]
    trainings = (
        db.query(Training)
        .filter(
            Training.group_id.in_(morning_group_ids),
            Training.date == day,
        )
        .all()
        if morning_group_ids
        else []
    )
    if not trainings:
        raise HTTPException(
            status_code=400,
            detail="Na tento den není uložený žádný ranní trénink.",
        )

    # Present wins on overlap between morning groups.
    present_map: dict[int, bool] = {}
    for training in trainings:
        rows = db.query(Attendance).filter(Attendance.training_id == training.id).all()
        for row in rows:
            present_map[row.swimmer_id] = present_map.get(row.swimmer_id, False) or (
                row.present
            )

    season_swimmers = (
        db.query(Swimmer)
        .join(SeasonGroupMember, SeasonGroupMember.swimmer_id == Swimmer.id)
        .filter(SeasonGroupMember.season_id == season_id)
        .distinct()
        .all()
    )

    synced = 0
    skipped = 0
    for swimmer in season_swimmers:
        if swimmer.yarmill_user_id is None:
            skipped += 1
            continue
        if swimmer.id in present_map:
            value = (
                YarmillAttendanceValue.ATTEND
                if present_map[swimmer.id]
                else YarmillAttendanceValue.EXCUSED
            )
        else:
            value = YarmillAttendanceValue.FREE
        try:
            client.save_user_attendance(
                swimmer.yarmill_user_id,
                YarmillAttendanceItem.MORNING,
                day,
                value,
            )
        except YarmillError as exc:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Zápis ranní docházky selhal pro plavce {swimmer.name} "
                    f"{swimmer.surname} (zapsáno {synced} plavců). {exc.message} "
                    "Opakovaný pokus je bezpečný — Yarmill hodnoty přepíše."
                ),
            ) from exc
        synced += 1

    details = (
        f"Ranní docházka zapsána pro {synced} plavců (celý klub, {day.isoformat()})."
    )
    if skipped:
        details += f" Přeskočeno {skipped} plavců bez Yarmill ID."
    return SyncAttendanceResponse(synced=synced, skipped=skipped, details=details)


@router.post("/sync-attendance", response_model=SyncAttendanceResponse)
def sync_attendance(
    payload: SyncAttendanceRequest,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Sync one day's attendance to Yarmill (regular group or whole-club morning)."""
    client = _make_client(payload.yarmill_token)

    group = db.query(Group).filter(Group.id == payload.group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Skupina nenalezena.")

    season = get_season_for_date(db, payload.date)
    if season is None:
        raise HTTPException(status_code=400, detail="Datum nespadá do žádné sezóny.")

    if group.is_morning_group:
        return _sync_morning_attendance(db, client, season.id, payload.date)
    return _sync_regular_attendance(db, client, group, payload.date)


@router.post("/copy-attendance-to-reality", response_model=CopyRealityResponse)
def copy_attendance_to_reality(
    payload: CopyRealityRequest,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Finalize a week: copy the saved attendance into the swimmers' Reality."""
    client = _make_client(payload.yarmill_token)

    if payload.week_start.isoweekday() != 1:
        raise HTTPException(status_code=400, detail="week_start musí být pondělí.")

    group = db.query(Group).filter(Group.id == payload.group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Skupina nenalezena.")
    if not group.yarmill_group_id:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Skupina „{group.display_name_cs}“ nemá nastavené Yarmill ID — "
                "doplň ho v nastavení skupin."
            ),
        )

    week_end = payload.week_start + timedelta(days=6)
    try:
        client.copy_attendance_to_reality(
            group.yarmill_group_id, payload.week_start, week_end
        )
    except YarmillError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Kopie docházky do reality selhala. {exc.message}",
        ) from exc

    return CopyRealityResponse(
        details=(
            f"Docházka týdne {payload.week_start.isoformat()} – "
            f"{week_end.isoformat()} zkopírována do reality."
        )
    )
