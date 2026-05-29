import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchIntegrations } from '../../api';

const KnowledgeIndexRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkIntegrations = async () => {
      try {
        const data = await fetchIntegrations();
        if (data && data.length > 0) {
          navigate('/knowledge/dashboard', { replace: true });
        } else {
          navigate('/knowledge/catalog', { replace: true });
        }
      } catch (err) {
        console.error("Failed to fetch integrations", err);
        // Fallback to catalog on error
        navigate('/knowledge/catalog', { replace: true });
      }
    };

    checkIntegrations();
  }, [navigate]);

  return (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      Loading your knowledge base...
    </div>
  );
};

export default KnowledgeIndexRedirect;
