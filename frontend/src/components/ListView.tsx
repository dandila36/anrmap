import React, { useState, useMemo } from 'react';
import { ExternalLink, Users, PlayCircle } from 'lucide-react';
import { GraphData, ArtistNode } from '../types';

interface ListViewProps {
  data: GraphData;
  onArtistSelect: (artist: ArtistNode) => void;
}

const ListView: React.FC<ListViewProps> = ({ data, onArtistSelect }) => {
  const [sortBy, setSortBy] = useState<'name' | 'listeners' | 'match'>('listeners');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Process data to include connection info
  const artistsWithConnections = useMemo(() => {
    return data.nodes.map(node => {
      // Find edges connected to this artist to get match scores
      const connections = data.edges.filter(edge => 
        edge.source === node.name || edge.target === node.name
      );
      
      // Get the best match score for this artist
      const bestMatch = connections.reduce((max, edge) => {
        return Math.max(max, edge.match || 0);
      }, 0);

      return {
        ...node,
        connections: connections.length,
        bestMatch
      };
    });
  }, [data]);

  // Sort artists
  const sortedArtists = useMemo(() => {
    const sorted = [...artistsWithConnections].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'listeners':
          comparison = (a.listeners || 0) - (b.listeners || 0);
          break;
        case 'match':
          comparison = a.bestMatch - b.bestMatch;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [artistsWithConnections, sortBy, sortOrder]);

  const handleSort = (column: 'name' | 'listeners' | 'match') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const formatNumber = (num: number | undefined) => {
    if (!num) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getSpotifySearchUrl = (artistName: string) => {
    const query = encodeURIComponent(artistName);
    return `https://open.spotify.com/search/${query}`;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Artist List</h2>
            <p className="text-sm text-gray-500">
              {data.nodes.length} artists • {data.edges.length} connections
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left p-3 border-b border-gray-200">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                >
                  Artist
                  {sortBy === 'name' && (
                    <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="text-left p-3 border-b border-gray-200">
                <button
                  onClick={() => handleSort('listeners')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                >
                  <Users className="w-4 h-4" />
                  Listeners
                  {sortBy === 'listeners' && (
                    <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="text-left p-3 border-b border-gray-200">Genres</th>
              <th className="text-left p-3 border-b border-gray-200">
                <button
                  onClick={() => handleSort('match')}
                  className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                >
                  Match
                  {sortBy === 'match' && (
                    <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="text-center p-3 border-b border-gray-200">Links</th>
            </tr>
          </thead>
          <tbody>
            {sortedArtists.map((artist) => (
              <tr
                key={artist.id}
                className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                  artist.isRoot ? 'bg-orange-50' : ''
                }`}
                onClick={() => onArtistSelect(artist)}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {artist.isRoot && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    )}
                    <span className={`font-medium ${artist.isRoot ? 'text-orange-700' : 'text-gray-900'}`}>
                      {artist.name}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-gray-600">
                  {formatNumber(artist.listeners)}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {artist.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  {artist.isRoot ? (
                    <span className="text-orange-600 font-medium">Root</span>
                  ) : (
                    <span className="text-gray-600">
                      {(artist.bestMatch * 100).toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <a
                      href={getSpotifySearchUrl(artist.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                      title="Search on Spotify"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PlayCircle className="w-4 h-4" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArtistSelect(artist);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                      title="View details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
        <div className="flex justify-between items-center">
          <span>Click on any artist to view details</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <PlayCircle className="w-4 h-4 text-green-600" />
              <span>Spotify</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListView; 