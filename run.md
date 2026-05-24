# Running Agent Orchestrator

This guide provides instructions on how to run the AI Agent Orchestrator, either through Docker Compose (recommended for production/full-stack) or locally without Docker (recommended for development).

---

## Method 1: Running with Docker (Recommended)

Docker Compose will automatically orchestrate the Postgres database, Redis cache, Bifrost gateway, Backend API, and Agents API simultaneously.

1. Ensure Docker Desktop is running.
2. Ensure you have copied `.env.sample` to `.env` and provided your desired API keys (though Bifrost handles these).
3. From the root directory, run:
   ```bash
   docker-compose up --build
   ```

**Services will be available at:**
- **Frontend UI:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Agents API:** http://localhost:8001
- **Bifrost Dashboard:** http://localhost:8080/workspace/dashboard

---

## Method 2: Running Locally Without Docker

If you want to run the services individually for faster local development loops, you should create separate virtual environments for each service.

### Prerequisites (External Services)
Even when running microservices locally, you must have **Redis** and **PostgreSQL** running in the background. You can use Docker just for these dependencies:
```bash
docker-compose up db redis bifrost -d
```

### 1. Frontend UI
```bash
# Terminal 1
cd frontend
npm install
npm run dev
```
**Access:** http://localhost:5173

### 2. Backend Microservice
```bash
# Terminal 2
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
**Access:** http://localhost:8000

### 3. Agents Microservice
```bash
# Terminal 3
cd agents
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
uvicorn agents.main:app --host 0.0.0.0 --port 8001 --reload
```
**Access:** http://localhost:8001

---

## Seeding Initial Data
Once your Backend and Postgres database are running, you can seed the initial database with a default workflow and some agents:

**Using Docker:**
```bash
docker-compose exec -e PYTHONPATH=/app backend python backend/seed.py
```

**Running Locally:**
```bash
# From the root directory with the backend virtual environment active
export PYTHONPATH=$(pwd)
python backend/seed.py
```
