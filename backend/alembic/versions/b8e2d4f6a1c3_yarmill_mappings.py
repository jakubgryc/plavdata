"""yarmill mappings

Revision ID: b8e2d4f6a1c3
Revises: a7b3c9d2e5f1
Create Date: 2026-10-28 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b8e2d4f6a1c3"
down_revision: Union[str, Sequence[str], None] = "a7b3c9d2e5f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "groups",
        sa.Column("yarmill_group_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "swimmers",
        sa.Column("yarmill_user_id", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("swimmers", "yarmill_user_id")
    op.drop_column("groups", "yarmill_group_id")
