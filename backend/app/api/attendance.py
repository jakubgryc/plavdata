"""
Coach-facing attendance API: context, day view/edit, week overview.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import (
    Attendance,
    CoachGroup,
    Group,
    Season,
    SeasonGroupMember,
    Swimmer,
    Training,
    TrainingSchedule,
    User,
)
from app.api.admin_attendance import SeasonOut, get_season_for_date

router = APIRouter(tags=["attendance"], prefix="/attendance")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PRAGUE = ZoneInfo("Europe/Prague")


def prague_today() -> date:
    return datetime.now(_PRAGUE).date()


def _check_group_access(db: Session, season_id: int, group_id: int, user: User) -> None:
    """Raise 403 if user is not admin and has no CoachGroup row."""
    if user.role == "admin":
        return
    row = (
        db.query(CoachGroup)
        .filter(
            CoachGroup.season_id == season_id,
            CoachGroup.group_id == group_id,
            CoachGroup.user_id == user.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=403,
            detail="K této skupině nemáš přístup.",
        )


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ScheduleSlot(BaseModel):
    weekday: int
    start_time: str
    end_time: str


class ContextGroup(BaseModel):
    id: int
    display_name_cs: str
    schedule: list[ScheduleSlot]


class ContextOut(BaseModel):
    season: SeasonOut | None
    groups: list[ContextGroup]


class SwimmerBrief(BaseModel):
    id: int
    name: str
    surname: str


class AttendanceEntry(BaseModel):
    swimmer_id: int
    present: bool


class TrainingOut(BaseModel):
    total_meters: int | None
    drill_meters: int | None
    kick_meters: int | None
    description: str | None
    duration_minutes: int | None
    saved_by_name: str
    saved_at: datetime
    attendance: list[AttendanceEntry]


class DayOut(BaseModel):
    date: date
    is_training_day: bool
    schedule: ScheduleSlot | None
    swimmers: list[SwimmerBrief]
    training: TrainingOut | None


class SaveDayIn(BaseModel):
    group_id: int
    date: date
    attendance: list[AttendanceEntry]
    total_meters: int | None = None
    drill_meters: int | None = None
    kick_meters: int | None = None
    description: str | None = None
    duration_minutes: int | None = None


class WeekDayOut(BaseModel):
    date: date
    is_training_day: bool
    schedule: ScheduleSlot | None
    filled: bool
    present_count: int | None
    saved_by_name: str | None
    saved_at: datetime | None
    attendance: list[AttendanceEntry]


class ImportSource(BaseModel):
    group_id: int
    display_name_cs: str


class WeekOut(BaseModel):
    swimmers: list[SwimmerBrief]
    days: list[WeekDayOut]


# ---------------------------------------------------------------------------
# Internal query helpers
# ---------------------------------------------------------------------------


def _get_group_swimmers(db: Session, season_id: int, group_id: int) -> list[Swimmer]:
    """Return season-group members ordered by surname, name."""
    return (
        db.query(Swimmer)
        .join(SeasonGroupMember, SeasonGroupMember.swimmer_id == Swimmer.id)
        .filter(
            SeasonGroupMember.season_id == season_id,
            SeasonGroupMember.group_id == group_id,
        )
        .order_by(Swimmer.surname, Swimmer.name)
        .all()
    )


def _build_training_out(db: Session, training: Training) -> TrainingOut:
    """Build TrainingOut from a Training ORM instance."""
    saved_by_user = db.query(User).filter(User.id == training.saved_by).first()
    attendance_rows = (
        db.query(Attendance).filter(Attendance.training_id == training.id).all()
    )
    return TrainingOut(
        total_meters=training.total_meters,
        drill_meters=training.drill_meters,
        kick_meters=training.kick_meters,
        description=training.description,
        duration_minutes=training.duration_minutes,
        saved_by_name=saved_by_user.username if saved_by_user else "",
        saved_at=training.saved_at,
        attendance=[
            AttendanceEntry(swimmer_id=a.swimmer_id, present=a.present)
            for a in attendance_rows
        ],
    )


def _build_day_out(
    db: Session,
    d: date,
    season: Season | None,
    group_id: int,
) -> DayOut:
    """Build a full DayOut for a given date/season/group."""
    if season is None:
        return DayOut(
            date=d,
            is_training_day=False,
            schedule=None,
            swimmers=[],
            training=None,
        )

    weekday = d.isoweekday()
    sched = (
        db.query(TrainingSchedule)
        .filter(
            TrainingSchedule.season_id == season.id,
            TrainingSchedule.group_id == group_id,
            TrainingSchedule.weekday == weekday,
        )
        .first()
    )
    is_training_day = sched is not None
    schedule_slot = (
        ScheduleSlot(
            weekday=sched.weekday,
            start_time=sched.start_time,
            end_time=sched.end_time,
        )
        if sched
        else None
    )

    swimmers = _get_group_swimmers(db, season.id, group_id)
    swimmer_briefs = [
        SwimmerBrief(id=s.id, name=s.name, surname=s.surname) for s in swimmers
    ]

    training = (
        db.query(Training)
        .filter(Training.group_id == group_id, Training.date == d)
        .first()
    )
    training_out = _build_training_out(db, training) if training else None

    return DayOut(
        date=d,
        is_training_day=is_training_day,
        schedule=schedule_slot,
        swimmers=swimmer_briefs,
        training=training_out,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/context", response_model=ContextOut)
async def get_context(
    current_user: Annotated[User, Depends(get_current_user)],
    date: date | None = None,
    db: Session = Depends(get_db),
):
    """
    Return the current season and the groups visible to the user.
    Admins see all groups with schedule rows; coaches see only their assigned groups.
    Returns 200 with season=None when the date falls outside any season.
    """
    if date is None:
        date = prague_today()

    season = get_season_for_date(db, date)
    if season is None:
        return ContextOut(season=None, groups=[])

    if current_user.role == "admin":
        group_ids = {
            gid
            for (gid,) in db.query(TrainingSchedule.group_id)
            .filter(TrainingSchedule.season_id == season.id)
            .distinct()
            .all()
        }
    else:
        group_ids = {
            gid
            for (gid,) in db.query(CoachGroup.group_id)
            .filter(
                CoachGroup.season_id == season.id,
                CoachGroup.user_id == current_user.id,
            )
            .all()
        }

    if not group_ids:
        return ContextOut(season=SeasonOut.model_validate(season), groups=[])

    groups = (
        db.query(Group)
        .filter(Group.id.in_(group_ids))
        .order_by(Group.display_order)
        .all()
    )

    context_groups: list[ContextGroup] = []
    for g in groups:
        sched_rows = (
            db.query(TrainingSchedule)
            .filter(
                TrainingSchedule.season_id == season.id,
                TrainingSchedule.group_id == g.id,
            )
            .order_by(TrainingSchedule.weekday)
            .all()
        )
        schedule = [
            ScheduleSlot(
                weekday=s.weekday, start_time=s.start_time, end_time=s.end_time
            )
            for s in sched_rows
        ]
        context_groups.append(
            ContextGroup(id=g.id, display_name_cs=g.display_name_cs, schedule=schedule)
        )

    return ContextOut(season=SeasonOut.model_validate(season), groups=context_groups)


@router.get("/day", response_model=DayOut)
async def get_day(
    group_id: int,
    date: date,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Return the day view for a single group: schedule slot, swimmer list,
    and any saved training with attendance.
    """
    season = get_season_for_date(db, date)
    if season is None:
        raise HTTPException(
            status_code=404,
            detail="Datum nespadá do žádné sezóny.",
        )

    _check_group_access(db, season.id, group_id, current_user)

    return _build_day_out(db, date, season, group_id)


@router.put("/day", response_model=DayOut)
async def save_day(
    payload: SaveDayIn,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Create or update a training day: upsert the Training row and replace
    all attendance entries. Single transaction; rolls back on any error.
    """
    season = get_season_for_date(db, payload.date)
    if season is None:
        raise HTTPException(
            status_code=404,
            detail="Datum nespadá do žádné sezóny.",
        )

    _check_group_access(db, season.id, payload.group_id, current_user)

    # --- Validate duration_minutes ---
    if payload.duration_minutes is not None and not (
        1 <= payload.duration_minutes <= 600
    ):
        raise HTTPException(
            status_code=422,
            detail="Délka tréninku musí být mezi 1 a 600 minutami.",
        )

    # --- Training-day check ---
    existing_training = (
        db.query(Training)
        .filter(
            Training.group_id == payload.group_id,
            Training.date == payload.date,
        )
        .first()
    )
    if existing_training is None:
        sched = (
            db.query(TrainingSchedule)
            .filter(
                TrainingSchedule.season_id == season.id,
                TrainingSchedule.group_id == payload.group_id,
                TrainingSchedule.weekday == payload.date.isoweekday(),
            )
            .first()
        )
        if sched is None:
            raise HTTPException(
                status_code=422,
                detail="Tento den nemá skupina trénink dle rozvrhu.",
            )

    # --- Validate attendance entries ---
    swimmer_ids = [entry.swimmer_id for entry in payload.attendance]

    # Check duplicates
    seen: set[int] = set()
    for sid in swimmer_ids:
        if sid in seen:
            raise HTTPException(
                status_code=422,
                detail=f"Duplicitní plavec: id {sid}.",
            )
        seen.add(sid)

    # Check membership
    valid_ids = {
        sid
        for (sid,) in db.query(SeasonGroupMember.swimmer_id)
        .filter(
            SeasonGroupMember.season_id == season.id,
            SeasonGroupMember.group_id == payload.group_id,
        )
        .all()
    }
    for sid in swimmer_ids:
        if sid not in valid_ids:
            raise HTTPException(
                status_code=422,
                detail=f"Plavec není členem skupiny v této sezóně: id {sid}.",
            )

    # --- Upsert Training ---
    training = (
        db.query(Training)
        .filter(
            Training.group_id == payload.group_id,
            Training.date == payload.date,
        )
        .first()
    )
    if training is None:
        training = Training(
            group_id=payload.group_id,
            season_id=season.id,
            date=payload.date,
            total_meters=payload.total_meters,
            drill_meters=payload.drill_meters,
            kick_meters=payload.kick_meters,
            description=payload.description,
            duration_minutes=payload.duration_minutes,
            saved_by=current_user.id,
            saved_at=datetime.now(timezone.utc),
        )
        db.add(training)
    else:
        training.total_meters = payload.total_meters
        training.drill_meters = payload.drill_meters
        training.kick_meters = payload.kick_meters
        training.description = payload.description
        training.duration_minutes = payload.duration_minutes
        training.saved_by = current_user.id
        training.saved_at = datetime.now(timezone.utc)

    db.flush()  # ensure training.id is populated

    # --- Replace attendance ---
    db.query(Attendance).filter(Attendance.training_id == training.id).delete(
        synchronize_session=False
    )
    for entry in payload.attendance:
        db.add(
            Attendance(
                training_id=training.id,
                swimmer_id=entry.swimmer_id,
                present=entry.present,
            )
        )

    db.commit()

    # Fresh read after commit
    return _build_day_out(db, payload.date, season, payload.group_id)


@router.get("/import-sources", response_model=list[ImportSource])
async def get_import_sources(
    date: date,
    exclude_group_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Return groups (excluding exclude_group_id) that have a saved training
    on the given date and are accessible to the caller.
    Admins see all groups with a schedule that season; coaches see only
    their CoachGroup-assigned groups.
    """
    season = get_season_for_date(db, date)
    if season is None:
        return []

    if current_user.role == "admin":
        accessible_group_ids = {
            gid
            for (gid,) in db.query(TrainingSchedule.group_id)
            .filter(TrainingSchedule.season_id == season.id)
            .distinct()
            .all()
        }
    else:
        accessible_group_ids = {
            gid
            for (gid,) in db.query(CoachGroup.group_id)
            .filter(
                CoachGroup.season_id == season.id,
                CoachGroup.user_id == current_user.id,
            )
            .all()
        }

    accessible_group_ids.discard(exclude_group_id)
    if not accessible_group_ids:
        return []

    training_group_ids = {
        gid
        for (gid,) in db.query(Training.group_id)
        .filter(
            Training.date == date,
            Training.group_id.in_(accessible_group_ids),
        )
        .all()
    }

    if not training_group_ids:
        return []

    groups = (
        db.query(Group)
        .filter(Group.id.in_(training_group_ids))
        .order_by(Group.display_order)
        .all()
    )
    return [
        ImportSource(group_id=g.id, display_name_cs=g.display_name_cs)
        for g in groups
    ]


@router.get("/week", response_model=WeekOut)
async def get_week(
    group_id: int,
    week_start: date,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Return a Mon–Sun week overview for a group. Season is resolved per day
    (the week may span two seasons). Days outside any season return empty data.
    """
    if week_start.isoweekday() != 1:
        raise HTTPException(
            status_code=422,
            detail="week_start musí být pondělí.",
        )

    # Find primary season (for access check and swimmer list)
    primary_season = get_season_for_date(db, week_start)
    if primary_season is None:
        for i in range(1, 7):
            day = week_start + timedelta(days=i)
            primary_season = get_season_for_date(db, day)
            if primary_season is not None:
                break

    # Access check
    if primary_season is not None:
        _check_group_access(db, primary_season.id, group_id, current_user)
    elif current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="K této skupině nemáš přístup.",
        )

    # Seasons whose group access has already been verified (the week may span
    # two seasons; every day's season must pass the access check before its
    # data is emitted).
    checked_season_ids: set[int] = set()
    if primary_season is not None:
        checked_season_ids.add(primary_season.id)

    # Swimmers from primary season
    if primary_season is not None:
        swimmers = _get_group_swimmers(db, primary_season.id, group_id)
    else:
        swimmers = []

    swimmer_briefs = [
        SwimmerBrief(id=s.id, name=s.name, surname=s.surname) for s in swimmers
    ]

    # Build per-day data (Mon..Sun)
    days: list[WeekDayOut] = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_season = get_season_for_date(db, day)

        if day_season is None:
            days.append(
                WeekDayOut(
                    date=day,
                    is_training_day=False,
                    schedule=None,
                    filled=False,
                    present_count=None,
                    saved_by_name=None,
                    saved_at=None,
                    attendance=[],
                )
            )
            continue

        # Access check for each distinct season appearing in this week
        if day_season.id not in checked_season_ids:
            _check_group_access(db, day_season.id, group_id, current_user)
            checked_season_ids.add(day_season.id)

        # Schedule check
        weekday = day.isoweekday()
        sched = (
            db.query(TrainingSchedule)
            .filter(
                TrainingSchedule.season_id == day_season.id,
                TrainingSchedule.group_id == group_id,
                TrainingSchedule.weekday == weekday,
            )
            .first()
        )
        is_training_day = sched is not None
        schedule_slot = (
            ScheduleSlot(
                weekday=sched.weekday,
                start_time=sched.start_time,
                end_time=sched.end_time,
            )
            if sched
            else None
        )

        # Training check
        training = (
            db.query(Training)
            .filter(Training.group_id == group_id, Training.date == day)
            .first()
        )
        if training is not None:
            saved_by_user = db.query(User).filter(User.id == training.saved_by).first()
            attendance_rows = (
                db.query(Attendance).filter(Attendance.training_id == training.id).all()
            )
            present_count = sum(1 for a in attendance_rows if a.present)
            days.append(
                WeekDayOut(
                    date=day,
                    is_training_day=is_training_day,
                    schedule=schedule_slot,
                    filled=True,
                    present_count=present_count,
                    saved_by_name=(saved_by_user.username if saved_by_user else ""),
                    saved_at=training.saved_at,
                    attendance=[
                        AttendanceEntry(swimmer_id=a.swimmer_id, present=a.present)
                        for a in attendance_rows
                    ],
                )
            )
        else:
            days.append(
                WeekDayOut(
                    date=day,
                    is_training_day=is_training_day,
                    schedule=schedule_slot,
                    filled=False,
                    present_count=None,
                    saved_by_name=None,
                    saved_at=None,
                    attendance=[],
                )
            )

    return WeekOut(swimmers=swimmer_briefs, days=days)
