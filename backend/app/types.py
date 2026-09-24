from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from sqlalchemy import BigInteger, TypeDecorator

# MY50 points are exact decimals (points x frozen MY50 dividend, e.g. 25 x 4.50 = 112.50).
# They are stored as integer millionths so the value is exact on every database
# (SQLite has no decimal type) and SQL ORDER BY / SUM stay exact.
POINTS_SCALE = 10**6


def to_points(value) -> Decimal:
    """Exact Decimal points. Binary floats are refused: they cannot carry an exact score."""
    if value is None:
        return Decimal(0)
    if isinstance(value, Decimal):
        return value
    if isinstance(value, bool) or isinstance(value, float):
        raise TypeError(f"points must be Decimal/int/str, not {type(value).__name__}")
    try:
        return Decimal(value) if isinstance(value, int) else Decimal(str(value))
    except InvalidOperation as exc:
        raise ValueError(f"invalid points value {value!r}") from exc


class ExactPoints(TypeDecorator):
    """Decimal points stored as BIGINT millionths. Never rounds: a value with more
    than 6 decimal places raises instead of being silently truncated."""

    impl = BigInteger
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        scaled = to_points(value) * POINTS_SCALE
        if scaled != scaled.to_integral_value():
            raise ValueError(f"points {value!r} exceed {len(str(POINTS_SCALE)) - 1} decimal places")
        return int(scaled)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return Decimal(int(value)) / POINTS_SCALE


class PrismaDateTime(TypeDecorator):
    """SQLite dates from Prisma are stored as millisecond Unix timestamps."""

    impl = BigInteger
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, datetime):
            dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
            return int(dt.timestamp() * 1000)
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value / 1000.0, tz=timezone.utc)
        if isinstance(value, str):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return value
