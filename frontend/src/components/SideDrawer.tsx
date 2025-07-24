import React, { useMemo } from 'react';
import { 
  X, 
  Plus, 
  Users, 
  Music,
  TrendingUp,
  Globe,
  Star,
  Zap,
  Radio,
  Headphones,
  Award,
  Target
} from 'lucide-react';
import { SideDrawerProps } from '../types';

const SideDrawer: React.FC<SideDrawerProps> = ({ artist, isOpen, onClose, onExpand, graphData }) => {
  // Enhanced network analysis using graph data
  const networkInsights = useMemo(() => {
    if (!artist || !graphData) return null;
    
    const connections = graphData.edges.filter(edge => 
      edge.source === artist.name || edge.target === artist.name
    );
    
    const similarities = connections.map(edge => edge.match || 0);
    const avgSimilarity = similarities.length > 0 
      ? similarities.reduce((sum, val) => sum + val, 0) / similarities.length 
      : 0;
    
    const strongConnections = connections.filter(edge => (edge.match || 0) > 0.7).length;
    const maxSimilarity = Math.max(...similarities, 0);
    
    // Calculate popularity tier
    const allListeners = graphData.nodes.map(node => node.listeners || 0);
    const maxListeners = Math.max(...allListeners);
    const popularityScore = maxListeners > 0 
      ? (artist.listeners || 0) / maxListeners 
      : 0;
    
    let popularityTier = 'Emerging';
    if (popularityScore > 0.8) popularityTier = 'Superstar';
    else if (popularityScore > 0.6) popularityTier = 'Major';
    else if (popularityScore > 0.3) popularityTier = 'Popular';
    else if (popularityScore > 0.1) popularityTier = 'Rising';
    
    return {
      connectionCount: connections.length,
      strongConnections,
      avgSimilarity,
      maxSimilarity,
      popularityScore,
      popularityTier,
      isWellConnected: connections.length > 3,
      isInfluencer: strongConnections > 2,
    };
  }, [artist, graphData]);

  // Genre-based color theming
  const getGenreColor = (genre: string) => {
    const colors: { [key: string]: string } = {
      'pop': '#FF69B4',
      'rock': '#DC143C', 
      'indie': '#4169E1',
      'electronic': '#00FFFF',
      'jazz': '#4169E1',
      'blues': '#000080',
      'country': '#228B22',
      'folk': '#8FBC8F',
      'hip hop': '#FF4500',
      'rap': '#FF0000',
      'r&b': '#FF8C00',
      'metal': '#000000',
      'classical': '#F8F8FF',
      'alternative': '#8B0000',
      'indie rock': '#8B0000',
      'default': '#6B7280'
    };
    
    const normalizedGenre = genre.toLowerCase();
    return colors[normalizedGenre] || colors.default;
  };

  const primaryColor = artist ? getGenreColor(artist.primaryGenre || artist.tags?.[0] || 'default') : '#6B7280';

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

  const getPopularityIcon = (tier: string) => {
    switch (tier) {
      case 'Superstar': return <Award className="w-4 h-4" />;
      case 'Major': return <Star className="w-4 h-4" />;
      case 'Popular': return <TrendingUp className="w-4 h-4" />;
      case 'Rising': return <Zap className="w-4 h-4" />;
      default: return <Music className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
        onClick={onClose}
      />

             {/* Enhanced Drawer */}
       <div className={`
         fixed lg:relative top-0 right-0 h-full w-96 bg-white shadow-2xl z-50
         transform transition-transform duration-300 ease-in-out
         ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
         border-l border-gray-200 flex flex-col
       `}>
        {/* Header with Genre Theme */}
        <div 
          className="relative p-6 border-b border-gray-200"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}08)`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <h2 className="text-lg font-bold text-gray-900">Artist Profile</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

                 {/* Content */}
         <div className="flex-1 overflow-y-auto min-h-0">
          {/* Artist Hero Section */}
          <div className="p-6 text-center">
            <div className="relative inline-block mb-4">
              {artist.image ? (
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="w-32 h-32 rounded-2xl mx-auto object-cover shadow-lg"
                  style={{
                    border: `3px solid ${primaryColor}40`
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div 
                  className="w-32 h-32 rounded-2xl mx-auto flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Music className="w-12 h-12" style={{ color: primaryColor }} />
                </div>
              )}
              
              {/* Status Badge */}
              {artist.isRoot && (
                <div className="absolute -top-2 -right-2">
                  <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow-md">
                    <Target className="w-3 h-3" />
                    <span>ROOT</span>
                  </div>
                </div>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{artist.name}</h1>
            
            {/* Popularity Tier */}
            {networkInsights && (
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div 
                  className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${primaryColor}20`,
                    color: primaryColor
                  }}
                >
                  {getPopularityIcon(networkInsights.popularityTier)}
                  <span>{networkInsights.popularityTier}</span>
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="px-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Global Reach</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatNumber(artist.listeners)}
                </div>
                <div className="text-xs text-blue-600">monthly listeners</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <Headphones className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Total Plays</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {formatNumber(artist.playcount)}
                </div>
                <div className="text-xs text-purple-600">all-time scrobbles</div>
              </div>
            </div>
          </div>

                     {/* Top Tracks */}
           {artist.topTracks && artist.topTracks.length > 0 && (
             <div className="px-6 mb-6">
               <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                 <TrendingUp className="w-5 h-5" />
                 <span>Top Tracks</span>
               </h3>
               <div className="space-y-3">
                 {artist.topTracks.slice(0, 3).map((track, index) => (
                   <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                     <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                       <span className="text-white text-sm font-bold">{index + 1}</span>
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="text-sm font-medium text-gray-900 truncate">
                         {track.name}
                       </div>
                       <p className="text-xs text-gray-500">
                         {formatNumber(track.playcount)} plays
                       </p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

                     {/* Latest Release */}
           {artist.topAlbums && artist.topAlbums.length > 0 && (
             <div className="px-6 mb-6">
               <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                 <Award className="w-5 h-5" />
                 <span>Top Album</span>
               </h3>
               <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                 <div className="flex-shrink-0">
                   {artist.topAlbums[0].image ? (
                     <img 
                       src={artist.topAlbums[0].image} 
                       alt={artist.topAlbums[0].name}
                       className="w-12 h-12 rounded-lg object-cover"
                       onError={(e) => {
                         (e.target as HTMLImageElement).style.display = 'none';
                         (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display: flex;');
                       }}
                     />
                   ) : null}
                   <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center" style={{ display: artist.topAlbums[0].image ? 'none' : 'flex' }}>
                     <Music className="w-6 h-6 text-white" />
                   </div>
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="text-sm font-medium text-gray-900 truncate">
                     {artist.topAlbums[0].name}
                   </div>
                   <p className="text-xs text-gray-500">
                     {formatNumber(artist.topAlbums[0].playcount)} plays
                   </p>
                 </div>
               </div>
             </div>
           )}

          {/* Enhanced Genres */}
          {artist.tags && artist.tags.length > 0 && (
            <div className="px-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Music className="w-5 h-5" />
                <span>Musical DNA</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {artist.tags.slice(0, 8).map((tag, index) => {
                  const isMain = index === 0;
                  const tagColor = getGenreColor(tag);
                  return (
                                         <span
                       key={index}
                       className={`px-3 py-1 rounded-full text-sm font-medium ${
                         isMain ? 'ring-2 ring-offset-1 ring-opacity-40' : ''
                       }`}
                       style={{
                         backgroundColor: isMain ? `${tagColor}25` : `${tagColor}15`,
                         color: tagColor
                       }}
                     >
                      {tag}
                      {isMain && (
                        <span className="ml-1 text-xs opacity-70">main</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enhanced Bio */}
          {artist.bio && (
            <div className="px-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Biography</span>
              </h3>
              <div 
                className="text-sm text-gray-600 leading-relaxed p-4 bg-gray-50 rounded-xl max-h-32 overflow-y-auto"
                dangerouslySetInnerHTML={{ 
                  __html: artist.bio.replace(/<a[^>]*>/g, '').replace(/<\/a>/g, '') 
                }}
              />
            </div>
          )}

          {/* Enhanced Actions */}
          <div className="px-6 pb-6 space-y-4">
            <button
              onClick={handleExpandNode}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>Discover Similar Artists</span>
            </button>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleLastFmOpen}
                className="flex flex-col items-center space-y-2 p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-colors"
              >
                <Radio className="w-6 h-6" />
                <span className="text-xs font-medium">Last.fm</span>
              </button>
              
              <button
                onClick={handleSpotifySearch}
                className="flex flex-col items-center space-y-2 p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span className="text-xs font-medium">Spotify</span>
              </button>
              
              <button
                onClick={handleYouTubeSearch}
                className="flex flex-col items-center space-y-2 p-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span className="text-xs font-medium">YouTube</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SideDrawer; 