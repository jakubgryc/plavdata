from sqlalchemy.orm import Session
from sqlalchemy import func

from app.constants import EXCLUDED_COMPETITION_LOCATIONS
from app.models import Competition, Discipline, Result, Swimmer
from app.crud.common import fetch_club_record_ids, build_result_entry


def _fetch_competition_rows(db: Session, competition_id: int):
    return (
        db.query(
            Result.id.label("result_id"),
            Result.swimmer_id,
            Result.time,
            Result.points,
            Result.improvement,
            Result.comparison_to_best,
            Result.relay_part,
            Swimmer.name,
            Swimmer.surname,
            Swimmer.birth_year,
            Discipline.title.label("discipline"),
            Discipline.code.label("discipline_code"),
        )
        .join(Swimmer, Result.swimmer_id == Swimmer.id)
        .join(Discipline, Result.discipline_id == Discipline.id)
        .filter(Result.competition_id == competition_id)
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .filter(Result.split_time.is_(False))
        .order_by(Swimmer.surname, Swimmer.name, Discipline.code)
        .all()
    )


def _build_swimmers_data(rows, club_record_ids: set[int]) -> tuple[list, int, int, int]:
    """Returns (swimmers, total_starts, total_personal_bests, club_records_count)."""
    swimmers_dict: dict = {}
    total_starts = 0
    total_personal_bests = 0
    club_records_count = 0

    for row in rows:
        sid = row.swimmer_id
        if sid not in swimmers_dict:
            swimmers_dict[sid] = {
                "swimmerId": sid,
                "name": row.name,
                "surname": row.surname,
                "birthYear": row.birth_year,
                "results": [],
            }
        swimmers_dict[sid]["results"].append(build_result_entry(row, club_record_ids))

        total_starts += 1
        if row.improvement:
            total_personal_bests += 1
        if row.result_id in club_record_ids:
            club_records_count += 1

    return (
        list(swimmers_dict.values()),
        total_starts,
        total_personal_bests,
        club_records_count,
    )


def get_competition_detail(db: Session, competition_id: int) -> dict | None:
    competition = db.query(Competition).filter(Competition.id == competition_id).first()
    if not competition:
        return None

    rows = _fetch_competition_rows(db, competition_id)
    if not rows:
        return None

    club_record_ids = fetch_club_record_ids(db, [row.result_id for row in rows])
    swimmers, total_starts, total_personal_bests, club_records_count = (
        _build_swimmers_data(rows, club_record_ids)
    )

    return {
        "competition": {
            "id": competition.id,
            "title": competition.title,
            "startDate": competition.start_date.isoformat()
            if competition.start_date
            else None,
            "endDate": competition.end_date.isoformat()
            if competition.end_date
            else None,
            "location": competition.location,
            "poolLength": competition.pool_length,
            "cspsCompetitionId": competition.csps_competition_id,
        },
        "swimmers": swimmers,
        "totalStarts": total_starts,
        "totalPersonalBests": total_personal_bests,
        "clubRecordsCount": club_records_count,
    }


def list_competitions(db: Session, year: int) -> list:
    """
    Return competitions for the given year where at least one tracked club swimmer
    has a result, ordered by start_date descending.
    """
    club_result_counts = (
        db.query(Result.competition_id)
        .join(Swimmer, Result.swimmer_id == Swimmer.id)
        .filter(Result.competition_location.notin_(EXCLUDED_COMPETITION_LOCATIONS))
        .group_by(Result.competition_id)
        .having(func.count(Result.id) > 0)
        .subquery()
    )

    competitions = (
        db.query(Competition)
        .join(club_result_counts, Competition.id == club_result_counts.c.competition_id)
        .filter(func.strftime("%Y", Competition.start_date) == str(year))
        .order_by(Competition.start_date.desc())
        .all()
    )

    return [
        {
            "id": comp.id,
            "title": comp.title,
            "startDate": comp.start_date.isoformat() if comp.start_date else None,
            "endDate": comp.end_date.isoformat() if comp.end_date else None,
            "location": comp.location,
            "poolLength": comp.pool_length,
            "cspsCompetitionId": comp.csps_competition_id,
            "hasResults": comp.has_results,
        }
        for comp in competitions
    ]
