"""drop group column in swimmers

Revision ID: c4cd413126e4
Revises: 5ad8679163d3
Create Date: 2026-10-11 22:32:57.317933

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4cd413126e4'
down_revision: Union[str, Sequence[str], None] = '5ad8679163d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('swimmers', 'group')


def downgrade() -> None:
    """Downgrade schema."""
    # Note: the old string values are not restorable; the column comes back empty.
    op.add_column('swimmers', sa.Column('group', sa.String(), nullable=True))
