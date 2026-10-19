"""
Admin API endpoints for managing seasons and attendance configuration.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.db import get_db
from app.models import (
    CoachGroup,
    Season,
    SeasonGroupMember,
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
