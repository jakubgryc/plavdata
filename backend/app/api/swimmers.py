from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from unidecode import unidecode

from app.api.schemas import (
    BaseSwimmerOut,
    GroupedSwimmersOut,
    SwimmerProfileResponse,
    SwimmerSearchResult,
)
from app.constants import GROUPS_TO_LOOKUP
from app.crud.swimmer_profile import (
    get_swimmer_basic_info,
    get_swimmer_competitions,
    get_swimmer_personal_bests,
    get_swimmer_quarterly_improvements,
    get_swimmer_starts_by_stroke,
    get_swimmer_starts_by_year,
    get_swimmer_stats,
    get_swimmer_top_results,
)
from app.db import get_db
from app.models import Swimmer

router = APIRouter(
    prefix="/swimmers",
    tags=["swimmers"],
)


@router.get("", response_model=list[BaseSwimmerOut])
async def get_swimmers(db: Session = Depends(get_db)):
    """Get all swimmers."""
    swimmers = (
        db.query(Swimmer)
        .filter(Swimmer.group.in_(GROUPS_TO_LOOKUP))
        .options(joinedload(Swimmer.personal_bests))
        .all()
    )
    return swimmers


@router.get("/grouped", response_model=list[GroupedSwimmersOut])
async def get_swimmers_grouped(
    include_former: bool = False, db: Session = Depends(get_db)
):
    """Get swimmers grouped by their group. Optionally include former swimmers who left the club."""
    groups_to_include = GROUPS_TO_LOOKUP.copy()
    if include_former:
        groups_to_include.append("runaway")

    swimmers = (
        db.query(Swimmer)
        .filter(Swimmer.group.in_(groups_to_include))
        .order_by(Swimmer.surname, Swimmer.name)
        .all()
    )

    grouped = {}
    for swimmer in swimmers:
        if swimmer.group == "runaway":
            swimmer.group = "veteran"
        grouped.setdefault(swimmer.group, []).append(swimmer)

    result = [
        GroupedSwimmersOut(group=group, swimmers=swimmers_in_group)
        for group, swimmers_in_group in grouped.items()
    ]

    return result


@router.get("/{swimmer_id}/profile", response_model=SwimmerProfileResponse)
async def get_swimmer_profile(swimmer_id: int, db: Session = Depends(get_db)):
    """Get comprehensive profile information for a swimmer."""
    basic_info = get_swimmer_basic_info(db, swimmer_id)
    if not basic_info:
        raise HTTPException(status_code=404, detail="Swimmer not found")

    stats = get_swimmer_stats(db, swimmer_id)
    top_results = get_swimmer_top_results(db, swimmer_id, limit=3)
    starts_by_year = get_swimmer_starts_by_year(db, swimmer_id)
    competitions = get_swimmer_competitions(db, swimmer_id)
    personal_bests = get_swimmer_personal_bests(db, swimmer_id)
    starts_by_stroke = get_swimmer_starts_by_stroke(db, swimmer_id)
    quarterly_improvements = get_swimmer_quarterly_improvements(db, swimmer_id)

    return SwimmerProfileResponse(
        basic_info=basic_info,
        stats=stats,
        top_results=top_results,
        starts_by_year=starts_by_year,
        competitions=competitions,
        personal_bests=personal_bests,
        starts_by_stroke=starts_by_stroke,
        quarterly_improvements=quarterly_improvements,
    )


@router.get("/search", response_model=list[SwimmerSearchResult])
async def search_swimmers(
    query: str = Query(
        ..., min_length=1, description="Search query for swimmer name or surname"
    ),
    db: Session = Depends(get_db),
):
    """Search swimmers by name or surname. Returns matching swimmers for autocomplete.
    Supports Czech characters - searching 'c' will match 'č', 'r' will match 'ř', etc."""

    # Normalize the search query to ASCII (removes diacritics)
    normalized_query = unidecode(query).lower()

    # Fetch all swimmers (with reasonable limit for performance)
    all_swimmers = (
        db.query(Swimmer).order_by(Swimmer.surname, Swimmer.name).limit(500).all()
    )

    # Filter swimmers where normalized name or surname contains the normalized query
    matching_swimmers = []
    for swimmer in all_swimmers:
        normalized_name = unidecode(swimmer.name).lower()
        normalized_surname = unidecode(swimmer.surname).lower()

        if (
            normalized_query in normalized_name
            or normalized_query in normalized_surname
        ):
            matching_swimmers.append(swimmer)

            # Limit results to 20
            if len(matching_swimmers) >= 20:
                break

    return matching_swimmers
