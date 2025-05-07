"""add appointment tags

Revision ID: add_appointment_tags
Revises: 
Create Date: 2023-05-30 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision = 'add_appointment_tags'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # 創建預約標籤關聯表
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
    
    # 遷移現有預約標籤數據
    op.execute("""
    INSERT INTO appointment_tags (appointment_id, tag_id)
    SELECT a.id, t.id FROM appointments a
    JOIN tag_types t ON t.name = '首次求診'
    WHERE a.is_first_time = 1;
    """)
    
    op.execute("""
    INSERT INTO appointment_tags (appointment_id, tag_id)
    SELECT a.id, t.id FROM appointments a
    JOIN tag_types t ON t.name = '麻煩症'
    WHERE a.is_troublesome = 1;
    """)
    
    op.execute("""
    INSERT INTO appointment_tags (appointment_id, tag_id)
    SELECT a.id, t.id FROM appointments a
    JOIN tag_types t ON t.name = '傳染病'
    WHERE a.is_contagious = 1;
    """)


def downgrade():
    op.drop_index(op.f('ix_appointment_tags_id'), table_name='appointment_tags')
    op.drop_table('appointment_tags') 