"""MY50 real-racing foundation.

Provider data flows one way:

    provider adapter (server-side only)
        -> normalized DTOs (app.racing.dto)
        -> sync engine (idempotent upserts by provider identity)
        -> database
        -> read-only FastAPI endpoints
        -> frontend

Nothing here is ever triggered by a GET request. Synchronization runs only from
the background worker (app.racing.worker) or a protected admin action.
"""
