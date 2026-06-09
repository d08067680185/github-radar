"""add readme_summary_en (英文 AI 简介)

Revision ID: d2e1a7c4b9f0
Revises: ac29dd64b628
Create Date: 2026-06-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd2e1a7c4b9f0'
down_revision: Union[str, Sequence[str], None] = 'ac29dd64b628'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('projects', sa.Column('readme_summary_en', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('projects', 'readme_summary_en')
