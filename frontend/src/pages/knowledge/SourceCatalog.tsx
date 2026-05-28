import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { catalogItems, CatalogItem } from '../../components/knowledge/ConnectSourceModal';
import ConnectSourceModal from '../../components/knowledge/ConnectSourceModal';

const SourceCatalog: React.FC = () => {
  const { handleStageSource } = useOutletContext<{ handleStageSource: (source: any) => void }>();
  const [selectedSource, setSelectedSource] = useState<CatalogItem | null>(null);

  const categories = [
    { id: 'web', title: 'Web Content', description: 'Extract text from public websites.' },
    { id: 'internal', title: 'Internal Documentation', description: 'Connect your internal knowledge bases and files.' },
    { id: 'code', title: 'Code & APIs', description: 'Connect databases, repositories, and MCP tools.' },
  ];

  const handleAddSource = (config: any) => {
    handleStageSource(config);
    setSelectedSource(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 pb-24">
      {categories.map((category) => (
        <section key={category.id}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-100">{category.title}</h2>
            <p className="text-sm text-gray-400 mt-1">{category.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogItems
              .filter((item) => item.category === category.id)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedSource(item)}
                  className="flex flex-col items-start p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-indigo-500/50 transition-all group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="p-3 bg-white/5 rounded-lg mb-4 group-hover:bg-indigo-500/20 transition-colors">
                    <item.icon className="w-6 h-6 text-indigo-400" />
                  </div>
                  
                  <h3 className="text-base font-semibold text-gray-200 mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors line-clamp-2">
                    {item.description}
                  </p>
                </button>
              ))}
          </div>
        </section>
      ))}

      {selectedSource && (
        <ConnectSourceModal
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
          onAdd={handleAddSource}
        />
      )}
    </div>
  );
};

export default SourceCatalog;
