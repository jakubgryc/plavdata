import time
import random
from dataclasses import dataclass


@dataclass
class SwimmerData:
    csps_id: int
    name: str
    surname: str
    group: str
    birth_year: int
    sex: str
    membership_start: str | None
    membership_end: str | None

def wait_random(lower: float = 0.5, upper: float = 1.5) -> None:
    wait_time = random.uniform(lower, upper)
    print(f"Waiting for {wait_time:.2f} seconds to avoid rate limiting...")
    time.sleep(wait_time)
