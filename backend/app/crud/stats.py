from sqlalchemy import func, extract, desc
from sqlalchemy.orm import Session
from datetime import date

from app.models import (
    Result,
    ClubRecord,
    PersonalBest,
    Swimmer,
    Discipline,
    AgeCategory,
)


def get_results_count_by_year(db: Session, year: int) -> int:
    """Count total number of results (starts) in a given year."""
    return (
        db.query(func.count(Result.id))
        .filter(extract("year", Result.date) == year)
        .filter(Result.split_time == 0)
        .scalar()
        or 0
    )


def get_meets_count_by_year(db: Session, year: int) -> int:
    """
    Count unique meets in a given year.
    A meet is defined by unique location + week combination.
    """
    return (
        db.query(
            func.count(
                func.distinct(
                    Result.competition_location
                    + "-"
                    + func.strftime("%Y-%W", Result.date)
                )
            )
        )
        .filter(extract("year", Result.date) == year)
        .scalar()
        or 0
    )


def get_club_records_count_by_year(db: Session, year: int) -> int:
    """Count club records set/broken in a given year."""
    if year == date.today().year:
        # For the current year, count records with date in the current year
        return (
            db.query(func.count(ClubRecord.id))
            .join(Result, ClubRecord.result_id == Result.id)
            .filter(extract("year", Result.date) == year)
            .scalar()
            or 0
        )

    return 0


def get_personal_bests_count_by_year(db: Session, year: int) -> int:
    """Count personal bests achieved in a given year."""
    return (
        db.query(func.count(PersonalBest.id))
        .filter(extract("year", PersonalBest.date) == year)
        .scalar()
        or 0
    )


def get_top_swimmers_by_points(db: Session, sex: str, limit: int = 5) -> list:
    """
    Get top swimmers by their best FINA points.
    Returns distinct swimmers only (their single best result by points).
    """
    # Subquery to get max points per swimmer
    max_points_subquery = (
        db.query(
            PersonalBest.swimmer_id,
            func.max(PersonalBest.points).label("max_points"),
        )
        .join(Swimmer, PersonalBest.swimmer_id == Swimmer.id)
        .filter(Swimmer.sex == sex)
        .filter(PersonalBest.points.isnot(None))
        .group_by(PersonalBest.swimmer_id)
        .subquery()
    )

    # Main query to get swimmer details with their best result
    results = (
        db.query(
            Swimmer.name,
            Swimmer.surname,
            Swimmer.id.label("swimmer_id"),
            Discipline.title.label("discipline"),
            PersonalBest.points,
        )
        .join(PersonalBest, PersonalBest.swimmer_id == Swimmer.id)
        .join(Discipline, PersonalBest.discipline_id == Discipline.id)
        .join(
            max_points_subquery,
            (PersonalBest.swimmer_id == max_points_subquery.c.swimmer_id)
            & (PersonalBest.points == max_points_subquery.c.max_points),
        )
        .filter(Swimmer.sex == sex)
        .order_by(desc(PersonalBest.points))
        .limit(limit)
        .all()
    )

    return [
        {
            "rank": idx + 1,
            "swimmerId": row.swimmer_id,
            "name": row.name,
            "surname": row.surname,
            "discipline": row.discipline,
            "points": row.points,
        }
        for idx, row in enumerate(results)
    ]


def get_recent_club_records(db: Session, limit: int = 5) -> list:
    """
    Get the most recent club records, grouped by result_id.
    Each result can have multiple age categories, which are combined.
    Returns `limit` distinct results (swims), not `limit` club_record rows.
    """
    # First, get the most recent distinct result_ids that have club records
    recent_result_ids_subquery = (
        db.query(ClubRecord.result_id)
        .join(Result, ClubRecord.result_id == Result.id)
        .group_by(ClubRecord.result_id)
        .order_by(desc(func.max(Result.date)))
        .limit(limit)
        .subquery()
    )

    # Get all club records for those result_ids with full details
    records = (
        db.query(
            Result.id.label("result_id"),
            Swimmer.name,
            Swimmer.surname,
            Discipline.title.label("discipline"),
            Result.time,
            Result.date,
            AgeCategory.code.label("age_category"),
        )
        .join(ClubRecord, ClubRecord.result_id == Result.id)
        .join(Swimmer, Result.swimmer_id == Swimmer.id)
        .join(Discipline, Result.discipline_id == Discipline.id)
        .join(AgeCategory, ClubRecord.age_category_id == AgeCategory.id)
        .filter(Result.id.in_(db.query(recent_result_ids_subquery.c.result_id)))
        .order_by(desc(Result.date), Result.id, AgeCategory.max_age)
        .all()
    )

    # Group by result_id to combine age categories
    grouped = {}
    for row in records:
        if row.result_id not in grouped:
            grouped[row.result_id] = {
                "name": row.name,
                "surname": row.surname,
                "discipline": row.discipline,
                "time": row.time,
                "date": row.date.isoformat() if row.date else None,
                "ageCategories": [],
            }
        grouped[row.result_id]["ageCategories"].append(row.age_category)

    # Sort by date descending and return as list
    result_list = sorted(
        grouped.values(),
        key=lambda x: x["date"] or "",
        reverse=True,
    )

    return result_list


def get_dashboard_stats(db: Session) -> dict:
    """Get all dashboard statistics for current and previous year."""
    current_year = date.today().year
    previous_year = current_year - 1

    return {
        "currentYear": current_year,
        "previousYear": previous_year,
        "stats": {
            "totalStarts": {
                "current": get_results_count_by_year(db, current_year),
                "previous": get_results_count_by_year(db, previous_year),
            },
            "totalMeets": {
                "current": get_meets_count_by_year(db, current_year),
                "previous": get_meets_count_by_year(db, previous_year),
            },
            "clubRecords": {
                "current": get_club_records_count_by_year(db, current_year),
                # "previous": get_club_records_count_by_year(db, previous_year),
            },
            "personalBests": {
                "current": get_personal_bests_count_by_year(db, current_year),
                "previous": get_personal_bests_count_by_year(db, previous_year),
            },
        },
        "topMen": get_top_swimmers_by_points(db, "male", 5),
        "topWomen": get_top_swimmers_by_points(db, "female", 5),
        "recentRecords": get_recent_club_records(db, 5),
    }
