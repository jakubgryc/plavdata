"""drop unused swimmer_discipline_courses table

Revision ID: 5ad8679163d3
Revises: 49b09caf5991
Create Date: 2026-06-20 22:02:00.683557

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5ad8679163d3"
down_revision: Union[str, Sequence[str], None] = "49b09caf5991"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("swimmer_discipline_courses")


def downgrade() -> None:
    op.create_table(
        "swimmer_discipline_courses",
        sa.Column("swimmer_id", sa.BigInteger(), nullable=False),
        sa.Column("discipline_id", sa.BigInteger(), nullable=False),
        sa.Column("course_id", sa.BigInteger(), nullable=False),
        sa.Column("last_checked", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["discipline_id"], ["disciplines.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["swimmer_id"], ["swimmers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("swimmer_id", "discipline_id", "course_id"),
    )
