from datetime import datetime
from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .db import Base

EPOCH = datetime(1970, 1, 1)


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)
    length = Column(Integer, nullable=False)


class Discipline(Base):
    __tablename__ = "disciplines"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    code = Column(String, nullable=False)


class Swimmer(Base):
    __tablename__ = "swimmers"

    id = Column(Integer, primary_key=True, index=True)
    csps_id = Column(BigInteger, unique=True, nullable=False)
    name = Column(String, nullable=False)
    surname = Column(String, nullable=False)
    birth_year = Column(Integer, nullable=False)
    group = Column(String, nullable=True)
    sex = Column(String)
    membership_start = Column(Date, nullable=True)
    membership_end = Column(Date, nullable=True)


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    swimmer_id = Column(Integer, ForeignKey("swimmers.id"))
    discipline_id = Column(Integer, ForeignKey("disciplines.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    time = Column(Integer, nullable=False)
    comparison_to_best = Column(Integer)
    split_time = Column(Boolean)
    relay_part = Column(Boolean)
    improvement = Column(Boolean)
    competition_location = Column(String, nullable=True)  # nullable just in case
    date = Column(Date, nullable=False)

    discipline = relationship("Discipline")
    course = relationship("Course")
    swimmer = relationship("Swimmer", back_populates="results")
    club_record = relationship(
        "ClubRecord",
        back_populates="result",
        cascade="all, delete-orphan",
    )


class PersonalBest(Base):
    __tablename__ = "personal_bests"

    id = Column(Integer, primary_key=True, index=True)
    swimmer_id = Column(Integer, ForeignKey("swimmers.id"))
    discipline_id = Column(Integer, ForeignKey("disciplines.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    time = Column(Integer, nullable=False)
    split_time = Column(Boolean)
    relay_part = Column(Boolean)
    points = Column(Integer, nullable=True)
    competition_location = Column(String, nullable=True)
    date = Column(Date, nullable=False)

    discipline = relationship("Discipline")
    course = relationship("Course")
    swimmer = relationship("Swimmer", back_populates="personal_bests")


class AgeCategory(Base):
    __tablename__ = "age_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), nullable=False)
    min_age = Column(Integer, nullable=True)
    max_age = Column(Integer, nullable=False)


class ClubRecord(Base):
    __tablename__ = "club_records"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey("results.id"), nullable=False)
    age_category_id = Column(Integer, ForeignKey("age_categories.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "result_id", "age_category_id", name="uix_result_age_category"
        ),
    )

    result = relationship(
        "Result",
        back_populates="club_record",
        uselist=False,
    )

    age_category = relationship(
        "AgeCategory",
        uselist=False,
    )


class ApiSync(Base):
    __tablename__ = "api_syncs"

    id = Column(Integer, primary_key=True, index=True)
    personal_bests_last_fetch = Column(DateTime, nullable=False, default=EPOCH)
    results_last_fetch = Column(DateTime, nullable=False, default=EPOCH)


Swimmer.personal_bests = relationship(
    "PersonalBest", back_populates="swimmer", cascade="all, delete-orphan"
)
Swimmer.results = relationship(
    "Result", back_populates="swimmer", cascade="all, delete-orphan"
)
