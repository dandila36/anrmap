import React from 'react';
import { X, ExternalLink, Plus, Users, PlayCircle } from 'lucide-react';
import { SideDrawerProps } from '../types';

const SideDrawer: React.FC<SideDrawerProps> = ({ artist, isOpen, onClose, onExpand }) => {
  if (!isOpen || !artist) {
    return null;
  }

  const handleSpotifySearch = () => {
    const query = encodeURIComponent(artist.name);
    window.open(`https://open.spotify.com/search/${query}`, '_blank');
  };

  const handleYouTubeSearch = () => {
    const query = encodeURIComponent(`${artist.name} music`);
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
  };

  const handleLastFmOpen = () => {
    if (artist.url) {
      window.open(artist.url, '_blank');
    }
  };

  const handleExpandNode = () => {
    onExpand(artist.name);
    onClose();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`
        fixed lg:relative top-0 right-0 h-full w-80 bg-white shadow-lg z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        border-l border-gray-200
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Artist Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Artist Image & Name */}
          <div className="text-center">
            {artist.image && (
              <img
                src={artist.image}
                alt={artist.name}
                className="w-24 h-24 rounded-full mx-auto mb-3 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            )}
            <h3 className="text-xl font-bold text-gray-900 mb-1">{artist.name}</h3>
            {artist.isRoot && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Root Artist
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Users className="w-5 h-5 text-gray-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-gray-900">
                {formatNumber(artist.listeners)}
              </div>
              <div className="text-xs text-gray-600">Listeners</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <PlayCircle className="w-5 h-5 text-gray-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-gray-900">
                {formatNumber(artist.playcount)}
              </div>
              <div className="text-xs text-gray-600">Plays</div>
            </div>
          </div>

          {/* Genres */}
          {artist.tags && artist.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Genres</h4>
              <div className="flex flex-wrap gap-2">
                {artist.tags.slice(0, 6).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {artist.bio && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">About</h4>
              <div 
                className="text-sm text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: artist.bio.replace(/<a[^>]*>/g, '').replace(/<\/a>/g, '') 
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleExpandNode}
              className="w-full btn btn-primary flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Similar Artists</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleLastFmOpen}
                className="btn btn-secondary text-xs flex flex-col items-center space-y-1 py-3"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Last.fm</span>
              </button>
              
              <button
                onClick={handleSpotifySearch}
                className="btn btn-secondary text-xs flex flex-col items-center space-y-1 py-3"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1DB954">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span>Spotify</span>
              </button>
              
              <button
                onClick={handleYouTubeSearch}
                className="btn btn-secondary text-xs flex flex-col items-center space-y-1 py-3"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FF0000">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>YouTube</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SideDrawer; 