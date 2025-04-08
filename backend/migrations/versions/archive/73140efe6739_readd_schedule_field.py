"""readd_schedule_field

Revision ID: 73140efe6739
Revises: bb4aed1a3f04
Create Date: 2025-03-24 00:19:39.302372

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '73140efe6739'
down_revision: Union[str, None] = 'bb4aed1a3f04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 重新添加 schedule 欄位到 doctors 表
    op.add_column('doctors', sa.Column('schedule', sa.ARRAY(sa.String()), server_default='{}', nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # 移除 schedule 欄位
    op.drop_column('doctors', 'schedule')
