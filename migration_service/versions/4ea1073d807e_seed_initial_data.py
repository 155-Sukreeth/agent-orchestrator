"""Seed initial data

Revision ID: 4ea1073d807e
Revises: e9f3ba5e13e9
Create Date: 2026-05-24 16:57:33.096792

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4ea1073d807e'
down_revision: Union[str, None] = 'e9f3ba5e13e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    import json
    
    agents_table = sa.table(
        'agents',
        sa.column('name', sa.String),
        sa.column('role', sa.String),
        sa.column('provider', sa.String),
        sa.column('model', sa.String),
        sa.column('system_prompt', sa.String),
        sa.column('tools', sa.JSON),
        sa.column('memory', sa.Boolean),
        sa.column('guardrails', sa.JSON)
    )

    op.bulk_insert(agents_table, [
        {
            "name": "Customer Support Agent",
            "role": "Support",
            "provider": "openai",
            "model": "gpt-4o",
            "system_prompt": "You are a helpful customer support agent.",
            "tools": [],
            "memory": False,
            "guardrails": {}
        },
        {
            "name": "Data Analyst",
            "role": "Analytics",
            "provider": "anthropic",
            "model": "claude-3-5-sonnet-20240620",
            "system_prompt": "You are a data analyst that helps interpret metrics.",
            "tools": [],
            "memory": False,
            "guardrails": {}
        }
    ])

    workflows_table = sa.table(
        'workflows',
        sa.column('name', sa.String),
        sa.column('description', sa.String),
        sa.column('graph_definition', sa.JSON),
        sa.column('is_active', sa.Boolean),
        sa.column('channels', sa.JSON),
        sa.column('is_template', sa.Boolean)
    )

    op.bulk_insert(workflows_table, [
        {
            "name": "General Support Workflow",
            "description": "A workflow that handles basic customer support queries.",
            "graph_definition": {
                "nodes": [
                    {
                        "id": "support_agent",
                        "type": "agent",
                        "config": {
                            "provider": "openai",
                            "model": "gpt-4o",
                            "system_prompt": "You are a helpful support agent."
                        }
                    }
                ],
                "edges": [],
                "entry_node": "support_agent"
            },
            "is_active": True,
            "channels": [],
            "is_template": False
        }
    ])


def downgrade() -> None:
    pass
