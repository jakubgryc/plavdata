from datetime import date
from enum import Enum

from sqlalchemy import and_, desc, extract, func, not_, or_, select
from sqlalchemy.orm import Session

from app.constants import DNF_THRESHOLD, EXCLUDED_COMPETITION_LOCATIONS
from app.crud.update_club_records import (
    EXCLUDED_DISCIPLINE_COURSES,
    RECORD_DISCIPLINES,
)
from app.models import (
    AgeCategory,
    Course,
    Discipline,
    PersonalBest,
    Result,
    Swimmer,
)


class PeriodType(str, Enum):
    YEAR = "year"
    SEASON = "season"


def get_date_filter(
    period_value: int,
    period_type: PeriodType = PeriodType.YEAR,
    date_column=Result.date,
):
    """
    Build a date filter for SQLAlchemy queries.

    Args:
        period_value: Year (e.g., 2025) or season start year (e.g., 2025 for 2025/2026 season)
        period_type: Either "year" or "season"
        date_column: Column to filter on (defaults to Result.date, can be a subquery column)

    Returns:
        SQLAlchemy filter condition for the date column
    """
    if period_type == PeriodType.YEAR:
        return extract("year", date_column) == period_value
    else:  # SEASON
        # Season runs from September 1st of period_value to August 31st of period_value+1
        season_start = date(period_value, 9, 1)
        season_end = date(period_value + 1, 8, 31)
        return and_(date_column >= season_start, date_column <= season_end)


def get_results_count(
    db: Session, period_value: int, period_type: PeriodType = PeriodType.YEAR
) -> int:
    """Count total number of results (starts) in a given period."""
    return (
        db.query(func.count(Result.id))
        .filter(get_date_filter(period_value, period_type))
        .filter(Result.split_time.is_(False))
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
    date_week_format = func.to_char(Result.date, "YYYY-WW")

    return (
        db.query(
            func.count(
                func.distinct(
                    func.concat(Result.competition_location, "-", date_week_format)
                )
            )
        )
        .filter(get_date_filter(period_value, period_type))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )


def _fetch_record_steps(db: Session) -> list:
    """
    Single source query for all club-record dashboard stats: every
    progression step (record improvement) in club history, one row per
    (result, age category).

    A step is any result strictly faster than every eligible result before
    it, per (discipline, course, sex, age category) — the same rules as the
    record-progression view. `is_current` marks steps that are still the
    standing record for their combination.

    The step set is small (record improvements, not results), so it is
    fetched once and aggregated in Python — the expensive window query
    runs a single time per dashboard load instead of four.
    """
    discipline_codes = [
        f"{distance} {stroke_code}"
        for stroke_code, distances in RECORD_DISCIPLINES
        for distance in distances
    ]

    partition = (Result.discipline_id, Result.course_id, Swimmer.sex, AgeCategory.id)

    # Best time before this row (NULL for the first ever), and best time
    # across the whole partition — a step whose time equals the all-time
    # best is the standing record for that combination
    prev_best = (
        func.min(Result.time)
        .over(
            partition_by=partition,
            order_by=(Result.date, Result.id),
            rows=(None, -1),
        )
        .label("prev_best")
    )
    all_best = func.min(Result.time).over(partition_by=partition).label("all_best")

    inner = (
        select(
            Result.id.label("result_id"),
            Swimmer.id.label("swimmer_id"),
            Swimmer.name.label("name"),
            Swimmer.surname.label("surname"),
            Discipline.title.label("discipline"),
            Course.length.label("pool_length"),
            Result.time.label("time"),
            Result.date.label("date"),
            AgeCategory.code.label("age_category"),
            AgeCategory.max_age.label("max_age"),
            prev_best,
            all_best,
        )
        .select_from(Result)
        .join(Swimmer, Result.swimmer_id == Swimmer.id)
        .join(Discipline, Result.discipline_id == Discipline.id)
        .join(Course, Result.course_id == Course.id)
        .join(AgeCategory, Result.age_at_result <= AgeCategory.max_age)
        .where(
            Discipline.code.in_(discipline_codes),
            Result.time < DNF_THRESHOLD,
            Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS),
        )
    )

    # Discipline/course combinations that have no club records (100 O on 50m)
    for code, length in EXCLUDED_DISCIPLINE_COURSES:
        inner = inner.where(
            not_(and_(Discipline.code == code, Course.length == length))
        )

    steps = inner.subquery()

    return db.execute(
        select(
            steps.c.result_id,
            steps.c.swimmer_id,
            steps.c.name,
            steps.c.surname,
            steps.c.discipline,
            steps.c.pool_length,
            steps.c.time,
            steps.c.date,
            steps.c.age_category,
            steps.c.max_age,
            (steps.c.time == steps.c.all_best).label("is_current"),
        ).where(or_(steps.c.prev_best.is_(None), steps.c.time < steps.c.prev_best))
    ).all()


def _count_steps_in_period(
    steps: list, period_value: int, period_type: PeriodType
) -> int:
    """Count progression steps swum in the given year/season (pure Python)."""
    if period_type == PeriodType.YEAR:
        return sum(1 for s in steps if s.date.year == period_value)

    # Season runs from September 1st of period_value to August 31st of period_value+1
    season_start = date(period_value, 9, 1)
    season_end = date(period_value + 1, 8, 31)
    return sum(1 for s in steps if season_start <= s.date <= season_end)


def get_club_records_count(
    db: Session, period_value: int, period_type: PeriodType = PeriodType.YEAR
) -> int:
    """
    Count club record improvements (progression steps) in a given period.

    A record improvement is any result that was strictly faster than every
    eligible result before it, evaluated per (discipline, course, sex, age
    category) with the same rules as the record progression view:
    - the same discipline improved three times in a season counts three times,
    - one swim that improves records in several age categories counts once
      per category,
    - equal times do NOT count as a new record (the earlier swim keeps it).

    Computed on the fly from the results table, so it works for any past
    period — unlike the old logic, which could only see current record
    holders and returned 0 for past years.
    """
    return _count_steps_in_period(_fetch_record_steps(db), period_value, period_type)


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
            PersonalBest.time,
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
            "time": row.time,
        }
        for idx, row in enumerate(results)
    ]


def _group_steps(steps: list, limit: int, oldest: bool) -> list:
    """
    Group progression steps by result (one swim can break records in
    several age categories at once — those are combined into a single
    entry with all its categories). Pure Python.

    Args:
        steps: Rows from _fetch_record_steps
        limit: Number of distinct swims to return
        oldest: If True, only still-standing steps, oldest first;
                if False, all steps, most recent first (beaten ones included)
    """
    relevant = [s for s in steps if s.is_current] if oldest else steps
    relevant = sorted(relevant, key=lambda s: (s.date, s.result_id), reverse=not oldest)

    grouped: dict[int, dict] = {}
    for step in relevant:
        entry = grouped.get(step.result_id)
        if entry is None:
            # Only start new entries while under the limit; later steps of
            # already-collected swims still merge in (order guarantees the
            # first appearance is the ranking position)
            if len(grouped) >= limit:
                continue
            entry = {
                "resultId": step.result_id,
                "name": step.name,
                "surname": step.surname,
                "swimmerId": step.swimmer_id,
                "discipline": step.discipline,
                "time": step.time,
                "date": step.date.isoformat() if step.date else None,
                "poolLength": step.pool_length,
                "isCurrent": False,
                "_categories": [],
            }
            grouped[step.result_id] = entry
        entry["_categories"].append((step.max_age, step.age_category))
        entry["isCurrent"] = entry["isCurrent"] or step.is_current

    results = []
    for entry in grouped.values():
        categories = entry.pop("_categories")
        entry["ageCategories"] = [code for _, code in sorted(categories)]
        results.append(entry)
    return results


def get_club_records(db: Session, limit: int = 5, oldest: bool = False) -> list:
    """
    Get club record progression events, grouped by result (one swim can
    break records in several age categories at once — those are combined
    into a single entry with all its categories).

    Uses the same progression logic as the record-progression endpoint:
    a record event is any result strictly faster than every eligible
    result before it, per (discipline, course, sex, age category). This
    means a discipline broken three times in a week shows up three times.

    Each entry carries `isCurrent` — whether the swim is still the
    standing record in at least one of its categories. Entries that were
    beaten again later are kept in the list but flagged as not current.

    Args:
        db: Database session
        limit: Number of distinct swims to return
        oldest: If True, returns the oldest still-standing records;
                if False, the most recent record events (current or not)
    """
    return _group_steps(_fetch_record_steps(db), limit, oldest)


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

    # All club-record stats share one computation of the progression steps
    # (the expensive window query runs once per dashboard load, not 4×)
    record_steps = _fetch_record_steps(db)

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
                "current": _count_steps_in_period(
                    record_steps, current_period, period_type
                ),
                "previous": _count_steps_in_period(
                    record_steps, previous_period, period_type
                ),
            },
            "personalBests": {
                "current": get_personal_bests_count(db, current_period, period_type),
                "previous": get_personal_bests_count(db, previous_period, period_type),
            },
        },
        "topMen": get_top_swimmers_by_points(db, "male", limit=10),
        "topWomen": get_top_swimmers_by_points(db, "female", limit=10),
        "recentRecords": _group_steps(record_steps, limit=10, oldest=False),
        "oldestRecords": _group_steps(record_steps, limit=10, oldest=True),
    }
