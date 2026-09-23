"""Idempotent racing synchronization engine.

Identity is ALWAYS provider identity:
    RacingMeeting (provider, providerMeetingId)
    Tournament    (provider, providerMeetingId)
    Race          (provider, providerRaceId)       raceNumber = frozen index 1..7
    Horse         (raceId, providerRunnerId)
Names, track race numbers and post positions are data, never keys.

Rules enforced here:
* The 7 tournament races are selected ONCE (selection policy) and frozen. Later
  cards never add, drop or reorder tournament races, so existing ticket picks
  (Race.id / Horse.id) always keep pointing at the same real race and runner.
* Nothing is deleted because it disappeared from a provider response: a race
  missing from a COMPLETE card becomes availability="unavailable", a runner
  runnerStatus="unavailable"; partial cards change nothing that is missing.
* Provider odds go to Horse.morningLineOdds / liveOdds only. OfficialDividend
  (the MY50 dividend) is never written by this module.
* Missing provider information stays NULL (no invented distance/surface/jockey).
* Every unit runs in one transaction; a provider error leaves cached data as it was.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable

from sqlalchemy.orm import Session

from app.constants import RACES_PER_TOURNAMENT
from app.models import Horse, Race, RaceResult, RacingMeeting, Tournament
from app.racing.config import RacingConfig
from app.racing.dto import (
    RACE_CANCELLED,
    RACE_RESULT_OFFICIAL,
    RACE_RESULT_PROVISIONAL,
    RACE_VOID,
    RUNNER_SCRATCHED,
    ProviderEntries,
    ProviderMeeting,
    ProviderRace,
    ProviderResult,
    ProviderRunner,
)
from app.racing.provider import RacingProvider
from app.racing.selection import eligible_races, select_tournament_races
from app.racing.status import reconcile_statuses

logger = logging.getLogger(__name__)


@dataclass
class SyncReport:
    unit: str
    meetings: int = 0
    tournaments_created: int = 0
    races_updated: int = 0
    runners_created: int = 0
    runners_updated: int = 0
    marked_unavailable: int = 0
    results_written: int = 0
    field_changes: int = 0
    ignored_races: int = 0
    notes: list[str] = field(default_factory=list)


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-") or "track"


def _set(obj, attr: str, value, report: SyncReport) -> bool:
    """Assign only when the value really changes (idempotent syncs = no writes)."""
    if getattr(obj, attr) != value:
        setattr(obj, attr, value)
        report.field_changes += 1
        return True
    return False


def _same_instant(a: datetime | None, b: datetime | None) -> bool:
    if a is None or b is None:
        return a is b
    a = a if a.tzinfo else a.replace(tzinfo=timezone.utc)
    b = b if b.tzinfo else b.replace(tzinfo=timezone.utc)
    return int(a.timestamp() * 1000) == int(b.timestamp() * 1000)


class SyncEngine:
    def __init__(self, db: Session, provider: RacingProvider, config: RacingConfig | None = None,
                 now_fn: Callable[[], datetime] | None = None):
        self.db = db
        self.provider = provider
        self.config = config or RacingConfig.from_env()
        self.now_fn = now_fn or (lambda: datetime.now(timezone.utc))

    # ------------------------------------------------------------------ meetings
    def _upsert_meeting(self, m: ProviderMeeting, report: SyncReport) -> RacingMeeting:
        row = (
            self.db.query(RacingMeeting)
            .filter(RacingMeeting.provider == self.provider.name, RacingMeeting.providerMeetingId == m.provider_meeting_id)
            .first()
        )
        if row is None:
            row = RacingMeeting(
                provider=self.provider.name,
                providerMeetingId=m.provider_meeting_id,
                origin=self.provider.origin,
                trackName=m.track_name,
                meetingDate=m.meeting_date,
                status="scheduled",
                raceCount=0,
                eligibleRaceCount=0,
                tournamentDecision="pending",
            )
            self.db.add(row)
            self.db.flush()
            report.field_changes += 1
        _set(row, "trackName", m.track_name, report)
        _set(row, "trackCode", m.track_code, report)
        _set(row, "country", m.country, report)
        _set(row, "meetingDate", m.meeting_date, report)
        _set(row, "timezone", m.timezone, report)
        if m.status == "cancelled":
            _set(row, "status", "cancelled", report)
        report.meetings += 1
        return row

    def discover(self, date_from: str, date_to: str) -> SyncReport:
        """Upsert meeting headers only (cheap). Cards come from sync_entries()."""
        report = SyncReport(unit=f"discover:{date_from}..{date_to}")
        meetings = self.provider.get_meetings(date_from, date_to)  # provider errors propagate; nothing written
        now = self.now_fn()
        try:
            for m in meetings:
                row = self._upsert_meeting(m, report)
                row.lastSyncedAt = now
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return report

    # ------------------------------------------------------------------ entries
    def sync_entries(self, provider_meeting_id: str) -> SyncReport:
        report = SyncReport(unit=f"entries:{provider_meeting_id}")
        entries = self.provider.get_entries(provider_meeting_id)  # fetch BEFORE touching the DB
        now = self.now_fn()
        try:
            meeting = self._upsert_meeting(entries.meeting, report)
            races = list(entries.races)
            _set(meeting, "raceCount", len(races), report)
            _set(meeting, "eligibleRaceCount", len(eligible_races(races)), report)

            tournament = (
                self.db.query(Tournament)
                .filter(Tournament.provider == self.provider.name, Tournament.providerMeetingId == provider_meeting_id)
                .first()
            )
            if tournament is None:
                if meeting.status != "cancelled":
                    selected = select_tournament_races(self.config.selection_policy, races)
                    if selected is None:
                        _set(meeting, "tournamentDecision", "insufficient_races", report)
                        report.notes.append(f"fewer than {RACES_PER_TOURNAMENT} eligible races; no tournament")
                    else:
                        tournament = self._create_tournament(meeting, selected, now, report)
                        _set(meeting, "tournamentDecision", "created", report)
            else:
                self._update_tournament(tournament, meeting, entries, now, report)

            meeting.lastSyncedAt = now
            meeting.lastSuccessfulSyncAt = now
            _set(meeting, "providerStatus", "ok" if entries.complete else "partial", report)
            _set(meeting, "lastErrorCode", None, report)
            self.db.flush()
            if tournament is not None:
                reconcile_statuses(self.db, self.config, now, tournament_ids=[tournament.id], commit=False)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return report

    def _unique_slug(self, meeting: RacingMeeting) -> str:
        base = f"{_slugify(meeting.trackName)}-{meeting.meetingDate}"
        if not self.db.query(Tournament.id).filter(Tournament.slug == base).first():
            return base
        suffix = _slugify(f"{self.provider.name}-{meeting.providerMeetingId}")
        return f"{base}-{suffix}"

    def _create_tournament(self, meeting: RacingMeeting, selected: list[ProviderRace], now: datetime,
                           report: SyncReport) -> Tournament:
        tournament = Tournament(
            slug=self._unique_slug(meeting),
            name=meeting.trackName,
            track=meeting.trackName,
            location=meeting.country or "",
            status="cancelled" if meeting.status == "cancelled" else "upcoming",
            totalRaces=RACES_PER_TOURNAMENT,
            currentRace=1,
            date=datetime.fromisoformat(meeting.meetingDate).replace(tzinfo=timezone.utc),
            description=None,
            imageUrl=None,
            origin=self.provider.origin,
            provider=self.provider.name,
            providerMeetingId=meeting.providerMeetingId,
            meetingId=meeting.id,
            selectionPolicy=self.config.selection_policy,
            racesFrozenAt=now,
        )
        self.db.add(tournament)
        self.db.flush()
        for index, pr in enumerate(selected, start=1):  # frozen tournament index 1..7
            race = Race(
                tournamentId=tournament.id,
                raceNumber=index,
                provider=self.provider.name,
                providerRaceId=pr.provider_race_id,
                trackRaceNumber=pr.track_race_number,
                status="upcoming",
                resultStatus="none",
                availability="active",
            )
            self.db.add(race)
            self.db.flush()
            self._apply_race(race, pr, now, report)
            self._sync_runners(race, pr.runners, complete=True, now=now, report=report)
        report.tournaments_created += 1
        return tournament

    def _update_tournament(self, tournament: Tournament, meeting: RacingMeeting, entries: ProviderEntries,
                           now: datetime, report: SyncReport) -> None:
        by_id = {r.provider_race_id: r for r in entries.races}
        frozen = (
            self.db.query(Race)
            .filter(Race.tournamentId == tournament.id)
            .order_by(Race.raceNumber)
            .all()
        )
        frozen_ids = {r.providerRaceId for r in frozen}
        report.ignored_races = sum(1 for rid in by_id if rid not in frozen_ids)
        for race in frozen:
            pr = by_id.get(race.providerRaceId)
            if pr is None:
                if entries.complete and race.status != "cancelled" and race.resultStatus != "official":
                    if _set(race, "availability", "unavailable", report):
                        report.marked_unavailable += 1
                continue
            _set(race, "availability", "active", report)
            self._apply_race(race, pr, now, report)
            self._sync_runners(race, pr.runners, complete=entries.complete, now=now, report=report)
            report.races_updated += 1
        if meeting.status == "cancelled":
            for race in frozen:
                if race.resultStatus != "official":
                    _set(race, "status", "cancelled", report)
                    _set(race, "resultStatus", "void", report)
            _set(tournament, "status", "cancelled", report)

    def _apply_race(self, race: Race, pr: ProviderRace, now: datetime, report: SyncReport) -> None:
        if not _same_instant(race.postTime, pr.post_time):
            race.postTime = pr.post_time
            report.field_changes += 1
        _set(race, "scheduledTime", pr.post_time.isoformat() if pr.post_time else None, report)
        _set(race, "trackRaceNumber", pr.track_race_number, report)
        _set(race, "name", pr.name, report)
        _set(race, "distance", pr.distance_meters, report)
        _set(race, "surface", pr.surface, report)
        _set(race, "raceClass", pr.race_class, report)
        _set(race, "purse", pr.purse, report)
        _set(race, "providerStatus", pr.status, report)
        if pr.status in (RACE_CANCELLED, RACE_VOID) and race.resultStatus != "official":
            newly_cancelled = _set(race, "status", "cancelled", report)
            _set(race, "resultStatus", "void", report)
            if newly_cancelled and race.id is not None:
                # Confirmed tickets keep their selection for this race; its
                # score is held pending (cancelled-race rule not defined yet).
                from app.routers.races import hold_cancelled_race_scores
                hold_cancelled_race_scores(self.db, race)
        race.lastSyncedAt = now

    def _sync_runners(self, race: Race, runners, *, complete: bool, now: datetime, report: SyncReport) -> None:
        existing = {h.providerRunnerId: h for h in self.db.query(Horse).filter(Horse.raceId == race.id).all() if h.providerRunnerId}
        seen: set[str] = set()
        for order, runner in enumerate(runners, start=1):
            seen.add(runner.provider_runner_id)
            horse = existing.get(runner.provider_runner_id)
            post_position = runner.post_position if runner.post_position is not None else _program_to_int(runner.program_number, order)
            scratched = runner.status == RUNNER_SCRATCHED
            if horse is None:
                horse = Horse(
                    raceId=race.id,
                    provider=self.provider.name,
                    providerRunnerId=runner.provider_runner_id,
                    postPosition=post_position,
                    name=runner.name,
                    odds=None,  # never invented; provider prices live below
                )
                self.db.add(horse)
                self.db.flush()
                existing[runner.provider_runner_id] = horse
                report.runners_created += 1
            changed = 0
            for attr, value in (
                ("name", runner.name),
                ("programNumber", runner.program_number),
                ("postPosition", post_position),
                ("jockey", runner.jockey),
                ("trainer", runner.trainer),
                ("scratched", scratched),
                ("runnerStatus", "scratched" if scratched else "active"),
                ("morningLineOdds", runner.morning_line_odds),
                ("liveOdds", runner.live_odds),
            ):
                changed += _set(horse, attr, value, report)
            if runner.odds_updated_at is not None and not _same_instant(horse.oddsUpdatedAt, runner.odds_updated_at):
                horse.oddsUpdatedAt = runner.odds_updated_at
                changed += 1
            if changed:
                report.runners_updated += 1
        if complete:
            for pid, horse in existing.items():
                if pid not in seen and horse.runnerStatus != "unavailable":
                    horse.runnerStatus = "unavailable"   # retained, never deleted
                    report.marked_unavailable += 1
                    report.field_changes += 1

    # ------------------------------------------------------------------ results
    def sync_results(self, provider_meeting_id: str) -> SyncReport:
        """Official results are racing FACTS (RaceResult, source=provider). MY50
        scoring then reads only the frozen MY50 dividend table and pends honestly
        when a dividend is not published. No dividend is ever written here."""
        report = SyncReport(unit=f"results:{provider_meeting_id}")
        results = self.provider.get_results(provider_meeting_id)
        now = self.now_fn()
        from app.routers.races import score_race_entries
        from app.services.leaderboard_snapshot import refresh_tournament_rank_changes

        try:
            tournament = (
                self.db.query(Tournament)
                .filter(Tournament.provider == self.provider.name, Tournament.providerMeetingId == provider_meeting_id)
                .first()
            )
            if tournament is None:
                return report
            races = {r.providerRaceId: r for r in self.db.query(Race).filter(Race.tournamentId == tournament.id).all()}
            rescored = []
            for res in results:
                race = races.get(res.provider_race_id)
                if race is None:
                    continue  # not one of the 7 frozen races
                if self._apply_result(race, res, report):
                    rescored.append(race)
                race.lastSyncedAt = now
            self.db.flush()  # sessions use autoflush=False: make new RaceResult rows visible
            for race in rescored:
                result_dicts = [{"position": r.position, "horseId": r.horseId}
                                for r in self.db.query(RaceResult).filter(RaceResult.raceId == race.id).all()]
                score_race_entries(self.db, race, result_dicts)
                refresh_tournament_rank_changes(self.db, tournament.id, race_id=race.id, race_number=race.raceNumber)
            if tournament.meetingId:
                meeting = self.db.get(RacingMeeting, tournament.meetingId)
                if meeting is not None:
                    meeting.lastSyncedAt = now
                    meeting.lastSuccessfulSyncAt = now
            self.db.flush()
            reconcile_statuses(self.db, self.config, now, tournament_ids=[tournament.id], commit=False)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return report

    def _apply_result(self, race: Race, res: ProviderResult, report: SyncReport) -> bool:
        """Returns True when the official finishing order changed (needs rescoring)."""
        if res.status in (RACE_CANCELLED, RACE_VOID):
            if race.resultStatus != "official":
                _set(race, "status", "cancelled", report)
                _set(race, "resultStatus", "void", report)
            return False
        if res.status == RACE_RESULT_PROVISIONAL:
            if race.resultStatus not in ("official",):
                _set(race, "resultStatus", "pending", report)
            _set(race, "providerStatus", RACE_RESULT_PROVISIONAL, report)
            return False
        if res.status != RACE_RESULT_OFFICIAL:
            return False

        existing_rows = self.db.query(RaceResult).filter(RaceResult.raceId == race.id).all()
        if any(r.source == "admin" for r in existing_rows):
            report.notes.append(f"race {race.id}: admin result kept (takes precedence)")
            return False
        horses = {h.providerRunnerId: h for h in self.db.query(Horse).filter(Horse.raceId == race.id).all()}
        placings = [p for p in res.placings if p.position is not None]
        mapped = []
        for p in placings:
            horse = horses.get(p.provider_runner_id)
            if horse is None:
                # Unknown runner: do not write a half result.
                _set(race, "resultStatus", "pending", report)
                _set(race, "providerStatus", "result_unmapped", report)
                report.notes.append(f"race {race.id}: result references unknown runner; kept pending")
                return False
            mapped.append((horse.id, int(p.position)))
        if not mapped:
            return False
        dead = res.dead_heat_positions
        wanted = sorted(mapped)
        current = sorted((r.horseId, r.position) for r in existing_rows)
        if wanted == current and race.resultStatus == "official":
            return False
        for row in existing_rows:
            self.db.delete(row)
        self.db.flush()
        for horse_id, position in wanted:
            self.db.add(RaceResult(raceId=race.id, horseId=horse_id, position=position,
                                   source="provider", isDeadHeat=position in dead))
        _set(race, "resultStatus", "official", report)
        _set(race, "status", "finished", report)
        _set(race, "providerStatus", RACE_RESULT_OFFICIAL, report)
        report.results_written += 1
        return True


def _program_to_int(program_number: str | None, fallback: int) -> int:
    """Display order when the provider gives no post position: the numeric part
    of the program number, else the runner's order in the provider card."""
    if program_number:
        m = re.match(r"(\d+)", str(program_number))
        if m:
            return int(m.group(1))
    return fallback
