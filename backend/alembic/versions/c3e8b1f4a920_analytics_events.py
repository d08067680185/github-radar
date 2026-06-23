"""add analytics_events table

Revision ID: c3e8b1f4a920
Revises: b1d4f7a92c30
Create Date: 2026-06-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3e8b1f4a920'
down_revision: Union[str, Sequence[str], None] = 'b1d4f7a92c30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'analytics_events',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('key', sa.String(length=200), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_analytics_events_created_at', 'analytics_events', ['created_at'])
    op.create_index('idx_analytics_kind_created', 'analytics_events', ['kind', 'created_at'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_analytics_kind_created', table_name='analytics_events')
    op.drop_index('ix_analytics_events_created_at', table_name='analytics_events')
    op.drop_table('analytics_events')
