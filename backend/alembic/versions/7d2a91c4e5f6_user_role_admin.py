"""user_role_admin

Revision ID: 7d2a91c4e5f6
Revises: 64620c348393
Create Date: 2026-09-21

Add User.role (founder | admin | member) so admin/simulate routes can
authorize browser sessions via the user's Bearer JWT instead of a shared
secret living in client code.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7d2a91c4e5f6'
down_revision: Union[str, Sequence[str], None] = '64620c348393'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('User', schema=None) as batch_op:
        batch_op.add_column(sa.Column('role', sa.String(), nullable=False, server_default='member'))


def downgrade() -> None:
    with op.batch_alter_table('User', schema=None) as batch_op:
        batch_op.drop_column('role')
