"""Orbistats adapter boundary.

What IS documented publicly (Orbistats developer tutorials):
  * base URL  https://api.orbistats.com/v1
  * auth      Authorization: Bearer <API key>
  * a free tier with a daily request allowance (configure the real limit with
    ORBISTATS_DAILY_REQUEST_LIMIT once Marco's plan is known)

What is NOT documented anywhere we could verify: the horse-racing endpoints and
their response fields. This adapter therefore does not guess them. Until a real
key is available and the payloads are captured and reviewed, every data method
raises ProviderNotReady ("adapter_pending_validation"), and health() reports why.

To connect real data (checklist, see REPORT.md):
  1. Set ORBISTATS_API_KEY (environment only — never in code or NEXT_PUBLIC_*).
  2. Capture one sanitized response for: meetings list, meeting entries/racecard,
     results. Store them as reviewed fixtures (NOT committed with any key).
  3. Fill ENDPOINTS below and implement the four _map_* functions against those
     captured payloads (provider IDs, track race number, post time with timezone,
     runner status / scratches, odds fields, result status, dead heats).
  4. Set VALIDATED = True, add adapter tests replaying the captured fixtures.
  5. Enable with RACING_PROVIDER=orbistats and RACING_SYNC_ENABLED=true.
"""
from __future__ import annotations

import os
from typing import Any

from app.racing.config import RacingConfig
from app.racing.dto import ProviderEntries, ProviderHealth, ProviderMeeting, ProviderResult
from app.racing.errors import ProviderCredentialsMissing, ProviderNotReady
from app.racing.http_client import ProviderHttpClient
from app.racing.provider import RacingProvider

DEFAULT_BASE_URL = "https://api.orbistats.com/v1"

# Horse-racing endpoint paths — intentionally unset until validated against
# real Orbistats documentation/payloads (step 3 of the checklist above).
ENDPOINTS: dict[str, str | None] = {
    "meetings": None,
    "meeting": None,
    "entries": None,
    "results": None,
}
VALIDATED = False


class OrbistatsProvider(RacingProvider):
    name = "orbistats"
    origin = "real"

    def __init__(self, api_key: str | None, config: RacingConfig, base_url: str = DEFAULT_BASE_URL, transport=None):
        super().__init__()
        self._has_key = bool(api_key and api_key.strip())
        self._config = config
        self._client: ProviderHttpClient | None = None
        if self._has_key:
            # The key lives only inside the client's headers.
            self._client = ProviderHttpClient(
                base_url,
                headers={"Authorization": f"Bearer {api_key.strip()}", "Accept": "application/json"},
                timeout=config.request_timeout_seconds,
                max_retries=config.max_retries,
                backoff_base=config.backoff_base_seconds,
                max_retry_after=config.max_retry_after_seconds,
                rate_per_second=config.rate_limit_per_second,
                transport=transport,
                on_request=self._count,
            )

    @classmethod
    def from_env(cls, config: RacingConfig | None = None) -> "OrbistatsProvider":
        config = config or RacingConfig.from_env()
        return cls(
            os.getenv("ORBISTATS_API_KEY"),
            config,
            base_url=(os.getenv("ORBISTATS_BASE_URL") or DEFAULT_BASE_URL),
        )

    def _count(self) -> None:
        if self.on_request:
            self.on_request()

    def __repr__(self) -> str:  # never expose the key
        return f"OrbistatsProvider(configured={self._has_key}, validated={VALIDATED})"

    # ---- health / readiness -------------------------------------------------
    def health(self) -> ProviderHealth:
        if not self._has_key:
            return ProviderHealth(self.name, "credentials_unavailable", "ORBISTATS_API_KEY is not configured", False)
        if not VALIDATED or not all(ENDPOINTS.values()):
            return ProviderHealth(
                self.name,
                "adapter_pending_validation",
                "Orbistats horse-racing endpoints/fields are not validated yet; no requests are made",
                False,
            )
        return ProviderHealth(self.name, "ok", "configured", True)

    def _require_ready(self) -> ProviderHttpClient:
        if not self._has_key or self._client is None:
            raise ProviderCredentialsMissing("ORBISTATS_API_KEY is not configured")
        if not VALIDATED or not all(ENDPOINTS.values()):
            raise ProviderNotReady("Orbistats horse-racing mapping is pending validation with a real key")
        return self._client

    # ---- data methods (refuse until validated) -----------------------------
    def get_meetings(self, date_from: str, date_to: str) -> list[ProviderMeeting]:
        client = self._require_ready()
        return [self._map_meeting(m) for m in self._list(client.get_json(ENDPOINTS["meetings"], {"from": date_from, "to": date_to}))]

    def get_meeting(self, provider_meeting_id: str) -> ProviderMeeting:
        client = self._require_ready()
        return self._map_meeting(client.get_json(ENDPOINTS["meeting"].format(id=provider_meeting_id)))

    def get_entries(self, provider_meeting_id: str) -> ProviderEntries:
        client = self._require_ready()
        return self._map_entries(client.get_json(ENDPOINTS["entries"].format(id=provider_meeting_id)))

    def get_results(self, provider_meeting_id: str) -> list[ProviderResult]:
        client = self._require_ready()
        return [self._map_result(r) for r in self._list(client.get_json(ENDPOINTS["results"].format(id=provider_meeting_id)))]

    # ---- field mapping: implement ONLY against captured real payloads ------
    @staticmethod
    def _list(payload: Any) -> list:
        raise ProviderNotReady("Orbistats list envelope not validated")

    @staticmethod
    def _map_meeting(raw: dict) -> ProviderMeeting:
        raise ProviderNotReady("Orbistats meeting mapping not validated")

    @staticmethod
    def _map_entries(raw: dict) -> ProviderEntries:
        raise ProviderNotReady("Orbistats entries mapping not validated")

    @staticmethod
    def _map_result(raw: dict) -> ProviderResult:
        raise ProviderNotReady("Orbistats result mapping not validated")
