"""add_waiting_list_table

Revision ID: waiting_list_table
Revises: 94ddcc775540
Create Date: 2023-09-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'waiting_list_table'
down_revision = '94ddcc775540'
branch_labels = None
depends_on = None


def upgrade():
    # 創建 waiting_list 表
    op.create_table('waiting_list',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('registration_number', sa.String(), nullable=False),
        sa.Column('chinese_name', sa.String(), nullable=False),
        sa.Column('doctor_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], ),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_waiting_list_created_at'), 'waiting_list', ['created_at'], unique=False)
    op.create_index(op.f('ix_waiting_list_id'), 'waiting_list', ['id'], unique=False)
    op.create_index(op.f('ix_waiting_list_patient_id'), 'waiting_list', ['patient_id'], unique=False)
    op.create_index(op.f('ix_waiting_list_registration_number'), 'waiting_list', ['registration_number'], unique=False)


def downgrade():
    # 刪除 waiting_list 表
    op.drop_index(op.f('ix_waiting_list_registration_number'), table_name='waiting_list')
    op.drop_index(op.f('ix_waiting_list_patient_id'), table_name='waiting_list')
    op.drop_index(op.f('ix_waiting_list_id'), table_name='waiting_list')
    op.drop_index(op.f('ix_waiting_list_created_at'), table_name='waiting_list')
    op.drop_table('waiting_list') 