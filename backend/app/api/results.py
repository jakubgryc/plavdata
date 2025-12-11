from datetime import datetime
from collections import defaultdict
from typing import List, Optional
from pydantic import BaseModel
from pydantic.alias_generators import to_camel

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, contains_eager

from app.models import Swimmer, Discipline, Course, Result
from app.crud.results import get_best_times_for_age, get_club_records
from app.db import get_db
from app.api.schemas import (
    SwimmerResultOut,
    ResultOut,
    SwimmerOut,
    DisciplineOut,
    CourseOut,
    BestTimeResultOut,
)

results_router = APIRouter(
    prefix="/results",
    tags=["results"],
)


class ComparisonRequest(BaseModel):
    swimmer_ids: List[int]
    discipline_code: str
    course: Optional[int] = 25


class BestTimesRequest(BaseModel):
    discipline_code: str
    course_length: Optional[int] = 25
    sex: str
    max_age: int
    limit: int = 10
    unique_swimmers: bool = False
    only_current_age: bool = False

    class Config:
        alias_generator = to_camel
        validate_by_name = True


class ClubRecordOut(BaseModel):
    discipline_code: str
    age_category: str
    swimmer_id: int
    name: str
    surname: str
    birth_year: int
    sex: str
    time: int
    age_at_result: int
    split_time: Optional[bool] = None
    relay_part: Optional[bool] = None
    competition_location: Optional[str] = None
    date: datetime

    class Config:
        alias_generator = to_camel
        populate_by_name = True


@results_router.post(
    "/compare",
    summary="Get results for given swimmers grouped by swimmer",
    response_model=List[SwimmerResultOut],
)
async def get_results(
    request: ComparisonRequest,
    db: Session = Depends(get_db),
):
    """
    Returns a list of objects, one per swimmer_id:
    [
      { "swimmer": {..}, "results": [ {...}, ... ] },
      ...
    ]
    """

    swimmer_ids = request.swimmer_ids
    discipline_code = request.discipline_code
    course = request.course

    query = (
        db.query(Result)
        .join(Result.swimmer)
        .join(Result.discipline)
        .join(Result.course)
        .filter(Swimmer.id.in_(swimmer_ids))
        .filter(Discipline.code == discipline_code)
        .filter(Course.length == course)
        .options(
            contains_eager(Result.swimmer),
            contains_eager(Result.discipline),
            contains_eager(Result.course),
        )
        .order_by(Swimmer.surname.asc(), Result.date.asc())
        .all()
    )

    # Group results by swimmer while preserving order of appearance from the query
    grouped = defaultdict(list)
    for r in query:
        sid = r.swimmer.id
        if sid not in grouped:
            grouped[sid] = {"swimmer": r.swimmer, "results": []}
        grouped[sid]["results"].append(r)

    swimmer_results: List[SwimmerResultOut] = []
    for sid, data in grouped.items():
        swimmer_model = data["swimmer"]

        swimmer_out = SwimmerOut.with_age(swimmer_model)

        results_out: List[ResultOut] = []
        for r in data["results"]:
            # Rename freestyle discipline to VZ
            discipline_out = DisciplineOut.rename_freestyle(r.discipline)

            course_out = CourseOut(type=r.course.type, length=r.course.length)

            date_dt = r.date

            comparison = r.comparison_to_best

            result_out = ResultOut(
                discipline=discipline_out,
                course=course_out,
                time=r.time,
                comparison_to_best=comparison,
                split_time=r.split_time,
                relay_part=r.relay_part,
                improvement=r.improvement,
                competition_location=r.competition_location,
                date=date_dt,
            )
            results_out.append(result_out)

        swimmer_results.append(
            SwimmerResultOut(swimmer=swimmer_out, results=results_out)
        )
    return swimmer_results


@results_router.post(
    "/best-times",
    summary="Get best times for given discipline",
    response_model=List[BestTimeResultOut],
)
async def best_times(
    request: BestTimesRequest,
    db: Session = Depends(get_db),
):
    """
    Returns best times for given discipline, course, sex, and max age.
    """
    discipline_code = request.discipline_code
    course_length = request.course_length
    sex = request.sex
    max_age = request.max_age
    limit = request.limit
    unique_swimmers = request.unique_swimmers
    only_current_age = request.only_current_age
    results = get_best_times_for_age(
        db,
        discipline_code,
        course_length,
        sex,
        max_age,
        limit,
        unique_swimmers,
        only_current_age,
    )

    best_times_out = [
        BestTimeResultOut(
            swimmer_id=r.swimmer_id,
            name=r.name,
            surname=r.surname,
            birth_year=r.birth_year,
            time=r.time,
            age_at_result=r.age_at_result,
            split_time=r.split_time,
            relay_part=r.relay_part,
            competition_location=r.competition_location,
            date=r.date,
        )
        for r in results
    ]

    return best_times_out


@results_router.get(
    "/club-records",
    summary="Get all club records for a given course",
    response_model=List[ClubRecordOut],
)
async def get_all_club_records(
    course: int = 25,
    db: Session = Depends(get_db),
):
    """
    Returns all club records for the given course length.
    """
    records = get_club_records(db, course)

    club_records_out = [
        ClubRecordOut(
            discipline_code=r.discipline_code,
            age_category=r.age_category,
            swimmer_id=r.swimmer_id,
            name=r.name,
            surname=r.surname,
            birth_year=r.birth_year,
            sex=r.sex,
            time=r.time,
            age_at_result=r.age_at_result,
            split_time=r.split_time,
            relay_part=r.relay_part,
            competition_location=r.competition_location,
            date=r.date,
        )
        for r in records
    ]

    return club_records_out
