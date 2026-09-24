from datetime import datetime

from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.types import PrismaDateTime


class User(Base):
    __tablename__ = "User"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String, unique=True)
    email: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    passwordHash: Mapped[str | None] = mapped_column(String, nullable=True)
    isGuest: Mapped[bool] = mapped_column(Boolean, default=False)
    guestToken: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    avatarColor: Mapped[str] = mapped_column(String, default="#7c3aed")
    gameMode: Mapped[int] = mapped_column(Integer, default=2)
    role: Mapped[str] = mapped_column(String, default="member")  # founder | admin | member
    country: Mapped[str | None] = mapped_column(String, nullable=True)
    birthYear: Mapped[int | None] = mapped_column(Integer, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stats: Mapped["UserStats | None"] = relationship(back_populates="user", uselist=False)
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="user")
    tournamentTickets: Mapped[list["TournamentTicket"]] = relationship(back_populates="user")


class Tournament(Base):
    __tablename__ = "Tournament"
    __table_args__ = (
        # Provider identity: one MY50 tournament per provider meeting.
        UniqueConstraint("provider", "providerMeetingId", name="uq_tournament_provider_meeting"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    track: Mapped[str] = mapped_column(String)
    location: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="upcoming")
    totalRaces: Mapped[int] = mapped_column(Integer)
    currentRace: Mapped[int] = mapped_column(Integer, default=0)
    date: Mapped[datetime] = mapped_column(PrismaDateTime)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    imageUrl: Mapped[str | None] = mapped_column(String, nullable=True)
    vendorMeetId: Mapped[str | None] = mapped_column(String, nullable=True)  # legacy, unused
    # Data origin: real (provider pipeline) | demo (seed) | fixture (synthetic
    # provider fixtures, dev/tests only) | legacy (pre-provider scraped data).
    origin: Mapped[str] = mapped_column(String, default="legacy", server_default="legacy")
    provider: Mapped[str | None] = mapped_column(String, nullable=True)
    providerMeetingId: Mapped[str | None] = mapped_column(String, nullable=True)
    meetingId: Mapped[int | None] = mapped_column(ForeignKey("RacingMeeting.id"), nullable=True)
    # Race-selection policy used to freeze the 7 tournament races (e.g. "last7").
    selectionPolicy: Mapped[str | None] = mapped_column(String, nullable=True)
    racesFrozenAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)

    races: Mapped[list["Race"]] = relationship(back_populates="tournament")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="tournament")
    tournamentTickets: Mapped[list["TournamentTicket"]] = relationship(back_populates="tournament")


class Race(Base):
    """A tournament race.

    `raceNumber` IS the tournament race index (always 1..7 for a tournament).
    `trackRaceNumber` is the racetrack's own race number from the provider
    (track race 9 can be tournament race 7). Provider identity is
    (`provider`, `providerRaceId`), never the name or the number.
    """
    __tablename__ = "Race"
    __table_args__ = (
        UniqueConstraint("tournamentId", "raceNumber"),
        UniqueConstraint("provider", "providerRaceId", name="uq_race_provider_race"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tournamentId: Mapped[int] = mapped_column(ForeignKey("Tournament.id"))
    raceNumber: Mapped[int] = mapped_column(Integer)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="upcoming")
    scheduledTime: Mapped[str | None] = mapped_column(String, nullable=True)
    distance: Mapped[int | None] = mapped_column(Integer, nullable=True)
    surface: Mapped[str | None] = mapped_column(String, nullable=True)
    raceClass: Mapped[str | None] = mapped_column(String, nullable=True)
    purse: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vendorRaceId: Mapped[str | None] = mapped_column(String, nullable=True)  # legacy, unused
    provider: Mapped[str | None] = mapped_column(String, nullable=True)
    providerRaceId: Mapped[str | None] = mapped_column(String, nullable=True)
    trackRaceNumber: Mapped[int | None] = mapped_column(Integer, nullable=True)
    postTime: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)  # canonical UTC post time
    # none | pending | official | void | overdue
    resultStatus: Mapped[str] = mapped_column(String, default="none", server_default="none")
    # active | unavailable (missing from a complete provider card; row retained)
    availability: Mapped[str] = mapped_column(String, default="active", server_default="active")
    providerStatus: Mapped[str | None] = mapped_column(String, nullable=True)
    providerMeta: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON: other verified provider facts
    lastSyncedAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)

    tournament: Mapped["Tournament"] = relationship(back_populates="races")
    horses: Mapped[list["Horse"]] = relationship(back_populates="race", order_by="Horse.postPosition")
    results: Mapped[list["RaceResult"]] = relationship(back_populates="race")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="race")
    dividends: Mapped[list["OfficialDividend"]] = relationship(back_populates="race")


class Horse(Base):
    __tablename__ = "Horse"
    __table_args__ = (
        UniqueConstraint("raceId", "providerRunnerId", name="uq_horse_race_provider_runner"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    raceId: Mapped[int] = mapped_column(ForeignKey("Race.id"))
    postPosition: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String)
    jockey: Mapped[str | None] = mapped_column(String, nullable=True)
    trainer: Mapped[str | None] = mapped_column(String, nullable=True)
    # Legacy/demo odds only. Provider-synced runners leave this NULL; provider
    # prices live in morningLineOdds / liveOdds and are NEVER MY50 dividends.
    odds: Mapped[float | None] = mapped_column(Float, nullable=True)
    scratched: Mapped[bool] = mapped_column(Boolean, default=False)
    silkPrimary: Mapped[str | None] = mapped_column(String, nullable=True)
    silkSecondary: Mapped[str | None] = mapped_column(String, nullable=True)
    vendorRunnerId: Mapped[str | None] = mapped_column(String, nullable=True)
    programNumber: Mapped[str | None] = mapped_column(String, nullable=True)
    provider: Mapped[str | None] = mapped_column(String, nullable=True)
    providerRunnerId: Mapped[str | None] = mapped_column(String, nullable=True)
    # active | scratched | unavailable (missing from a complete card; row retained)
    # | provider_unknown (provider sent an undocumented status code; kept raw in providerMeta)
    runnerStatus: Mapped[str] = mapped_column(String, default="active", server_default="active")
    registrationNumber: Mapped[str | None] = mapped_column(String, nullable=True)  # stable NA horse id
    providerMeta: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON: other verified provider facts
    morningLineOdds: Mapped[float | None] = mapped_column(Float, nullable=True)  # provider information only
    liveOdds: Mapped[float | None] = mapped_column(Float, nullable=True)         # provider information only
    oddsUpdatedAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)

    race: Mapped["Race"] = relationship(back_populates="horses")


class RaceResult(Base):
    __tablename__ = "RaceResult"
    __table_args__ = (
        # Allow official dead heats (multiple horses sharing same position),
        # but prevent duplicate result entries for the same horse in a race.
        UniqueConstraint("raceId", "horseId"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    raceId: Mapped[int] = mapped_column(ForeignKey("Race.id"))
    horseId: Mapped[int] = mapped_column(ForeignKey("Horse.id"))
    position: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String, default="admin", server_default="admin")  # admin | provider | demo
    isDeadHeat: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")

    race: Mapped["Race"] = relationship(back_populates="results")
    horse: Mapped["Horse"] = relationship()


class OfficialDividend(Base):
    """Official pre/post race frozen track dividend ($2 Win payoff base)."""
    __tablename__ = "OfficialDividend"
    __table_args__ = (UniqueConstraint("raceId", "horseId"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    raceId: Mapped[int] = mapped_column(ForeignKey("Race.id"))
    horseId: Mapped[int] = mapped_column(ForeignKey("Horse.id"))
    winPayoff: Mapped[float] = mapped_column(Float)  # Official $2.00 Win payoff
    dividend: Mapped[float] = mapped_column(Float)   # winPayoff / 2.0
    isDeadHeat: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)

    race: Mapped["Race"] = relationship(back_populates="dividends")
    horse: Mapped["Horse"] = relationship()


class My50FixedDividend(Base):
    """MY50 fixed dividend frozen at tournament publication (V1.1 precedence:
    validated win-pool dollar, else live odds, else morning line, converted
    numerator/denominator + 1). `value` is the EXACT decimal as text; rows are
    insert-only and never updated by later syncs or odds moves."""
    __tablename__ = "My50FixedDividend"
    __table_args__ = (UniqueConstraint("raceId", "horseId", name="uq_my50_dividend_race_horse"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    raceId: Mapped[int] = mapped_column(ForeignKey("Race.id"))
    horseId: Mapped[int] = mapped_column(ForeignKey("Horse.id"))
    value: Mapped[str] = mapped_column(String)                       # exact decimal, e.g. "3.50"
    source: Mapped[str] = mapped_column(String)                      # live_odds | morning_line
    sourceValue: Mapped[str | None] = mapped_column(String, nullable=True)  # provider text, e.g. "5-2"
    # unique | pending_tie_adjustment (equal value in the race; tenths rule pending)
    tieStatus: Mapped[str] = mapped_column(String, default="unique", server_default="unique")
    frozenAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)


class Ticket(Base):
    """Per-race ticket selection row (preserved for backward compatibility and race-level scoring)."""
    __tablename__ = "Ticket"
    __table_args__ = (UniqueConstraint("userId", "raceId", "ticketNumber"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    userId: Mapped[int] = mapped_column(ForeignKey("User.id"))
    raceId: Mapped[int] = mapped_column(ForeignKey("Race.id"))
    tournamentId: Mapped[int] = mapped_column(ForeignKey("Tournament.id"))
    ticketNumber: Mapped[int] = mapped_column(Integer, default=1)
    strategy: Mapped[str] = mapped_column(String)
    picks: Mapped[str] = mapped_column(String)
    pointsEarned: Mapped[int] = mapped_column(Integer, default=0)
    isScored: Mapped[bool] = mapped_column(Boolean, default=False)
    # unscored | scored | pending_dividend | pending_scratch_rule
    scoreStatus: Mapped[str] = mapped_column(String, default="unscored", server_default="unscored")
    originalCreatorAlias: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="tickets")
    race: Mapped["Race"] = relationship(back_populates="tickets")
    tournament: Mapped["Tournament"] = relationship(back_populates="tickets")


class TournamentTicket(Base):
    """Aggregate Root: 1 Ticket = 1 Tournament = Final 7 Races."""
    __tablename__ = "TournamentTicket"
    __table_args__ = (UniqueConstraint("userId", "tournamentId", "ticketNumber"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    userId: Mapped[int] = mapped_column(ForeignKey("User.id"))
    tournamentId: Mapped[int] = mapped_column(ForeignKey("Tournament.id"))
    ticketNumber: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String, default="confirmed")  # confirmed | locked | completed
    isAdUnlocked: Mapped[bool] = mapped_column(Boolean, default=False)
    adUnlockToken: Mapped[str | None] = mapped_column(String, nullable=True)
    totalPoints: Mapped[int] = mapped_column(Integer, default=0)
    originalCreatorAlias: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="tournamentTickets")
    tournament: Mapped["Tournament"] = relationship(back_populates="tournamentTickets")
    selections: Mapped[list["TicketSelection"]] = relationship(back_populates="tournamentTicket", cascade="all, delete-orphan")


class TicketSelection(Base):
    """Individual race strategy and runner picks within a 7-race tournament ticket."""
    __tablename__ = "TicketSelection"
    __table_args__ = (UniqueConstraint("tournamentTicketId", "raceId"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tournamentTicketId: Mapped[int] = mapped_column(ForeignKey("TournamentTicket.id"))
    raceId: Mapped[int] = mapped_column(ForeignKey("Race.id"))
    raceOrder: Mapped[int] = mapped_column(Integer)  # 1 to 7
    strategy: Mapped[str] = mapped_column(String)    # full_point | dual_point | smart_pick
    picks: Mapped[str] = mapped_column(String)       # JSON string list of horse IDs
    pointsEarned: Mapped[int] = mapped_column(Integer, default=0)
    isScored: Mapped[bool] = mapped_column(Boolean, default=False)
    scoreStatus: Mapped[str] = mapped_column(String, default="unscored", server_default="unscored")

    tournamentTicket: Mapped["TournamentTicket"] = relationship(back_populates="selections")
    race: Mapped["Race"] = relationship()


class TournamentRankSnapshot(Base):
    """Historical progression snapshot of ranks and point deltas after each race."""
    __tablename__ = "TournamentRankSnapshot"
    __table_args__ = (UniqueConstraint("tournamentId", "raceId", "userId", "ticketNumber"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tournamentId: Mapped[int] = mapped_column(ForeignKey("Tournament.id"))
    raceId: Mapped[int] = mapped_column(ForeignKey("Race.id"))
    raceNumber: Mapped[int] = mapped_column(Integer)
    userId: Mapped[int] = mapped_column(ForeignKey("User.id"))
    ticketNumber: Mapped[int] = mapped_column(Integer, default=1)
    pointsAtRace: Mapped[int] = mapped_column(Integer, default=0)
    rankAtRace: Mapped[int] = mapped_column(Integer, default=1)
    pointsBehindLeader: Mapped[int] = mapped_column(Integer, default=0)
    pointsBehindNext: Mapped[int] = mapped_column(Integer, default=0)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)


class LeaderboardEntry(Base):
    __tablename__ = "LeaderboardEntry"
    __table_args__ = (UniqueConstraint("userId", "tournamentId", "ticketNumber"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    userId: Mapped[int] = mapped_column(ForeignKey("User.id"))
    tournamentId: Mapped[int] = mapped_column(ForeignKey("Tournament.id"))
    ticketNumber: Mapped[int] = mapped_column(Integer, default=1)
    totalPoints: Mapped[int] = mapped_column(Integer, default=0)
    racesPlayed: Mapped[int] = mapped_column(Integer, default=0)
    fullPoints: Mapped[int] = mapped_column(Integer, default=0)
    dualPoints: Mapped[int] = mapped_column(Integer, default=0)
    smartPoints: Mapped[int] = mapped_column(Integer, default=0)
    winStreak: Mapped[int] = mapped_column(Integer, default=0)
    bestStreak: Mapped[int] = mapped_column(Integer, default=0)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    previousRank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rankChange: Mapped[int] = mapped_column(Integer, default=0)
    lastPointsChange: Mapped[int] = mapped_column(Integer, default=0)
    pointsBehindNext: Mapped[int] = mapped_column(Integer, default=0)
    originalCreatorAlias: Mapped[str | None] = mapped_column(String, nullable=True)
    isClaimed: Mapped[bool] = mapped_column(Boolean, default=False)
    claimedByUserId: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updatedAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserStats(Base):
    __tablename__ = "UserStats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    userId: Mapped[int] = mapped_column(ForeignKey("User.id"), unique=True)
    totalPoints: Mapped[int] = mapped_column(Integer, default=0)
    tournamentsPlayed: Mapped[int] = mapped_column(Integer, default=0)
    totalRaces: Mapped[int] = mapped_column(Integer, default=0)
    winRate: Mapped[float] = mapped_column(Float, default=0)
    bestStreak: Mapped[int] = mapped_column(Integer, default=0)
    titles: Mapped[int] = mapped_column(Integer, default=0)
    records: Mapped[int] = mapped_column(Integer, default=0)
    updatedAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="stats")


class AchievementCard(Base):
    __tablename__ = "AchievementCard"
    __table_args__ = (UniqueConstraint("userId", "cardId"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    userId: Mapped[int] = mapped_column(ForeignKey("User.id"))
    cardId: Mapped[str] = mapped_column(String)
    payload: Mapped[str] = mapped_column(String)
    earnedAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)


class Group(Base):
    __tablename__ = "Group"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    founderId: Mapped[int] = mapped_column(ForeignKey("User.id"))
    privacyMode: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)

    members: Mapped[list["GroupMember"]] = relationship(back_populates="group")
    holograms: Mapped[list["GroupHologram"]] = relationship(back_populates="group")


class GroupMember(Base):
    __tablename__ = "GroupMember"
    __table_args__ = (UniqueConstraint("groupId", "userId"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    groupId: Mapped[int] = mapped_column(ForeignKey("Group.id"))
    userId: Mapped[int] = mapped_column(ForeignKey("User.id"))
    role: Mapped[str] = mapped_column(String, default="member")  # founder | admin | member
    status: Mapped[str] = mapped_column(String, default="active")  # active | pending
    requestedAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)

    group: Mapped["Group"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()


class GroupHologram(Base):
    __tablename__ = "GroupHologram"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    groupId: Mapped[int] = mapped_column(ForeignKey("Group.id"))
    authorId: Mapped[int] = mapped_column(ForeignKey("User.id"))
    message: Mapped[str] = mapped_column(String)
    emoji: Mapped[str | None] = mapped_column(String, nullable=True)
    colorVersion: Mapped[str] = mapped_column(String, default="purple")
    sentAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)

    group: Mapped["Group"] = relationship(back_populates="holograms")


class GroupHologramCooldown(Base):
    __tablename__ = "GroupHologramCooldown"
    __table_args__ = (UniqueConstraint("groupId"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    groupId: Mapped[int] = mapped_column(ForeignKey("Group.id"), unique=True)
    nextAvailableAt: Mapped[datetime] = mapped_column(PrismaDateTime)


class ChatMessage(Base):
    __tablename__ = "ChatMessage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String)
    text: Mapped[str] = mapped_column(String)
    avatarColor: Mapped[str] = mapped_column(String)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)


class RacingMeeting(Base):
    """A provider race meeting (track + day). May hold MORE than 7 races; the
    MY50 tournament freezes exactly 7 of them (see Tournament.selectionPolicy)."""
    __tablename__ = "RacingMeeting"
    __table_args__ = (
        UniqueConstraint("provider", "providerMeetingId", name="uq_meeting_provider_meeting"),
        Index("ix_meeting_date", "meetingDate"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String)
    providerMeetingId: Mapped[str] = mapped_column(String)
    origin: Mapped[str] = mapped_column(String, default="real")
    trackName: Mapped[str] = mapped_column(String)
    trackCode: Mapped[str | None] = mapped_column(String, nullable=True)
    country: Mapped[str | None] = mapped_column(String, nullable=True)
    meetingDate: Mapped[str] = mapped_column(String)  # YYYY-MM-DD, local track date
    timezone: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="scheduled")  # scheduled | cancelled | completed
    raceCount: Mapped[int] = mapped_column(Integer, default=0)
    eligibleRaceCount: Mapped[int] = mapped_column(Integer, default=0)
    # pending | created | insufficient_races
    tournamentDecision: Mapped[str] = mapped_column(String, default="pending")
    providerStatus: Mapped[str | None] = mapped_column(String, nullable=True)  # ok | partial | error | ...
    lastErrorCode: Mapped[str | None] = mapped_column(String, nullable=True)
    lastSyncedAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    lastSuccessfulSyncAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProviderSyncState(Base):
    """Per-provider health + daily quota counters (shared by every worker)."""
    __tablename__ = "ProviderSyncState"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String, unique=True)
    quotaDate: Mapped[str | None] = mapped_column(String, nullable=True)  # UTC YYYY-MM-DD of the counter
    requestsToday: Mapped[int] = mapped_column(Integer, default=0)
    dailyLimit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # ok | credentials_unavailable | auth_error | rate_limited | unavailable
    # | adapter_pending_validation | disabled | unknown
    status: Mapped[str] = mapped_column(String, default="unknown")
    lastRequestAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    lastSuccessAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    lastErrorAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    lastErrorCode: Mapped[str | None] = mapped_column(String, nullable=True)
    consecutiveFailures: Mapped[int] = mapped_column(Integer, default=0)
    blockedUntil: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    updatedAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SyncTask(Base):
    """Schedule state of one synchronization unit (discovery day, meeting card,
    meeting results, reconciliation). Persisted so every worker shares one schedule."""
    __tablename__ = "SyncTask"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String, unique=True)
    kind: Mapped[str] = mapped_column(String)  # discover | entries | results | reconcile
    provider: Mapped[str] = mapped_column(String)
    refId: Mapped[str | None] = mapped_column(String, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=4)  # 0 (highest) .. 5
    intervalSeconds: Mapped[int] = mapped_column(Integer, default=900)
    nextDueAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    lastRunAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    lastSuccessAt: Mapped[datetime | None] = mapped_column(PrismaDateTime, nullable=True)
    lastStatus: Mapped[str | None] = mapped_column(String, nullable=True)
    lastErrorCode: Mapped[str | None] = mapped_column(String, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    updatedAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SyncLease(Base):
    """Cross-process lease lock (works on SQLite and Postgres behind a pooler).
    A lease expires on its own, so a crashed worker can never block syncing forever."""
    __tablename__ = "SyncLease"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    owner: Mapped[str] = mapped_column(String)
    acquiredAt: Mapped[datetime] = mapped_column(PrismaDateTime)
    expiresAt: Mapped[datetime] = mapped_column(PrismaDateTime)
