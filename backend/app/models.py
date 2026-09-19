from datetime import datetime

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, UniqueConstraint
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
    country: Mapped[str | None] = mapped_column(String, nullable=True)
    birthYear: Mapped[int | None] = mapped_column(Integer, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stats: Mapped["UserStats | None"] = relationship(back_populates="user", uselist=False)
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="user")
    tournamentTickets: Mapped[list["TournamentTicket"]] = relationship(back_populates="user")


class Tournament(Base):
    __tablename__ = "Tournament"

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
    vendorMeetId: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)

    races: Mapped[list["Race"]] = relationship(back_populates="tournament")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="tournament")
    tournamentTickets: Mapped[list["TournamentTicket"]] = relationship(back_populates="tournament")


class Race(Base):
    __tablename__ = "Race"
    __table_args__ = (UniqueConstraint("tournamentId", "raceNumber"),)

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
    vendorRaceId: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(PrismaDateTime, default=datetime.utcnow)

    tournament: Mapped["Tournament"] = relationship(back_populates="races")
    horses: Mapped[list["Horse"]] = relationship(back_populates="race", order_by="Horse.postPosition")
    results: Mapped[list["RaceResult"]] = relationship(back_populates="race")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="race")
    dividends: Mapped[list["OfficialDividend"]] = relationship(back_populates="race")


class Horse(Base):
    __tablename__ = "Horse"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    raceId: Mapped[int] = mapped_column(ForeignKey("Race.id"))
    postPosition: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String)
    jockey: Mapped[str | None] = mapped_column(String, nullable=True)
    trainer: Mapped[str | None] = mapped_column(String, nullable=True)
    odds: Mapped[float] = mapped_column(Float)
    scratched: Mapped[bool] = mapped_column(Boolean, default=False)
    silkPrimary: Mapped[str | None] = mapped_column(String, nullable=True)
    silkSecondary: Mapped[str | None] = mapped_column(String, nullable=True)
    vendorRunnerId: Mapped[str | None] = mapped_column(String, nullable=True)
    programNumber: Mapped[str | None] = mapped_column(String, nullable=True)

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
