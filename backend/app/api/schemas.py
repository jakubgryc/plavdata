from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, model_validator
from pydantic.alias_generators import to_camel

SPECIAL_CASES = {
    # Special cases for renaming swimmer names
    "Khim Anna": "Anna",
    "Le Ngoc Nhi": "Le",
}


class SpecialNameMixin:
    """
    Mixin to handle special cases in swimmer names.
    """

    @model_validator(mode="before")
    @classmethod
    def rename_special_cases(cls, swimmer_out):
        """
        Rename swimmers with special cases in their names.
        """
        if isinstance(swimmer_out, dict):
            first_name = swimmer_out.get("name")
            surname = swimmer_out.get("surname")
        else:  # SQLAlchemy model instance
            first_name = getattr(swimmer_out, "name", None)
            surname = getattr(swimmer_out, "surname", None)

        if first_name in SPECIAL_CASES:
            new_name = SPECIAL_CASES[first_name]
            if isinstance(swimmer_out, dict):
                swimmer_out["name"] = new_name
            else:
                setattr(swimmer_out, "name", new_name)
        if surname in SPECIAL_CASES:
            new_surname = SPECIAL_CASES[surname]
            if isinstance(swimmer_out, dict):
                swimmer_out["surname"] = new_surname
            else:
                setattr(swimmer_out, "surname", new_surname)
        return swimmer_out


class BaseSwimmerModel(BaseModel, SpecialNameMixin):
    class Config:
        from_attributes = True


class BaseSwimmerOut(BaseSwimmerModel):
    id: int
    name: str
    surname: str


class GroupedSwimmersOut(BaseModel):
    group: str
    swimmers: List[BaseSwimmerOut]

    class Config:
        from_attributes = True


class SwimmerOut(BaseSwimmerModel):
    id: int
    name: str
    surname: str
    birth_year: int
    current_age: Optional[int] = None
    group: str
    sex: str

    @classmethod
    def with_age(cls, swimmer):
        """
        Create a SwimmerOut instance with the current age calculated from the birth year.
        """
        current_year = datetime.now().year
        current_age = current_year - swimmer.birth_year
        return cls(
            id=swimmer.id,
            name=swimmer.name,
            surname=swimmer.surname,
            birth_year=swimmer.birth_year,
            current_age=current_age,
            group=swimmer.group,
            sex=swimmer.sex,
        )


class DisciplineOut(BaseModel):
    title: str
    code: str

    @classmethod
    def rename_freestyle(cls, discipline):
        """
        Rename the discipline code 'K' to 'VZ'.
        """
        length, abbrev = discipline.code.split()
        if abbrev == "K":
            return cls(title=discipline.title, code=length + " VZ")
        return cls(title=discipline.title, code=discipline.code)

    class Config:
        from_attributes = True


class CourseOut(BaseModel):
    type: str
    length: int

    class Config:
        from_attributes = True


class PersonalBestOut(BaseModel):
    swimmer: SwimmerOut
    discipline: DisciplineOut
    course: CourseOut
    age_at_pb: Optional[int] = None
    time: int
    points: int
    split_time: Optional[bool] = None
    relay_part: Optional[bool] = None
    competition_location: Optional[str] = None
    date: datetime

    @classmethod
    def with_ages(cls, personal_best):
        """
        Create a PersonalBestOut instance with the swimmer's current age calculated from the birth year.
        """
        swimmer = personal_best.swimmer
        discipline = personal_best.discipline
        date_at_pb = personal_best.date.year
        age_at_pb = date_at_pb - swimmer.birth_year if swimmer.birth_year else None

        return cls(
            swimmer=SwimmerOut.with_age(swimmer),
            discipline=DisciplineOut.rename_freestyle(discipline),
            course=CourseOut(
                type=personal_best.course.type, length=personal_best.course.length
            ),
            age_at_pb=age_at_pb,
            time=personal_best.time,
            split_time=personal_best.split_time,
            relay_part=personal_best.relay_part,
            competition_location=personal_best.competition_location,
            date=personal_best.date,
            points=personal_best.points,
        )

    class Config:
        from_attributes = True


class PersonalBestStrippedOut(BaseModel):
    discipline: DisciplineOut
    course: CourseOut
    age_at_pb: Optional[int] = None
    time: int
    points: int
    split_time: Optional[bool] = None
    relay_part: Optional[bool] = None
    competition_location: Optional[str] = None
    date: datetime

    class Config:
        from_attributes = True


class BaseResultOut(BaseModel):
    time: int
    comparison_to_best: int
    split_time: Optional[bool] = None
    relay_part: Optional[bool] = None
    improvement: Optional[bool] = None
    competition_location: Optional[str] = None
    date: datetime

    class Config:
        from_attributes = True


class ResultOut(BaseResultOut):
    discipline: DisciplineOut
    course: CourseOut


class SwimmerResultOut(BaseModel):
    swimmer: SwimmerOut
    results: List[ResultOut]

    class Config:
        from_attributes = True


class SwimmerPersonalBestOut(BaseModel):
    swimmer: SwimmerOut
    personal_bests: List[PersonalBestStrippedOut]

    class Config:
        from_attributes = True


class BestTimeResultOut(BaseModel):
    swimmer_id: int
    name: str
    surname: str
    birth_year: int
    time: int
    age_at_result: int
    split_time: Optional[bool] = None
    relay_part: Optional[bool] = None
    competition_location: Optional[str] = None
    date: datetime

    class Config:
        from_attributes = True
        alias_generator = to_camel
        validate_by_name = True


# Relay Schemas
class RelaySwimmerInfo(BaseModel):
    id: int
    name: str
    surname: str
    time: int
    stroke: Optional[str] = None

    class Config:
        from_attributes = True
        alias_generator = to_camel
        populate_by_name = True


class RelayResult(BaseModel):
    total_time: int
    swimmers: List[RelaySwimmerInfo]

    class Config:
        from_attributes = True
        alias_generator = to_camel
        populate_by_name = True


class BestRelayResponse(BaseModel):
    relays: List[RelayResult]
    best_time: Optional[int] = None

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class TeamResult(BaseModel):
    swimmers: List[RelaySwimmerInfo]
    total_time: int

    class Config:
        from_attributes = True
        alias_generator = to_camel
        populate_by_name = True


class EqualRelaysResponse(BaseModel):
    teams: List[TeamResult]
    delta: int
    swimmers_per_relay: int

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class SwimmerBasicInfo(BaseModel):
    id: int
    csps_id: int
    name: str
    surname: str
    birth_year: int
    group: Optional[str]
    sex: str

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class SwimmerStats(BaseModel):
    total_starts: int
    year_starts: int
    total_competitions: int
    year_competitions: int
    year_personal_bests: int
    club_records: int

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class TopResult(BaseModel):
    discipline: str
    time: int
    points: int
    date: Optional[str]

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class StartsByYear(BaseModel):
    year: int
    starts: int

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class CompetitionResult(BaseModel):
    discipline: str
    code: str
    time: int
    improvement: bool
    performance: float
    points: Optional[int]

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class CompetitionDetail(BaseModel):
    competition_id: int
    name: str
    date: Optional[str]
    location: str
    pool_length: Optional[int] = None
    results: List[CompetitionResult]

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class PersonalBestDetail(BaseModel):
    discipline: str
    code: str
    time: int
    split_time: bool
    relay_part: bool
    points: Optional[int]
    date: Optional[str]
    location: Optional[str]

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class PersonalBestsByCourse(BaseModel):
    pb25m: List[PersonalBestDetail]
    pb50m: List[PersonalBestDetail]

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class StartsByStroke(BaseModel):
    K: int
    Z: int
    P: int
    M: int
    O: int

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class QuarterlyImprovement(BaseModel):
    quarter: str
    year: int
    quarter_num: int
    total_starts: int
    improvements: int
    improvement_rate: float

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class SwimmerProfileResponse(BaseModel):
    basic_info: SwimmerBasicInfo
    stats: SwimmerStats
    top_results: List[TopResult]
    starts_by_year: List[StartsByYear]
    competitions: List[CompetitionDetail]
    personal_bests: PersonalBestsByCourse
    starts_by_stroke: StartsByStroke
    quarterly_improvements: List[QuarterlyImprovement]

    class Config:
        alias_generator = to_camel
        populate_by_name = True


class SwimmerSearchResult(BaseModel):
    id: int
    name: str
    surname: str
    group: Optional[str]
    birth_year: int

    class Config:
        from_attributes = True
        alias_generator = to_camel
        populate_by_name = True
