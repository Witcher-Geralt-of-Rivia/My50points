"""provider_runner_facts

Revision ID: c3e8a61f5b27
Revises: 9b3c7e1a2d40
Create Date: 2026-09-24

Real provider (The Racing API North America) facts that have no column yet:
- Horse.registrationNumber: stable North America horse identifier
- Horse.providerMeta / Race.providerMeta: JSON text with other verified
  provider fields (jockey/trainer ids, weight, equipment, medication, raw
  scratch indicator, morning-line text, distance text, provider flags).
All nullable; existing rows are untouched.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3e8a61f5b27"
down_revision: Union[str, Sequence[str], None] = "9b3c7e1a2d40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("Horse", schema=None) as b:
        b.add_column(sa.Column("registrationNumber", sa.String(), nullable=True))
        b.add_column(sa.Column("providerMeta", sa.Text(), nullable=True))
    with op.batch_alter_table("Race", schema=None) as b:
        b.add_column(sa.Column("providerMeta", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("Race", schema=None) as b:
        b.drop_column("providerMeta")
    with op.batch_alter_table("Horse", schema=None) as b:
        b.drop_column("providerMeta")
        b.drop_column("registrationNumber")
