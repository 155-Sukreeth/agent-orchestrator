from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from backend.database import Base
import enum

class IntegrationType(str, enum.Enum):
    WEB_CRAWLER = "web_crawler"
    FILE_UPLOAD = "file_upload"
    CONFLUENCE = "confluence"
    NOTION = "notion"
    SHAREPOINT = "sharepoint"
    MCP = "mcp"
    POSTGRES = "postgres"
    GITHUB = "github"
    API_TOOL = "api_tool"

DOCUMENT_INTEGRATION_TYPES = [
    IntegrationType.WEB_CRAWLER,
    IntegrationType.FILE_UPLOAD,
    IntegrationType.CONFLUENCE,
    IntegrationType.NOTION,
    IntegrationType.SHAREPOINT,
    IntegrationType.POSTGRES,
    IntegrationType.GITHUB
]

TOOL_INTEGRATION_TYPES = [
    IntegrationType.MCP,
    IntegrationType.API_TOOL
]

class IntegrationCategory(str, enum.Enum):
    WEB = "web"
    INTERNAL = "internal"
    CODE = "code"

class IntegrationStatus(str, enum.Enum):
    PENDING = "pending"
    SYNCING = "syncing"
    SYNCED = "synced"
    ERROR = "error"

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

class Integration(Base):
    __tablename__ = "integrations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(SQLEnum(IntegrationType))
    category = Column(SQLEnum(IntegrationCategory))
    
    # Stores the raw connection data (URLs, Tokens, Auth Headers)
    config = Column(JSON, default=dict) 
    
    status = Column(SQLEnum(IntegrationStatus), default=IntegrationStatus.PENDING)
    last_sync = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    documents = relationship("KnowledgeDocument", back_populates="integration")
    tools = relationship("AgentTool", back_populates="integration")

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(Integer, ForeignKey("integrations.id", ondelete="CASCADE"))
    
    title = Column(String, index=True)
    url_or_path = Column(String)  # The source URL or file path
    metadata_json = Column(JSON, default=dict) # Any extra metadata from the source
    is_active = Column(Boolean, default=True) # Toggle for inclusion in RAG context
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    integration = relationship("Integration", back_populates="documents")

class AgentTool(Base):
    __tablename__ = "agent_tools"
    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(Integer, ForeignKey("integrations.id", ondelete="CASCADE"))
    
    name = Column(String, index=True)  # Tool name provided to the LLM
    description = Column(String)       # Tool description for the LLM
    
    # JSON schemas for LLM tool calling
    request_schema = Column(JSON, default=dict)
    response_schema = Column(JSON, nullable=True) 
    is_active = Column(Boolean, default=True) # Toggle for inclusion in agent context
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    integration = relationship("Integration", back_populates="tools")

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("knowledge_documents.id", ondelete="CASCADE"))
    integration_id = Column(Integer, ForeignKey("integrations.id", ondelete="CASCADE"))
    
    content = Column(String)
    chunk_index = Column(Integer)
    
    embedding = Column(Vector(768)) 
    embedding_model = Column(String, default="nomic-embed-text")
    
    is_active = Column(Boolean, default=True) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    content_type = Column(String)
    size = Column(Integer)
    storage_path = Column(String) # Physical path or cloud URL
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
