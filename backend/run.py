"""
Start the 50points FastAPI backend.

Usage:
  python run.py
  python run.py --port 8000
  python run.py --no-reload

Environment (optional):
  HOST, PORT, RELOAD=true|false, ENVIRONMENT=development|production
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import uvicorn
from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parent


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def main() -> None:
    load_dotenv(BACKEND_ROOT / ".env")
    (BACKEND_ROOT / "data").mkdir(parents=True, exist_ok=True)

    default_reload = os.getenv("ENVIRONMENT", "development").lower() != "production"
    parser = argparse.ArgumentParser(description="Run 50points API")
    parser.add_argument("--host", default=os.getenv("HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8000")))
    parser.add_argument("--reload", action="store_true", default=None, help="Enable auto-reload")
    parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")
    args = parser.parse_args()

    if args.no_reload:
        reload = False
    elif args.reload:
        reload = True
    else:
        reload = _env_bool("RELOAD", default_reload)

    display_host = "localhost" if args.host in ("0.0.0.0", "127.0.0.1") else args.host
    print(f"\n=======================================================")
    print(f"50points Backend API Running:")
    print(f"  Web / Root: http://{display_host}:{args.port}/")
    print(f"  Swagger UI: http://{display_host}:{args.port}/docs")
    print(f"  API Root:   http://{display_host}:{args.port}/api")
    print(f"  Health:     http://{display_host}:{args.port}/health")
    print(f"=======================================================\n")


    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=reload,
    )


if __name__ == "__main__":
    main()
