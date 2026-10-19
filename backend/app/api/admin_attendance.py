"""
Admin API endpoints for managing seasons and attendance configuration.
"""

import re
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.db import get_db
from app.models import (
    CoachGroup,
    Group,
    Season,
    SeasonGroupMember,
    Swimmer,
    Training,
    TrainingSchedule,
    User,
)

router = APIRouter(tags=["admin-attendance"], prefix="/admin")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class SeasonOut(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date

    class Config:
        from_attributes = True


class SeasonIn(BaseModel):
    name: str
    start_date: date
    end_date: date


# ---------------------------------------------------------------------------
# Helper (imported by Task 7)
# ---------------------------------------------------------------------------


def get_season_for_date(db: Session, d: date) -> Season | None:
    return db.query(Season).filter(Season.start_date <= d, Season.end_date >= d).first()


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


def _validate_season_dates(payload: SeasonIn) -> None:
    """Raise 422 if end_date is not strictly after start_date."""
    if payload.end_date <= payload.start_date:
        raise HTTPException(
            status_code=422,
            detail="Konec sezóny musí být později než začátek.",
        )


def _check_duplicate_name(
    db: Session, name: str, exclude_id: int | None = None
) -> None:
    """Raise 409 if a season with the exact name already exists."""
    query = db.query(Season).filter(Season.name == name)
    if exclude_id is not None:
        query = query.filter(Season.id != exclude_id)
    if query.first() is not None:
        raise HTTPException(
            status_code=409,
            detail="Sezóna s tímto názvem už existuje.",
        )


def _check_overlap(
    db: Session,
    start_date: date,
    end_date: date,
    exclude_id: int | None = None,
) -> None:
    """Raise 409 if the date range overlaps with any existing season."""
    query = db.query(Season).filter(
        Season.start_date <= end_date,
        Season.end_date >= start_date,
    )
    if exclude_id is not None:
        query = query.filter(Season.id != exclude_id)
    if query.first() is not None:
        raise HTTPException(
            status_code=409,
            detail="Sezóny se nesmí překrývat.",
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/seasons", response_model=list[SeasonOut])
async def list_seasons(
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Return all seasons ordered by start_date ascending."""
    seasons = db.query(Season).order_by(Season.start_date).all()
    return [SeasonOut.model_validate(s) for s in seasons]


@router.post("/seasons", response_model=SeasonOut, status_code=201)
async def create_season(
    payload: SeasonIn,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Create a new season with date-overlap and name-uniqueness checks."""
    _validate_season_dates(payload)
    _check_duplicate_name(db, payload.name)
    _check_overlap(db, payload.start_date, payload.end_date)

    season = Season(
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    db.add(season)
    db.commit()
    db.refresh(season)
    return SeasonOut.model_validate(season)


@router.put("/seasons/{season_id}", response_model=SeasonOut)
async def update_season(
    season_id: int,
    payload: SeasonIn,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Update an existing season. Same validations, excluding self."""
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Sezóna nenalezena.")

    _validate_season_dates(payload)
    _check_duplicate_name(db, payload.name, exclude_id=season_id)
    _check_overlap(db, payload.start_date, payload.end_date, exclude_id=season_id)

    season.name = payload.name
    season.start_date = payload.start_date
    season.end_date = payload.end_date
    db.commit()
    db.refresh(season)
    return SeasonOut.model_validate(season)


@router.delete("/seasons/{season_id}", status_code=204)
async def delete_season(
    season_id: int,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """
    Delete a season. Blocked when trainings already exist for it.
    Config rows (SeasonGroupMember, TrainingSchedule, CoachGroup) cascade via FK.
    """
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Sezóna nenalezena.")

    has_trainings = db.query(Training).filter(Training.season_id == season_id).first()
    if has_trainings is not None:
        raise HTTPException(
            status_code=409,
            detail="Sezónu s uloženými tréninky nelze smazat.",
        )

    db.delete(season)
    db.commit()
    return None


@router.post("/seasons/{season_id}/copy-from/{source_id}", status_code=204)
async def copy_season_config(
    season_id: int,
    source_id: int,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """
    Copy configuration (members, schedule, coaches) from source season into
    target season. Idempotent: rows whose unique key already exists in the
    target are skipped.
    """
    if season_id == source_id:
        raise HTTPException(
            status_code=400,
            detail="Nelze kopírovat sezónu do sebe sama.",
        )

    target = db.query(Season).filter(Season.id == season_id).first()
    source = db.query(Season).filter(Season.id == source_id).first()
    if not target or not source:
        raise HTTPException(status_code=404, detail="Sezóna nenalezena.")

    # --- SeasonGroupMember (unique: season_id, group_id, swimmer_id) ---
    existing_member_keys = set(
        db.query(SeasonGroupMember.group_id, SeasonGroupMember.swimmer_id)
        .filter(SeasonGroupMember.season_id == season_id)
        .all()
    )
    source_members = (
        db.query(SeasonGroupMember).filter(SeasonGroupMember.season_id == source_id).all()
    )
    for src in source_members:
        key = (src.group_id, src.swimmer_id)
        if key not in existing_member_keys:
            db.add(
                SeasonGroupMember(
                    season_id=season_id,
                    group_id=src.group_id,
                    swimmer_id=src.swimmer_id,
                )
            )

    # --- TrainingSchedule (unique: season_id, group_id, weekday) ---
    existing_schedule_keys = set(
        db.query(TrainingSchedule.group_id, TrainingSchedule.weekday)
        .filter(TrainingSchedule.season_id == season_id)
        .all()
    )
    source_schedules = (
        db.query(TrainingSchedule)
        .filter(TrainingSchedule.season_id == source_id)
        .all()
    )
    for src in source_schedules:
        key = (src.group_id, src.weekday)
        if key not in existing_schedule_keys:
            db.add(
                TrainingSchedule(
                    season_id=season_id,
                    group_id=src.group_id,
                    weekday=src.weekday,
                    start_time=src.start_time,
                    end_time=src.end_time,
                )
            )

    # --- CoachGroup (unique: season_id, group_id, user_id) ---
    existing_coach_keys = set(
        db.query(CoachGroup.group_id, CoachGroup.user_id)
        .filter(CoachGroup.season_id == season_id)
        .all()
    )
    source_coaches = (
        db.query(CoachGroup).filter(CoachGroup.season_id == source_id).all()
    )
    for src in source_coaches:
        key = (src.group_id, src.user_id)
        if key not in existing_coach_keys:
            db.add(
                CoachGroup(
                    season_id=season_id,
                    group_id=src.group_id,
                    user_id=src.user_id,
                )
            )

    db.commit()
    return None


# ---------------------------------------------------------------------------
# Task 6 Schemas
# ---------------------------------------------------------------------------


class SeasonMemberOut(BaseModel):
    id: int
    name: str
    surname: str
    birth_year: int

    class Config:
        from_attributes = True


class MembersIn(BaseModel):
    swimmer_ids: list[int]


class ScheduleSlotOut(BaseModel):
    weekday: int
    start_time: str
    end_time: str


class ScheduleIn(BaseModel):
    slots: list[ScheduleSlotOut]


class CoachOut(BaseModel):
    id: int
    username: str
    is_active: bool

    class Config:
        from_attributes = True


class CoachesIn(BaseModel):
    user_ids: list[int]


class GroupOut(BaseModel):
    id: int
    name: str
    display_name_cs: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Task 6 Validation helpers
# ---------------------------------------------------------------------------

_TIME_RE = re.compile(r"^\d{2}:\d{2}$")


def _validate_time_value(value: str) -> None:
    """Raise 422 if value is not a valid HH:MM time."""
    if not _TIME_RE.match(value):
        raise HTTPException(status_code=422, detail=f"Neplatný čas: {value}.")
    hours, minutes = value.split(":")
    if int(hours) > 23 or int(minutes) > 59:
        raise HTTPException(status_code=422, detail=f"Neplatný čas: {value}.")


def _validate_schedule_slots(payload: ScheduleIn) -> None:
    """Validate all schedule slots; raise 422 on any problem."""
    seen_weekdays: set[int] = set()
    for slot in payload.slots:
        if slot.weekday < 1 or slot.weekday > 7:
            raise HTTPException(
                status_code=422,
                detail=f"Neplatný den v týdnu: {slot.weekday}.",
            )
        _validate_time_value(slot.start_time)
        _validate_time_value(slot.end_time)
        if slot.end_time <= slot.start_time:
            raise HTTPException(
                status_code=422,
                detail="Konec musí být později než začátek.",
            )
        if slot.weekday in seen_weekdays:
            raise HTTPException(
                status_code=422,
                detail=f"Den v týdnu se opakuje: {slot.weekday}.",
            )
        seen_weekdays.add(slot.weekday)


# ---------------------------------------------------------------------------
# Task 6 Endpoints
# ---------------------------------------------------------------------------


@router.get("/seasons/{season_id}/groups", response_model=list[GroupOut])
async def list_season_groups(
    season_id: int,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Return ALL groups ordered by display_order, regardless of config."""
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Sezóna nenalezena.")

    groups = db.query(Group).order_by(Group.display_order).all()
    return [GroupOut.model_validate(g) for g in groups]


@router.get(
    "/seasons/{season_id}/groups/{group_id}/members",
    response_model=list[SeasonMemberOut],
)
async def get_group_members(
    season_id: int,
    group_id: int,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Return members of a season-group, joined with Swimmer, ordered by surname, name."""
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Sezóna nenalezena.")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Skupina nenalezena.")

    rows = (
        db.query(Swimmer)
        .join(SeasonGroupMember, SeasonGroupMember.swimmer_id == Swimmer.id)
        .filter(
            SeasonGroupMember.season_id == season_id,
            SeasonGroupMember.group_id == group_id,
        )
        .order_by(Swimmer.surname, Swimmer.name)
        .all()
    )
    return [
        SeasonMemberOut(
            id=s.id, name=s.name, surname=s.surname, birth_year=s.birth_year
        )
        for s in rows
    ]


@router.put(
    "/seasons/{season_id}/groups/{group_id}/members",
    response_model=list[SeasonMemberOut],
)
async def put_group_members(
    season_id: int,
    group_id: int,
    payload: MembersIn,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Full replace of season-group members in one transaction."""
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Sezóna nenalezena.")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Skupina nenalezena.")

    # Dedupe silently
    unique_ids = list(set(payload.swimmer_ids))

    # Validate all swimmer_ids exist
    existing_ids = {
        id_ for (id_,) in db.query(Swimmer.id).filter(Swimmer.id.in_(unique_ids)).all()
    }
    for sid in unique_ids:
        if sid not in existing_ids:
            raise HTTPException(
                status_code=422, detail=f"Neznámý plavec: id {sid}."
            )

    # Delete existing
    db.query(SeasonGroupMember).filter(
        SeasonGroupMember.season_id == season_id,
        SeasonGroupMember.group_id == group_id,
    ).delete(synchronize_session=False)

    # Insert new
    for swimmer_id in unique_ids:
        db.add(
            SeasonGroupMember(
                season_id=season_id,
                group_id=group_id,
                swimmer_id=swimmer_id,
            )
        )

    db.commit()

    # Return the GET shape
    rows = (
        db.query(Swimmer)
        .join(SeasonGroupMember, SeasonGroupMember.swimmer_id == Swimmer.id)
        .filter(
            SeasonGroupMember.season_id == season_id,
            SeasonGroupMember.group_id == group_id,
        )
        .order_by(Swimmer.surname, Swimmer.name)
        .all()
    )
    return [
        SeasonMemberOut(
            id=s.id, name=s.name, surname=s.surname, birth_year=s.birth_year
        )
        for s in rows
    ]


@router.get(
    "/seasons/{season_id}/groups/{group_id}/schedule",
    response_model=list[ScheduleSlotOut],
)
async def get_group_schedule(
    season_id: int,
    group_id: int,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Return training schedule slots for a season-group, ordered by weekday."""
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Sezóna nenalezena.")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Skupina nenalezena.")

    rows = (
        db.query(TrainingSchedule)
        .filter(
            TrainingSchedule.season_id == season_id,
            TrainingSchedule.group_id == group_id,
        )
        .order_by(TrainingSchedule.weekday)
        .all()
    )
    return [
        ScheduleSlotOut(
            weekday=r.weekday, start_time=r.start_time, end_time=r.end_time
        )
        for r in rows
    ]


@router.put(
    "/seasons/{season_id}/groups/{group_id}/schedule",
    response_model=list[ScheduleSlotOut],
)
async def put_group_schedule(
    season_id: int,
    group_id: int,
    payload: ScheduleIn,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Full replace of training schedule in one transaction."""
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Sezóna nenalezena.")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Skupina nenalezena.")

    _validate_schedule_slots(payload)

    # Delete existing
    db.query(TrainingSchedule).filter(
        TrainingSchedule.season_id == season_id,
        TrainingSchedule.group_id == group_id,
    ).delete(synchronize_session=False)

    # Insert new
    for slot in payload.slots:
        db.add(
            TrainingSchedule(
                season_id=season_id,
                group_id=group_id,
                weekday=slot.weekday,
                start_time=slot.start_time,
                end_time=slot.end_time,
            )
        )

    db.commit()

    # Return the GET shape
    rows = (
        db.query(TrainingSchedule)
        .filter(
            TrainingSchedule.season_id == season_id,
            TrainingSchedule.group_id == group_id,
        )
        .order_by(TrainingSchedule.weekday)
        .all()
    )
    return [
        ScheduleSlotOut(
            weekday=r.weekday, start_time=r.start_time, end_time=r.end_time
        )
        for r in rows
    ]


@router.get(
    "/seasons/{season_id}/groups/{group_id}/coaches",
    response_model=list[CoachOut],
)
async def get_group_coaches(
    season_id: int,
    group_id: int,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Return coaches assigned to a season-group, joined to User, ordered by username."""
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Sezóna nenalezena.")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Skupina nenalezena.")

    rows = (
        db.query(User)
        .join(CoachGroup, CoachGroup.user_id == User.id)
        .filter(
            CoachGroup.season_id == season_id,
            CoachGroup.group_id == group_id,
            User.role == "coach",
        )
        .order_by(User.username)
        .all()
    )
    return [
        CoachOut(id=u.id, username=u.username, is_active=u.is_active) for u in rows
    ]


@router.put(
    "/seasons/{season_id}/groups/{group_id}/coaches",
    response_model=list[CoachOut],
)
async def put_group_coaches(
    season_id: int,
    group_id: int,
    payload: CoachesIn,
    _current_user: Annotated[User, Depends(get_current_admin)],
    db: Session = Depends(get_db),
):
    """Full replace of coach assignments in one transaction."""
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Sezóna nenalezena.")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Skupina nenalezena.")

    # Dedupe silently
    unique_user_ids = list(set(payload.user_ids))

    # Validate all user_ids are existing coaches (pending allowed)
    existing_coach_ids = {
        id_
        for (id_,) in db.query(User.id)
        .filter(User.id.in_(unique_user_ids), User.role == "coach")
        .all()
    }
    for uid in unique_user_ids:
        if uid not in existing_coach_ids:
            raise HTTPException(
                status_code=422, detail=f"Neznámý trenér: id {uid}."
            )

    # Delete existing
    db.query(CoachGroup).filter(
        CoachGroup.season_id == season_id,
        CoachGroup.group_id == group_id,
    ).delete(synchronize_session=False)

    # Insert new
    for user_id in unique_user_ids:
        db.add(
            CoachGroup(
                season_id=season_id,
                group_id=group_id,
                user_id=user_id,
            )
        )

    db.commit()

    # Return the GET shape
    rows = (
        db.query(User)
        .join(CoachGroup, CoachGroup.user_id == User.id)
        .filter(
            CoachGroup.season_id == season_id,
            CoachGroup.group_id == group_id,
            User.role == "coach",
        )
        .order_by(User.username)
        .all()
    )
    return [
        CoachOut(id=u.id, username=u.username, is_active=u.is_active) for u in rows
    ]
