"""add duration_minutes to trainings

Revision ID: a7b3c9d2e5f1
Revises: f1a2b3c4d5e6
Create Date: 2026-10-28 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a7b3c9d2e5f1"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trainings",
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("trainings", "duration_minutes")
