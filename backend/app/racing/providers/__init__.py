"""Provider adapters and the registry that picks one from configuration."""
from __future__ import annotations

from app.racing.config import RacingConfig
from app.racing.provider import RacingProvider


def get_provider(config: RacingConfig | None = None) -> RacingProvider | None:
    """Return the configured adapter, or None when RACING_PROVIDER is unset/none."""
    config = config or RacingConfig.from_env()
    name = config.provider
    if name == "orbistats":
        from app.racing.providers.orbistats import OrbistatsProvider

        return OrbistatsProvider.from_env(config)
    if name == "fixture":
        from app.racing.providers.fixture import FixtureProvider

        if not config.fixture_path:
            return None
        return FixtureProvider.from_file(config.fixture_path)
    return None
