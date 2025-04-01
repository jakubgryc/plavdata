from datetime import datetime

import requests
from sqlalchemy.orm import Session

from app.db import SessionLocal, Base, engine
from app.models import Swimmer, PersonalBest
from scripts.config import HEADERS

# Just run this once
Base.metadata.create_all(bind=engine)

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
            discipline_title = entry.get("disciplineTitle")
            discipline_code = entry.get("disciplineCode")
            pool_length = entry.get("poolLength")
            points = entry.get("points")
            competition_location = entry.get("competitionLocation")
            date_str = entry.get("date")

            existing = (
                db.query(PersonalBest)
                .filter_by(
                    swimmer_id=swimmer.id,
                    discipline_code=discipline_code,
                    pool_length=pool_length,
                )
                .first()
            )

            if existing:
                continue
            else:
                db.add(
                    PersonalBest(
                        swimmer_id=swimmer.id,
                        time=time,
                        discipline_title=discipline_title,
                        discipline_code=discipline_code,
                        pool_length=pool_length,
                        points=points,
                        competition_location=competition_location,
                        date=datetime.fromisoformat(date_str),
                    )
                )

        print(f"Synced PBs for {swimmer.name} {swimmer.surname}")

    db.commit()
    db.close()


if __name__ == "__main__":
    sync()
