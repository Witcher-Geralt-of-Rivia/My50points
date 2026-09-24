"""my50_fixed_dividend

Revision ID: d4a7f2c91e08
Revises: c3e8a61f5b27
Create Date: 2026-09-24

MY50 fixed dividends frozen at tournament publication (V1.1 precedence),
stored as exact decimal text, insert-only. Tied values carry
tieStatus = pending_tie_adjustment until the tenths rule is available.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4a7f2c91e08"
down_revision: Union[str, Sequence[str], None] = "c3e8a61f5b27"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "My50FixedDividend",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("raceId", sa.Integer(), sa.ForeignKey("Race.id"), nullable=False),
        sa.Column("horseId", sa.Integer(), sa.ForeignKey("Horse.id"), nullable=False),
        sa.Column("value", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("sourceValue", sa.String(), nullable=True),
        sa.Column("tieStatus", sa.String(), nullable=False, server_default="unique"),
        sa.Column("frozenAt", sa.BigInteger(), nullable=True),
        sa.UniqueConstraint("raceId", "horseId", name="uq_my50_dividend_race_horse"),
    )


def downgrade() -> None:
    op.drop_table("My50FixedDividend")
