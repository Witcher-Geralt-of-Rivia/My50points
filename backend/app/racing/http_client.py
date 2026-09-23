"""Central provider HTTP transport: timeouts, bounded retries with backoff,
Retry-After handling, 401/403 as terminal auth errors, per-second pacing and a
per-request quota hook. Credentials travel ONLY in headers supplied by the
adapter; they are never placed in URLs, logs or exception messages."""
from __future__ import annotations

import email.utils
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any, Callable

import httpx

from app.racing.errors import (
    ProviderAuthError,
    ProviderNotFound,
    ProviderRateLimited,
    ProviderSchemaError,
    ProviderUnavailable,
)

logger = logging.getLogger(__name__)


def parse_retry_after(value: str | None, now: float | None = None) -> float | None:
    if not value:
        return None
    value = value.strip()
    try:
        return max(0.0, float(value))
    except ValueError:
        pass
    try:
        dt = email.utils.parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        ref = now if now is not None else time.time()
        return max(0.0, dt.timestamp() - ref)
    except (TypeError, ValueError):
        return None


class _Pacer:
    """Simple per-process pacing: at most `rate` requests per second."""

    def __init__(self, rate: float, clock: Callable[[], float], sleep: Callable[[float], None]):
        self.min_gap = 1.0 / rate if rate and rate > 0 else 0.0
        self.clock = clock
        self.sleep = sleep
        self._next = 0.0
        self._lock = threading.Lock()

    def wait(self) -> None:
        if not self.min_gap:
            return
        with self._lock:
            now = self.clock()
            if now < self._next:
                self.sleep(self._next - now)
                now = self._next
            self._next = now + self.min_gap


class ProviderHttpClient:
    def __init__(
        self,
        base_url: str,
        *,
        headers: dict[str, str],
        timeout: float = 10.0,
        max_retries: int = 3,
        backoff_base: float = 1.0,
        max_retry_after: float = 120.0,
        rate_per_second: float = 1.0,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
        on_request: Callable[[], None] | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self._headers = dict(headers)
        self.timeout = timeout
        self.max_retries = max(0, max_retries)
        self.backoff_base = backoff_base
        self.max_retry_after = max_retry_after
        self.sleep = sleep
        self.on_request = on_request
        self._pacer = _Pacer(rate_per_second, clock, sleep)
        self._client = httpx.Client(timeout=timeout, transport=transport)

    def close(self) -> None:
        self._client.close()

    def _backoff(self, attempt: int) -> float:
        return self.backoff_base * (2 ** attempt)

    def get_json(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{self.base_url}/{path.lstrip('/')}"
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            self._pacer.wait()
            if self.on_request:
                self.on_request()
            try:
                resp = self._client.get(url, params=params, headers=self._headers)
            except (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError) as exc:
                last_error = ProviderUnavailable(f"network error: {type(exc).__name__}")
                logger.warning("provider request failed (%s), attempt %s", type(exc).__name__, attempt + 1)
                if attempt < self.max_retries:
                    self.sleep(self._backoff(attempt))
                    continue
                raise last_error from None

            status = resp.status_code
            if status in (401, 403):
                # Never retried: a bad key or plan will not fix itself.
                raise ProviderAuthError(f"provider rejected credentials or plan (HTTP {status})", status_code=status)
            if status == 404:
                raise ProviderNotFound(f"provider resource not found (HTTP 404) for {path}", status_code=404)
            if status == 429:
                retry_after = parse_retry_after(resp.headers.get("Retry-After"))
                wait = retry_after if retry_after is not None else self._backoff(attempt)
                if attempt < self.max_retries and wait <= self.max_retry_after:
                    logger.warning("provider rate limited; waiting %.1fs (attempt %s)", wait, attempt + 1)
                    self.sleep(wait)
                    continue
                raise ProviderRateLimited("provider rate limit reached", retry_after=retry_after)
            if 500 <= status < 600:
                last_error = ProviderUnavailable(f"provider server error (HTTP {status})", status_code=status)
                if attempt < self.max_retries:
                    self.sleep(self._backoff(attempt))
                    continue
                raise last_error
            if status in (400, 422) or status >= 400:
                raise ProviderSchemaError(f"provider rejected request (HTTP {status})", status_code=status)
            try:
                return resp.json()
            except ValueError:
                raise ProviderSchemaError("provider returned a non-JSON payload") from None
        raise last_error or ProviderUnavailable("provider unavailable")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
