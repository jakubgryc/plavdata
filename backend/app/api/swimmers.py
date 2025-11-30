from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.models import Swimmer
from app.api.schemas import BaseSwimmerOut, GroupedSwimmersOut
from app.db import get_db
from app.constants import GROUPS_TO_LOOKUP

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
async def get_swimmers_grouped(db: Session = Depends(get_db)):
    """Get swimmers grouped by their group."""
    swimmers = (
        db.query(Swimmer)
        .filter(Swimmer.group.in_(GROUPS_TO_LOOKUP))
        .options(joinedload(Swimmer.personal_bests))
        .all()
    )

    grouped = {}
    for swimmer in swimmers:
        grouped.setdefault(swimmer.group, []).append(swimmer)

    result = [
        GroupedSwimmersOut(group=group, swimmers=swimmers_in_group)
        for group, swimmers_in_group in grouped.items()
        ]

    return result
