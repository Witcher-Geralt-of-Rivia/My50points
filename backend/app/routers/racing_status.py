"""Public, read-only racing data status. No credentials, no quota internals."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ProviderSyncState, RacingMeeting
from app.racing.config import RacingConfig

router = APIRouter(prefix="/racing", tags=["racing"])


def _iso(dt):
    if dt is None:
        return None
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).isoformat()


@router.get("/status")
def racing_status(db: Session = Depends(get_db)):
    config = RacingConfig.from_env()
    provider = config.provider if config.provider != "none" else None
    state = db.query(ProviderSyncState).filter(ProviderSyncState.provider == provider).first() if provider else None
    last_ok = (
        db.query(RacingMeeting.lastSuccessfulSyncAt)
        .filter(RacingMeeting.provider == provider)
        .order_by(RacingMeeting.lastSuccessfulSyncAt.desc())
        .first()
        if provider
        else None
    )
    if provider is None:
        provider_status = "not_configured"
    elif not config.sync_enabled:
        provider_status = "sync_disabled"
    else:
        provider_status = state.status if state else "unknown"
    return {
        "provider": provider,
        "syncEnabled": config.sync_enabled,
        "providerStatus": provider_status,
        "lastSuccessfulSyncAt": _iso(last_ok[0]) if last_ok else None,
        "serverTime": datetime.now(timezone.utc).isoformat(),
    }
