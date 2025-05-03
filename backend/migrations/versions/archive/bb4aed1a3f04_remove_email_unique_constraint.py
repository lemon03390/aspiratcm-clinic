"""remove_email_unique_constraint

Revision ID: bb4aed1a3f04
Revises: c9037e3da4a9
Create Date: 2025-03-24 00:07:49.330456

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb4aed1a3f04'
down_revision: Union[str, None] = 'c9037e3da4a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 刪除 email 欄位的唯一約束
    op.drop_index('ix_doctors_email', table_name='doctors')
    op.create_index(op.f('ix_doctors_email'), 'doctors', ['email'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # 恢復 email 欄位的唯一約束
    op.drop_index(op.f('ix_doctors_email'), table_name='doctors')
    op.create_index('ix_doctors_email', 'doctors', ['email'], unique=True)
