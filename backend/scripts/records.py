from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models import PersonalBest, Swimmer, Course, Discipline
from typing import Literal

# Aliases for joins
PB = PersonalBest
SW = Swimmer
CO = Course
DI = Discipline

stroke_order = [
    "Znak",
    "Prsa",
    "Motýl",
    "Kraul",
    "Polohový závod",
]
distance_order = [50, 100, 200, 400, 800, 1500]


def get_sort_key(discipline_title):
    # Example discipline_title: "100m Backstroke"
    try:
        parts = discipline_title.split()
        distance = int(parts[0].replace("m", ""))
        stroke = parts[1]
    except Exception:
        # Fallback if format doesn't match
        stroke = "Zzzz"
        distance = 9999
    # Get stroke and distance index for sorting
    stroke_idx = (
        stroke_order.index(stroke) if stroke in stroke_order else len(stroke_order)
    )
    distance_idx = (
        distance_order.index(distance)
        if distance in distance_order
        else len(distance_order)
    )
    return (stroke_idx, distance_idx)


# Helper for one query (parametrize gender and course length)
def best_records_query(session: Session, gender: Literal["M", "Z"], course_length: int):
    # Subquery: for each discipline, get the minimum time for this gender/course
    subq = (
        session.query(PB.discipline_id, func.min(PB.time).label("min_time"))
        .join(SW, PB.swimmer_id == SW.id)
        .join(CO, PB.course_id == CO.id)
        .filter(SW.gender == gender, CO.length == course_length)
        .group_by(PB.discipline_id)
        .subquery()
    )
    # Main query: join back to get full details
    q = (
        session.query(
            DI.title.label("discipline"),
            PB.time,
            SW.name,
            SW.surname,
            CO.type.label("course_type"),
            CO.length,
            PB.date,
        )
        .join(DI, PB.discipline_id == DI.id)
        .join(CO, PB.course_id == CO.id)
        .join(SW, PB.swimmer_id == SW.id)
        .join(
            subq,
            and_(subq.c.discipline_id == PB.discipline_id, subq.c.min_time == PB.time),
        )
        .filter(SW.gender == gender, CO.length == course_length)
        .order_by(DI.title)
    )
    return sorted(q.all(), key=lambda x: get_sort_key(x[0]))


# Usage:
# For men, short course (25m)
# men_short = best_records_query(session, gender="M", course_length=25)
# # For women, short course (25m)
# women_short = best_records_query(session, gender="F", course_length=25)
# # For men, long course (50m)
# men_long = best_records_query(session, gender="M", course_length=50)
# # For women, long course (50m)
# women_long = best_records_query(session, gender="F", course_length=50)

# Each result in e.g. men_short will be a tuple with:
# (discipline, record_time, swimmer_name, swimmer_surname, course_type, course_length, date)
