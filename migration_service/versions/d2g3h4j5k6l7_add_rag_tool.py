"""add rag tool

Revision ID: d2g3h4j5k6l7
Revises: c1f2e3d4a5b6
Create Date: 2026-05-30 11:51:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = 'd2g3h4j5k6l7'
down_revision: Union[str, None] = 'c1f2e3d4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        text("""
        INSERT INTO default_tools (name, description, is_active) VALUES 
        ('rag_tool', 'Perform Retrieval-Augmented Generation using connected knowledge bases.', true)
        ON CONFLICT DO NOTHING
        """)
    )


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        text("""
        DELETE FROM default_tools WHERE name = 'rag_tool'
        """)
    )
