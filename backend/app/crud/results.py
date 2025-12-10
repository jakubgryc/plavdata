from sqlalchemy import func, cast, select, Integer
from sqlalchemy.orm import Session

from app.models import Swimmer, Discipline, Course, Result
from app.constants import DNF_THRESHOLD


def get_best_times_for_age(
    db: Session,
    discipline_code: str,
    course_length: int,
    sex: str,
    max_age: int,
    limit: int,
    unique_swimmers: bool = False,
    only_current_age: bool = False,
):
    age_at_result = cast(func.strftime("%Y", Result.date), Integer) - Swimmer.birth_year
    if only_current_age and max_age > 18:
        only_current_age = False

    # Subquery with row_number to rank results per swimmer
    ranked_subquery = (
        select(
            Swimmer.id.label("swimmer_id"),
            Swimmer.name,
            Swimmer.surname,
            Swimmer.birth_year,
            Discipline.code.label("discipline"),
            Result.id,
            Result.time,
            Result.split_time,
            Result.relay_part,
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
            age_at_result <= max_age
            if not only_current_age
            else age_at_result == max_age,
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
