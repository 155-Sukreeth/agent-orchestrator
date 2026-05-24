from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from backend.database import Base

class Agent(Base):
    __tablename__ = "agents"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    role = Column(String)
    provider = Column(String)
    model = Column(String)
    system_prompt = Column(String)
    tools = Column(JSON, default=list)
    memory = Column(Boolean, default=False)
    guardrails = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    description_embedding = Column(Vector(1536))
    graph_definition = Column(JSON)
    channels = Column(JSON, default=list)
    is_active = Column(Boolean, default=False)
    is_template = Column(Boolean, default=False)
    template_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    runs = relationship("Run", back_populates="workflow")

class Run(Base):
    __tablename__ = "runs"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"))
    sender_id = Column(String, index=True)
    thread_id = Column(String, index=True)
    input_text = Column(String)
    output_text = Column(String, nullable=True)
    token_usage = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    status = Column(String, default="pending")  # pending, running, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    workflow = relationship("Workflow", back_populates="runs")
    logs = relationship("RunLog", back_populates="run")
    messages = relationship("Message", back_populates="run")

class RunLog(Base):
    __tablename__ = "run_logs"
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("runs.id"))
    node_id = Column(String)
    event_type = Column(String)
    payload = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    run = relationship("Run", back_populates="logs")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("runs.id"))
    role = Column(String)
    content = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    run = relationship("Run", back_populates="messages")
