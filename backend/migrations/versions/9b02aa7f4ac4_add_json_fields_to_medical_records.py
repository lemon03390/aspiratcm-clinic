"""add_json_fields_to_medical_records

Revision ID: 9b02aa7f4ac4
Revises: bef231edfb1d
Create Date: 2025-05-01 13:50:38.851356

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9b02aa7f4ac4'
down_revision: Union[str, None] = 'bef231edfb1d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('medical_records', sa.Column('diagnosis_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('medical_records', sa.Column('treatment_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('medical_records', sa.Column('prescription_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # ⚠️ 修改 observation 欄位為 JSONB，需手動加入 USING 語法
    op.execute("""
        ALTER TABLE medical_records
        ALTER COLUMN observation TYPE JSONB
        USING observation::jsonb
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('medical_records', 'observation',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               type_=sa.TEXT(),
               existing_nullable=True)
    op.drop_column('medical_records', 'prescription_json')
    op.drop_column('medical_records', 'treatment_json')
    op.drop_column('medical_records', 'diagnosis_json')