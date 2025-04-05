import json

from sqlalchemy.orm import Session

from app.db import SessionLocal, engine, Base
from app.models import Swimmer, Discipline, Course
from scripts.config import DATA_DIR

SWIMMERS_FILE = DATA_DIR / "pkboh.json"

STROKE_TITLES = ["Volný způsob", "Znak", "Prsa", "Motýlek", "Polohový závod"]
STROKE_CODES = ["K", "Z", "P", "M", "O"]
DISTANCES = [50, 100, 200, 400, 800, 1500]


def init_static_tables(db: Session):
    COURSES = [
        {"type": "SCM", "length": 25},
        {"type": "LCM", "length": 50},
    ]

    for course in COURSES:
        exists = db.query(Course).filter_by(type=course.get("type")).first()
        if not exists:
            db.add(Course(**course))

    disciplines: list = []
    for title, code in zip(STROKE_TITLES, STROKE_CODES):
        for distance in DISTANCES:
            if (
                code == "O"
                and distance not in [100, 200, 400]
                or code in ["Z", "M", "P"]
                and distance not in [50, 100, 200]
            ):
                continue
            disciplines.append(
                {
                    "title": f"{distance}m {title}",
                    "code": f"{distance} {code}",
                }
            )

    for d in disciplines:
        exists = (
            db.query(Discipline)
            .filter_by(code=d.get("code"))
            .first()
        )
        if not exists:
            db.add(Discipline(**d))


def init_swimmers(db: Session):
    with open(SWIMMERS_FILE) as f:
        swimmers = json.load(f)

    for s in swimmers:
        exists = db.query(Swimmer).filter_by(swimmer_id=s.get("userId")).first()
        if exists:
            continue
        swimmer = Swimmer(
            swimmer_id=s.get("userId"),
            name=s.get("firstName"),
            surname=s.get("lastName").capitalize(),
            birth_year=s.get("birthYear"),
            group=s.get("group"),
            gender=s.get("gender"),
        )
        db.add(swimmer)


def init_db():
    # Drop all tables
    Base.metadata.drop_all(bind=engine)

    # Create all tables
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    # Initialize static tables
    init_static_tables(db)

    # Initialize swimmers
    init_swimmers(db)

    db.commit()
    db.close()

    print("Database initialized.")


if __name__ == "__main__":
    init_db()
