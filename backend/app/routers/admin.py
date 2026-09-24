from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.auth_utils import require_admin
from app.database import get_db
from app.models import Horse, ProviderSyncState, Race, SyncTask, Tournament
from app.racing.config import RacingConfig
from app.racing.providers import get_provider
from app.racing.worker import run_sync_tick
from app.routers.races import post_race_result
from app.seed import SeedRefused, run_seed

router = APIRouter(prefix="/admin", tags=["admin"])


class SimulateRaceResultBody(BaseModel):
    raceId: int
    winnerHorseId: int
    officialDividend: float = Field(gt=0)


@router.post("/seed", dependencies=[Depends(require_admin)])
def seed_database(db: Session = Depends(get_db)):
    """Demo seed — refused in production-like environments and unless
    ALLOW_DEMO_SEED=true (it wipes users and racing tables)."""
    try:
        return run_seed(db)
    except SeedRefused as exc:
        raise HTTPException(status_code=403, detail=f"Demo seeding refused: {exc}")


@router.post("/racing/proof-tickets/{slug}", dependencies=[Depends(require_admin)])
def create_acceptance_proof_tickets(slug: str, db: Session = Depends(get_db)):
    """Acceptance only: SYNTHETIC proof players (usernames prueba_*) on a real
    provider tournament, picks from pre-race card data only, then scoring of the
    races that already have official results. Refused in production-like envs."""
    from app.services.acceptance_proof import ProofRefused, create_proof_tickets

    tournament = db.query(Tournament).filter(Tournament.slug == slug).first()
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if tournament.origin != "real":
        raise HTTPException(status_code=400, detail="Proof players are only for real provider tournaments")
    try:
        return create_proof_tickets(db, tournament)
    except ProofRefused as exc:
        raise HTTPException(status_code=403, detail=f"Proof refused: {exc}")


@router.post("/sync-racing", dependencies=[Depends(require_admin)])
def sync_racing():
    """Protected manual trigger: run ONE scheduler tick now (provider sync).
    The provider/credential/quota gates still apply."""
    return run_sync_tick(force=True)


def _iso(dt):
    if dt is None:
        return None
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).isoformat()


@router.get("/racing/status", dependencies=[Depends(require_admin)])
def racing_admin_status(db: Session = Depends(get_db)):
    config = RacingConfig.from_env()
    provider = get_provider(config)
    health = provider.health() if provider else None
    state = (
        db.query(ProviderSyncState).filter(ProviderSyncState.provider == provider.name).first()
        if provider
        else None
    )
    tasks = (
        db.query(SyncTask)
        .filter(SyncTask.provider == provider.name, SyncTask.active.is_(True))
        .order_by(SyncTask.priority, SyncTask.nextDueAt)
        .limit(50)
        .all()
        if provider
        else []
    )
    return {
        "provider": config.provider,
        "syncEnabled": config.sync_enabled,
        "workerEnabled": config.worker_enabled,
        "selectionPolicy": config.selection_policy,
        "health": {"status": health.status, "message": health.message, "canFetch": health.can_fetch} if health else None,
        "quota": {
            "dailyLimit": state.dailyLimit if state else config.daily_request_limit,
            "quotaDate": state.quotaDate if state else None,
            "requestsToday": state.requestsToday if state else 0,
            "status": state.status if state else None,
            "lastSuccessAt": _iso(state.lastSuccessAt) if state else None,
            "lastErrorAt": _iso(state.lastErrorAt) if state else None,
            "lastErrorCode": state.lastErrorCode if state else None,
            "consecutiveFailures": state.consecutiveFailures if state else 0,
            "blockedUntil": _iso(state.blockedUntil) if state else None,
        },
        "tasks": [
            {
                "key": t.key,
                "kind": t.kind,
                "priority": t.priority,
                "intervalSeconds": t.intervalSeconds,
                "nextDueAt": _iso(t.nextDueAt),
                "lastRunAt": _iso(t.lastRunAt),
                "lastStatus": t.lastStatus,
                "lastErrorCode": t.lastErrorCode,
            }
            for t in tasks
        ],
        "serverTime": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/simulate/race-result", dependencies=[Depends(require_admin)])
def simulate_race_result(body: SimulateRaceResultBody, db: Session = Depends(get_db)):
    """Freeze an admin-supplied MY50 dividend, then score all picks for that race.

    The dividend is written to the immutable OfficialDividend table and scoring
    reads ONLY that table. Live/provider odds are never mutated or used here.
    """
    race = (
        db.query(Race)
        .options(joinedload(Race.horses))
        .filter(Race.id == body.raceId)
        .first()
    )
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    horses = sorted(race.horses, key=lambda h: h.postPosition)
    winner = db.query(Horse).filter(Horse.id == body.winnerHorseId, Horse.raceId == body.raceId).first()
    if not winner:
        raise HTTPException(status_code=400, detail="Winner horse not in this race")

    dividend = float(body.officialDividend)

    others = [h for h in horses if h.id != winner.id]
    if len(others) < 2:
        raise HTTPException(status_code=400, detail="Need at least 3 horses to post results")

    results = [
        {"position": 1, "horseId": winner.id},
        {"position": 2, "horseId": others[0].id},
        {"position": 3, "horseId": others[1].id},
    ]
    return post_race_result(
        body.raceId,
        results,
        db,
        dividends=[{"horseId": winner.id, "dividend": dividend}],
    )
