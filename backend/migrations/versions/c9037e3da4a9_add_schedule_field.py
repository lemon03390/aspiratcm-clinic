"""add_schedule_field

Revision ID: c9037e3da4a9
Revises: ebf8ebaaf5b3
Create Date: 2025-03-23 23:52:53.667987

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9037e3da4a9'
down_revision: Union[str, None] = 'ebf8ebaaf5b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 添加 schedule 欄位到 doctors 表
    op.add_column('doctors', sa.Column('schedule', sa.ARRAY(sa.String()), server_default='{}', nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # 從 doctors 表中刪除 schedule 欄位
    op.drop_column('doctors', 'schedule')
