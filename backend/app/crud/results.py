from sqlalchemy import func, cast, desc, Integer, case
from sqlalchemy.orm import Session

from app.models import Swimmer, Discipline, Course, Result, ClubRecord, AgeCategory
from app.constants import DNF_THRESHOLD, EXCLUDED_COMPETITION_LOCATIONS


def get_record_progression(
    db: Session,
    discipline_code: str,
    course_length: int,
    sex: str,
    age_category_code: str,
):
    """
    Compute the historical progression of a club record.

    Returns None if the age category does not exist, otherwise a
    chronological list of steps — every result that was strictly faster
    than all eligible results before it (equal times do NOT take over the
    record, the earlier swim keeps it).

    The progression is computed on the fly from the results table, so it
    always reflects the current data and current record rules. Within one
    date, results are ordered by id (insertion order) — ČSPS provides no
    finer chronological signal.
    """
    category = (
        db.query(AgeCategory).filter(AgeCategory.code == age_category_code).first()
    )
    if category is None:
        return None

    # Frontend/display codes use VZ for freestyle, the DB stores K
    db_discipline_code = discipline_code.replace(" VZ", " K")

    rows = (
        db.query(Result, Swimmer)
        .join(Result.swimmer)
        .join(Result.discipline)
        .join(Result.course)
        .filter(
            Discipline.code == db_discipline_code,
            Course.length == course_length,
            Swimmer.sex == sex,
            Result.age_at_result <= category.max_age,
            Result.time < DNF_THRESHOLD,
            Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS),
        )
        .order_by(Result.date, Result.id)
        .all()
    )

    steps = []
    best_time = None
    for result, swimmer in rows:
        if best_time is None or result.time < best_time:
            steps.append(
                {
                    "result": result,
                    "swimmer": swimmer,
                    "previous_best": best_time,
                }
            )
            best_time = result.time

    return steps


def get_record_holders(db: Session, course_length: int):
    """
    Rank swimmers by the number of club records they currently hold on
    the given course length, most records first.

    One record = one (discipline, age category) combination, so a single
    swim standing as the record in several categories counts several
    times — consistent with how records are counted elsewhere.
    """
    record_count = func.count(ClubRecord.id).label("record_count")

    return (
        db.query(
            Swimmer.id.label("swimmer_id"),
            Swimmer.name,
            Swimmer.surname,
            Swimmer.sex,
            record_count,
        )
        .select_from(ClubRecord)
        .join(ClubRecord.result)
        .join(Result.swimmer)
        .join(Result.course)
        .filter(Course.length == course_length)
        .group_by(Swimmer.id, Swimmer.name, Swimmer.surname, Swimmer.sex)
        .order_by(desc(record_count), Swimmer.surname)
        .all()
    )


def get_club_records(db: Session, course_length: int):
    """
    Get all club records for a given course length.
    Returns club records grouped by discipline and age category.
    """
    age_at_result = (
        cast(func.extract("year", Result.date), Integer) - Swimmer.birth_year
    )

    # Replace "K" with "VZ" in discipline code
    discipline_code = case(
        (Discipline.code.like("% K"), func.replace(Discipline.code, " K", " VZ")),
        else_=Discipline.code,
    )

    query = (
        db.query(
            discipline_code.label("discipline_code"),
            AgeCategory.code.label("age_category"),
            Swimmer.id.label("swimmer_id"),
            Swimmer.name,
            Swimmer.surname,
            Swimmer.birth_year,
            Swimmer.sex,
            Result.time,
            Result.split_time,
            Result.relay_part,
            Result.competition_location,
            Result.date,
            age_at_result.label("age_at_result"),
        )
        .select_from(ClubRecord)
        .join(Result, ClubRecord.result_id == Result.id)
        .join(AgeCategory, ClubRecord.age_category_id == AgeCategory.id)
        .join(Swimmer, Result.swimmer_id == Swimmer.id)
        .join(Discipline, Result.discipline_id == Discipline.id)
        .join(Course, Result.course_id == Course.id)
        .filter(Course.length == course_length)
        .all()
    )

    return query
