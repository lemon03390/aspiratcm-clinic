"""add_membership_account_system

Revision ID: 2c8f6d7a3e15
Revises: 542f8ed7f0ee
Create Date: 2025-05-08 05:03:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2c8f6d7a3e15'
down_revision = '2c48e4313138'
branch_labels = None
depends_on = None


def upgrade():
    # 1. 創建會員餘額表
    op.create_table(
        'membership_account_balances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('membership_id', sa.Integer(), nullable=False),
        sa.Column('storedValue', sa.Integer(), nullable=False, default=0),
        sa.Column('giftedValue', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), 
                 onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['membership_id'], ['memberships.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_membership_account_balances_membership_id'), 
                    'membership_account_balances', ['membership_id'], unique=True)

    # 2. 創建會員餘額變動日誌表
    op.create_table(
        'membership_account_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('membership_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('giftAmount', sa.Integer(), nullable=False, default=0),
        sa.Column('type', sa.String(), nullable=False),  # 'deposit' 或 'consumption'
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), 
                 onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['membership_id'], ['memberships.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_membership_account_logs_membership_id'), 
                    'membership_account_logs', ['membership_id'], unique=False)
    op.create_index(op.f('ix_membership_account_logs_created_at'), 
                    'membership_account_logs', ['created_at'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_membership_account_logs_created_at'), table_name='membership_account_logs')
    op.drop_index(op.f('ix_membership_account_logs_membership_id'), table_name='membership_account_logs')
    op.drop_table('membership_account_logs')
    
    op.drop_index(op.f('ix_membership_account_balances_membership_id'), 
                 table_name='membership_account_balances')
    op.drop_table('membership_account_balances') 