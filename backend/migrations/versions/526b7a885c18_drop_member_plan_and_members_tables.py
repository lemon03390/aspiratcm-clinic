"""drop member_plan and members tables

Revision ID: 526b7a885c18
Revises: e40a2a201a61
Create Date: 2025-05-09 23:25:25.607540

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '526b7a885c18'
down_revision: Union[str, None] = 'e40a2a201a61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """刪除不需要的 member_plan 和 members 資料表。"""
    op.drop_table('member_plan')
    op.drop_index('ix_members_id', table_name='members')
    op.drop_table('members')


def downgrade() -> None:
    """若要還原，重新建立 members 和 member_plan 資料表。"""
    op.create_table(
        'members',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('id_number', sa.String(), nullable=True),
        sa.Column('gender', sa.String(), nullable=True),
        sa.Column('dob', sa.DateTime(), nullable=True),
        sa.Column('has_card', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('has_signed_consent_form', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('id_number', name='members_id_number_key')
    )
    op.create_index('ix_members_id', 'members', ['id'])

    op.create_table(
        'member_plan',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('membership_id', sa.Integer(), nullable=False),
        sa.Column('plan_type', sa.String(), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['membership_id'], ['memberships.id'], ondelete='CASCADE')
    )
