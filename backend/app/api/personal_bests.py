from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy import case
from typing import List, Optional
from pydantic import BaseModel
from collections import defaultdict

from app.models import PersonalBest, Swimmer, Discipline, Course
from app.db import get_db
from app.api.schemas import (
    PersonalBestOut,
    PersonalBestStrippedOut,
    SwimmerPersonalBestOut,
    SwimmerOut,
)
from app.constants import GROUPS_TO_LOOKUP, DISCIPLINE_ORDER

router = APIRouter(
    prefix="/personal_bests",
    tags=["personal_bests"],
)


def discipline_case():
    """
    Helper function to create a case statement for discipline ordering.
    """
    return case(
        {title: index for index, title in enumerate(DISCIPLINE_ORDER)},
        value=Discipline.code,
        else_=len(GROUPS_TO_LOOKUP),  # Default case for unknown disciplines
    )


class PB_Payload(BaseModel):
    """
    Payload for filtering personal bests.
    """

    swimmer_ids: Optional[List[int]] = None
    discipline_ids: Optional[List[int]] = None
    course: Optional[int] = 25


@router.post("", response_model=list[PersonalBestOut])
async def get_personal_bests(payload: PB_Payload, db: Session = Depends(get_db)):
    """Get personal bests filtered by swimmer IDs, discipline IDs, and course length."""
    payload = dict(payload)
    swimmer_ids = payload.get("swimmer_ids", [])
    discipline_ids = payload.get("discipline_ids", [])
    course = payload.get("course", 25)

    query = db.query(PersonalBest).options(
        joinedload(PersonalBest.swimmer),
        joinedload(PersonalBest.discipline),
        joinedload(PersonalBest.course),
    )

    if course and course not in [25, 50]:
        raise HTTPException(status_code=400, detail="Invalid course. Must be 25 or 50.")

    if swimmer_ids:
        query = query.filter(PersonalBest.swimmer_id.in_(swimmer_ids))

    if discipline_ids:
        query = query.filter(PersonalBest.discipline_id.in_(discipline_ids))

    query = (
        query.join(Swimmer)
        .join(Discipline)
        .join(Course)
        .filter(Swimmer.group.in_(GROUPS_TO_LOOKUP))
    )
    if course:
        query = query.filter(Course.length == course)

    personal_bests = query.all()

    return [PersonalBestOut.with_ages(pb) for pb in personal_bests]


@router.get("/grouped")
async def get_personal_bests_by_group(
    group: str,
    course: Optional[int] = Query(25, description="Course length (25 or 50)"),
    db: Session = Depends(get_db),
):
    """
    Get personal bests for a specific group.
    """
    if group not in GROUPS_TO_LOOKUP:
        raise HTTPException(status_code=400, detail="Invalid group")

    swimmers_in_group = (
        db.query(Swimmer)
        .filter(Swimmer.group == group)
        .order_by(Swimmer.surname.asc(), Swimmer.name.asc())
        .all()
    )

    pbs = (
        db.query(PersonalBest)
        .join(PersonalBest.swimmer)
        .join(PersonalBest.discipline)
        .join(PersonalBest.course)
        .filter(Swimmer.group == group)
        .filter(Course.length == course)
        .options(
            contains_eager(PersonalBest.swimmer),
            contains_eager(PersonalBest.discipline),
            contains_eager(PersonalBest.course),
        )
        .order_by(Swimmer.surname.asc(), Swimmer.name, discipline_case().asc())
        .all()
    )

    pbs_with_ages = [PersonalBestOut.with_ages(pb) for pb in pbs]

    grouped_pbs = defaultdict(list)
    swimmers = {}

    for pb in pbs_with_ages:
        swimmer_id = pb.swimmer.id
        grouped_pbs[swimmer_id].append(
            PersonalBestStrippedOut(**pb.model_dump(exclude={"swimmer"}))
        )
        swimmers[swimmer_id] = pb.swimmer

    result: List[SwimmerPersonalBestOut] = []

    for swimmer in swimmers_in_group:
        # Get the PBs for the current swimmer. It will be an empty list if they have none.
        personal_bests_for_swimmer = grouped_pbs[swimmer.id]

        result.append(
            SwimmerPersonalBestOut(
                swimmer=SwimmerOut.with_age(swimmer),
                personal_bests=personal_bests_for_swimmer,
            )
        )

    # for swimmer_id, personal_bests in grouped_pbs.items():
    #     result.append(SwimmerPersonalBestOut(
    #         swimmer=swimmers[swimmer_id],
    #         personal_bests=personal_bests
    #     ))

    return result


@router.get("/swimmer/{swimmer_id}")
async def get_personal_bests_by_swimmer(swimmer_id: int, db: Session = Depends(get_db)):
    """
    Get personal bests for a specific swimmer.
    """
    swimmer = db.query(Swimmer).filter(Swimmer.id == swimmer_id).first()
    if not swimmer:
        raise HTTPException(status_code=404, detail="Swimmer not found")

    personal_bests = (
        db.query(PersonalBest).filter(PersonalBest.swimmer_id == swimmer_id).all()
    )

    return personal_bests


@router.get("/swimmer/{swimmer_id}/discipline/{discipline_id}")
async def get_personal_best_by_discipline(
    swimmer_id: int, discipline_id: int, db: Session = Depends(get_db)
):
    """
    Get personal best for a specific swimmer and discipline.
    """
    swimmer = db.query(Swimmer).filter(Swimmer.id == swimmer_id).first()
    if not swimmer:
        raise HTTPException(status_code=404, detail="Swimmer not found")

    discipline = db.query(Discipline).filter(Discipline.id == discipline_id).first()
    if not discipline:
        raise HTTPException(status_code=404, detail="Discipline not found")

    personal_best = (
        db.query(PersonalBest)
        .filter(
            PersonalBest.swimmer_id == swimmer_id,
            PersonalBest.discipline_id == discipline_id,
        )
        .first()
    )

    if not personal_best:
        raise HTTPException(status_code=404, detail="Personal best not found")

    return personal_best


@router.get("/swimmer/{swimmer_id}/discipline/{discipline_id}/course/{course}")
async def get_personal_best_by_discipline_and_course(
    swimmer_id: int, discipline_id: int, course: int, db: Session = Depends(get_db)
):
    """
    Get personal best for a specific swimmer, discipline, and course.
    """
    swimmer = db.query(Swimmer).filter(Swimmer.id == swimmer_id).first()
    if not swimmer:
        raise HTTPException(status_code=404, detail="Swimmer not found")

    discipline = db.query(Discipline).filter(Discipline.id == discipline_id).first()
    if not discipline:
        raise HTTPException(status_code=404, detail="Discipline not found")

    if course not in [25, 50]:
        raise HTTPException(status_code=400, detail="Invalid course. Must be 25 or 50.")

    personal_best = (
        db.query(PersonalBest)
        .join(Swimmer)
        .join(Discipline)
        .join(Course)
        .filter(
            PersonalBest.swimmer_id == swimmer_id,
            PersonalBest.discipline_id == discipline_id,
            Course.length == course,
        )
        .first()
    )
    if not personal_best:
        raise HTTPException(status_code=404, detail="Personal best not found")

    return personal_best
