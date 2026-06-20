"""baseline

Revision ID: 0b4b2e826fc1
Revises:
Create Date: 2026-06-20 21:49:54.786327

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "0b4b2e826fc1"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
