from datetime import date

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.constants import EXCLUDED_COMPETITION_LOCATIONS
from app.api.schemas import PersonalBestDetail
from app.models import (
    ClubRecord,
    Competition,
    Discipline,
    PersonalBest,
    Result,
    Swimmer,
)


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
        "group": swimmer.group,
        "sex": swimmer.sex,
    }


def get_swimmer_stats(db: Session, swimmer_id: int) -> dict:
    """Get swimmer statistics (starts, competitions, PBs, club records)."""
    current_year = date.today().year

    # Total starts (excluding splits and Bohumín)
    total_starts = (
        db.query(func.count(Result.id))
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.split_time == 0)
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )

    # This year starts
    year_starts = (
        db.query(func.count(Result.id))
        .filter(Result.swimmer_id == swimmer_id)
        .filter(extract("year", Result.date) == current_year)
        .filter(Result.split_time == 0)
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )

    # Total competitions (unique competition_id)
    total_competitions = (
        db.query(func.count(func.distinct(Result.competition_id)))
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.competition_id.isnot(None))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )

    # This year competitions
    year_competitions = (
        db.query(func.count(func.distinct(Result.competition_id)))
        .filter(Result.swimmer_id == swimmer_id)
        .filter(extract("year", Result.date) == current_year)
        .filter(Result.competition_id.isnot(None))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )

    # Personal bests this year
    year_pbs = (
        db.query(func.count(Result.id))
        .filter(Result.swimmer_id == swimmer_id)
        .filter(extract("year", Result.date) == current_year)
        .filter(Result.improvement.is_(True))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .scalar()
        or 0
    )

    # Club records count
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
    results = (
        db.query(
            Discipline.title.label("discipline"),
            func.max(Result.points).label("points"),
            Result.time,
            Result.date,
        )
        .join(Discipline, Result.discipline_id == Discipline.id)
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.points.isnot(None))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .group_by(Discipline.title)
        .order_by(func.max(Result.points).desc())
        .limit(limit)
        .all()
    )

    # For each discipline, get the actual result with the max points
    top_results = []
    for row in results:
        best_result = (
            db.query(
                Discipline.title.label("discipline"),
                Result.time,
                Result.points,
                Result.date,
            )
            .join(Discipline, Result.discipline_id == Discipline.id)
            .filter(Result.swimmer_id == swimmer_id)
            .filter(Discipline.title == row.discipline)
            .filter(Result.points == row.points)
            .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
            .first()
        )

        if best_result:
            top_results.append(
                {
                    "discipline": best_result.discipline,
                    "time": best_result.time,
                    "points": best_result.points,
                    "date": best_result.date.isoformat() if best_result.date else None,
                }
            )

    return top_results


def get_swimmer_starts_by_year(db: Session, swimmer_id: int) -> list:
    """Get number of starts per year for the swimmer."""
    results = (
        db.query(
            extract("year", Result.date).label("year"),
            func.count(Result.id).label("starts"),
        )
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.split_time == 0)
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .group_by(extract("year", Result.date))
        .order_by(extract("year", Result.date))
        .all()
    )

    return [{"year": int(row.year), "starts": row.starts} for row in results]


def get_swimmer_competitions(db: Session, swimmer_id: int) -> list:
    """Get detailed information about competitions the swimmer attended."""
    competitions_data = (
        db.query(
            Result.competition_id,
            func.count(Result.id).label("starts"),
        )
        .filter(Result.swimmer_id == swimmer_id)
        .filter(Result.split_time == 0)
        .filter(Result.competition_id.isnot(None))
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .group_by(Result.competition_id)
        .all()
    )

    result = []
    for comp_data in competitions_data:
        competition = (
            db.query(Competition)
            .filter(Competition.id == comp_data.competition_id)
            .first()
        )

        if competition:
            comp_info = {
                "competitionId": competition.csps_competition_id,
                "name": competition.title,
                "date": competition.start_date.isoformat()
                if competition.start_date
                else None,
                "location": competition.location,
                "poolLength": competition.pool_length,
                "starts": comp_data.starts,
            }
            result.append(comp_info)

    # Sort by date descending
    result.sort(key=lambda x: x["date"] or "", reverse=True)

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
        return [PersonalBestDetail(discipline=row.discipline,
                                   code=row.code,
                                   time=row.time,
                                   split_time=row.split_time,
                                   relay_part=row.relay_part,
                                   points=row.points,
                                   date=row.date.isoformat() if row.date else None,
                                   location=row.competition_location)
                for row in pbs]

    return {"pb25m": format_pbs(pbs_25m), "pb50m": format_pbs(pbs_50m)}
