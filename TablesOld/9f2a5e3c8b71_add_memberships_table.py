"""Add memberships table to match CSV format.

Revision ID: 9f2a5e3c8b71
Revises: latest
Create Date: 2024-05-05 08:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9f2a5e3c8b71'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """建立與CSV格式相符的memberships表。"""
    op.create_table(
        'memberships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=True),
        sa.Column('phoneNumber', sa.String(), nullable=True),
        sa.Column('contactAddress', sa.String(), nullable=True),
        sa.Column('patientName', sa.String(), nullable=False),
        sa.Column('hkid', sa.String(), nullable=True),
        sa.Column('termsConsent', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('haveCard', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('hkid')
    )
    op.create_index(op.f('ix_memberships_id'), 'memberships', ['id'], unique=False)
    op.create_index(op.f('ix_memberships_patient_id'), 'memberships', ['patient_id'], unique=False)


def downgrade() -> None:
    """刪除memberships表。"""
    op.drop_index(op.f('ix_memberships_patient_id'), table_name='memberships')
    op.drop_index(op.f('ix_memberships_id'), table_name='memberships')
    op.drop_table('memberships') 