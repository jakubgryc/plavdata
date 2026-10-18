from datetime import date
from collections import defaultdict

from sqlalchemy import extract, func, select, case, Integer
from sqlalchemy.orm import Session

from app.constants import DNF_THRESHOLD, EXCLUDED_COMPETITION_LOCATIONS
from app.api.schemas import PersonalBestDetail
from app.models import (
    AgeCategory,
    ClubRecord,
    Competition,
    Course,
    Discipline,
    PersonalBest,
    Result,
    Swimmer,
)
from app.crud.common import build_result_entry, fetch_club_record_ids


def get_swimmer_basic_info(db: Session, swimmer_id: int) -> dict | None:
    """Get basic swimmer information."""
    swimmer = db.query(Swimmer).filter(Swimmer.id == swimmer_id).first()
    if not swimmer:
        return None

    return {
        "id": swimmer.id,
        "cspsId": swimmer.csps_id,
        "name": swimmer.name,
        "surname": swimmer.surname,
        "birthYear": swimmer.birth_year,
        "group": swimmer.group_display_name,
        "sex": swimmer.sex,
    }


def get_swimmer_stats(db: Session, swimmer_id: int) -> dict:
    """Get swimmer statistics (starts, competitions, PBs, club records)."""
    current_year = date.today().year

    total_starts = (
        db.query(func.count(Result.id))
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.split_time.is_(False))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )

    year_starts = (
        db.query(func.count(Result.id))
        .filter(Result.swimmer_id == swimmer_id)
        .filter(extract("year", Result.date) == current_year)
        .filter(Result.split_time.is_(False))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )

    total_competitions = (
        db.query(func.count(func.distinct(Result.competition_id)))
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.competition_id.isnot(None))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )

    year_competitions = (
        db.query(func.count(func.distinct(Result.competition_id)))
        .filter(Result.swimmer_id == swimmer_id)
        .filter(extract("year", Result.date) == current_year)
        .filter(Result.competition_id.isnot(None))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )

    year_pbs = (
        db.query(func.count(Result.id))
        .filter(Result.swimmer_id == swimmer_id)
        .filter(extract("year", Result.date) == current_year)
        .filter(Result.improvement.is_(True))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )

    club_records_count = (
        db.query(func.count(ClubRecord.id))
        .join(Result, ClubRecord.result_id == Result.id)
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )

    return {
        "totalStarts": total_starts,
        "yearStarts": year_starts,
        "totalCompetitions": total_competitions,
        "yearCompetitions": year_competitions,
        "yearPersonalBests": year_pbs,
        "clubRecords": club_records_count,
    }


def get_swimmer_top_results(db: Session, swimmer_id: int, limit: int = 3) -> list:
    """Get swimmer's top results by FINA points (unique disciplines only)."""

    ranked_subquery = (
        select(
            Discipline.title.label("discipline"),
            Result.time,
            Result.points,
            Result.date,
            func.row_number()
            .over(partition_by=Discipline.id, order_by=Result.points.desc())
            .label("rank"),
        )
        .join(Discipline, Result.discipline_id == Discipline.id)
        .where(
            Result.swimmer_id == swimmer_id,
            Result.points.isnot(None),
            Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS),
        )
    ).subquery()

    query = (
        select(ranked_subquery)
        .where(ranked_subquery.c.rank == 1)
        .order_by(ranked_subquery.c.points.desc())
        .limit(limit)
    )

    rows = db.execute(query).all()

    top_results = [
        {
            "discipline": row.discipline,
            "time": row.time,
            "points": row.points,
            "date": row.date.isoformat() if row.date else None,
        }
        for row in rows
    ]

    return top_results


def get_swimmer_starts_by_year(db: Session, swimmer_id: int) -> list:
    """Get number of starts per year for the swimmer."""
    results = (
        db.query(
            extract("year", Result.date).label("year"),
            func.count(Result.id).label("starts"),
        )
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.split_time.is_(False))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .group_by(extract("year", Result.date))
        .order_by(extract("year", Result.date))
        .all()
    )

    return [{"year": int(row.year), "starts": row.starts} for row in results]


def get_swimmer_competitions(db: Session, swimmer_id: int) -> list:
    """Get detailed information about competitions the swimmer attended with individual results."""
    results_data = (
        db.query(
            Competition.title.label("comp_name"),
            Competition.start_date,
            Competition.location,
            Competition.pool_length,
            Discipline.title.label("discipline"),
            Discipline.code.label("discipline_code"),
            Result.id.label("result_id"),
            Result.time,
            Result.improvement,
            Result.comparison_to_best,
            Result.relay_part,
            Result.points,
            Result.competition_id,
        )
        .join(Competition, Result.competition_id == Competition.id)
        .join(Discipline, Result.discipline_id == Discipline.id)
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.split_time.is_(False))
        .filter(Result.competition_id.isnot(None))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .order_by(Competition.start_date.desc())
        .all()
    )

    club_record_ids = fetch_club_record_ids(db, [row.result_id for row in results_data])

    # Group results by competition
    competitions_dict = {}
    for row in results_data:
        comp_id = row.competition_id
        if comp_id not in competitions_dict:
            competitions_dict[comp_id] = {
                "competitionId": comp_id,
                "name": row.comp_name,
                "date": row.start_date.isoformat() if row.start_date else None,
                "location": row.location,
                "poolLength": row.pool_length,
                "results": [],
            }

        competitions_dict[comp_id]["results"].append(
            build_result_entry(row, club_record_ids)
        )

    result = list(competitions_dict.values())

    return result


def get_swimmer_personal_bests(db: Session, swimmer_id: int) -> dict:
    """Get swimmer's personal bests grouped by course length (25m and 50m)."""

    def get_pbs_for_course(course_id: int):
        return (
            db.query(
                Discipline.title.label("discipline"),
                Discipline.code.label("code"),
                PersonalBest.time,
                PersonalBest.points,
                PersonalBest.date,
                PersonalBest.competition_location,
                PersonalBest.split_time,
                PersonalBest.relay_part,
            )
            .join(Discipline, PersonalBest.discipline_id == Discipline.id)
            .filter(PersonalBest.swimmer_id == swimmer_id)
            .filter(PersonalBest.course_id == course_id)
            .all()
        )

    pbs_25m = get_pbs_for_course(1)  # 25m course
    pbs_50m = get_pbs_for_course(2)  # 50m course

    def format_pbs(pbs):
        return [
            PersonalBestDetail(
                discipline=row.discipline,
                code=row.code,
                time=row.time,
                split_time=row.split_time,
                relay_part=row.relay_part,
                points=row.points,
                date=row.date.isoformat() if row.date else None,
                location=row.competition_location,
            )
            for row in pbs
        ]

    return {"pb25m": format_pbs(pbs_25m), "pb50m": format_pbs(pbs_50m)}


def get_swimmer_starts_by_stroke(db: Session, swimmer_id: int) -> dict:
    """Get total number of starts by stroke type for a swimmer."""
    results = (
        db.query(Discipline.code, func.count(Result.id).label("starts"))
        .join(Discipline, Result.discipline_id == Discipline.id)
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.split_time.is_(False))
        .filter(Result.relay_part.is_(False))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .group_by(Discipline.code)
        .all()
    )

    stroke_counts = defaultdict(int)

    for row in results:
        code = row.code.upper().split()[1]
        stroke_counts[code] += row.starts

    # Ensure all stroke types are present in the result
    return {
        "Z": stroke_counts.get("Z", 0),
        "P": stroke_counts.get("P", 0),
        "M": stroke_counts.get("M", 0),
        "K": stroke_counts.get("K", 0),
        "O": stroke_counts.get("O", 0),
    }


def get_swimmer_quarterly_improvements(db: Session, swimmer_id: int) -> list:
    """Get quarterly improvement statistics for a swimmer."""

    quarter_expr = func.extract("quarter", Result.date)
    year_expr = func.extract("year", Result.date)

    results = (
        db.query(
            year_expr.label("year"),
            func.cast(quarter_expr, Integer).label("quarter"),
            func.count(Result.id).label("total_starts"),
            func.sum(case((Result.improvement.is_(True), 1), else_=0)).label(
                "improvements"
            ),
        )
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.split_time.is_(False))
        .filter(Result.relay_part.is_(False))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .group_by(year_expr, quarter_expr)
        .order_by(year_expr, quarter_expr)
        .all()
    )

    quarterly_data = []
    for row in results:
        improvements = row.improvements or 0
        total_starts = row.total_starts or 0
        improvement_rate = (
            round((improvements / total_starts * 100), 2) if total_starts > 0 else 0.0
        )

        quarterly_data.append(
            {
                "quarter": f"Q{int(row.quarter)} {int(row.year)}",
                "year": int(row.year),
                "quarterNum": int(row.quarter),
                "totalStarts": total_starts,
                "improvements": improvements,
                "improvementRate": improvement_rate,
            }
        )

    return quarterly_data


def get_swimmer_club_records(db: Session, swimmer_id: int) -> list:
    """
    Get all club records currently held by the swimmer, grouped per result:
    one swim standing as the record in several age categories is a single
    entry carrying all its categories (same shape as the home page's
    recent club records).
    """
    rows = (
        db.query(
            Result.id.label("result_id"),
            Course.length.label("course_length"),
            Discipline.code.label("discipline_code"),
            AgeCategory.code.label("age_category"),
            Result.time,
            Result.date,
            Result.competition_location,
            Result.split_time,
            Result.relay_part,
        )
        .select_from(ClubRecord)
        .join(ClubRecord.result)
        .join(ClubRecord.age_category)
        .join(Result.discipline)
        .join(Result.course)
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .order_by(AgeCategory.max_age)
        .all()
    )

    grouped = {}
    for row in rows:
        entry = grouped.get(row.result_id)
        if entry is None:
            entry = {
                "resultId": row.result_id,
                "courseLength": row.course_length,
                # display codes use VZ for freestyle, the DB stores K
                "disciplineCode": row.discipline_code.replace(" K", " VZ"),
                "ageCategories": [],
                "time": row.time,
                "date": row.date,
                "competitionLocation": row.competition_location,
                "splitTime": row.split_time,
                "relayPart": row.relay_part,
            }
            grouped[row.result_id] = entry
        # ordered by max_age, so categories end up youngest -> oldest
        entry["ageCategories"].append(row.age_category)

    return list(grouped.values())


def get_swimmer_record_chances(db: Session, swimmer_id: int) -> list | None:
    """
    For every club record, compare the swimmer's personal best (same
    discipline + course) with the record time and report the gap.

    - `pbTime`: the swimmer's best time that is ELIGIBLE for that record's
      age category — i.e. swum at age <= the category's max_age. For the
      12letí category of a 14-year-old this is their best time from when
      they were 12 or younger, not their current overall PB. For beatable
      categories it naturally equals the current PB (all their times are
      within the age limit).
    - `beatable`: whether the swimmer can still set a record in that age
      category (their current age must be <= the category's max_age —
      a 12-year-old can no longer break the 11-and-under records).
    - `holdsRecord`: whether the swimmer is the current holder.
    - `gap`: pbTime - record time in ms (positive = still missing this
      much; a record is only broken by a strictly faster time).
    - Entries where the swimmer has no eligible time carry pbTime/gap =
      None; the frontend skips them.

    Returns None if the swimmer does not exist.
    """
    swimmer = db.query(Swimmer).filter(Swimmer.id == swimmer_id).first()
    if not swimmer:
        return None

    current_year = date.today().year
    swimmer_age = (
        current_year - swimmer.birth_year if swimmer.birth_year else None
    )

    record_rows = (
        db.query(
            Course.length.label("course_length"),
            Discipline.id.label("discipline_id"),
            Discipline.code.label("discipline_code"),
            AgeCategory.code.label("age_category"),
            AgeCategory.max_age.label("max_age"),
            Result.time.label("record_time"),
            Result.swimmer_id.label("holder_id"),
            Swimmer.name.label("holder_name"),
            Swimmer.surname.label("holder_surname"),
        )
        .select_from(ClubRecord)
        .join(ClubRecord.result)
        .join(ClubRecord.age_category)
        .join(Result.discipline)
        .join(Result.course)
        .join(Result.swimmer)
        # only records of the swimmer's own sex are relevant targets
        .filter(Swimmer.sex == swimmer.sex)
        .all()
    )

    # Swimmer's times per (discipline, course) with the age at each result —
    # a category record can only be attacked with a time swum at an age
    # within that category's limit (same filters as record eligibility)
    result_rows = (
        db.query(
            Result.discipline_id.label("discipline_id"),
            Course.length.label("course_length"),
            Result.time.label("time"),
            Result.age_at_result.label("age_at_result"),
        )
        .join(Result.course)
        .filter(
            Result.swimmer_id == swimmer_id,
            Result.time < DNF_THRESHOLD,
            Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS),
            Result.age_at_result.isnot(None),
        )
        .all()
    )

    times_by_key: dict = {}
    for row in result_rows:
        times_by_key.setdefault((row.discipline_id, row.course_length), []).append(
            (row.age_at_result, row.time)
        )

    chances = []
    for row in record_rows:
        candidates = times_by_key.get((row.discipline_id, row.course_length), [])
        eligible_times = [
            time for age, time in candidates if age <= row.max_age
        ]
        pb_time = min(eligible_times) if eligible_times else None
        beatable = swimmer_age is not None and row.max_age >= swimmer_age
        gap = pb_time - row.record_time if pb_time is not None else None
        chances.append(
            {
                "courseLength": row.course_length,
                "disciplineCode": row.discipline_code.replace(" K", " VZ"),
                "ageCategory": row.age_category,
                "maxAge": row.max_age,
                "recordTime": row.record_time,
                "holderId": row.holder_id,
                "holderName": row.holder_name,
                "holderSurname": row.holder_surname,
                "beatable": beatable,
                "holdsRecord": row.holder_id == swimmer_id,
                "pbTime": pb_time,
                "gap": gap,
            }
        )
    return chances
