from datetime import datetime

from pydantic import BaseModel, model_validator
from typing import Optional, List

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
        else: # SQLAlchemy model instance
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


class ResultOut(BaseModel):
    discipline: DisciplineOut
    course: CourseOut
    time: int
    comparison_to_best: int
    split_time: Optional[bool] = None
    relay_part: Optional[bool] = None
    improvement: Optional[bool] = None
    competition_location: Optional[str] = None
    date: datetime

    class Config:
        from_attributes = True


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
