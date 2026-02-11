import React, { useState } from 'react';
import { Music, Plus, ExternalLink, Loader2, Check, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { apiService } from '../services/api';
import { GraphData } from '../types';

interface SpotifyPlaylistCreatorProps {
  graphData: GraphData;
  onClose: () => void;
}

const SpotifyPlaylistCreator: React.FC<SpotifyPlaylistCreatorProps> = ({ graphData, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState('');
  const [trackType, setTrackType] = useState<'popular' | 'recent'>('popular');
  const [createdPlaylist, setCreatedPlaylist] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user has Spotify token from URL params (after OAuth)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('spotify_token');
    if (token) {
      setSpotifyToken(token);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Generate default playlist name
  React.useEffect(() => {
    const currentDate = new Date();
    const timestamp = currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const rootArtist = graphData.stats?.rootArtist || 'Artist Network';
    const trackTypeLabel = trackType === 'recent' ? 'Latest' : 'Popular';
    setPlaylistName(`${rootArtist}: AnR Map (${trackTypeLabel}) - ${timestamp}`);
  }, [graphData, trackType]);

  const handleSpotifyAuth = async () => {
    try {
      setIsLoading(true);
      const authResponse = await apiService.spotify.getAuthUrl();
      if (authResponse.success) {
        // Redirect to Spotify authorization
        window.location.href = authResponse.authUrl;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start Spotify authorization');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!spotifyToken) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Get all artist names from graph data
      const artistNames = graphData.nodes.map(node => node.name);
      
      const response = await apiService.spotify.createPlaylist(
        spotifyToken,
        artistNames,
        playlistName,
        trackType
      );

      if (response.success) {
        setCreatedPlaylist(response.playlist);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrackTypeInfo = (type: 'popular' | 'recent') => {
    return {
      popular: {
        label: 'Most Popular Tracks',
        description: 'Each artist\'s top performing track on Spotify',
        icon: <TrendingUp className="w-5 h-5" />
      },
      recent: {
        label: 'Latest Releases',
        description: 'Each artist\'s most recently released track',
        icon: <Clock className="w-5 h-5" />
      }
    }[type];
  };

  if (createdPlaylist) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Playlist Created!</h2>
            
            <p className="text-gray-600 mb-6">
              Successfully created "<strong>{createdPlaylist.name}</strong>" with {createdPlaylist.tracksAdded} tracks
              {createdPlaylist.tracksAdded < createdPlaylist.totalArtists && 
                ` (${createdPlaylist.totalArtists - createdPlaylist.tracksAdded} artists couldn't be found on Spotify)`
              }
            </p>

            <div className="space-y-3">
              <a
                href={createdPlaylist.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-5 h-5" />
                <span>Open in Spotify</span>
              </a>
              
              <button
                onClick={onClose}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Spotify Playlist</h2>
          <p className="text-gray-600">
            Generate a playlist from your artist network analysis
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="space-y-4">
          {!spotifyToken ? (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">What we'll include:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {graphData.nodes.length} artists from your current network</li>
                  <li>• One track per artist based on your selection</li>
                  <li>• Automatically named with timestamp</li>
                </ul>
              </div>

              <button
                onClick={handleSpotifyAuth}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <span>Connect with Spotify</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                {/* Track Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Track Selection
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {(['popular', 'recent'] as const).map((type) => {
                      const info = getTrackTypeInfo(type);
                      return (
                        <button
                          key={type}
                          onClick={() => setTrackType(type)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            trackType === type
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`mt-0.5 ${trackType === type ? 'text-green-600' : 'text-gray-400'}`}>
                              {info.icon}
                            </div>
                            <div>
                              <div className={`font-medium ${trackType === type ? 'text-green-900' : 'text-gray-900'}`}>
                                {info.label}
                              </div>
                              <div className={`text-sm ${trackType === type ? 'text-green-700' : 'text-gray-600'}`}>
                                {info.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Playlist Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Playlist Name
                  </label>
                  <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter playlist name..."
                  />
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">Ready to create:</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• {graphData.nodes.length} artists will be processed</li>
                    <li>• {getTrackTypeInfo(trackType).label.toLowerCase()} will be selected</li>
                    <li>• Playlist will be public on your Spotify account</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleCreatePlaylist}
                  disabled={isLoading || !playlistName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Create Playlist</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpotifyPlaylistCreator;