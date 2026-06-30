"""watched_projects table

Revision ID: g8c3d5e2f170
Revises: f7a2b9d4c510
Create Date: 2026-06-30

"""
from alembic import op
import sqlalchemy as sa

revision = "g8c3d5e2f170"
down_revision = "f7a2b9d4c510"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "watched_projects",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("project_id", sa.BigInteger(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("last_notified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "project_id", name="uq_watch_user_project"),
    )


def downgrade() -> None:
    op.drop_table("watched_projects")
