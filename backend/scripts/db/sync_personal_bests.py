from datetime import datetime

import requests
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Swimmer, PersonalBest, Discipline, Course
from scripts.config import HEADERS


# Hardcoded list of allowed groups
VALID_GROUPS = ["Z1", "Z2", "P1", "veteran"]

API_URL = "https://vysledky.czechswimming.cz/cz.zma.csps.portal.rest/api/public/user-profiles/{}/outputs?mastersOnly=false"


def fetch_personal_bests(user_id: int):
    url = API_URL.format(user_id)
    try:
        response = requests.get(url, timeout=5, headers=HEADERS)
        response.raise_for_status()
        return response.json()  # assume it's a list of events/pbs
    except Exception as e:
        print(f"Failed to fetch for {user_id}: {e}")
        return []


def sync():
    db: Session = SessionLocal()

    swimmers = db.query(Swimmer).filter(Swimmer.group.in_(VALID_GROUPS)).all()

    for swimmer in swimmers:
        pb_data = fetch_personal_bests(swimmer.swimmer_id)

        for entry in pb_data:
            # Adjust these fields based on actual API response keys
            time = entry.get("time")
            discipline_code = entry.get("disciplineCode")
            pool_length = entry.get("poolLength")
            points = entry.get("points")
            competition_location = entry.get("competitionLocation")
            date_str = entry.get("date")
            split_time = entry.get("splitTime")
            relay_part = entry.get("relayPart")

            discipline = db.query(Discipline).filter_by(code=discipline_code).first()
            if not discipline:
                print(f"Discipline {discipline_code} not found.")
                continue

            course = db.query(Course).filter_by(length=pool_length).first()
            if not course:
                print(f"Course {pool_length} not found.")
                continue

            exists = (
                db.query(PersonalBest)
                .filter_by(
                    swimmer_id=swimmer.id,
                    discipline_id=discipline.id,
                    course_id=course.id,
                )
                .first()
            )

            if not exists:
                db.add(
                    PersonalBest(
                        swimmer_id=swimmer.id,
                        time=time,
                        discipline_id=discipline.id,
                        course_id=course.id,
                        points=points,
                        competition_location=competition_location,
                        date=datetime.fromisoformat(date_str),
                        split_time=split_time,
                        relay_part=relay_part,
                    )
                )

        print(f"Synced PBs for {swimmer.name} {swimmer.surname}")

    db.commit()
    db.close()


if __name__ == "__main__":
    sync()
