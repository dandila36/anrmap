import React, { useState, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import InputBar from './components/InputBar';
import GraphCanvas from './components/GraphCanvas';
import ListView from './components/ListView';
import SideDrawer from './components/SideDrawer';
import Toolbar from './components/Toolbar';
import { ArtistNode, ArtistEdge, GraphData, FilterState } from './types';

function App() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedArtist, setSelectedArtist] = useState<ArtistNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [filters, setFilters] = useState<FilterState>({
    minSimilarity: 0.0,
    selectedGenres: [],
    depth: 1
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleGraphDataUpdate = useCallback((data: GraphData) => {
    setGraphData(data);
  }, []);

  const handleNodeSelect = useCallback((node: ArtistNode | null) => {
    setSelectedArtist(node);
    setIsDrawerOpen(!!node);
  }, []);

  const handleExpandNode = useCallback(async (artistName: string) => {
    setIsLoading(true);
    try {
      const response = await import('./services/api').then(m => m.apiService.expandNode(artistName, 25));
      
      // Merge new nodes and edges with existing data
      const existingNodeIds = new Set(graphData.nodes.map(node => node.id));
      const newNodes = response.nodes.filter(node => !existingNodeIds.has(node.id));
      
      const updatedGraphData: GraphData = {
        nodes: [...graphData.nodes, ...newNodes],
        edges: [...graphData.edges, ...response.edges],
        stats: {
          totalNodes: graphData.nodes.length + newNodes.length,
          totalEdges: graphData.edges.length + response.edges.length,
          rootArtist: graphData.stats?.rootArtist || ''
        }
      };
      
      setGraphData(updatedGraphData);
      const toast = await import('react-hot-toast');
      toast.default.success(`Added ${newNodes.length} new artists and ${response.edges.length} connections`);
    } catch (error) {
      console.error('Failed to expand node:', error);
      const toast = await import('react-hot-toast');
      toast.default.error(error instanceof Error ? error.message : 'Failed to expand artist node');
    } finally {
      setIsLoading(false);
    }
  }, [graphData]);

  const handleFiltersChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters((prev: FilterState) => ({ ...prev, ...newFilters }));
  }, []);

  const handleExport = useCallback(async (format: 'csv' | 'png') => {
    // Export functionality is handled by the Toolbar component
    console.log('Export initiated:', format);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Input Section */}
        <div className="bg-white border-b border-gray-200 p-4">
          <InputBar 
            onGraphData={handleGraphDataUpdate}
            onLoadingChange={setIsLoading}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Graph Canvas or List View */}
          <div className="flex-1 relative">
            {viewMode === 'graph' ? (
              <GraphCanvas
                data={graphData}
                filters={filters}
                onNodeSelect={handleNodeSelect}
                selectedArtist={selectedArtist}
                isLoading={isLoading}
              />
            ) : (
              <ListView
                data={graphData}
                onArtistSelect={handleNodeSelect}
              />
            )}

            {/* Toolbar Overlay */}
            <div className="absolute top-4 left-4 z-10">
              <Toolbar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onExport={handleExport}
                graphData={graphData}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
          </div>

          {/* Side Drawer */}
          <SideDrawer
            artist={selectedArtist}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onExpand={handleExpandNode}
          />
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

export default App; 