"""add default tools

Revision ID: c1f2e3d4a5b6
Revises: a7e2350e2772
Create Date: 2026-05-30 11:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = 'c1f2e3d4a5b6'
down_revision: Union[str, None] = 'a7e2350e2772'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the table
    op.create_table('default_tools',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_default_tools_id'), 'default_tools', ['id'], unique=False)
    op.create_index(op.f('ix_default_tools_name'), 'default_tools', ['name'], unique=True)
    
    # Seed data
    connection = op.get_bind()
    connection.execute(
        text("""
        INSERT INTO default_tools (name, description, is_active) VALUES 
        ('web_search', 'Search the web for real-time information.', true),
        ('doc_reader', 'Read and parse content from URLs or local knowledge bases.', true),
        ('code_exec', 'Execute Python or sandboxed code to compute results.', true)
        ON CONFLICT DO NOTHING
        """)
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_default_tools_name'), table_name='default_tools')
    op.drop_index(op.f('ix_default_tools_id'), table_name='default_tools')
    op.drop_table('default_tools')
