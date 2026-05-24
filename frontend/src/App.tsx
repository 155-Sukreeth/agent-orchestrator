
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AgentsDashboard from './pages/AgentsDashboard';
import WorkflowBuilder from './pages/WorkflowBuilder';
import LiveMonitor from './pages/LiveMonitor';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/agents" replace />} />
          <Route path="agents" element={<AgentsDashboard />} />
          <Route path="workflows" element={<WorkflowBuilder />} />
          <Route path="monitor" element={<LiveMonitor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
