from sqlalchemy.orm import Session

from app.models import ClubRecord


def fetch_club_record_ids(db: Session, result_ids: list[int]) -> set[int]:
    if not result_ids:
        return set()
    rows = (
        db.query(ClubRecord.result_id)
        .filter(ClubRecord.result_id.in_(result_ids))
        .all()
    )
    return {r.result_id for r in rows}


def build_result_entry(row, club_records_ids: set[int]) -> dict:
    previous_best = row.time + abs(row.comparison_to_best)
    performance = (
        round(abs(row.comparison_to_best) / previous_best, 4)
        if previous_best > 0
        else 0.0
    )
    # Rename freestyle code K -> VZ
    code_parts = row.discipline_code.upper().split()
    display_code = (
        f"{code_parts[0]} VZ"
        if len(code_parts) == 2 and code_parts[1] == "K"
        else row.discipline_code
    )
    return {
        "discipline": row.discipline,
        "discipline_code": display_code,
        "time": row.time,
        "points": row.points,
        "improvement": bool(row.improvement),
        "comparison_to_best": row.comparison_to_best,
        "performance": performance,
        "relay_part": bool(row.relay_part),
        "club_record": row.result_id in club_records_ids,
    }
