import os
from enum import IntEnum, StrEnum


TARGET_CLUB = os.getenv("TARGET_CLUB")
STROKE_TITLES = ["Volný způsob", "Znak", "Prsa", "Motýlek", "Polohový závod"]
STROKE_CODES = ["K", "Z", "P", "M", "O"]
DISTANCES = [50, 100, 200, 400, 800, 1500]
DNF_THRESHOLD = 3600000
EXCLUDED_COMPETITION_LOCATIONS = ["Bohumín"]
DEFAULT_AFTER_DATE = "2000-01-01"
REFERER_RESULTS_URL = "https://vysledky.czechswimming.cz/statistiky"
GENDERS = ["MALE", "FEMALE"]

DISCIPLINE_ORDER = [
    "50 Z",
    "100 Z",
    "200 Z",
    "50 P",
    "100 P",
    "200 P",
    "50 M",
    "100 M",
    "200 M",
    "50 K",
    "100 K",
    "200 K",
    "400 K",
    "800 K",
    "1500 K",
    "100 O",
    "200 O",
    "400 O",
]


# Yarmill observed API magic constants.
class YarmillActivityItem(IntEnum):
    """activityItemId values for the api/TrainingDayActivity plan endpoint."""

    DZ = 23  # training done that day: 1/0
    JZ_VODA = 1  # number of water trainings that day
    JZ_SUCHO = 31  # unused — plavdata does not track dryland training
    HZ_VODA_DOPO = 57  # morning water training duration, MINUTES
    HZ_VODA_ODPO = 62  # afternoon water training duration, MINUTES
    KM_DOPO = 58  # morning training: total km
    KM_ODPO = 64  # afternoon training: total km
    NOHY_DOPO = 12  # morning training: kick km
    NOHY_ODPO = 66  # afternoon training: kick km
    TECHNIKA_DOPO = 13  # morning training: drill km
    TECHNIKA_ODPO = 78  # afternoon training: drill km
    HZ_SUCHO_DOPO = 59  # unused
    HZ_SUCHO_ODPO = 82  # unused


class YarmillAttendanceItem(IntEnum):
    """ActivityItemID values for the /api/attendance/save/user endpoint."""

    MORNING = 33  # morning training
    AFTERNOON = 47  # afternoon training


class YarmillAttendanceValue(IntEnum):
    """Possible attendance values in Yarmill."""

    ATTEND = 1
    FREE = 2
    EXCUSED = 3
    UNEXCUSED = 4


class YarmillAttributeId(IntEnum):
    """attributeId values for the api/TrainingDayAttribute endpoint."""

    MORNING = 1
    AFTERNOON = 9


class YarmillState(StrEnum):
    """state field of the plan endpoints."""

    PLAN = "P"
    REALITY = "R"  # unused in v1 — we always send PLAN
