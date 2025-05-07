"""add_members_table

Revision ID: a0083fba14db
Revises: f7014dcdd8e0
Create Date: 2025-05-04 13:36:27.324781

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0083fba14db'
down_revision: Union[str, None] = 'f7014dcdd8e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


"""add_members_table_and_appointment_tags

Revision ID: a0083fba14db
Revises: f7014dcdd8e0
Create Date: 2025-05-04 13:36:27.324781
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func, text

# revision identifiers, used by Alembic.
revision: str = 'a0083fba14db'
down_revision: Union[str, None] = 'f7014dcdd8e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # 1. 更新 tag_types 欄位註解與索引
    op.alter_column('tag_types', 'name',
               existing_type=sa.VARCHAR(),
               comment='標籤名稱',
               existing_nullable=False)
    op.alter_column('tag_types', 'description',
               existing_type=sa.VARCHAR(),
               comment='標籤描述',
               existing_nullable=True)
    op.alter_column('tag_types', 'color',
               existing_type=sa.VARCHAR(),
               comment='標籤顏色',
               existing_nullable=False)
    op.alter_column('tag_types', 'icon',
               existing_type=sa.VARCHAR(),
               comment='標籤圖示',
               existing_nullable=True)
    op.alter_column('tag_types', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=True,
               comment='是否啟用',
               existing_server_default=sa.text('true'))
    op.create_index(op.f('ix_tag_types_id'), 'tag_types', ['id'], unique=False)

    # 2. 建立 members 表
    op.create_table(
        'members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('id_number', sa.String(), nullable=True),
        sa.Column('gender', sa.String(), nullable=True),
        sa.Column('dob', sa.DateTime(), nullable=True),
        sa.Column('has_card', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('has_signed_consent_form', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id_number')
    )
    op.create_index(op.f('ix_members_id'), 'members', ['id'], unique=False)

    # 3. 建立 appointment_tags 關聯表
    op.create_table(
        'appointment_tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=func.now()),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tag_types.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_appointment_tags_id'), 'appointment_tags', ['id'], unique=False)

    # 4. 遷移過往 appointment 的標籤
    op.execute(text("""
        INSERT INTO appointment_tags (appointment_id, tag_id)
        SELECT a.id, t.id FROM appointments a
        JOIN tag_types t ON t.name = '首次求診'
        WHERE a.is_first_time = 1;
    """))
    op.execute(text("""
        INSERT INTO appointment_tags (appointment_id, tag_id)
        SELECT a.id, t.id FROM appointments a
        JOIN tag_types t ON t.name = '麻煩症'
        WHERE a.is_troublesome = 1;
    """))
    op.execute(text("""
        INSERT INTO appointment_tags (appointment_id, tag_id)
        SELECT a.id, t.id FROM appointments a
        JOIN tag_types t ON t.name = '傳染病'
        WHERE a.is_contagious = 1;
    """))


def downgrade() -> None:
    """Downgrade schema."""

    # 還原 appointment_tags 表
    op.drop_index(op.f('ix_appointment_tags_id'), table_name='appointment_tags')
    op.drop_table('appointment_tags')

    # 還原 members 表
    op.drop_index(op.f('ix_members_id'), table_name='members')
    op.drop_table('members')

    # 還原 tag_types 的註解與索引
    op.drop_index(op.f('ix_tag_types_id'), table_name='tag_types')
    op.alter_column('tag_types', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=False,
               comment=None,
               existing_comment='是否啟用',
               existing_server_default=sa.text('true'))
    op.alter_column('tag_types', 'icon',
               existing_type=sa.VARCHAR(),
               comment=None,
               existing_comment='標籤圖示',
               existing_nullable=True)
    op.alter_column('tag_types', 'color',
               existing_type=sa.VARCHAR(),
               comment=None,
               existing_comment='標籤顏色',
               existing_nullable=False)
    op.alter_column('tag_types', 'description',
               existing_type=sa.VARCHAR(),
               comment=None,
               existing_comment='標籤描述',
               existing_nullable=True)
    op.alter_column('tag_types', 'name',
               existing_type=sa.VARCHAR(),
               comment=None,
               existing_comment='標籤名稱',
               existing_nullable=False)
