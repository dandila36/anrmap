import React, { useState, useCallback } from 'react';
import { Download, FileText, Image, Filter, Sliders, Grid3X3, List, Music } from 'lucide-react';
import toast from 'react-hot-toast';
import { ToolbarProps } from '../types';
import { apiService, downloadBlob } from '../services/api';
import html2canvas from 'html2canvas';
import SpotifyPlaylistCreator from './SpotifyPlaylistCreator';

const Toolbar: React.FC<ToolbarProps> = ({ 
  filters, 
  onFiltersChange, 
  graphData, 
  viewMode = 'graph', 
  onViewModeChange 
}) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const handleSimilarityChange = useCallback((value: number) => {
    onFiltersChange({ minSimilarity: value });
  }, [onFiltersChange]);

  const handleDepthChange = useCallback((value: number) => {
    onFiltersChange({ depth: value });
  }, [onFiltersChange]);

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await apiService.exportConnections(graphData.nodes, graphData.edges);
      downloadBlob(blob, 'artist-network.csv');
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export CSV');
    } finally {
      setIsExporting(false);
      setIsExportOpen(false);
    }
  }, [graphData]);

  const handleExportPNG = useCallback(async () => {
    setIsExporting(true);
    try {
      const graphContainer = document.querySelector('.graph-container') as HTMLElement;
      if (!graphContainer) {
        throw new Error('Graph container not found');
      }

      const canvas = await html2canvas(graphContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });

      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, 'artist-network.png');
          toast.success('PNG exported successfully!');
        } else {
          throw new Error('Failed to create image');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export PNG');
    } finally {
      setIsExporting(false);
      setIsExportOpen(false);
    }
  }, []);

  // Get unique genres from graph data
  const availableGenres = React.useMemo(() => {
    const genres = new Set<string>();
    graphData.nodes.forEach(node => {
      node.tags.forEach(tag => genres.add(tag.toLowerCase()));
    });
    return Array.from(genres).sort();
  }, [graphData.nodes]);

  const handleGenreToggle = useCallback((genre: string) => {
    const newGenres = filters.selectedGenres.includes(genre)
      ? filters.selectedGenres.filter(g => g !== genre)
      : [...filters.selectedGenres, genre];
    onFiltersChange({ selectedGenres: newGenres });
  }, [filters.selectedGenres, onFiltersChange]);

  return (
    <div className="flex flex-col space-y-2">
      {/* Main Toolbar */}
      <div className="flex items-center space-x-2 bg-white rounded-lg shadow-lg p-2">
        {/* View Mode Toggle */}
        {onViewModeChange && (
          <div className="flex bg-gray-100 rounded-md p-1">
            <button
              onClick={() => onViewModeChange('graph')}
              className={`p-2 rounded ${
                viewMode === 'graph' 
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              title="Graph view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded ${
                viewMode === 'list' 
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Spotify Playlist Creation */}
        <button
          onClick={() => setIsPlaylistModalOpen(true)}
          className="btn btn-ghost p-2 bg-green-50 hover:bg-green-100 text-green-700"
          title="Create Spotify playlist"
          disabled={graphData.nodes.length === 0}
        >
          <Music className="w-4 h-4" />
        </button>

        {/* Filters Toggle */}
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className={`btn btn-ghost p-2 ${isFiltersOpen ? 'bg-gray-100' : ''}`}
          title="Toggle filters"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Export Toggle */}
        <button
          onClick={() => setIsExportOpen(!isExportOpen)}
          className={`btn btn-ghost p-2 ${isExportOpen ? 'bg-gray-100' : ''}`}
          title="Export options"
          disabled={graphData.nodes.length === 0}
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Stats */}
        {graphData.stats && (
          <div className="flex items-center space-x-4 px-3 py-1 bg-gray-50 rounded text-xs text-gray-600">
            <span>{graphData.stats.totalNodes} artists</span>
            <span>{graphData.stats.totalEdges} connections</span>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {isFiltersOpen && (
        <div className="bg-white rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-4 h-4 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
          </div>

          <div className="space-y-4">
            {/* Similarity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Similarity: {filters.minSimilarity.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filters.minSimilarity}
                onChange={(e) => handleSimilarityChange(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.00</span>
                <span>1.00</span>
              </div>
            </div>

            {/* Depth Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network Depth
              </label>
              <select
                value={filters.depth}
                onChange={(e) => handleDepthChange(parseInt(e.target.value))}
                className="input w-full"
              >
                <option value={1}>1-hop (direct connections)</option>
                <option value={2}>2-hop (friends of friends)</option>
              </select>
            </div>

            {/* Genre Filter */}
            {availableGenres.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Genres ({filters.selectedGenres.length} selected)
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableGenres.slice(0, 20).map(genre => (
                    <label key={genre} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.selectedGenres.includes(genre)}
                        onChange={() => handleGenreToggle(genre)}
                        className="rounded"
                      />
                      <span className="capitalize">{genre}</span>
                    </label>
                  ))}
                </div>
                {availableGenres.length > 20 && (
                  <p className="text-xs text-gray-500 mt-2">
                    And {availableGenres.length - 20} more...
                  </p>
                )}
              </div>
            )}

            {/* Reset Filters */}
            <button
              onClick={() => onFiltersChange({ 
                minSimilarity: 0.5, 
                selectedGenres: [], 
                depth: 1 
              })}
              className="btn btn-secondary w-full text-sm"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Export Panel */}
      {isExportOpen && (
        <div className="bg-white rounded-lg shadow-lg p-4 w-64">
          <div className="flex items-center space-x-2 mb-4">
            <Download className="w-4 h-4 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Export</h3>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="btn btn-secondary w-full flex items-center justify-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Export as CSV</span>
            </button>

            <button
              onClick={handleExportPNG}
              disabled={isExporting}
              className="btn btn-secondary w-full flex items-center justify-center space-x-2"
            >
              <Image className="w-4 h-4" />
              <span>Export as PNG</span>
            </button>
          </div>

          {isExporting && (
            <div className="mt-3 text-center">
              <div className="text-sm text-gray-600">
                Exporting<span className="loading-dots"></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spotify Playlist Modal */}
      {isPlaylistModalOpen && (
        <SpotifyPlaylistCreator
          graphData={graphData}
          onClose={() => setIsPlaylistModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Toolbar; 