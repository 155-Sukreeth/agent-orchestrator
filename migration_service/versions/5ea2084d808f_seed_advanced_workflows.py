"""seed advanced workflows

Revision ID: 5ea2084d808f
Revises: 4ea1073d807e
Create Date: 2026-05-28 16:40:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '5ea2084d808f'
down_revision = '4ea1073d807e'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Customer Support Agent Workflow
    cs_workflow_graph = {
        "nodes": [
            {
                "id": "start",
                "type": "userMessageNode",
                "config": {"label": "User Input", "input_key": "message"}
            },
            {
                "id": "classifier",
                "type": "routerNode",
                "config": {"label": "Intent Router", "condition_type": "llm_judge", "condition": "Is this a refund request?"}
            },
            {
                "id": "refund_agent",
                "type": "reactAgentNode",
                "config": {"label": "Refund Specialist", "system_prompt": "You process refunds.", "llm_params": {"primary_model": "gemini/gemini-3.1-flash-lite"}, "tools": ["billing_api"]}
            },
            {
                "id": "human_approval",
                "type": "humanPauseNode",
                "config": {"label": "Manager Approval", "approval_prompt": "Approve refund?"}
            },
            {
                "id": "general_support",
                "type": "knowledgeNode",
                "config": {"label": "Policy DB", "knowledge_base_id": "kb_company_policies", "top_k": 3}
            },
            {
                "id": "support_llm",
                "type": "llmNode",
                "config": {"label": "Support Responder", "llm_params": {"primary_model": "gemini/gemini-3.1-flash-lite"}, "system_prompt": "Answer using policy context."}
            }
        ],
        "edges": [
            {"source": "start", "target": "classifier"},
            {"source": "classifier", "target": "refund_agent", "condition": "yes"},
            {"source": "classifier", "target": "general_support", "condition": "no"},
            {"source": "refund_agent", "target": "human_approval"},
            {"source": "general_support", "target": "support_llm"}
        ],
        "entry_node": "start"
    }

    # 2. Job Search Agent Workflow
    job_workflow_graph = {
        "nodes": [
            {
                "id": "start",
                "type": "userMessageNode",
                "config": {"label": "Job Query", "input_key": "resume"}
            },
            {
                "id": "resume_extractor",
                "type": "llmNode",
                "config": {"label": "Skills Extractor", "llm_params": {"primary_model": "gemini/gemini-3.1-flash-lite"}, "system_prompt": "Extract skills into JSON."}
            },
            {
                "id": "job_search_tool",
                "type": "reactAgentNode",
                "config": {"label": "LinkedIn Searcher", "llm_params": {"primary_model": "groq/llama3-70b-8192"}, "tools": ["web_search", "linkedin_api"], "system_prompt": "Find jobs matching skills."}
            }
        ],
        "edges": [
            {"source": "start", "target": "resume_extractor"},
            {"source": "resume_extractor", "target": "job_search_tool"}
        ],
        "entry_node": "start"
    }

    workflows_table = sa.table(
        'workflows',
        sa.column('name', sa.String),
        sa.column('description', sa.String),
        sa.column('graph_definition', sa.JSON),
        sa.column('channels', sa.JSON),
        sa.column('is_active', sa.Boolean),
        sa.column('is_template', sa.Boolean)
    )

    op.bulk_insert(workflows_table, [
        {
            "name": "Customer Support Agent",
            "description": "Handles general queries via RAG and routes refunds to a human-in-the-loop specialist.",
            "graph_definition": cs_workflow_graph,
            "channels": ["telegram", "web"],
            "is_active": True,
            "is_template": False
        },
        {
            "name": "Job Search Agent",
            "description": "Extracts skills from a resume and searches LinkedIn for matching roles.",
            "graph_definition": job_workflow_graph,
            "channels": ["telegram"],
            "is_active": True,
            "is_template": False
        }
    ])

def downgrade() -> None:
    op.execute("DELETE FROM workflows WHERE name IN ('Customer Support Agent', 'Job Search Agent');")
