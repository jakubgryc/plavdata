from collections import defaultdict
from typing import NamedTuple
from datetime import date

from sqlalchemy.orm import Session, joinedload
from app.db import SessionLocal
from app.models import Swimmer, PersonalBest, Discipline, Course, Result
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.comments import Comment
from openpyxl.styles import Border, Side, Font, Alignment, PatternFill
from openpyxl.utils import get_column_letter


class PBInfo(NamedTuple):
    name: str
    surname: str
    birth_year: int
    group: str
    discipline: str
    course: str
    time: int
    date: date
    location: str


def format_time(ms: int | None) -> str:
    if ms is None:
        return ""
    minutes, rem_ms = divmod(ms, 60_000)
    seconds, milliseconds = divmod(rem_ms, 1_000)
    return f"{minutes:02}:{seconds:02}.{milliseconds // 10:02}"


def discipline_sort_key(disc_key: str) -> tuple:
    """
    Assumes disc_key is like '100 Z 25m' (code + course)
    """

    stroke_order = {
        "Z": 0,
        "P": 1,
        "M": 2,
        "K": 3,
        "O": 4,
    }
    try:
        parts = disc_key.split()  # e.g. ['100', 'Z', '25m']
        distance = int(parts[0])
        stroke_code = parts[1].upper()
        return (stroke_order.get(stroke_code, 99), distance)
    except Exception:
        return (999, 999)


def calc_table_range(data):
    """
    Calculate the range of a table based on the data provided.
    :param data: List of lists containing the data for the table.
    :return: String representing the range of the table (e.g., "A1:D10").
    """
    num_rows = len(data)
    num_cols = len(data[0])
    start_cell = "A1"
    end_cell = f"{chr(65 + num_cols - 1)}{num_rows}"
    return f"{start_cell}:{end_cell}"


def load_personal_bests():
    """Fetches personal bests from the database.

    Returns:
        list[PBInfo]: List of personal bests with swimmer details.
    """

    db: Session = SessionLocal()

    pbs: list[PBInfo] = [
        PBInfo(*row)
        for row in db.query(
            Swimmer.name,
            Swimmer.surname,
            Swimmer.birth_year,
            Swimmer.group,
            Discipline.code,
            Course.type,
            PersonalBest.time,
            PersonalBest.date,
            PersonalBest.competition_location,
        )
        .join(PersonalBest.swimmer)
        .join(PersonalBest.swimmer)
        .join(PersonalBest.discipline)
        .join(PersonalBest.course)
        .order_by(Swimmer.surname, Swimmer.name, Swimmer.id)
        .all()
    ]

    db.close()

    return pbs


def get_all_swimmers():
    db: Session = SessionLocal()

    groups = ["Z1", "Z2", "P1", "veteran"]

    swimmers = db.query(Swimmer).filter(Swimmer.group.in_(groups)).all()

    db.close()

    return swimmers


def get_all_disciplines():
    db: Session = SessionLocal()

    disciplines = [row[0] for row in db.query(Discipline.code).all()]

    db.close()

    return disciplines


def init_data():
    """Initialize the data structure for storing personal bests."""
    data = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))
    all_swimmers = get_all_swimmers()
    all_disciplines = get_all_disciplines()

    for swimmer in all_swimmers:
        swimmer_key = (swimmer.name, swimmer.surname, swimmer.birth_year)
        for course in ["SCM", "LCM"]:
            for discipline in all_disciplines:
                data[course][swimmer.group][swimmer_key][discipline] = None

    return data


header_fill = PatternFill(fill_type="solid", start_color="B00D08")
white_font = Font(bold=True, color="FFFFFF")

red_font = Font(color="FF0000")

# Color setup
gray_fill_1 = PatternFill("solid", start_color="8D8D8D")
gray_fill_2 = PatternFill("solid", start_color="D6D6D6")
red_fill_1 = PatternFill("solid", start_color="732B29")
red_fill_2 = PatternFill("solid", start_color="953735")
title_fill = PatternFill("solid", start_color="000000")
name_fill = PatternFill("solid", fgColor="DE5A72")
white_font = Font(color="FFFFFF")
bold_font = Font(bold=True)
title_font = Font(bold=True, size=20, color="FFFFFF")
group_header_font = Font(bold=True, size=16)
group_header_fill = PatternFill("solid", start_color="B00D08")
border = Border(*[Side(style="thin", color="000000")] * 4)

# Stroke sort order by code
stroke_order = {"M": 0, "Z": 1, "P": 2, "K": 3, "O": 4}
group_order = {"Z1": 0, "Z2": 1, "P1": 2, "veteran": 3, None: 99}
group_display_name = {
    "Z1": "Z1",
    "Z2": "Z2",
    "P1": "P1",
    "veteran": "bývalí",
    None: "Nezařazení",
}

today = date.today().strftime("%d.%m.%Y")


def generate_excel_from_pbs(pbs: list[PBInfo], filename: str = "personal_bests.xlsx"):
    # Organize data by course type -> group -> swimmer_id -> {discipline: PBInfo}
    all_discipline_keys = defaultdict(set)

    structured_data = init_data()

    group_order = {
        "Z1": 0,
        "Z2": 1,
        "P1": 2,
        "veteran": 3,
        None: 99,  # in case some swimmers have no group
    }
    group_display_name = {
        "Z1": "Z1",
        "Z2": "Z2",
        "P1": "P1",
        "veteran": "bývalí",
        None: "Nezařazení",
    }

    for pb in pbs:
        course = pb.course
        swimmer_key = (pb.name, pb.surname, pb.birth_year)
        group = pb.group
        disc_key = pb.discipline

        structured_data[course][group][swimmer_key][disc_key] = pb
        all_discipline_keys[course].add(disc_key)

    discipline_keys = sorted(all_discipline_keys["SCM"], key=discipline_sort_key)
    headers = ["Jméno", "Ročník"] + [disc for disc in discipline_keys]
    total_columns = len(headers)

    wb = Workbook()

    for i, (course, groups) in enumerate(structured_data.items()):
        ws = wb.active if i == 0 else wb.create_sheet(title=course)
        ws.title = course
        ws.column_dimensions["A"].width = 20
        ws.column_dimensions["B"].width = 8

        current_row = 1
        start_col = get_column_letter(1)
        end_col = get_column_letter(total_columns)
        ws.merge_cells(f"{start_col}{current_row}:{end_col}{current_row}")
        cell = ws.cell(
            row=current_row,
            column=1,
            value=f"Osobní rekordy {'25' if course == 'SCM' else '50'} m - aktualizováno {today}",
        )
        cell.font = title_font
        cell.fill = title_fill
        cell.border = border
        cell.alignment = Alignment(horizontal="center", vertical="center")
        current_row += 1

        for group_name in sorted(groups.keys(), key=lambda g: group_order.get(g, 99)):
            group_label = group_display_name.get(group_name, group_name)

            # Group header row (merged)
            start_col = get_column_letter(1)
            end_col = get_column_letter(total_columns)
            ws.merge_cells(f"{start_col}{current_row}:{end_col}{current_row}")
            cell = ws.cell(row=current_row, column=1, value=f"{group_label}")
            cell.font = group_header_font
            cell.fill = group_header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            current_row += 1

            # Header row
            for col_index, header in enumerate(headers, start=1):
                cell = ws.cell(row=current_row, column=col_index, value=header)
                cell.alignment = Alignment(horizontal="center", vertical="center")
                cell.fill = header_fill
                cell.font = bold_font
                cell.border = border

            current_row += 1

            # Swimmer rows
            swimmers = groups[group_name]
            for swimmer_key, pb_map in swimmers.items():
                name, surname, year = swimmer_key
                row_data = [f"{surname} {name}", year]
                for disc in discipline_keys:
                    pb = pb_map.get(disc)
                    if pb:
                        row_data.append(
                            (
                                format_time(pb.time),
                                f"{pb.location}, {pb.date.strftime('%d.%m.%Y')}",
                            )
                        )
                    else:
                        row_data.append(("", None))

                fill = gray_fill_1 if current_row % 2 == 0 else gray_fill_2

                for col_index, val in enumerate(row_data, start=1):
                    cell = ws.cell(row=current_row, column=col_index)
                    cell.border = border
                    cell.alignment = Alignment(wrap_text=True)
                    cell.fill = fill

                    if col_index in (1, 2):  # name, surname
                        cell.fill = red_fill_1 if current_row % 2 == 0 else red_fill_2
                        cell.font = bold_font
                        cell.alignment = Alignment(horizontal="left", vertical="center")

                    if isinstance(val, tuple):
                        cell.value = val[0]
                        if val[1]:
                            cell.comment = Comment(val[1], "PB Export")
                    else:
                        cell.value = val
                ws.row_dimensions[current_row].height = 30
                current_row += 1

            ws.row_dimensions[current_row].height = 10
            current_row += 1  # spacer between groups

    wb.save(filename)


def debug():
    pbs = load_personal_bests()

    generate_excel_from_pbs(pbs)

    # wb = Workbook()
    # ws = wb.active
    # ws.title = "Results"

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

    # thin = Side(border_style="thin", color="000000")
    # border = Border(top=thin, left=thin, right=thin, bottom=thin)
    #
    # stroke = "100 P"
    # results = (
    #     db.query(Result)
    #     .join(Swimmer)
    #     .join(Course)
    #     .join(Discipline)
    #     .filter(Discipline.code == stroke, Course.length == 25, Swimmer.gender == "M")
    #     .order_by(Result.time)
    #     .limit(20)
    #     .all()
    # )
    #
    # header = ["Rank", "Surname", "Name", "Time", "Split Time", "Date", "Location"]
    # data = []
    # data.append(header)
    # for i, r in enumerate(results, start=1):
    #     formatted_time = format_time(r.time)
    #     split_time = "mezicas" if r.split_time else ""
    #     data.append(
    #         [
    #             i,
    #             r.swimmer.surname,
    #             r.swimmer.name,
    #             formatted_time,
    #             split_time,
    #             str(r.date),
    #             r.competition_location,
    #         ]
    #     )
    #
    # rows = len(data)
    # cols = len(data[0])
    # # ws.add_table(table)
    # for row in data:
    #     ws.append(row)
    #
    # for row in ws.iter_rows(min_row=2, max_row=rows, min_col=1, max_col=cols):
    #     for cell in row:
    #         cell.border = border
    # wb.save("results.xlsx")

    # print(f"\n=== Results for {stroke} (25m)===")
    # for i, r in enumerate(results, start=1):
    #     print(
    #         f"{i:<3} {r.swimmer.surname:<10} {r.swimmer.name:<20}"
    #         f"{format_time(r.time):<14} {'mezičas' if r.split_time else '':^10} {r.date}  {r.competition_location:<20} "
    #     )

    # swimmer = (
    #     db.query(Swimmer)
    #     .filter(Swimmer.name.ilike("Lukáš"), Swimmer.surname.ilike("Orlík"))
    #     .first()
    # )
    #
    # results = (
    #     db.query(PersonalBest)
    #     .join(Swimmer)
    #     .join(Course)
    #     .filter(Swimmer.gender == "M", Course.length == 25)
    #     .order_by(PersonalBest.points.desc())
    #     .limit(30)
    #     .all()
    # )
    #
    # print("-" * 40)
    # for i, pb in enumerate(results, start=1):
    #     print(
    #         f"{i:>2} "
    #         f"{pb.swimmer.name:<10} {pb.swimmer.surname:<10} "
    #         f"{pb.discipline.title:<20} "
    #         f"{format_time(pb.time):>9}  "
    #         f"{pb.points:>4}"
    #     )
    #
    # print_personal_bests(swimmer)
    # for pb in swimmer.personal_bests:
    #     print(
    #         f"{pb.swimmer.name} {pb.swimmer.surname} - "
    #         f"{pb.discipline.code} ({pb.course.length}m): {format_time(pb.time)}s on {pb.date}"
    #     )


if __name__ == "__main__":
    debug()
