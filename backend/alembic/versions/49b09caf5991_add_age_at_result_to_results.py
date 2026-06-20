"""add age_at_result to results

Revision ID: 49b09caf5991
Revises: 0b4b2e826fc1
Create Date: 2026-06-20 22:01:19.405469

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "49b09caf5991"
down_revision: Union[str, Sequence[str], None] = "0b4b2e826fc1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("results", sa.Column("age_at_result", sa.Integer(), nullable=True))

    op.execute("""
        UPDATE results
        SET age_at_result = EXTRACT(YEAR FROM results.date)::integer - swimmers.birth_year
        FROM swimmers
        WHERE results.swimmer_id = swimmers.id
    """)


def downgrade() -> None:
    op.drop_column("results", "age_at_result")
