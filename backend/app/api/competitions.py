from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from sqlalchemy.orm import Session

from app.crud.competition import get_competition_detail, list_competitions
from app.db import get_db

competitions_router = APIRouter(
    prefix="/competitions",
    tags=["competitions"],
)


# ── Pydantic response schemas ──────────────────────────────────────────────────


class CompetitionInfoOut(BaseModel):
    id: int
    title: str
    start_date: Optional[str]
    end_date: Optional[str]
    location: Optional[str]
    pool_length: Optional[int]
    csps_competition_id: int

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class CompetitionResultDetailOut(BaseModel):
    discipline: str
    discipline_code: str
    time: int
    points: Optional[int]
    improvement: bool
    comparison_to_best: int
    performance: float
    relay_part: bool
    club_record: bool

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class CompetitionSwimmerResultOut(BaseModel):
    swimmer_id: int
    name: str
    surname: str
    birth_year: int
    results: List[CompetitionResultDetailOut]

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class CompetitionDetailResponse(BaseModel):
    competition: CompetitionInfoOut
    swimmers: List[CompetitionSwimmerResultOut]
    total_starts: int
    total_personal_bests: int
    club_records_count: int

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class CompetitionListItemOut(BaseModel):
    id: int
    title: str
    start_date: Optional[str]
    end_date: Optional[str]
    location: Optional[str]
    pool_length: Optional[int]
    csps_competition_id: int
    has_results: bool

    class Config:
        alias_generator = to_camel
        populate_by_name = True


# ── Endpoints ──────────────────────────────────────────────────────────────────


@competitions_router.get(
    "",
    summary="List competitions with club swimmer results for a given year",
    response_model=List[CompetitionListItemOut],
)
async def get_competitions(
    year: int = Query(
        default=None, description="Filter by year (defaults to current year)"
    ),
    db: Session = Depends(get_db),
):
    """Return competitions for the given year where club swimmers have results, ordered newest first."""
    if year is None:
        year = date.today().year
    return list_competitions(db, year)


@competitions_router.get(
    "/{competition_id}",
    summary="Get competition detail",
    response_model=CompetitionDetailResponse,
)
async def get_competition(
    competition_id: int,
    db: Session = Depends(get_db),
):
    """Return full detail for a competition including all club swimmer results."""
    data = get_competition_detail(db, competition_id)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail="Competition not found or no club swimmers participated",
        )
    return data
