from datetime import datetime
from typing import NamedTuple

import requests
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Swimmer, PersonalBest, Discipline, Course
from scripts.config import HEADERS


# Hardcoded list of allowed groups
VALID_GROUPS = ["Z1", "Z2", "P1", "veteran"]

API_URL = "https://vysledky.czechswimming.cz/cz.zma.csps.portal.rest/api/public/user-profiles/{}/outputs?mastersOnly=false"


class PBEntry(NamedTuple):
    time: str
    discipline_code: str
    pool_length: int
    points: int
    competition_location: str
    date_str: str
    split_time: bool
    relay_part: bool


def fetch_personal_bests(user_id: int):
    url = API_URL.format(user_id)
    header = HEADERS.copy()
    try:
        header["Referer"] = f"https://vysledky.czechswimming.cz/lide/{user_id}"
        response = requests.get(url, timeout=5, headers=header)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Failed to fetch for {user_id}: {e}")
        return []


def update_swimmer(swimmer_row: Swimmer, pb: PBEntry):
    swimmer_row.time = pb.time
    swimmer_row.points = pb.points
    swimmer_row.competition_location = pb.competition_location
    swimmer_row.date = datetime.fromisoformat(pb.date_str)
    swimmer_row.split_time = pb.split_time
    swimmer_row.relay_part = pb.relay_part


def sync_pbs():
    db: Session = SessionLocal()

    swimmers = db.query(Swimmer).filter(Swimmer.group.in_(VALID_GROUPS)).all()

    for swimmer in swimmers:
        pb_data = fetch_personal_bests(swimmer.swimmer_id)

        for entry in pb_data:
            pb = PBEntry(
                time=entry.get("time"),
                discipline_code=entry.get("disciplineCode"),
                pool_length=entry.get("poolLength"),
                points=entry.get("points"),
                competition_location=entry.get("competitionLocation"),
                date_str=entry.get("date"),
                split_time=entry.get("splitTime"),
                relay_part=entry.get("relayPart"),
            )

            discipline = db.query(Discipline).filter_by(code=pb.discipline_code).first()
            if not discipline:
                print(f"Discipline {pb.discipline_code} not found.")
                continue

            course = db.query(Course).filter_by(length=pb.pool_length).first()
            if not course:
                print(f"Course {pb.pool_length} not found.")
                continue

            swimmer_row = (
                db.query(PersonalBest)
                .filter_by(
                    swimmer_id=swimmer.id,
                    discipline_id=discipline.id,
                    course_id=course.id,
                )
                .first()
            )

            if swimmer_row:
                update_swimmer(swimmer_row, pb)
            else:
                db.add(
                    PersonalBest(
                        swimmer_id=swimmer.id,
                        time=pb.time,
                        discipline_id=discipline.id,
                        course_id=course.id,
                        points=pb.points,
                        competition_location=pb.competition_location,
                        date=datetime.fromisoformat(pb.date_str),
                        split_time=pb.split_time,
                        relay_part=pb.relay_part,
                    )
                )
        print(f"Synced PBs for {swimmer.name} {swimmer.surname}")

    db.commit()
    db.close()


if __name__ == "__main__":
    sync_pbs()
