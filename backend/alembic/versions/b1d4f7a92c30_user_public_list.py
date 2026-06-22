"""add public list fields to users

Revision ID: b1d4f7a92c30
Revises: a1c4e8b62d30
Create Date: 2026-06-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1d4f7a92c30'
down_revision: Union[str, Sequence[str], None] = 'a1c4e8b62d30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('public_slug', sa.String(length=32), nullable=True))
    op.add_column('users', sa.Column('public_listed', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('public_title', sa.String(length=120), nullable=True))
    op.create_index('ix_users_public_slug', 'users', ['public_slug'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_users_public_slug', table_name='users')
    op.drop_column('users', 'public_title')
    op.drop_column('users', 'public_listed')
    op.drop_column('users', 'public_slug')
