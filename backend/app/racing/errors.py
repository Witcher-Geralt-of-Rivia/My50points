"""Provider error taxonomy. Messages never contain credentials or full URLs
with secrets; the scheduler maps each class to a retry/backoff decision."""
from __future__ import annotations


class ProviderError(Exception):
    code = "provider_error"
    retryable = False

    def __init__(self, message: str = "", *, status_code: int | None = None):
        super().__init__(message or self.code)
        self.status_code = status_code


class ProviderDisabled(ProviderError):
    """No provider configured, or synchronization switched off."""
    code = "provider_disabled"


class ProviderCredentialsMissing(ProviderError):
    """The adapter needs credentials that are not configured."""
    code = "credentials_unavailable"


class ProviderNotReady(ProviderError):
    """Adapter exists but its endpoint/field mapping is not yet validated against
    real provider documentation or payloads. It refuses to guess."""
    code = "adapter_pending_validation"


class ProviderAuthError(ProviderError):
    """401/403: bad key or plan does not cover the endpoint. Never retried in a loop."""
    code = "auth_error"


class ProviderRateLimited(ProviderError):
    code = "rate_limited"
    retryable = True

    def __init__(self, message: str = "", *, retry_after: float | None = None, status_code: int | None = 429):
        super().__init__(message, status_code=status_code)
        self.retry_after = retry_after


class ProviderUnavailable(ProviderError):
    """Timeouts, network failures, 5xx after bounded retries."""
    code = "unavailable"
    retryable = True


class ProviderSchemaError(ProviderError):
    """422/400 or a payload that does not match the expected schema. Not retried blindly."""
    code = "schema_error"


class ProviderNotFound(ProviderError):
    code = "not_found"


class QuotaExhausted(ProviderError):
    code = "quota_exhausted"
