import React, { useState, useCallback } from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { InputBarProps, GraphData } from '../types';
import { apiService } from '../services/api';

const InputBar: React.FC<InputBarProps> = ({ onGraphData, onLoadingChange, isLoading }) => {
  const [input, setInput] = useState('');
  const [depth, setDepth] = useState(1);
  const [limit, setLimit] = useState(25);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) {
      toast.error('Please enter an artist name');
      return;
    }

    onLoadingChange(true);
    
    try {
      const response = await apiService.createMap(input.trim(), depth, limit);
      
      const graphData: GraphData = {
        nodes: response.nodes,
        edges: response.edges,
        stats: response.stats
      };
      
      onGraphData(graphData);
      toast.success(`Found ${response.stats.totalNodes} artists with ${response.stats.totalEdges} connections`);
    } catch (error) {
      console.error('Failed to create map:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create artist map');
    } finally {
      onLoadingChange(false);
    }
  }, [input, depth, limit, onGraphData, onLoadingChange]);

  const handleExampleClick = useCallback((example: string) => {
    setInput(example);
  }, []);

  const examples = [
    'Billie Eilish',
    'Radiohead',
    'Taylor Swift',
    'Daft Punk',
    'Arctic Monkeys'
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Input */}
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter artist name..."
              className="input pl-11"
              disabled={isLoading}
            />
          </div>
          
          {/* Controls */}
          <div className="flex space-x-2">
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="input w-24"
              disabled={isLoading}
            >
              <option value={1}>1-hop</option>
              <option value={2}>2-hop</option>
            </select>
            
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="input w-20"
              disabled={isLoading}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="btn btn-primary px-6 min-w-[120px] flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mapping<span className="loading-dots"></span></span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>Map</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Examples */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Try:</span>
          {examples.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </form>
      
      {/* Help Text */}
      <div className="mt-4 text-sm text-gray-600">
        <p>
          Type an <strong>artist name</strong>.
          The app will find similar artists and create an interactive network visualization.
        </p>
      </div>
    </div>
  );
};

export default InputBar; 