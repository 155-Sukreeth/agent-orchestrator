
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AgentsDashboard from './pages/AgentsDashboard';
import WorkflowBuilder from './pages/WorkflowBuilder';
import LiveMonitor from './pages/LiveMonitor';
import KnowledgeLayout from './pages/knowledge/KnowledgeLayout';
import SourceCatalog from './pages/knowledge/SourceCatalog';
import KnowledgeDashboard from './pages/knowledge/KnowledgeDashboard';

import KnowledgeIndexRedirect from './pages/knowledge/KnowledgeIndexRedirect';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/agents" replace />} />
          <Route path="agents" element={<AgentsDashboard />} />
          <Route path="workflows/new" element={<WorkflowBuilder />} />
          <Route path="workflows/:id" element={<WorkflowBuilder />} />
          <Route path="knowledge" element={<KnowledgeLayout />}>
            <Route index element={<KnowledgeIndexRedirect />} />
            <Route path="catalog" element={<SourceCatalog />} />
            <Route path="dashboard" element={<KnowledgeDashboard />} />
          </Route>
          <Route path="monitor" element={<LiveMonitor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
