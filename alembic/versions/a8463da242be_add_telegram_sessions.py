"""Store Telegram browser sessions."""

import sqlalchemy as sa
from alembic import op

revision = "a8463da242be"
down_revision = "bb21d8031c62"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "telegram_sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("code_hash", sa.String(64), unique=True),
        sa.Column("expires_at", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE")),
    )
    op.create_index("ix_telegram_sessions_expires_at", "telegram_sessions", ["expires_at"])


def downgrade() -> None:
    op.drop_table("telegram_sessions")
