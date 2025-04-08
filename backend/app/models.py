from sqlalchemy import Column, BigInteger, Integer, String, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from .db import Base


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
    swimmer_id = Column(BigInteger, unique=True, nullable=False)
    name = Column(String, nullable=False)
    surname = Column(String, nullable=False)
    birth_year = Column(Integer, nullable=False)
    group = Column(String, nullable=True)
    gender = Column(String)


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
    competition_location = Column(String, nullable=False)
    date = Column(Date, nullable=False)

    discipline = relationship("Discipline")
    course = relationship("Course")
    swimmer = relationship("Swimmer", back_populates="personal_bests")


Swimmer.personal_bests = relationship(
    "PersonalBest", back_populates="swimmer", cascade="all, delete-orphan"
)
Swimmer.results = relationship(
    "Result", back_populates="swimmer", cascade="all, delete-orphan"
)
