"""attendance module

Revision ID: e3f4a5b6c7d8
Revises: ca4a224372ca
Create Date: 2026-10-19 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, Sequence[str], None] = "ca4a224372ca"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- seasons ---
    op.create_table(
        "seasons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_seasons_id"), "seasons", ["id"], unique=False)

    # --- season_group_members ---
    op.create_table(
        "season_group_members",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("swimmer_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["swimmer_id"], ["swimmers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id", "group_id", "swimmer_id", name="uix_season_group_swimmer"
        ),
    )
    op.create_index(
        op.f("ix_season_group_members_id"),
        "season_group_members",
        ["id"],
        unique=False,
    )
    op.create_index(
        "idx_season_group_members_group_season",
        "season_group_members",
        ["group_id", "season_id"],
        unique=False,
    )

    # --- training_schedules ---
    op.create_table(
        "training_schedules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.String(5), nullable=False),
        sa.Column("end_time", sa.String(5), nullable=False),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id", "group_id", "weekday", name="uix_season_group_weekday"
        ),
    )
    op.create_index(
        op.f("ix_training_schedules_id"), "training_schedules", ["id"], unique=False
    )
    op.create_index(
        "idx_training_schedules_season_group",
        "training_schedules",
        ["season_id", "group_id"],
        unique=False,
    )

    # --- coach_groups ---
    op.create_table(
        "coach_groups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id", "group_id", "user_id", name="uix_season_group_user"
        ),
    )
    op.create_index(op.f("ix_coach_groups_id"), "coach_groups", ["id"], unique=False)

    # --- trainings ---
    op.create_table(
        "trainings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("total_meters", sa.Integer(), nullable=True),
        sa.Column("drill_meters", sa.Integer(), nullable=True),
        sa.Column("kick_meters", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("saved_by", sa.Integer(), nullable=False),
        sa.Column("saved_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.ForeignKeyConstraint(["saved_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "date", name="uix_training_group_date"),
    )
    op.create_index(op.f("ix_trainings_id"), "trainings", ["id"], unique=False)

    # --- attendances ---
    op.create_table(
        "attendances",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("training_id", sa.Integer(), nullable=False),
        sa.Column("swimmer_id", sa.Integer(), nullable=False),
        sa.Column("present", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["training_id"], ["trainings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["swimmer_id"], ["swimmers.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("training_id", "swimmer_id", name="uix_training_swimmer"),
    )
    op.create_index(op.f("ix_attendances_id"), "attendances", ["id"], unique=False)

    # --- users: add email and role columns ---
    op.add_column(
        "users",
        sa.Column("email", sa.String(), nullable=True),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(),
            nullable=False,
            server_default=sa.text("'coach'"),
        ),
    )
    # Promote all pre-existing users to admin
    op.execute("UPDATE users SET role = 'admin'")


def downgrade() -> None:
    # --- users: drop columns ---
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_column("users", "role")
    op.drop_column("users", "email")

    # --- attendances ---
    op.drop_index(op.f("ix_attendances_id"), table_name="attendances")
    op.drop_table("attendances")

    # --- trainings ---
    op.drop_index(op.f("ix_trainings_id"), table_name="trainings")
    op.drop_table("trainings")

    # --- coach_groups ---
    op.drop_index(op.f("ix_coach_groups_id"), table_name="coach_groups")
    op.drop_table("coach_groups")

    # --- training_schedules ---
    op.drop_index(
        "idx_training_schedules_season_group", table_name="training_schedules"
    )
    op.drop_index(op.f("ix_training_schedules_id"), table_name="training_schedules")
    op.drop_table("training_schedules")

    # --- season_group_members ---
    op.drop_index(
        "idx_season_group_members_group_season", table_name="season_group_members"
    )
    op.drop_index(op.f("ix_season_group_members_id"), table_name="season_group_members")
    op.drop_table("season_group_members")

    # --- seasons ---
    op.drop_index(op.f("ix_seasons_id"), table_name="seasons")
    op.drop_table("seasons")
