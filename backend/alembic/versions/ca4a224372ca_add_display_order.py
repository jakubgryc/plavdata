"""add display order

Revision ID: ca4a224372ca
Revises: c4cd413126e4
Create Date: 2026-10-11 23:07:51.711341

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "ca4a224372ca"
down_revision: Union[str, Sequence[str], None] = "c4cd413126e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "groups",
        sa.Column(
            "display_order",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("groups", "display_order")
