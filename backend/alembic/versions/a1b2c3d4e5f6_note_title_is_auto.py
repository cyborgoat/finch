"""note_title_is_auto

Revision ID: a1b2c3d4e5f6
Revises: 72a0d1bdad04
Create Date: 2026-07-09 16:40:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "72a0d1bdad04"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("note") as batch_op:
        batch_op.add_column(
            sa.Column(
                "title_is_auto",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )


def downgrade() -> None:
    with op.batch_alter_table("note") as batch_op:
        batch_op.drop_column("title_is_auto")
