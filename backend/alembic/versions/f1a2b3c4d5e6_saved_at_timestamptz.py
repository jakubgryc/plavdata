"""training saved_at to timestamptz

Revision ID: f1a2b3c4d5e6
Revises: e3f4a5b6c7d8
Create Date: 2026-10-20 02:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e3f4a5b6c7d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing naive values were written as an aware UTC datetime into a
    # timestamp-without-tz column, which Postgres converted to the session
    # timezone (Europe/Prague) — so stored values are Prague local time.
    # Interpret them as such when converting to timestamptz.
    op.alter_column(
        "trainings",
        "saved_at",
        existing_type=sa.DateTime(),
        type_=sa.DateTime(timezone=True),
        existing_nullable=False,
        postgresql_using="saved_at AT TIME ZONE 'Europe/Prague'",
    )


def downgrade() -> None:
    op.alter_column(
        "trainings",
        "saved_at",
        existing_type=sa.DateTime(timezone=True),
        type_=sa.DateTime(),
        existing_nullable=False,
        postgresql_using="saved_at AT TIME ZONE 'Europe/Prague'",
    )
