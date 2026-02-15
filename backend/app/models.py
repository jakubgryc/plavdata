from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    UniqueConstraint,
    Index,
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


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    display_name_cs = Column(String, nullable=False)

    swimmers = relationship("Swimmer", back_populates="group_rel")


class Swimmer(Base):
    __tablename__ = "swimmers"

    id = Column(Integer, primary_key=True, index=True)
    csps_id = Column(BigInteger, unique=True, nullable=False)
    name = Column(String, nullable=False)
    surname = Column(String, nullable=False)
    birth_year = Column(Integer, nullable=False)
    group = Column(String, nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    sex = Column(String)
    membership_start = Column(Date, nullable=True)
    membership_end = Column(Date, nullable=True)
    show_in_comparison = Column(Boolean, default=False)
    show_in_personal_bests = Column(Boolean, default=False)
    show_in_relay_builder = Column(Boolean, default=False)

    group_rel = relationship("Group", back_populates="swimmers")


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    swimmer_id = Column(Integer, ForeignKey("swimmers.id"))
    discipline_id = Column(Integer, ForeignKey("disciplines.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    competition_id = Column(Integer, ForeignKey("competitions.id"), nullable=True)
    csps_result_id = Column(String, nullable=True)
    time = Column(Integer, nullable=False)
    comparison_to_best = Column(Integer)
    split_time = Column(Boolean)
    relay_part = Column(Boolean)
    improvement = Column(Boolean)
    competition_location = Column(String, nullable=True)  # nullable just in case
    date = Column(Date, nullable=False)
    points = Column(Integer, nullable=True)

    discipline = relationship("Discipline")
    course = relationship("Course")
    swimmer = relationship("Swimmer", back_populates="results")
    club_record = relationship(
        "ClubRecord",
        back_populates="result",
        cascade="all, delete-orphan",
    )
    competition = relationship("Competition")

    __table_args__ = (
        Index(
            "idx_swimmer_pb_lookup", "swimmer_id", "discipline_id", "course_id", "time"
        ),
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


class CompetitionTag(Base):
    __tablename__ = "competition_tags"

    id = Column(Integer, primary_key=True, index=True)
    csps_competition_tag_id = Column(
        Integer, unique=True, nullable=False
    )  # competitionTagId from API
    title = Column(String, nullable=False)
    key = Column(String, nullable=False)


# Association table for many-to-many relationship
competition_tag_association = Table(
    "competition_tag_association",
    Base.metadata,
    Column("competition_id", Integer, ForeignKey("competitions.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("competition_tags.id"), primary_key=True),
)


class Competition(Base):
    __tablename__ = "competitions"

    id = Column(Integer, primary_key=True, index=True)
    csps_competition_id = Column(
        Integer, unique=True, nullable=False
    )  # competitionId from API
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    sport = Column(Integer, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    location = Column(String, nullable=True)
    location_region = Column(String, nullable=True)
    club_id = Column(Integer, nullable=True)
    competition_state = Column(String, nullable=True)  # ACTIVE, etc.
    pool_length = Column(Integer, nullable=True)
    has_plan = Column(Boolean, default=False)
    has_results = Column(Boolean, default=False)
    plan_file_name = Column(String, nullable=True)
    results_file_name = Column(String, nullable=True)
    stopwatch_type = Column(String, nullable=True)  # MANUAL, SEMIMANUAL, etc.
    elapsed = Column(Boolean, default=False)
    irregular_pool = Column(Boolean, default=False)
    masters = Column(Boolean, default=False)

    # Relationship to tags
    tags = relationship(
        "CompetitionTag", secondary=competition_tag_association, backref="competitions"
    )


Swimmer.personal_bests = relationship(
    "PersonalBest", back_populates="swimmer", cascade="all, delete-orphan"
)
Swimmer.results = relationship(
    "Result", back_populates="swimmer", cascade="all, delete-orphan"
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
