"""add_membership_account_system

Revision ID: 2c8f6d7a3e15
Revises: 2c48e4313138
Create Date: 2025-05-08 05:03:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '2c48e4313138'
down_revision: Union[str, None] = 'a0083fba14db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """建立會員餘額與變動日誌相關資料表。"""

    # 建立會員餘額表
    op.create_table(
        'membership_account_balances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('membership_id', sa.Integer(), nullable=False),
        sa.Column('storedValue', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('giftedValue', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['membership_id'], ['memberships.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_membership_account_balances_membership_id'), 'membership_account_balances', ['membership_id'], unique=True)

    # 建立會員帳戶變動日誌表
    op.create_table(
        'membership_account_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('membership_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('giftAmount', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('type', sa.String(), nullable=False),  # 'deposit' 或 'consumption'
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['membership_id'], ['memberships.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_membership_account_logs_membership_id'), 'membership_account_logs', ['membership_id'], unique=False)
    op.create_index(op.f('ix_membership_account_logs_created_at'), 'membership_account_logs', ['created_at'], unique=False)


def downgrade() -> None:
    """刪除會員餘額與變動日誌相關資料表。"""
    op.drop_index(op.f('ix_membership_account_logs_created_at'), table_name='membership_account_logs')
    op.drop_index(op.f('ix_membership_account_logs_membership_id'), table_name='membership_account_logs')
    op.drop_table('membership_account_logs')

    op.drop_index(op.f('ix_membership_account_balances_membership_id'), table_name='membership_account_balances')
    op.drop_table('membership_account_balances')
