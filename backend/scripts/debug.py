from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import Swimmer, PersonalBest, Discipline, Course


def format_time(ms: int) -> str:
    minutes, rem_ms = divmod(ms, 60_000)
    seconds, milliseconds = divmod(rem_ms, 1_000)
    return f"{minutes:02}:{seconds:02}.{milliseconds:03}"


def print_personal_bests(swimmer: Swimmer):
    print(f"\n🏊 Personal Bests for {swimmer.name} {swimmer.surname}:")
    header = (
        f"{'Discipline':<20} {'Time':^10} {'Date':^12} {'Location':<20} {'Points':>6}"
    )
    print(header)
    print("-" * len(header))

    for pb in swimmer.personal_bests:
        formatted_time = format_time(pb.time)
        print(
            f"{pb.discipline.title:<20} {formatted_time:^10} {str(pb.date):^12} {pb.competition_location:<20} {pb.points:>6}"
        )


def debug():
    db: Session = SessionLocal()

    # print("=== Swimmers ===")
    # for swimmer in db.query(Swimmer).limit(10).all():
    #     print(f"{swimmer.id}: {swimmer.name} {swimmer.surname} ({swimmer.group})")
    #
    # print("\n=== Disciplines ===")
    # for d in db.query(Discipline).order_by(Discipline.code).limit(10):
    #     print(f"{d.id}: {d.code} - {d.title} ({d.gender})")
    #
    # print("\n=== Courses ===")
    # for c in db.query(Course).all():
    #     print(f"{c.id}: {c.type} ({c.length}m)")
    #
    # print("\n=== Personal Bests ===")
    # for pb in db.query(PersonalBest).limit(10):
    #     print(
    #         f"{pb.id}: {pb.swimmer.name} {pb.swimmer.surname} - "
    #         f"{pb.discipline.code} ({pb.course.length}m): {pb.time}s on {pb.date}"
    #     )
    #

    swimmer = (
        db.query(Swimmer)
        .filter(Swimmer.name.ilike("Lukáš"), Swimmer.surname.ilike("Orlík"))
        .first()
    )

    results = (
        db.query(PersonalBest)
        .join(Swimmer)
        .join(Course)
        .filter(Swimmer.gender == "M", Course.length == 25)
        .order_by(PersonalBest.points.desc())
        .limit(30)
        .all()
    )

    print("-" * 40)
    for i, pb in enumerate(results, start=1):
        print(
            f"{i:>2} "
            f"{pb.swimmer.name:<10} {pb.swimmer.surname:<10} "
            f"{pb.discipline.title:<20} "
            f"{format_time(pb.time):>9}  "
            f"{pb.points:>4}"
        )

    # print_personal_bests(swimmer)
    # for pb in swimmer.personal_bests:
    #     print(
    #         f"{pb.swimmer.name} {pb.swimmer.surname} - "
    #         f"{pb.discipline.code} ({pb.course.length}m): {format_time(pb.time)}s on {pb.date}"
    #     )
    db.close()


if __name__ == "__main__":
    debug()
