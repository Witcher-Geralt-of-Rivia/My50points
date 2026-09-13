"""
Migración one-shot: SQLite (backend/data/dev.db)  ->  Postgres (Supabase).

Uso:
    cd backend
    # DATABASE_URL debe apuntar al Postgres de Supabase (en .env o export)
    python scripts/migrate_sqlite_to_supabase.py [--wipe]

Qué hace:
  1. Crea TODAS las tablas en el destino usando el mismo esquema de la app
     (Base.metadata.create_all) — así el Postgres queda idéntico a los modelos.
  2. Copia fila por fila cada tabla desde SQLite preservando los IDs.
  3. Reinicia las secuencias (serial) de cada PK 'id' a MAX(id)+1.
  4. Imprime conteos origen/destino para verificar.

Notas:
  - Las fechas se almacenan como enteros (ms) en columnas BigInteger, así que
    se copian tal cual (sin conversión de zona horaria).
  - Los booleanos de SQLite (0/1) se convierten a bool para Postgres.
  - Idempotencia: usa --wipe para vaciar las tablas destino antes de copiar
    (TRUNCATE ... RESTART IDENTITY CASCADE). Sin --wipe, aborta si hay datos.
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

# Permite ejecutar desde backend/ importando el paquete app
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

# La consola de Windows (cp1252) no imprime emojis; forzar UTF-8 evita crashes de print.
try:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
except Exception:
    pass

from sqlalchemy import Boolean, text  # noqa: E402

from app.config import settings  # noqa: E402
from app.database import Base, engine, is_sqlite  # noqa: E402
import app.models  # noqa: F401,E402  (registra los modelos en Base.metadata)

SQLITE_PATH = BACKEND_ROOT / "data" / "dev.db"


def die(msg: str) -> None:
    print(f"\n❌ {msg}")
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--wipe",
        action="store_true",
        help="Vaciar tablas destino antes de copiar (TRUNCATE RESTART IDENTITY CASCADE).",
    )
    args = parser.parse_args()

    if is_sqlite:
        die(
            "DATABASE_URL apunta a SQLite. Debe apuntar al Postgres de Supabase.\n"
            f"   Valor actual: {settings.database_url}"
        )
    if not SQLITE_PATH.exists():
        die(f"No existe el SQLite de origen: {SQLITE_PATH}")

    print(f"Origen : sqlite -> {SQLITE_PATH}")
    print(f"Destino: {engine.url.render_as_string(hide_password=True)}")

    # 1) Crear el esquema en el destino (idéntico a los modelos de la app)
    print("\n[1/4] Creando tablas en Postgres (create_all)...")
    Base.metadata.create_all(engine)

    tables = list(Base.metadata.sorted_tables)  # padres antes que hijos (FK-safe)

    # Conexión de origen (SQLite) — filas como dict por nombre de columna
    src = sqlite3.connect(str(SQLITE_PATH))
    src.row_factory = sqlite3.Row

    raw = engine.raw_connection()  # conexión DBAPI cruda (psycopg)
    try:
        cur = raw.cursor()

        if args.wipe:
            print("\n[2/4] --wipe: vaciando tablas destino...")
            for t in reversed(tables):
                cur.execute(f'TRUNCATE TABLE "{t.name}" RESTART IDENTITY CASCADE')
            raw.commit()
        else:
            # Seguridad: no sobrescribir un Postgres con datos
            for t in tables:
                cur.execute(f'SELECT COUNT(*) FROM "{t.name}"')
                if cur.fetchone()[0] > 0:
                    die(
                        f'La tabla destino "{t.name}" ya tiene datos. '
                        "Usa --wipe para reiniciar el destino."
                    )

        print("\n[3/4] Copiando datos tabla por tabla (se omiten filas huérfanas)...")
        summary: list[tuple[str, int, int]] = []
        loaded_ids: dict[str, set] = {}  # tabla -> ids realmente insertados (para validar FKs)

        for t in tables:
            cols = [c.name for c in t.columns]
            bool_cols = {c.name for c in t.columns if isinstance(c.type, Boolean)}
            # Mapa FK: columna_hijo -> tabla_padre (los padres se cargan antes por sorted_tables)
            fk_map = {fk.parent.name: fk.column.table.name for fk in t.foreign_keys}

            try:
                rows = src.execute(f'SELECT * FROM "{t.name}"').fetchall()
            except sqlite3.OperationalError:
                # La tabla no existe en el SQLite de origen: se omite
                summary.append((t.name, 0, 0))
                loaded_ids[t.name] = set()
                continue

            valid, skipped = [], 0
            for r in rows:
                ok = True
                for child_col, parent_tbl in fk_map.items():
                    val = r[child_col] if child_col in r.keys() else None
                    if val is not None and val not in loaded_ids.get(parent_tbl, set()):
                        ok = False
                        break
                if ok:
                    valid.append(r)
                else:
                    skipped += 1

            if valid:
                col_list = ", ".join(f'"{c}"' for c in cols)
                placeholders = ", ".join(["%s"] * len(cols))
                insert_sql = f'INSERT INTO "{t.name}" ({col_list}) VALUES ({placeholders})'
                payload = []
                for r in valid:
                    values = []
                    for c in cols:
                        v = r[c] if c in r.keys() else None
                        if c in bool_cols and v is not None:
                            v = bool(v)
                        values.append(v)
                    payload.append(tuple(values))
                cur.executemany(insert_sql, payload)

            loaded_ids[t.name] = {r["id"] for r in valid} if "id" in cols else set()
            summary.append((t.name, len(valid), skipped))

        raw.commit()

        # 4) Reiniciar secuencias de los PK 'id'
        print("\n[4/4] Ajustando secuencias (serial PK)...")
        for t in tables:
            if "id" in t.columns:
                cur.execute(
                    f"""
                    SELECT setval(
                        pg_get_serial_sequence('"{t.name}"', 'id'),
                        COALESCE((SELECT MAX(id) FROM "{t.name}"), 1),
                        (SELECT COUNT(*) FROM "{t.name}") > 0
                    )
                    WHERE pg_get_serial_sequence('"{t.name}"', 'id') IS NOT NULL
                    """
                )
        raw.commit()

        print("\n✅ Migración completada. Resumen (tabla: copiadas / omitidas-huérfanas):")
        total_copied = total_skipped = 0
        for name, n, sk in summary:
            total_copied += n
            total_skipped += sk
            flag = f"  ⚠️ {sk} huérfanas omitidas" if sk else ""
            print(f"   {name:<24} {n}{flag}")
        print(f"\n   TOTAL: {total_copied} filas copiadas, {total_skipped} huérfanas omitidas")
    finally:
        cur.close()
        raw.close()
        src.close()


if __name__ == "__main__":
    main()
