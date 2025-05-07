"""tag_types_migration

Revision ID: f7014dcdd8e0
Revises: a82d717721db
Create Date: 2025-05-04 13:03:49.041343

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'f7014dcdd8e0'
down_revision: Union[str, None] = 'a82d717721db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 創建標籤類型表
    op.create_table(
        'tag_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('color', sa.String(), nullable=False),
        sa.Column('icon', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 添加唯一約束，防止標籤名稱重複
    op.create_index(op.f('ix_tag_types_name'), 'tag_types', ['name'], unique=True)
    
    # 添加預設標籤
    connection = op.get_bind()
    connection.execute(
        text("""
        INSERT INTO tag_types (name, description, color, icon, is_active, created_at, updated_at)
        VALUES 
            ('麻煩症', '需要特別照顧或處理的患者', 'red', 'warning', true, NOW(), NOW()),
            ('傳染病', '可能傳染給他人的疾病，需要隔離處理', 'yellow', 'virus', true, NOW(), NOW())
        """)
    )


def downgrade():
    # 刪除標籤類型表
    op.drop_index(op.f('ix_tag_types_name'), table_name='tag_types')
    op.drop_table('tag_types') 
