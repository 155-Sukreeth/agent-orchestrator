"""add missing default tools

Revision ID: e8f9a0b1c2d3
Revises: d2g3h4j5k6l7
Create Date: 2026-05-31 11:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, None] = '7265461d2805'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Seed data
    connection = op.get_bind()
    connection.execute(
        text("""
        INSERT INTO default_tools (name, description, is_active) VALUES 
        ('send_notification', 'Send messages to communication channels (Slack, Discord, Email, etc.)', true),
        ('http_request', 'Execute custom HTTP/API requests', true)
        ON CONFLICT DO NOTHING
        """)
    )


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        text("""
        DELETE FROM default_tools WHERE name IN ('send_notification', 'http_request')
        """)
    )
