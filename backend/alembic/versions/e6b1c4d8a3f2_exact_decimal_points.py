"""exact_decimal_points

Revision ID: e6b1c4d8a3f2
Revises: d4a7f2c91e08
Create Date: 2026-09-24

MY50 scores are exact decimals (points x frozen MY50 dividend, e.g.
25 x 4.50 = 112.50) and must never be rounded. Every points column becomes
BIGINT holding integer millionths (app.types.ExactPoints): exact on SQLite and
PostgreSQL, and SQL ordering/sums stay exact. Existing whole-number values are
multiplied by 1,000,000 (exact).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e6b1c4d8a3f2"
down_revision: Union[str, Sequence[str], None] = "d4a7f2c91e08"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCALE = 1_000_000
COLUMNS = {
    "Ticket": ("pointsEarned",),
    "TournamentTicket": ("totalPoints",),
    "TicketSelection": ("pointsEarned",),
    "TournamentRankSnapshot": ("pointsAtRace", "pointsBehindLeader", "pointsBehindNext"),
    "LeaderboardEntry": ("totalPoints", "fullPoints", "dualPoints", "smartPoints", "lastPointsChange", "pointsBehindNext"),
    "UserStats": ("totalPoints",),
}


def upgrade() -> None:
    for table, cols in COLUMNS.items():
        with op.batch_alter_table(table, schema=None) as b:
            for col in cols:
                b.alter_column(col, existing_type=sa.Integer(), type_=sa.BigInteger())
        for col in cols:
            op.execute(f'UPDATE "{table}" SET "{col}" = "{col}" * {SCALE} WHERE "{col}" IS NOT NULL')


def downgrade() -> None:
    # Lossy by nature (integer points cannot hold 112.50); refuse rather than round.
    raise RuntimeError("exact_decimal_points cannot be downgraded without rounding scores")
