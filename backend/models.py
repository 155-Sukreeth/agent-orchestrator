from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, Float, ForeignKey, Enum as SQLEnum, TypeDecorator
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import UUID
import uuid
from backend.database import Base
from backend.config.settings import settings
from cryptography.fernet import Fernet
import enum
import json

class EncryptedJSON(TypeDecorator):
    """
    Encrypts JSON dictionaries as text in the DB using Fernet symmetric encryption.
    """
    impl = String
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Ensure we have a valid fernet key
        self.fernet = Fernet(settings.ENCRYPTION_KEY.encode('utf-8'))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        json_str = json.dumps(value)
        encrypted = self.fernet.encrypt(json_str.encode('utf-8'))
        return encrypted.decode('utf-8')

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        decrypted = self.fernet.decrypt(value.encode('utf-8'))
        return json.loads(decrypted.decode('utf-8'))

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
    triggers = relationship("WorkflowTrigger", back_populates="workflow", cascade="all, delete-orphan")

class DefaultWorkflowTemplate(Base):
    __tablename__ = "default_workflow_templates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    graph_definition = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class WorkflowTrigger(Base):
    __tablename__ = "workflow_triggers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(Integer, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False, index=True) # "semantic"|"webhook"|"scheduler"
    enabled = Column(Boolean, default=True, index=True)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    workflow = relationship("Workflow", back_populates="triggers")

class Run(Base):
    __tablename__ = "runs"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"))
    trigger_id = Column(UUID(as_uuid=True), ForeignKey("workflow_triggers.id", ondelete="SET NULL"), nullable=True)
    run_type = Column(String(50), default="test", index=True) # test, webhook, scheduler, semantic
    sender_id = Column(String, index=True)
    thread_id = Column(String, index=True)
    input_text = Column(String)
    output_text = Column(String, nullable=True)
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    token_usage = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    status = Column(String, default="pending")  # pending, running, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
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

    @property
    def level(self): return self.event_type
    @property
    def message(self): return self.node_id
    @property
    def details(self): return self.payload

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

class DefaultTool(Base):
    __tablename__ = "default_tools"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

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

class AppConnectionType(str, enum.Enum):
    SLACK = "slack"
    TELEGRAM = "telegram"
    JIRA = "jira"
    CONFLUENCE = "confluence"
    GOOGLE_DRIVE = "google_drive"
    CUSTOM_WEBHOOK = "custom_webhook"

class AppConnection(Base):
    __tablename__ = "app_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) 
    type = Column(SQLEnum(AppConnectionType))
    credentials = Column(EncryptedJSON, default=dict)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __mapper_args__ = {
        "polymorphic_on": type,
        "polymorphic_identity": "base"
    }

class SlackConnectionModel(AppConnection):
    __mapper_args__ = {"polymorphic_identity": AppConnectionType.SLACK}
    
    @property
    def bot_token(self): return self.credentials.get("bot_token")
    @bot_token.setter
    def bot_token(self, value): self.credentials["bot_token"] = value
    
    @property
    def signing_secret(self): return self.credentials.get("signing_secret")
    @signing_secret.setter
    def signing_secret(self, value): self.credentials["signing_secret"] = value

class TelegramConnectionModel(AppConnection):
    __mapper_args__ = {"polymorphic_identity": AppConnectionType.TELEGRAM}
    
    @property
    def bot_token(self): return self.credentials.get("bot_token")
    @bot_token.setter
    def bot_token(self, value): self.credentials["bot_token"] = value

class JiraConnectionModel(AppConnection):
    __mapper_args__ = {"polymorphic_identity": AppConnectionType.JIRA}
    
    @property
    def base_url(self): return self.credentials.get("base_url")
    @base_url.setter
    def base_url(self, value): self.credentials["base_url"] = value
    
    @property
    def email(self): return self.credentials.get("email")
    @email.setter
    def email(self, value): self.credentials["email"] = value
    
    @property
    def api_token(self): return self.credentials.get("api_token")
    @api_token.setter
    def api_token(self, value): self.credentials["api_token"] = value

class ConfluenceConnectionModel(AppConnection):
    __mapper_args__ = {"polymorphic_identity": AppConnectionType.CONFLUENCE}
    
    @property
    def base_url(self): return self.credentials.get("base_url")
    @base_url.setter
    def base_url(self, value): self.credentials["base_url"] = value
    
    @property
    def email(self): return self.credentials.get("email")
    @email.setter
    def email(self, value): self.credentials["email"] = value
    
    @property
    def api_token(self): return self.credentials.get("api_token")
    @api_token.setter
    def api_token(self, value): self.credentials["api_token"] = value

class GoogleDriveConnectionModel(AppConnection):
    __mapper_args__ = {"polymorphic_identity": AppConnectionType.GOOGLE_DRIVE}
    
    @property
    def service_account_json(self): return self.credentials.get("service_account_json")
    @service_account_json.setter
    def service_account_json(self, value): self.credentials["service_account_json"] = value

class CustomWebhookConnectionModel(AppConnection):
    __mapper_args__ = {"polymorphic_identity": AppConnectionType.CUSTOM_WEBHOOK}
    
    @property
    def webhook_url(self): return self.credentials.get("webhook_url")
    @webhook_url.setter
    def webhook_url(self, value): self.credentials["webhook_url"] = value
    
    @property
    def auth_header_name(self): return self.credentials.get("auth_header_name")
    @auth_header_name.setter
    def auth_header_name(self, value): self.credentials["auth_header_name"] = value
    
    @property
    def auth_header_value(self): return self.credentials.get("auth_header_value")
    @auth_header_value.setter
    def auth_header_value(self, value): self.credentials["auth_header_value"] = value
