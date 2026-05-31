# AI Agent Orchestration Platform

A full-stack platform for creating, configuring, and orchestrating AI agents into collaborative multi-agent workflows. Agents run on a real LangGraph runtime, execute real tools, and can be reached through Telegram. A React-based web UI provides visual workflow building, live monitoring, and full agent management.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Architecture Decisions & Justifications](#architecture-decisions--justifications)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Running](#setup--running)
- [Seeding Initial Data](#seeding-initial-data)
- [Telegram Integration Setup](#telegram-integration-setup)
- [Feature Walkthrough](#feature-walkthrough)
- [Adding New Workflow Templates](#adding-new-workflow-templates)
- [Adding New Messaging Channels](#adding-new-messaging-channels)
- [Environment Variables Reference](#environment-variables-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        External World                               │
│    User Browser          Telegram Bot         Webhook Callers       │
└────────┬────────────────────┬──────────────────────┬───────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Backend Service  :8000                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  REST API    │  │  WebSocket   │  │  Webhook / Telegram      │  │
│  │  (Agents,    │  │  (Live Logs  │  │  Adaptors (parse inbound │  │
│  │  Workflows,  │  │   Stream)    │  │  msgs, dispatch runs)    │  │
│  │  Runs, Auth) │  └──────────────┘  └──────────────────────────┘  │
│  └──────┬───────┘                                                   │
│         │  PostgreSQL (pgvector)         Redis (pub/sub + cache)    │
└─────────┼─────────────────────────────────────────────────────────-─┘
          │
          │ HTTP (dispatch AgentRunPayload)
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Agents Service  :8001                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  LangGraph Runtime                                             │ │
│  │                                                                │ │
│  │  compile_graph(graph_definition)                               │ │
│  │       │                                                        │ │
│  │  ┌────▼────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐  │ │
│  │  │ Agent   │──▶│ Router   │──▶│  Tool    │──▶│  LLM /     │  │ │
│  │  │  Node   │   │  Node    │   │  Node    │   │  Knowledge │  │ │
│  │  └─────────┘   └──────────┘   └──────────┘   │  Node      │  │ │
│  │                                               └────────────┘  │ │
│  │  Semantic Router — maps inbound messages to workflows via LLM  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│         │                                                           │
│         ▼  OpenAI-compatible API                                    │
│  ┌──────────────┐                                                   │
│  │   Bifrost    │  :8080  (AI Gateway — provider key mgmt,         │
│  │   Gateway    │          retries, fallbacks, logging)             │
│  └──────┬───────┘                                                   │
└─────────┼───────────────────────────────────────────────────────────┘
          │
          ▼
  OpenAI / Anthropic / Google / Mistral / Groq  (external LLM APIs)


┌─────────────────────────────────────────────────────────────────────┐
│               Knowledge Base Service  :8002                         │
│  Vector search (pgvector + Ollama embeddings) for RAG               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│               Frontend  :3000 / :5173  (React + Vite)               │
│  AgentsDashboard · WorkflowBuilder · LiveMonitor · Connections      │
└─────────────────────────────────────────────────────────────────────┘
```

**Request flow for an inbound Telegram message:**

1. Telegram POSTs to `/webhooks/telegram` on the Backend.
2. `TelegramAdaptor` parses the payload into a normalized `AgentRunPayload`.
3. The Semantic Router queries active workflows and uses an LLM to pick the best match.
4. A `Run` record is created in PostgreSQL; the payload is forwarded to the Agents service.
5. The Agents service compiles the workflow's `graph_definition` into a LangGraph `StateGraph` and executes it.
6. Each graph node streams events back via Redis pub/sub; the Backend log streamer forwards them to the browser over WebSocket.
7. On completion, the Backend sends the agent's reply back to the Telegram chat via `TelegramAdaptor`.

---

## Architecture Decisions & Justifications

### Runtime: LangGraph

LangGraph was chosen over CrewAI, AutoGen, and a custom runtime for three reasons:

- **Graph-as-data**: A workflow's entire topology is stored as a JSON `graph_definition` in PostgreSQL. The `compile_graph` function deserializes it into a `StateGraph` at runtime — this is what makes the visual workflow builder functional rather than cosmetic. No other framework offers this compile-from-JSON pattern as cleanly.
- **Conditional edges natively**: LangGraph's `add_conditional_edges` maps directly to the Router node concept (LLM-judge and keyword conditions) without glue code.
- **Async streaming**: LangGraph's async execution model integrates naturally with the SSE/WebSocket log streaming used in the Live Monitor.

### AI Gateway: Bifrost

All LLM calls go through [Bifrost](https://github.com/maximhq/bifrost) rather than hitting provider SDKs directly:

- Single OpenAI-compatible endpoint regardless of provider (OpenAI, Anthropic, Google, Mistral, Groq).
- Built-in retries, exponential backoff, and model fallbacks configured in `ai-gateway/config.json`.
- Provider keys are managed in one place via environment variables — agents never hold API keys directly.
- Prompt caching and request logging are toggleable per-call via `extra_body`.

### Language: Python + TypeScript

Python is the natural choice for LLM/agent work given the LangGraph, LangChain, and OpenAI SDK ecosystem. FastAPI provides async HTTP and WebSocket with minimal boilerplate. TypeScript/React was chosen for the frontend for type safety in a complex visual builder with many node and edge types.

### Persistence: PostgreSQL + pgvector + Redis

- **PostgreSQL** stores all domain entities (agents, workflows, runs, logs, integrations). The `pgvector` extension enables vector similarity search for the Knowledge Base RAG feature and for semantic workflow routing.
- **Redis** is used for async pub/sub between the Agents service and the Backend log streamer, enabling real-time event push without polling.

### Monorepo with microservices

All services live in one repository for ease of setup (`docker-compose up --build` starts everything). The services are independently deployable and communicate only via HTTP or Redis — there are no shared in-process imports between Backend and Agents at runtime.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Agent Runtime | LangGraph (Python) |
| AI Gateway | Bifrost (Docker) |
| Backend API | FastAPI + SQLAlchemy (async) + Alembic |
| Database | PostgreSQL 15 + pgvector |
| Cache / Pub-Sub | Redis |
| Messaging Channel | Telegram Bot API |
| Knowledge Base | FastAPI + Ollama (local embeddings) + pgvector |
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
agent-orchestrator/
├── agents/                  # Agents microservice (LangGraph runtime)
│   ├── graph/
│   │   ├── builder.py       # compile_graph: JSON graph_definition → StateGraph
│   │   ├── state.py         # AgentState TypedDict
│   │   └── nodes/           # AgentNode, RouterNode, ToolNode, LLMNode,
│   │                        #   KnowledgeNode, HumanPauseNode, ...
│   ├── clients/             # BifrostClient, BackendClient, RedisClient
│   ├── tools/               # web_search, http_request, code_exec, send_notification
│   ├── templates/           # Jinja2 system-prompt templates per agent role
│   ├── services/            # SemanticRouterService, CompilerService
│   └── config/              # LLM param profiles (AGENT_DEFAULT, LLM_JUDGE, ...)
│
├── backend/                 # Backend microservice (FastAPI REST + WebSocket)
│   ├── routers/             # agents, workflows, runs, webhooks, ws, auth, ...
│   ├── adaptors/            # TelegramAdaptor (extensible channel abstraction)
│   ├── services/            # RunService, AgentService, SemanticRouterService
│   ├── repositories/        # DB access layer (one class per model)
│   ├── models.py            # SQLAlchemy models
│   └── log_streamer.py      # Redis pub/sub → WebSocket bridge
│
├── frontend/                # React + Vite SPA
│   └── src/
│       ├── pages/           # AgentsDashboard, WorkflowBuilder, LiveMonitor,
│       │                    #   Connections, Knowledge pages
│       └── components/      # Node components, NodeConfigSidebar, Layout
│
├── knowledge_base/          # RAG microservice (pgvector + Ollama embeddings)
├── ai-gateway/              # Bifrost config (provider keys, retries, fallbacks)
├── migration_service/       # Alembic migration scripts
├── docker-compose.yml
├── .env.sample
└── run.md
```

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2)
- At least one LLM provider API key (OpenAI, Anthropic, Google, Mistral, or Groq)

For local development without Docker you also need Python 3.11+, Node.js 18+, PostgreSQL 15 with the `pgvector` extension, and Redis.

---

## Setup & Running

### Method 1: Docker Compose (Recommended)

Starts every service — database, Redis, Bifrost gateway, backend, agents, knowledge base, and frontend — with a single command.

```bash
# 1. Clone the repository
git clone https://github.com/155-Sukreeth/agent-orchestrator.git
cd agent-orchestrator
git checkout develop/1.0

# 2. Configure environment
cp .env.sample .env
# Open .env and add at least one LLM provider key, e.g.:
#   OPENAI_API_KEY=sk-...
# All other defaults work out of the box for local Docker use.

# 3. Start all services
docker-compose up --build
```

**Services after startup:**

| Service | URL |
|---|---|
| Frontend UI | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Agents Runtime | http://localhost:8001 |
| Bifrost AI Gateway | http://localhost:8080/workspace/dashboard |
| Knowledge Base API | http://localhost:8002 |

Database migrations run automatically on backend startup.

---

### Method 2: Local Development (without Docker for app services)

Faster iteration cycle. Infrastructure still runs in Docker.

```bash
# Start only infrastructure
docker-compose up db redis bifrost -d

# Terminal 1 — Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173

# Terminal 2 — Backend
python -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt
alembic upgrade head
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3 — Agents
python -m venv agents_venv && source agents_venv/bin/activate
pip install -r agents/requirements.txt
uvicorn agents.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 4 — Knowledge Base (optional)
python -m venv kb_venv && source kb_venv/bin/activate
pip install -r knowledge_base/requirements.txt
uvicorn knowledge_base.main:app --host 0.0.0.0 --port 8002 --reload
```

---

## Seeding Initial Data

After backend and database are running, seed default workflow templates and example agents:

**Docker:**
```bash
docker-compose exec -e PYTHONPATH=/app backend python backend/seed.py
```

**Local:**
```bash
export PYTHONPATH=$(pwd)
python backend/seed.py
```

This creates a default organization, an admin user, pre-built workflow templates, and example agents with roles, system prompts, and tool assignments.

---

## Telegram Integration Setup

Telegram is the supported external messaging channel. Connect a workflow to a Telegram bot to let users converse with agents directly.

### 1. Create a Telegram Bot

1. Open Telegram and message `@BotFather`.
2. Run `/newbot` and follow the prompts to receive a **Bot Token** (e.g. `123456:ABC-DEF...`).

### 2. Configure the environment

```env
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_WEBHOOK_SECRET=<any-random-string>
PUBLIC_URL=https://<your-public-domain-or-ngrok-url>
```

For local development, expose the backend with [ngrok](https://ngrok.com/):

```bash
ngrok http 8000
# Copy the HTTPS URL shown (e.g. https://abc123.ngrok.io)
# Set PUBLIC_URL=https://abc123.ngrok.io in .env
```

### 3. Register the webhook with Telegram

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<YOUR_PUBLIC_URL>/webhooks/telegram"}'
```

### 4. Connect a workflow in the UI

1. Open **Connections** → add a new Telegram connection with your Bot Token.
2. Open the target workflow in the **Workflow Builder**.
3. In the workflow settings panel, add the Telegram connection as a channel.
4. Activate the workflow.

Messages sent to your bot will now trigger the workflow, and agents will reply directly to the chat.

---

## Feature Walkthrough

### Agent Management

Navigate to **Agents** to create and configure agents. Each agent supports:

- **Name & Role** — human-readable label and functional role (e.g. `researcher`, `writer`, `billing`)
- **Provider & Model** — any provider/model pair supported by Bifrost
- **System Prompt** — core instructions; pre-built role templates are available (`researcher_default`, `writer_default`, `billing_agent_default`, etc.)
- **Tools** — assign from the registry: `web_search`, `http_request`, `code_exec`, `send_notification`
- **Memory** — toggle conversation memory persistence
- **Guardrails** — configurable constraints stored as JSON

### Workflow Builder

Navigate to **Workflows → New** to open the visual canvas builder. Available node types:

| Node Type | Description |
|---|---|
| `agentNode` | Runs a configured agent with its tools and system prompt |
| `routerNode` | Conditional branch — `llm_judge` (LLM evaluates a natural-language condition) or `contains_keyword` |
| `llmNode` | Direct LLM call without full agent context |
| `toolNode` | Executes a single tool directly |
| `knowledgeNode` | Retrieves relevant documents via RAG (pgvector similarity search) |
| `userMessageNode` | Injects or transforms the user message into workflow state |
| `humanPauseNode` | Pauses execution to await a human approval step |
| `stateTransformNode` | Applies a transformation to the workflow state object |
| `structuredOutputNode` | Instructs the LLM to return a typed JSON schema response |

Connect nodes with edges. Router nodes support yes/no conditional edges for feedback loops and branching logic.

**Workflow Triggers** (configured in the sidebar):

- **Semantic trigger** — the Semantic Router automatically routes inbound channel messages to this workflow using LLM-based intent matching against workflow names and descriptions
- **Webhook trigger** — any external system can POST to `/webhooks/{workflow_id}` to start a run immediately
- **Scheduler trigger** — run the workflow automatically on a cron schedule

### Pre-built Templates

Two templates are included (seeded via `seed.py`):

1. **Researcher → Writer Pipeline** — a two-agent workflow where a Researcher uses `web_search` to gather information, then a Writer produces polished output. Demonstrates multi-agent chaining and state passing.

2. **Billing Agent** — a single-agent workflow for handling billing queries, demonstrating system-prompt specialization and `send_notification` tool use.

Templates appear in the Workflow Builder's template picker and can be cloned and customized.

### Live Monitor

Navigate to **Monitor** to observe all workflow runs in real time. For each run you can inspect:

- Real-time log stream (`LLM_START`, `LLM_END`, `TOOL_CALL`, `TOOL_RESULT` events via WebSocket)
- Inter-agent messages as they flow through the graph
- Input and output text
- Run status, type, and timing

### Knowledge Base

Navigate to **Knowledge** to manage RAG data sources. Supported integration types: Web Crawler, File Upload, Confluence, Notion, SharePoint, GitHub, PostgreSQL. Documents are chunked and embedded via Ollama (local) into pgvector for retrieval by `knowledgeNode` in any workflow.

### Connections

Navigate to **Connections** to manage external channel credentials (Telegram bot tokens) and API tool connections that agents can call.

---

## Adding New Workflow Templates

1. Define the template as a Python dict using the `graph_definition` node/edge schema:

```python
# backend/seed_templates/my_template.py
MY_TEMPLATE = {
    "name": "My New Template",
    "description": "What this workflow does — used by semantic routing",
    "graph_definition": {
        "nodes": [
            {"id": "start", "type": "start"},
            {"id": "agent-1", "type": "agentNode", "data": {
                "system_prompt": "You are a helpful assistant.",
                "tools": ["web_search"],
                "llm_params": {"primary_model": "openai/gpt-4o"}
            }},
            {"id": "end", "type": "end"}
        ],
        "edges": [
            {"source": "start", "target": "agent-1"},
            {"source": "agent-1", "target": "end"}
        ]
    }
}
```

2. Import and insert it in `backend/seed.py`:

```python
from seed_templates.my_template import MY_TEMPLATE

# Inside the async seed function:
await db.execute(insert(DefaultWorkflowTemplate).values(**MY_TEMPLATE))
await db.commit()
```

3. Re-run the seed script. The template will appear in the Workflow Builder's template picker.

---

## Adding New Messaging Channels

The channel integration is built on a `BaseAdaptor` interface with two methods. To add a new channel (e.g. Slack):

### 1. Implement the adaptor

```python
# backend/adaptors/slack.py
from backend.adaptors.base import BaseAdaptor

class SlackAdaptor(BaseAdaptor):
    async def parse_payload(self, request_body: dict) -> dict:
        event = request_body.get("event", {})
        return {
            "sender_id": event.get("user"),
            "thread_id": event.get("channel"),
            "text": event.get("text", ""),
        }

    async def send_message(self, connection, sender_id: str, thread_id: str, text: str):
        # Use the Slack Web API to post a message to thread_id
        ...
```

### 2. Register the adaptor

```python
# backend/adaptors/registry.py
from backend.adaptors.slack import SlackAdaptor

adaptors = {
    "telegram": TelegramAdaptor(),
    "slack": SlackAdaptor(),
}
```

### 3. Add a webhook route

```python
# backend/routers/webhooks.py
@router.post("/slack")
async def slack_webhook(request: Request, db: AsyncSession = Depends(get_db), ...):
    adaptor = get_adaptor("slack")
    parsed = await adaptor.parse_payload(await request.json())
    # route through semantic router → run_service.start_run(...)
```

### 4. Add a connection model

Add a `SlackConnectionModel` to `backend/models.py` (following `TelegramConnectionModel`) with the credentials your adaptor needs (bot token, signing secret, etc.).

### 5. Surface it in the UI

Add `"slack"` to the channel type enum in the frontend's Connections page so users can create and save Slack credentials.

---

## Environment Variables Reference

Copy `.env.sample` to `.env`. All Docker-internal service URLs default correctly; only API keys and public-facing URLs need to be changed.

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | At least one LLM key required | OpenAI API key |
| `ANTHROPIC_API_KEY` | Optional | Anthropic Claude API key |
| `GOOGLE_API_KEY` | Optional | Google Gemini API key |
| `MISTRAL_API_KEY` | Optional | Mistral API key |
| `GROQ_API_KEY` | Optional | Groq API key |
| `DATABASE_URL` | Required | PostgreSQL asyncpg connection string |
| `REDIS_URL` | Required | Redis connection string |
| `AGENTS_API_URL` | Required | URL the Backend uses to reach the Agents service |
| `AGENTS_BIFROST_URL` | Required | URL the Agents service uses to reach Bifrost |
| `AGENTS_BIFROST_API_KEY` | Optional | API key for Bifrost (use `dummy` for local) |
| `AGENTS_DEFAULT_PROVIDER` | Optional | Default LLM provider (e.g. `openai`) |
| `AGENTS_DEFAULT_MODEL` | Optional | Default model name (e.g. `gpt-4o`) |
| `PUBLIC_URL` | Required for Telegram | Public HTTPS URL of the backend |
| `TELEGRAM_BOT_TOKEN` | Required for Telegram | Token from @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Required for Telegram | Secret to validate Telegram webhook requests |
| `ENCRYPTION_KEY` | Required | Fernet key for encrypting stored credentials. Generate with: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
