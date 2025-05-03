"""merge patients and doctors

Revision ID: 6bc7f775e440
Revises: 65870cf2b288, 73140efe6739
Create Date: 2025-04-05 21:14:23.818646

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6bc7f775e440'
down_revision: Union[str, None] = ('65870cf2b288', '73140efe6739')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
