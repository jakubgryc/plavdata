from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, contains_eager, joinedload

from app.api.schemas import (
    BaseSwimmerOut,
    GroupedSwimmersOut,
    SwimmerProfileResponse,
    SwimmerSearchResult,
)
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
from app.models import Group, Swimmer

router = APIRouter(
    prefix="/swimmers",
    tags=["swimmers"],
)

# Maps a public view to the swimmer visibility flag that controls it
VIEW_VISIBILITY_FLAGS = {
    "relay_builder": Swimmer.show_in_relay_builder,
    "comparison": Swimmer.show_in_comparison,
}


@router.get("", response_model=list[BaseSwimmerOut])
async def get_swimmers(db: Session = Depends(get_db)):
    """Get all swimmers that belong to a group."""
    swimmers = (
        db.query(Swimmer)
        .filter(Swimmer.group_id.isnot(None))
        .options(joinedload(Swimmer.personal_bests))
        .all()
    )
    return swimmers


@router.get("/grouped", response_model=list[GroupedSwimmersOut])
async def get_swimmers_grouped(
    view: Literal["relay_builder", "comparison"] = Query(
        ..., description="Public view to list swimmers for"
    ),
    db: Session = Depends(get_db),
):
    """
    Get swimmers visible in the given view, grouped by their group.

    Only swimmers with the view's visibility flag enabled are returned, and only
    groups that contain at least one such swimmer appear in the response.
    """
    visibility_flag = VIEW_VISIBILITY_FLAGS[view]

    swimmers = (
        db.query(Swimmer)
        .join(Group, Swimmer.group_id == Group.id)
        .filter(visibility_flag.is_(True))
        .order_by(Group.display_order, Group.name, Swimmer.surname, Swimmer.name)
        .options(contains_eager(Swimmer.group_rel))
        .all()
    )

    grouped: dict[int, dict] = {}
    for swimmer in swimmers:
        entry = grouped.setdefault(
            swimmer.group_id,
            {
                "group_id": swimmer.group_id,
                "group": swimmer.group_display_name,
                "swimmers": [],
            },
        )
        entry["swimmers"].append(swimmer)

    return [GroupedSwimmersOut(**entry) for entry in grouped.values()]


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
    """
    Search swimmers by name or surname. Returns matching swimmers for autocomplete.
    Supports flexible space-separated name combining and native accent insensitivity.
    """
    search_term = query.strip().lower()

    # Note: Make sure the 'unaccent' extension is enabled in your Postgres instance!
    def postgres_unaccent(col):
        return func.unaccent(func.lower(col))

    db_query = postgres_unaccent(search_term)

    fullname_combo_1 = func.concat(Swimmer.surname, " ", Swimmer.name)
    fullname_combo_2 = func.concat(Swimmer.name, " ", Swimmer.surname)

    matching_swimmers = (
        db.query(Swimmer)
        .filter(
            or_(
                postgres_unaccent(Swimmer.name).contains(db_query),
                postgres_unaccent(Swimmer.surname).contains(db_query),
                postgres_unaccent(fullname_combo_1).contains(db_query),
                postgres_unaccent(fullname_combo_2).contains(db_query),
            )
        )
        .order_by(Swimmer.surname, Swimmer.name)
        .options(joinedload(Swimmer.group_rel))
        .limit(20)
        .all()
    )

    return [
        SwimmerSearchResult(
            id=swimmer.id,
            name=swimmer.name,
            surname=swimmer.surname,
            group=swimmer.group_display_name,
            birth_year=swimmer.birth_year,
        )
        for swimmer in matching_swimmers
    ]
