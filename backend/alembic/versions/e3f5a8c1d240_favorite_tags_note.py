"""add tags/note to favorites

Revision ID: e3f5a8c1d240
Revises: d2e1a7c4b9f0
Create Date: 2026-06-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e3f5a8c1d240'
down_revision: Union[str, Sequence[str], None] = 'd2e1a7c4b9f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'favorites',
        sa.Column('tags', postgresql.ARRAY(sa.Text()), server_default='{}', nullable=False),
    )
    op.add_column('favorites', sa.Column('note', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('favorites', 'note')
    op.drop_column('favorites', 'tags')
