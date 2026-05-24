const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';

export const fetchAgents = async () => {
  const response = await fetch(`${API_URL}/agents`);
  if (!response.ok) throw new Error('Failed to fetch agents');
  return response.json();
};

export const createAgent = async (agentData: any) => {
  const response = await fetch(`${API_URL}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agentData)
  });
  if (!response.ok) throw new Error('Failed to create agent');
  return response.json();
};

export const fetchWorkflows = async () => {
  const response = await fetch(`${API_URL}/workflows`);
  if (!response.ok) throw new Error('Failed to fetch workflows');
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
