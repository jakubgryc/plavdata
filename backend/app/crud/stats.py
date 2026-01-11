from datetime import date
from enum import Enum

from sqlalchemy import and_, desc, extract, func
from sqlalchemy.orm import Session

from app.constants import EXCLUDED_COMPETITION_LOCATIONS
from app.models import (
    AgeCategory,
    ClubRecord,
    Discipline,
    PersonalBest,
    Result,
    Swimmer,
)


class PeriodType(str, Enum):
    YEAR = "year"
    SEASON = "season"


def get_date_filter(period_value: int, period_type: PeriodType = PeriodType.YEAR):
    """
    Build a date filter for SQLAlchemy queries.

    Args:
        period_value: Year (e.g., 2025) or season start year (e.g., 2025 for 2025/2026 season)
        period_type: Either "year" or "season"

    Returns:
        SQLAlchemy filter condition for Result.date
    """
    if period_type == PeriodType.YEAR:
        return extract("year", Result.date) == period_value
    else:  # SEASON
        # Season runs from September 1st of period_value to August 31st of period_value+1
        season_start = date(period_value, 9, 1)
        season_end = date(period_value + 1, 8, 31)
        return and_(Result.date >= season_start, Result.date <= season_end)


def get_results_count(
    db: Session, period_value: int, period_type: PeriodType = PeriodType.YEAR
) -> int:
    """Count total number of results (starts) in a given period."""
    return (
        db.query(func.count(Result.id))
        .filter(get_date_filter(period_value, period_type))
        .filter(Result.split_time == 0)
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )


def get_meets_count(
    db: Session, period_value: int, period_type: PeriodType = PeriodType.YEAR
) -> int:
    """
    Count unique meets in a given period.
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
        .filter(get_date_filter(period_value, period_type))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )


def get_club_records_count(
    db: Session, period_value: int, period_type: PeriodType = PeriodType.YEAR
) -> int:
    """Count club records set/broken in a given period."""
    if period_type == PeriodType.YEAR and period_value != date.today().year:
        return 0

    # For seasons or current year, count records with date in the period
    return (
        db.query(func.count(ClubRecord.id))
        .join(Result, ClubRecord.result_id == Result.id)
        .filter(get_date_filter(period_value, period_type))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )


def get_personal_bests_count(
    db: Session, period_value: int, period_type: PeriodType = PeriodType.YEAR
) -> int:
    """Count personal bests achieved in a given period."""
    return (
        db.query(func.count(Result.id))
        .filter(get_date_filter(period_value, period_type))
        .filter(Result.improvement)
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
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


def get_club_records(db: Session, limit: int = 5, oldest: bool = False) -> list:
    """
    Get club records, grouped by result_id.
    Each result can have multiple age categories, which are combined.
    Returns `limit` distinct results (swims), not `limit` club_record rows.

    Args:
        db: Database session
        limit: Number of records to return
        oldest: If True, returns oldest records; if False, returns most recent
    """
    # Get distinct result_ids ordered by date
    order = func.max(Result.date).asc() if oldest else desc(func.max(Result.date))

    result_ids_subquery = (
        db.query(ClubRecord.result_id)
        .join(Result, ClubRecord.result_id == Result.id)
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .group_by(ClubRecord.result_id)
        .order_by(order)
        .limit(limit)
        .subquery()
    )

    # Get all club records for those result_ids with full details
    date_order = Result.date.asc() if oldest else desc(Result.date)
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
        .filter(Result.id.in_(db.query(result_ids_subquery.c.result_id)))
        .order_by(date_order, Result.id, AgeCategory.max_age)
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

    return list(grouped.values())


def get_dashboard_stats(db: Session, period_type: PeriodType = PeriodType.YEAR) -> dict:
    """
    Get all dashboard statistics for current and previous period.

    Args:
        db: Database session
        period_type: Either "year" or "season" to determine the period type
    """
    if period_type == PeriodType.YEAR:
        current_period = date.today().year
        previous_period = current_period - 1
        current_label = str(current_period)
        previous_label = str(previous_period)
    else:  # SEASON
        # Determine current season based on current date
        today = date.today()
        if today.month >= 9:  # September or later
            current_period = today.year
        else:  # Before September
            current_period = today.year - 1
        previous_period = current_period - 1
        current_label = f"{current_period}/{current_period + 1}"
        previous_label = f"{previous_period}/{previous_period + 1}"

    return {
        "periodType": period_type.value,
        "currentPeriod": current_label,
        "previousPeriod": previous_label,
        "stats": {
            "totalStarts": {
                "current": get_results_count(db, current_period, period_type),
                "previous": get_results_count(db, previous_period, period_type),
            },
            "totalMeets": {
                "current": get_meets_count(db, current_period, period_type),
                "previous": get_meets_count(db, previous_period, period_type),
            },
            "clubRecords": {
                "current": get_club_records_count(db, current_period, period_type),
            },
            "personalBests": {
                "current": get_personal_bests_count(db, current_period, period_type),
                "previous": get_personal_bests_count(db, previous_period, period_type),
            },
        },
        "topMen": get_top_swimmers_by_points(db, "male", limit=5),
        "topWomen": get_top_swimmers_by_points(db, "female", limit=5),
        "recentRecords": get_club_records(db, limit=10, oldest=False),
        "oldestRecords": get_club_records(db, limit=10, oldest=True),
    }
