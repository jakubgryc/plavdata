from collections import defaultdict
from typing import List, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends
from sqlalchemy import func, cast, select, Integer
from sqlalchemy.orm import Session, contains_eager

from app.models import Swimmer, Discipline, Course, Result
from app.db import get_db
from app.api.schemas import (
    SwimmerResultOut,
    ResultOut,
    SwimmerOut,
    DisciplineOut,
    CourseOut,
)

results_router = APIRouter(
    prefix="/results",
    tags=["results"],
)


class ComparisonRequest(BaseModel):
    swimmer_ids: List[int]
    discipline_code: str
    course: Optional[int] = 25


@results_router.post(
    "/compare", summary="Get results for given swimmers grouped by swimmer"
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


def get_best_times_for_age(
    db: Session,
    discipline_code: str,
    course_length: int,
    sex: str,
    max_age: int,
    limit: int = 10,
    unique_swimmers: bool = False,
):
    age_at_result = cast(func.strftime("%Y", Result.date), Integer) - Swimmer.birth_year

    # set DNF THRESHOLD as 1 hour in milliseconds
    DNF_THRESHOLD = 3600000
    # Subquery with row_number to rank results per swimmer
    ranked_subquery = (
        select(
            Swimmer.id.label("swimmer_id"),
            Swimmer.name,
            Swimmer.surname,
            Swimmer.birth_year,
            Discipline.code.label("discipline"),
            Result.time,
            Result.competition_location,
            Result.date,
            age_at_result.label("age_at_result"),
            func.row_number()
            .over(partition_by=Swimmer.id, order_by=[Result.time, age_at_result])
            .label("swimmer_rank")
            if unique_swimmers
            else None,
        )
        .select_from(Result)
        .join(Swimmer, Result.swimmer_id == Swimmer.id)
        .join(Discipline, Result.discipline_id == Discipline.id)
        .join(Course, Result.course_id == Course.id)
        .where(
            Discipline.code == discipline_code,
            Course.length == course_length,
            Swimmer.sex == sex,
            age_at_result <= max_age,
            Result.time < DNF_THRESHOLD,
        )
    ).subquery()

    # Main query
    query = select(ranked_subquery)

    if unique_swimmers:
        query = query.where(ranked_subquery.c.swimmer_rank == 1)

    query = query.order_by(
        ranked_subquery.c.time, ranked_subquery.c.age_at_result
    ).limit(limit)

    return db.execute(query).all()


@results_router.get(
    "/best-times",
    summary="Get best times for given discipline",
)
async def best_times(
    discipline_code: str = "100 Z",
    course_length: int = 25,
    sex: str = "male",
    max_age: int = 25,
    limit: int = 2,
    unique_swimmers: bool = True,
    db: Session = Depends(get_db),
):
    """
    Returns best times for given discipline, course, sex, and max age.
    """
    results = get_best_times_for_age(
        db, discipline_code, course_length, sex, max_age, limit, unique_swimmers
    )
    best_times_out = []

    for row in results:
        best_time = {
            "swimmer": {
                "id": row.swimmer_id,
                "name": row.name,
                "surname": row.surname,
                "birth_year": row.birth_year,
            },
            "discipline": row.discipline,
            "time": row.time,
            "competition_location": row.competition_location,
            "date": row.date,
            "age_at_result": row.age_at_result,
        }
        best_times_out.append(best_time)
    return best_times_out
