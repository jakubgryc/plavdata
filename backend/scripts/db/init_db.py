import argparse
import json
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.db import SessionLocal, engine, Base
from app.constants import STROKE_TITLES, STROKE_CODES, DISTANCES
from app.models import Swimmer, Discipline, Course, ApiSync, AgeCategory
from scripts.config import DATA_DIR

SWIMMERS_FILE = DATA_DIR / "swimmers.json"


def init_age_categories(db: Session):
    categories = [
        {"code": "9", "min_age": 0, "max_age": 9},
        {"code": "10", "min_age": 0, "max_age": 10},
        {"code": "11", "min_age": 0, "max_age": 11},
        {"code": "12", "min_age": 0, "max_age": 12},
        {"code": "13", "min_age": 0, "max_age": 13},
        {"code": "14", "min_age": 0, "max_age": 14},
        {"code": "junior", "min_age": 0, "max_age": 18},
        {"code": "open", "min_age": 0, "max_age": 99},
    ]

    for category in categories:
        exists = db.query(AgeCategory).filter_by(code=category.code).first()
        if not exists:
            db.add(AgeCategory(**category))


def init_static_tables(db: Session):
    sync = db.query(ApiSync).first()

    if not sync:
        sync = ApiSync(id=1)
        db.add(sync)

    init_age_categories(db)

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
        exists = db.query(Discipline).filter_by(code=d.get("code")).first()
        if not exists:
            db.add(Discipline(**d))


def init_swimmers(db: Session, swimmers_file: Path):
    ## Deprecated, used to init swimmers from JSON file
    with open(swimmers_file) as f:
        swimmers = json.load(f)

    for s in swimmers:
        exists = db.query(Swimmer).filter_by(csps_id=s.get("csps_id")).first()
        if exists:
            continue
        membership_start_str = s.get("membership_start")
        membership_end_str = s.get("membership_end")
        swimmer = Swimmer(
            csps_id=s.get("csps_id"),
            name=s.get("name"),
            surname=s.get("surname"),
            birth_year=s.get("birth_year"),
            group=s.get("group"),
            sex=s.get("sex"),
            membership_start=datetime.fromisoformat(membership_start_str).date(),
            membership_end=datetime.fromisoformat(membership_end_str).date()
            if membership_end_str
            else None,
        )
        db.add(swimmer)


def init_db(swimmers_file: Path, drop_all: bool):
    if drop_all:
        Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    # Initialize static tables
    init_static_tables(db)

    # Initialize swimmers
    # init_swimmers(db, swimmers_file)

    db.commit()
    db.close()

    print("Database initialized.")


def parse_args():
    parser = argparse.ArgumentParser(description="Initialize the database.")

    parser.add_argument(
        "--input",
        type=Path,
        default=SWIMMERS_FILE,
        help="Initialize the database with static data and swimmers.",
    )

    parser.add_argument(
        "--drop-all",
        action="store_true",
        help="Drop all existing tables before initializing.",
        default=False,
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    init_db(args.input, args.drop_all)
