from sqlalchemy import Column, BigInteger, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship

from .db import Base


class Swimmer(Base):
    __tablename__ = "swimmers"

    id = Column(Integer, primary_key=True, index=True)
    swimmer_id = Column(BigInteger, unique=True, nullable=False)
    name = Column(String, nullable=False)
    surname = Column(String, nullable=False)
    birth_year = Column(Integer, nullable=False)
    group = Column(String, nullable=True)
    gender = Column(String)


class PersonalBest(Base):
    __tablename__ = "personal_bests"

    id = Column(Integer, primary_key=True, index=True)
    swimmer_id = Column(Integer, ForeignKey("swimmers.id"))
    time = Column(Integer, nullable=False)
    discipline_title = Column(String, nullable=False)
    discipline_code = Column(String, nullable=False)
    pool_length = Column(Integer, nullable=False)
    points = Column(Integer, nullable=True)
    competition_location = Column(String, nullable=False)
    date = Column(Date, nullable=False)

    swimmer = relationship("Swimmer", back_populates="personal_bests")


Swimmer.personal_bests = relationship(
    "PersonalBest", back_populates="swimmer", cascade="all, delete-orphan"
)
