"""real_racing_foundation

Revision ID: 9b3c7e1a2d40
Revises: 7d2a91c4e5f6
Create Date: 2026-09-23

Milestone 1 real-racing foundation:
- provider identity on Tournament / Race / Horse (+ uniqueness)
- track race number vs tournament race index (Race.raceNumber stays the 1..7 index)
- data origin (real | demo | fixture | legacy)
- explicit race availability / result status and runner status (rows are never
  deleted because they vanished from a provider response)
- provider odds kept apart from any MY50 dividend (Horse.odds becomes nullable)
- honest score status on tickets (pending instead of a fabricated 0/score)
- RacingMeeting, ProviderSyncState (quota/health), SyncTask (schedule),
  SyncLease (cross-process lease locks)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9b3c7e1a2d40"
down_revision: Union[str, Sequence[str], None] = "7d2a91c4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Known demo seed tournaments (app/seed.py). Only these are relabelled "demo";
# every other pre-existing tournament keeps origin "legacy".
_SEED_SLUGS = ("santa-anita-stakes", "gulfstream-park-2026", "churchill-downs-classic")


def upgrade() -> None:
    op.create_table(
        "RacingMeeting",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("providerMeetingId", sa.String(), nullable=False),
        sa.Column("origin", sa.String(), nullable=False, server_default="real"),
        sa.Column("trackName", sa.String(), nullable=False),
        sa.Column("trackCode", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column("meetingDate", sa.String(), nullable=False),
        sa.Column("timezone", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="scheduled"),
        sa.Column("raceCount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("eligibleRaceCount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tournamentDecision", sa.String(), nullable=False, server_default="pending"),
        sa.Column("providerStatus", sa.String(), nullable=True),
        sa.Column("lastErrorCode", sa.String(), nullable=True),
        sa.Column("lastSyncedAt", sa.BigInteger(), nullable=True),
        sa.Column("lastSuccessfulSyncAt", sa.BigInteger(), nullable=True),
        sa.Column("createdAt", sa.BigInteger(), nullable=False),
        sa.Column("updatedAt", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "providerMeetingId", name="uq_meeting_provider_meeting"),
    )
    op.create_index("ix_meeting_date", "RacingMeeting", ["meetingDate"])

    op.create_table(
        "ProviderSyncState",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("quotaDate", sa.String(), nullable=True),
        sa.Column("requestsToday", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("dailyLimit", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="unknown"),
        sa.Column("lastRequestAt", sa.BigInteger(), nullable=True),
        sa.Column("lastSuccessAt", sa.BigInteger(), nullable=True),
        sa.Column("lastErrorAt", sa.BigInteger(), nullable=True),
        sa.Column("lastErrorCode", sa.String(), nullable=True),
        sa.Column("consecutiveFailures", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("blockedUntil", sa.BigInteger(), nullable=True),
        sa.Column("updatedAt", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider"),
    )

    op.create_table(
        "SyncTask",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("refId", sa.String(), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("intervalSeconds", sa.Integer(), nullable=False, server_default="900"),
        sa.Column("nextDueAt", sa.BigInteger(), nullable=True),
        sa.Column("lastRunAt", sa.BigInteger(), nullable=True),
        sa.Column("lastSuccessAt", sa.BigInteger(), nullable=True),
        sa.Column("lastStatus", sa.String(), nullable=True),
        sa.Column("lastErrorCode", sa.String(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("updatedAt", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )

    op.create_table(
        "SyncLease",
        sa.Column("key", sa.String(), nullable=False),
        sa.Column("owner", sa.String(), nullable=False),
        sa.Column("acquiredAt", sa.BigInteger(), nullable=False),
        sa.Column("expiresAt", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )

    with op.batch_alter_table("Tournament", schema=None) as b:
        b.add_column(sa.Column("origin", sa.String(), nullable=False, server_default="legacy"))
        b.add_column(sa.Column("provider", sa.String(), nullable=True))
        b.add_column(sa.Column("providerMeetingId", sa.String(), nullable=True))
        b.add_column(sa.Column("meetingId", sa.Integer(), nullable=True))
        b.add_column(sa.Column("selectionPolicy", sa.String(), nullable=True))
        b.add_column(sa.Column("racesFrozenAt", sa.BigInteger(), nullable=True))
        b.create_unique_constraint("uq_tournament_provider_meeting", ["provider", "providerMeetingId"])
        b.create_foreign_key("fk_tournament_meeting", "RacingMeeting", ["meetingId"], ["id"])

    with op.batch_alter_table("Race", schema=None) as b:
        b.add_column(sa.Column("provider", sa.String(), nullable=True))
        b.add_column(sa.Column("providerRaceId", sa.String(), nullable=True))
        b.add_column(sa.Column("trackRaceNumber", sa.Integer(), nullable=True))
        b.add_column(sa.Column("postTime", sa.BigInteger(), nullable=True))
        b.add_column(sa.Column("resultStatus", sa.String(), nullable=False, server_default="none"))
        b.add_column(sa.Column("availability", sa.String(), nullable=False, server_default="active"))
        b.add_column(sa.Column("providerStatus", sa.String(), nullable=True))
        b.add_column(sa.Column("lastSyncedAt", sa.BigInteger(), nullable=True))
        b.create_unique_constraint("uq_race_provider_race", ["provider", "providerRaceId"])

    with op.batch_alter_table("Horse", schema=None) as b:
        b.alter_column("odds", existing_type=sa.Float(), nullable=True)
        b.add_column(sa.Column("provider", sa.String(), nullable=True))
        b.add_column(sa.Column("providerRunnerId", sa.String(), nullable=True))
        b.add_column(sa.Column("runnerStatus", sa.String(), nullable=False, server_default="active"))
        b.add_column(sa.Column("morningLineOdds", sa.Float(), nullable=True))
        b.add_column(sa.Column("liveOdds", sa.Float(), nullable=True))
        b.add_column(sa.Column("oddsUpdatedAt", sa.BigInteger(), nullable=True))
        b.create_unique_constraint("uq_horse_race_provider_runner", ["raceId", "providerRunnerId"])

    with op.batch_alter_table("RaceResult", schema=None) as b:
        b.add_column(sa.Column("source", sa.String(), nullable=False, server_default="admin"))
        b.add_column(sa.Column("isDeadHeat", sa.Boolean(), nullable=False, server_default=sa.false()))

    with op.batch_alter_table("Ticket", schema=None) as b:
        b.add_column(sa.Column("scoreStatus", sa.String(), nullable=False, server_default="unscored"))

    with op.batch_alter_table("TicketSelection", schema=None) as b:
        b.add_column(sa.Column("scoreStatus", sa.String(), nullable=False, server_default="unscored"))

    # ---- data backfill (no rows deleted) ----
    conn = op.get_bind()
    tournament = sa.table("Tournament", sa.column("slug", sa.String), sa.column("origin", sa.String))
    conn.execute(tournament.update().where(tournament.c.slug.in_(_SEED_SLUGS)).values(origin="demo"))

    horse = sa.table("Horse", sa.column("scratched", sa.Boolean), sa.column("runnerStatus", sa.String))
    conn.execute(horse.update().where(horse.c.scratched == sa.true()).values(runnerStatus="scratched"))

    ticket = sa.table("Ticket", sa.column("isScored", sa.Boolean), sa.column("scoreStatus", sa.String))
    conn.execute(ticket.update().where(ticket.c.isScored == sa.true()).values(scoreStatus="scored"))
    selection = sa.table("TicketSelection", sa.column("isScored", sa.Boolean), sa.column("scoreStatus", sa.String))
    conn.execute(selection.update().where(selection.c.isScored == sa.true()).values(scoreStatus="scored"))

    race = sa.table("Race", sa.column("id", sa.Integer), sa.column("resultStatus", sa.String))
    race_result = sa.table("RaceResult", sa.column("raceId", sa.Integer))
    conn.execute(
        race.update()
        .where(race.c.id.in_(sa.select(race_result.c.raceId).distinct()))
        .values(resultStatus="official")
    )


def downgrade() -> None:
    with op.batch_alter_table("TicketSelection", schema=None) as b:
        b.drop_column("scoreStatus")
    with op.batch_alter_table("Ticket", schema=None) as b:
        b.drop_column("scoreStatus")
    with op.batch_alter_table("RaceResult", schema=None) as b:
        b.drop_column("isDeadHeat")
        b.drop_column("source")

    # Horse.odds returns to NOT NULL: provider runners stored NULL, so give them
    # 0.0 (meaning "no legacy odds") before restoring the constraint.
    conn = op.get_bind()
    horse = sa.table("Horse", sa.column("odds", sa.Float))
    conn.execute(horse.update().where(horse.c.odds.is_(None)).values(odds=0.0))
    with op.batch_alter_table("Horse", schema=None) as b:
        b.drop_constraint("uq_horse_race_provider_runner", type_="unique")
        b.drop_column("oddsUpdatedAt")
        b.drop_column("liveOdds")
        b.drop_column("morningLineOdds")
        b.drop_column("runnerStatus")
        b.drop_column("providerRunnerId")
        b.drop_column("provider")
        b.alter_column("odds", existing_type=sa.Float(), nullable=False)

    with op.batch_alter_table("Race", schema=None) as b:
        b.drop_constraint("uq_race_provider_race", type_="unique")
        b.drop_column("lastSyncedAt")
        b.drop_column("providerStatus")
        b.drop_column("availability")
        b.drop_column("resultStatus")
        b.drop_column("postTime")
        b.drop_column("trackRaceNumber")
        b.drop_column("providerRaceId")
        b.drop_column("provider")

    with op.batch_alter_table("Tournament", schema=None) as b:
        b.drop_constraint("fk_tournament_meeting", type_="foreignkey")
        b.drop_constraint("uq_tournament_provider_meeting", type_="unique")
        b.drop_column("racesFrozenAt")
        b.drop_column("selectionPolicy")
        b.drop_column("meetingId")
        b.drop_column("providerMeetingId")
        b.drop_column("provider")
        b.drop_column("origin")

    op.drop_table("SyncLease")
    op.drop_table("SyncTask")
    op.drop_table("ProviderSyncState")
    op.drop_index("ix_meeting_date", table_name="RacingMeeting")
    op.drop_table("RacingMeeting")
