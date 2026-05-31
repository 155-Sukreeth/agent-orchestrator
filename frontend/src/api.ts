export const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';

const getHeaders = (customHeaders: any = {}) => {
  const token = localStorage.getItem('token');
  const headers: any = { ...customHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = getHeaders(options.headers);
  const response = await fetch(url, {
    ...options,
    headers,
  });
  return response;
};

export const fetchAgents = async () => {
  const response = await fetchWithAuth(`${API_URL}/api/agents/`);
  if (!response.ok) throw new Error('Failed to fetch agents');
  return response.json();
};

export const createAgent = async (agentData: any) => {
  const response = await fetchWithAuth(`${API_URL}/api/agents/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agentData)
  });
  if (!response.ok) throw new Error('Failed to create agent');
  return response.json();
};

export const fetchWorkflows = async () => {
  const response = await fetchWithAuth(`${API_URL}/api/workflows/`);
  if (!response.ok) throw new Error('Failed to fetch workflows');
  return response.json();
};

export const fetchTemplates = async () => {
  const response = await fetchWithAuth(`${API_URL}/api/workflows/templates`);
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
};

export const fetchWorkflow = async (id: string) => {
  const response = await fetchWithAuth(`${API_URL}/api/workflows/${id}`);
  if (!response.ok) throw new Error('Failed to fetch workflow');
  return response.json();
};


export const updateWorkflow = async (id: string, workflowData: any) => {
  const response = await fetchWithAuth(`${API_URL}/api/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflowData)
  });
  if (!response.ok) throw new Error('Failed to update workflow');
  return response.json();
};

export const deleteWorkflow = async (id: string) => {
  const response = await fetchWithAuth(`${API_URL}/api/workflows/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete workflow');
  return response.json();
};

export const createWorkflow = async (workflowData: any) => {
  const response = await fetchWithAuth(`${API_URL}/api/workflows/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflowData)
  });
  if (!response.ok) throw new Error('Failed to create workflow');
  return response.json();
};

export const fetchIntegrations = async () => {
  const response = await fetchWithAuth(`${API_URL}/api/integrations/`);
  if (!response.ok) throw new Error('Failed to fetch integrations');
  return response.json();
};

export const uploadFiles = async (formData: FormData) => {
  const response = await fetchWithAuth(`${API_URL}/api/files/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to upload files');
  }
  return response.json();
};

export const createIntegration = async (integrationData: any) => {
  const response = await fetchWithAuth(`${API_URL}/api/integrations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(integrationData)
  });
  if (!response.ok) throw new Error('Failed to create integration');
  return response.json();
};

export const fetchIntegrationDocuments = async (id: string) => {
  const response = await fetchWithAuth(`${API_URL}/api/integrations/${id}/documents`);
  if (!response.ok) throw new Error('Failed to fetch documents');
  return response.json();
};

export const fetchIntegrationTools = async (id: string) => {
  const response = await fetchWithAuth(`${API_URL}/api/integrations/${id}/tools`);
  if (!response.ok) throw new Error('Failed to fetch tools');
  return response.json();
};

export const toggleToolActive = async (toolId: number) => {
  const response = await fetchWithAuth(`${API_URL}/api/integrations/tools/${toolId}/toggle`, {
    method: 'PUT'
  });
  if (!response.ok) throw new Error('Failed to toggle tool');
  return response.json();
};

export const crawlIntegration = async (id: string) => {
  const response = await fetchWithAuth(`${API_URL}/api/integrations/${id}/crawl`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to start crawl');
  return response.json();
};

export const deleteIntegration = async (id: string) => {
  const response = await fetchWithAuth(`${API_URL}/api/integrations/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete integration');
  return response.json();
};

export const fetchActiveTools = async () => {
  const response = await fetchWithAuth(`${API_URL}/api/integrations/active/tools`);
  if (!response.ok) throw new Error('Failed to fetch active tools');
  return response.json();
};

export const fetchActiveDocumentIntegrations = async () => {
  const response = await fetchWithAuth(`${API_URL}/api/integrations/active/documents`);
  if (!response.ok) throw new Error('Failed to fetch active document integrations');
  return response.json();
};

export const fetchConnections = async () => {
  const response = await fetchWithAuth(`${API_URL}/api/connections/`);
  if (!response.ok) throw new Error('Failed to fetch connections');
  return response.json();
};

export const fetchActiveChannels = async () => {
  const response = await fetchWithAuth(`${API_URL}/api/connections/channels`);
  if (!response.ok) throw new Error('Failed to fetch channels');
  return response.json();
};

export const createConnection = async (connectionData: any) => {
  const response = await fetchWithAuth(`${API_URL}/api/connections/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(connectionData)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to create connection');
  }
  return response.json();
};

export const updateConnection = async (id: number, connectionData: any) => {
  const response = await fetchWithAuth(`${API_URL}/api/connections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(connectionData)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to update connection');
  }
  return response.json();
};

export const deleteConnection = async (id: number) => {
  const response = await fetchWithAuth(`${API_URL}/api/connections/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete connection');
  return response.json();
};

export const fetchWorkflowRuns = async (workflowId: string) => {
  const response = await fetchWithAuth(`${API_URL}/api/runs/workflow/${workflowId}`);
  if (!response.ok) throw new Error('Failed to fetch runs');
  return response.json();
};

export const fetchRunDetails = async (runId: string) => {
  const response = await fetchWithAuth(`${API_URL}/api/runs/${runId}`);
  if (!response.ok) throw new Error('Failed to fetch run details');
  return response.json();
};

export const startTestRun = async (workflowId: string, inputData: any) => {
  const payload = {
    message: typeof inputData === 'string' ? inputData : (inputData?.topic || inputData?.input || inputData?.message || null),
    data: typeof inputData === 'object' && inputData !== null ? inputData : {}
  };

  const response = await fetchWithAuth(`${API_URL}/api/runs/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflow_id: parseInt(workflowId),
      payload: payload,
      run_type: 'test'
    })
  });
  if (!response.ok) throw new Error('Failed to start test run');
  return response.json();
};
