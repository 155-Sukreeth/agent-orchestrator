
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AgentsDashboard from './pages/AgentsDashboard';
import WorkflowBuilder from './pages/WorkflowBuilder';
import LiveMonitor from './pages/LiveMonitor';
import KnowledgeLayout from './pages/knowledge/KnowledgeLayout';
import SourceCatalog from './pages/knowledge/SourceCatalog';
import KnowledgeDashboard from './pages/knowledge/KnowledgeDashboard';
import KnowledgeIndexRedirect from './pages/knowledge/KnowledgeIndexRedirect';
import ConnectionsLayout from './pages/connections/ConnectionsLayout';
import ConnectionsDashboard from './pages/connections/ConnectionsDashboard';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>;
  }
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/agents" replace />} />
              <Route path="agents" element={<AgentsDashboard />} />
              <Route path="workflows" element={<Navigate to="/workflows/new" replace />} />
              <Route path="workflows/new" element={<WorkflowBuilder />} />
              <Route path="workflows/:id" element={<WorkflowBuilder />} />
              <Route path="knowledge" element={<KnowledgeLayout />}>
                <Route index element={<KnowledgeIndexRedirect />} />
                <Route path="catalog" element={<SourceCatalog />} />
                <Route path="dashboard" element={<KnowledgeDashboard />} />
              </Route>
              <Route path="connections" element={<ConnectionsLayout />}>
                <Route index element={<ConnectionsDashboard />} />
              </Route>
              <Route path="monitor" element={<LiveMonitor />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
