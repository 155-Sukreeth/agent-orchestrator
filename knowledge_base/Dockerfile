FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire mono-repo since we share backend models
COPY . /app

# Ensure python can find backend module
ENV PYTHONPATH=/app

CMD ["uvicorn", "knowledge_base.main:app", "--host", "0.0.0.0", "--port", "8002"]
