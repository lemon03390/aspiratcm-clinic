"""add unique index to reference_data

Revision ID: 0f50858ff8c0
Revises: daaafd1b2d4d
Create Date: 2025-05-02 14:19:37.836268

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f50858ff8c0'
down_revision: Union[str, None] = 'daaafd1b2d4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create unique index on (data_type, data_key) in reference_data"""
    op.create_index(
        'uq_reference_data_type_key',
        'reference_data',
        ['data_type', 'data_key'],
        unique=True
    )

def downgrade() -> None:
    """Drop the unique index if exists"""
    op.drop_index('uq_reference_data_type_key', table_name='reference_data')
