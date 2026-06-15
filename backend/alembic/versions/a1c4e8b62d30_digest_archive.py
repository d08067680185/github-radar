"""add digest_archives table

Revision ID: a1c4e8b62d30
Revises: f7a2b9d4c510
Create Date: 2026-06-15 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1c4e8b62d30'
down_revision: Union[str, Sequence[str], None] = 'f7a2b9d4c510'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'digest_archives',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('week_date', sa.Date(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('item_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('items', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_digest_archives_week_date'), 'digest_archives', ['week_date'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_digest_archives_week_date'), table_name='digest_archives')
    op.drop_table('digest_archives')
