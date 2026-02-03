import heapq
import itertools
import math
import random
from dataclasses import asdict, dataclass
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Course, Discipline, PersonalBest, Swimmer


@dataclass
class SwimmerInfo:
    """Represents a swimmer's basic information and time for a specific stroke."""

    swimmer_id: int
    name: str
    surname: str
    time: int
    stroke: Optional[str] = None  # For relay assignments (Z, P, M, VZ)


@dataclass
class RelayResult:
    """Represents a single relay team result."""

    total_time: int
    swimmers: list[SwimmerInfo]

    def to_dict(self):
        """Convert to dictionary format for API response."""
        return {
            "totalTime": self.total_time,
            "swimmers": [asdict(s) for s in self.swimmers],
        }


@dataclass
class TeamResult:
    """Represents a team in equal/fun relays."""

    swimmers: list[SwimmerInfo]
    total_time: int

    def to_dict(self):
        """Convert to dictionary format for API response."""
        return {
            "swimmers": [asdict(s) for s in self.swimmers],
            "totalTime": self.total_time,
        }


@dataclass
class EqualRelaysResult:
    """Result of equal relays calculation."""

    teams: list[TeamResult]
    delta: int
    swimmers_per_relay: int

    def to_dict(self):
        """Convert to dictionary format for API response."""
        return {
            "teams": [team.to_dict() for team in self.teams],
            "delta": self.delta,
            "swimmersPerRelay": self.swimmers_per_relay,
        }


def calculate_best_freestyle_relay(
    swimmer_ids: list[int], db: Session
) -> list[RelayResult]:
    # This function was implemented with the help of Copilot
    # 1. FETCH ALL DATA ONCE
    # Get all relevant 50K freestyle PBs for these swimmers in one query
    pbs = (
        db.query(PersonalBest, Swimmer.name, Swimmer.surname)
        .join(Discipline, PersonalBest.discipline_id == Discipline.id)
        .join(Swimmer, PersonalBest.swimmer_id == Swimmer.id)
        .join(Course, PersonalBest.course_id == Course.id)
        .filter(
            PersonalBest.swimmer_id.in_(swimmer_ids),
            Discipline.code == "50 K",
            Course.length == 25,
        )
        .all()
    )

    # 2. ORGANIZE DATA IN MEMORY
    # Structure: { swimmer_id: SwimmerInfo }
    swimmer_lookup: dict[int, SwimmerInfo] = {}
    for pb, name, surname in pbs:
        sid = pb.swimmer_id
        if sid not in swimmer_lookup:
            swimmer_lookup[sid] = SwimmerInfo(
                swimmer_id=sid, name=name, surname=surname, time=pb.time, stroke="VZ"
            )
        else:
            # Keep the best (minimum) time for this swimmer
            swimmer_lookup[sid].time = min(swimmer_lookup[sid].time, pb.time)

    if len(swimmer_lookup) < 4:
        raise HTTPException(status_code=400, detail="Not enough 50 free times")

    # 3. INITIALIZE HEAP
    # We store (-total_time, counter, total_time, relay_swimmers)
    # Counter is used as tiebreaker to avoid comparing relay_swimmers lists.
    top_relays_heap = []
    counter = 0

    # 4. ITERATE THROUGH COMBINATIONS
    # This generates every possible combination of 4 swimmers (order doesn't matter for freestyle)
    for combo in itertools.combinations(swimmer_lookup.keys(), 4):
        total_time = sum(swimmer_lookup[swimmer_id].time for swimmer_id in combo)

        relay_swimmers = [swimmer_lookup[swimmer_id] for swimmer_id in combo]

        # We want to keep the 10 SMALLEST totals.
        # We push (-total_time) so the 'slowest' of the 'best' is at index 0.
        # Counter ensures we never compare relay_swimmers lists.
        entry = (-total_time, counter, total_time, relay_swimmers)
        counter += 1

        if len(top_relays_heap) < 10:
            heapq.heappush(top_relays_heap, entry)
        elif entry > top_relays_heap[0]:
            # If this relay is better (smaller time, so larger negative)
            # than the worst in our top 10, replace it.
            heapq.heapreplace(top_relays_heap, entry)

    # 5. FORMAT FINAL RESULTS
    # Sort from fastest to slowest
    final_results: list[RelayResult] = []
    while top_relays_heap:
        neg_time, counter, total_time, swimmers = heapq.heappop(top_relays_heap)
        final_results.append(RelayResult(total_time=total_time, swimmers=swimmers))

    # Since we popped from a heap, we need to reverse to get fastest first
    return final_results[::-1]


def calculate_best_medley_relay(
    swimmer_ids: list[int], db: Session
) -> list[RelayResult]:
    # This function was implemented with the help of Copilot
    # Mapping strokes to their discipline codes
    # Order: Back (Z), Breast (P), Fly (M), Free (K)
    stroke_codes = ["50 Z", "50 P", "50 M", "50 K"]
    stroke_names = ["Z", "P", "M", "VZ"]

    # 1. FETCH ALL DATA ONCE
    # Get all relevant PBs for these swimmers in one query
    pbs = (
        db.query(PersonalBest, Discipline.code, Swimmer.name, Swimmer.surname)
        .join(Discipline, PersonalBest.discipline_id == Discipline.id)
        .join(Swimmer, PersonalBest.swimmer_id == Swimmer.id)
        .join(Course, PersonalBest.course_id == Course.id)
        .filter(
            PersonalBest.swimmer_id.in_(swimmer_ids),
            Discipline.code.in_(stroke_codes),
            Course.length == 25,
        )
        .all()
    )

    # 2. ORGANIZE DATA IN MEMORY
    # Structure: { swimmer_id: { "id": ..., "name": ..., "surname": ..., "times": {"50 Z": 30.5, ...} } }
    swimmer_lookup: dict[int, dict] = {}
    for pb, code, name, surname in pbs:
        sid = pb.swimmer_id
        if sid not in swimmer_lookup:
            swimmer_lookup[sid] = {
                "swimmer_id": sid,
                "name": name,
                "surname": surname,
                "times": {},
            }
        swimmer_lookup[sid]["times"][code] = pb.time

    # 3. INITIALIZE HEAP
    # We store (-total_time, counter, total_time, relay_swimmers)
    # Python's heapq is a min-heap. By using negative times, the "largest"
    # value (the slowest time) stays at the top of the heap for easy removal.
    # Counter is used as tiebreaker to avoid comparing relay_swimmers lists.
    top_relays_heap = []
    counter = 0

    # 4. ITERATE THROUGH COMBINATIONS
    # This generates every possible order of 4 swimmers
    for combo in itertools.permutations(swimmer_lookup.keys(), 4):
        total_time = 0
        relay_swimmers: list[SwimmerInfo] = []
        is_valid_relay = True

        for i, swimmer_id in enumerate(combo):
            target_stroke = stroke_codes[i]
            time = swimmer_lookup[swimmer_id]["times"].get(target_stroke)

            if time is None:
                is_valid_relay = False
                break

            total_time += time
            relay_swimmers.append(
                SwimmerInfo(
                    swimmer_id=swimmer_id,
                    name=swimmer_lookup[swimmer_id]["name"],
                    surname=swimmer_lookup[swimmer_id]["surname"],
                    stroke=stroke_names[i],
                    time=time,
                )
            )

        if is_valid_relay:
            # We want to keep the 10 SMALLEST totals.
            # We push (-total_time) so the 'slowest' of the 'best' is at index 0.
            # Counter ensures we never compare relay_swimmers lists.
            entry = (-total_time, counter, total_time, relay_swimmers)
            counter += 1

            if len(top_relays_heap) < 10:
                heapq.heappush(top_relays_heap, entry)
            elif entry > top_relays_heap[0]:
                # If this relay is better (smaller time, so larger negative)
                # than the worst in our top 10, replace it.
                heapq.heapreplace(top_relays_heap, entry)

    # 5. FORMAT FINAL RESULTS
    # Sort from fastest to slowest
    final_results: list[RelayResult] = []
    while top_relays_heap:
        neg_time, counter, total_time, swimmers = heapq.heappop(top_relays_heap)
        final_results.append(RelayResult(total_time=total_time, swimmers=swimmers))

    # Since we popped from a heap, we need to reverse to get fastest first
    return final_results[::-1]


def calculate_equal_relays(
    swimmer_ids: list[int], num_relays: int, db: Session
) -> EqualRelaysResult:
    """
    Split swimmers into num_relays teams that are as equal in total time as possible.
    Uses Monte Carlo optimization to find the most balanced team assignments.

    IMPORTANT: Each swimmer is assigned to exactly ONE team. If the number of swimmers
    doesn't divide evenly, the fastest swimmers within each team will swim twice
    (multiple legs) IN THEIR OWN TEAM ONLY.

    Args:
        swimmer_ids: List of swimmer IDs to split into teams
        num_relays: Number of relay teams to create
        db: Database session

    Returns:
        EqualRelaysResult with teams, delta, and swimmers_per_relay
    """

    ## This function was implementede with the help of Copilot
    if num_relays < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 relays")

    # 1. FETCH ALL 50K FREESTYLE PBs IN ONE QUERY
    pbs = (
        db.query(PersonalBest, Swimmer.id, Swimmer.name, Swimmer.surname)
        .join(Swimmer, PersonalBest.swimmer_id == Swimmer.id)
        .join(Discipline, PersonalBest.discipline_id == Discipline.id)
        .join(Course, PersonalBest.course_id == Course.id)
        .filter(
            PersonalBest.swimmer_id.in_(swimmer_ids),
            Discipline.code == "50 K",
            Course.length == 25,
        )
        .all()
    )

    if not pbs:
        raise HTTPException(
            status_code=400, detail="No swimmers have 50K freestyle PBs"
        )

    # 2. BUILD SWIMMER DATA STRUCTURE
    swimmers_data: list[SwimmerInfo] = []
    for pb, swimmer_id, name, surname in pbs:
        swimmers_data.append(
            SwimmerInfo(
                swimmer_id=swimmer_id,
                name=name,
                surname=surname,
                time=pb.time,
                stroke="VZ",
            )
        )

    # Sort by time (fastest first) for handling clones
    swimmers_data.sort(key=lambda x: x.time)

    num_swimmers = len(swimmers_data)
    swimmers_per_relay = math.ceil(num_swimmers / num_relays)  # Ceiling division

    # 3. MONTE CARLO OPTIMIZATION
    # Strategy: Split swimmers into distinct teams first, then add clones within teams if needed
    best_assignment: Optional[list[dict]] = None
    best_delta = float("inf")
    iterations = 10000

    for _ in range(iterations):
        # Shuffle and split into teams (each swimmer goes to exactly ONE team)
        shuffled = swimmers_data.copy()
        random.shuffle(shuffled)

        teams = []
        for i in range(num_relays):
            # Assign base swimmers to this team
            start_idx = (i * num_swimmers) // num_relays
            end_idx = ((i + 1) * num_swimmers) // num_relays
            team_base_swimmers = shuffled[start_idx:end_idx]

            # If this team needs more swimmers to reach swimmers_per_relay,
            # clone the fastest swimmers from THIS team
            team_swimmers = team_base_swimmers.copy()
            slots_needed = swimmers_per_relay - len(team_base_swimmers)

            if slots_needed > 0:
                # Sort this team by time to get fastest swimmers
                team_sorted = sorted(team_base_swimmers, key=lambda x: x.time)
                for j in range(slots_needed):
                    # Clone the swimmer info (create new instance)
                    original = team_sorted[j % len(team_sorted)]
                    clone = SwimmerInfo(
                        swimmer_id=original.swimmer_id,
                        name=original.name,
                        surname=original.surname,
                        time=original.time,
                        stroke="VZ",
                    )
                    team_swimmers.append(clone)

            team_time = sum(s.time for s in team_swimmers)
            teams.append(
                {
                    "swimmers": team_swimmers,
                    "totalTime": team_time,
                }
            )

        # Calculate delta (difference between fastest and slowest team)
        team_times = [team["totalTime"] for team in teams]
        delta = max(team_times) - min(team_times)

        # Keep track of best assignment
        if delta < best_delta:
            best_delta = delta
            best_assignment = teams

    # 5. FORMAT FINAL RESULTS
    formatted_teams: list[TeamResult] = []
    for idx, team in enumerate(best_assignment):
        swimmers_list: list[SwimmerInfo] = team["swimmers"]
        formatted_teams.append(
            TeamResult(
                swimmers=swimmers_list,
                total_time=team["totalTime"],
            )
        )

    # Sort teams by total time (fastest first)
    formatted_teams.sort(key=lambda x: x.total_time)

    return EqualRelaysResult(
        teams=formatted_teams,
        delta=best_delta,
        swimmers_per_relay=swimmers_per_relay,
    )
