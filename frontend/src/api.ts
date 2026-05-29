const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';

export const fetchAgents = async () => {
  const response = await fetch(`${API_URL}/agents/`);
  if (!response.ok) throw new Error('Failed to fetch agents');
  return response.json();
};

export const createAgent = async (agentData: any) => {
  const response = await fetch(`${API_URL}/agents/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agentData)
  });
  if (!response.ok) throw new Error('Failed to create agent');
  return response.json();
};

export const fetchWorkflows = async () => {
  const response = await fetch(`${API_URL}/workflows/`);
  if (!response.ok) throw new Error('Failed to fetch workflows');
  return response.json();
};

export const fetchWorkflow = async (id: string) => {
  const response = await fetch(`${API_URL}/workflows/${id}`);
  if (!response.ok) throw new Error('Failed to fetch workflow');
  return response.json();
};

export const updateWorkflow = async (id: string, workflowData: any) => {
  const response = await fetch(`${API_URL}/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflowData)
  });
  if (!response.ok) throw new Error('Failed to update workflow');
  return response.json();
};

export const createWorkflow = async (workflowData: any) => {
  const response = await fetch(`${API_URL}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflowData)
  });
  if (!response.ok) throw new Error('Failed to create workflow');
  return response.json();
};

export const fetchIntegrations = async () => {
  const response = await fetch(`${API_URL}/api/integrations/`);
  if (!response.ok) throw new Error('Failed to fetch integrations');
  return response.json();
};

export const uploadFiles = async (formData: FormData) => {
  const response = await fetch(`${API_URL}/api/files/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to upload files');
  }
  return response.json();
};

export const createIntegration = async (integrationData: any) => {
  const response = await fetch(`${API_URL}/api/integrations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(integrationData)
  });
  if (!response.ok) throw new Error('Failed to create integration');
  return response.json();
};

export const fetchIntegrationDocuments = async (id: string) => {
  const response = await fetch(`${API_URL}/api/integrations/${id}/documents`);
  if (!response.ok) throw new Error('Failed to fetch documents');
  return response.json();
};

export const fetchIntegrationTools = async (id: string) => {
  const response = await fetch(`${API_URL}/api/integrations/${id}/tools`);
  if (!response.ok) throw new Error('Failed to fetch tools');
  return response.json();
};

export const toggleToolActive = async (toolId: number) => {
  const response = await fetch(`${API_URL}/api/integrations/tools/${toolId}/toggle`, {
    method: 'PUT'
  });
  if (!response.ok) throw new Error('Failed to toggle tool');
  return response.json();
};

export const crawlIntegration = async (id: string) => {
  const response = await fetch(`${API_URL}/api/integrations/${id}/crawl`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to start crawl');
  return response.json();
};

export const deleteIntegration = async (id: string) => {
  const response = await fetch(`${API_URL}/api/integrations/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete integration');
  return response.json();
};

export const fetchActiveTools = async () => {
  const response = await fetch(`${API_URL}/api/integrations/active/tools`);
  if (!response.ok) throw new Error('Failed to fetch active tools');
  return response.json();
};

export const fetchActiveDocumentIntegrations = async () => {
  const response = await fetch(`${API_URL}/api/integrations/active/documents`);
  if (!response.ok) throw new Error('Failed to fetch active document integrations');
  return response.json();
};
