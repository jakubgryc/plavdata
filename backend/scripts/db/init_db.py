import json

from sqlalchemy.orm import Session

from app.db import SessionLocal, engine, Base
from app.models import Swimmer
from scripts.config import DATA_DIR

SWIMMERS_FILE = DATA_DIR / "pkboh.json"


def init_db():
    Base.metadata.create_all(bind=engine)  # Create tables

    db: Session = SessionLocal()

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

    db.commit()
    db.close()


if __name__ == "__main__":
    init_db()
