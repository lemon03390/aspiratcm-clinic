"""add reference data indexes

Revision ID: daaafd1b2d4d
Revises: 9b02aa7f4ac4
Create Date: 2025-05-01 20:01:06.311015
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'daaafd1b2d4d'
down_revision: Union[str, None] = '9b02aa7f4ac4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(
        'ix_reference_data_data_type',
        'reference_data',
        ['data_type']
    )
    op.create_index(
        'ix_reference_data_data_key',
        'reference_data',
        ['data_key']
    )
    op.create_index(
        'ix_reference_data_data_type_key',
        'reference_data',
        ['data_type', 'data_key']
    )
    op.create_index(
        'ix_reference_data_is_active',
        'reference_data',
        ['is_active']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_reference_data_data_type', table_name='reference_data')
    op.drop_index('ix_reference_data_data_key', table_name='reference_data')
    op.drop_index('ix_reference_data_data_type_key', table_name='reference_data')
    op.drop_index('ix_reference_data_is_active', table_name='reference_data')
