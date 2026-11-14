"""Record successful feed imports."""

import sqlalchemy as sa
from alembic import op

revision = "ce765ce0aa14"
down_revision = "a8463da242be"
branch_labels = None
depends_on = None


def upgrade() -> None:
    table = op.create_table(
        "feed_sync",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.bulk_insert(table, [{"id": 1, "completed_at": None}])


def downgrade() -> None:
    op.drop_table("feed_sync")
