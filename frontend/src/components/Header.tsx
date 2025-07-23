import React from 'react';
import { Music, ExternalLink } from 'lucide-react';
import { HeaderProps } from '../types';

const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* App Title */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-600 rounded-lg">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Similar Artists Mapper</h1>
            <p className="text-sm text-gray-600">
              Interactive network visualization of musically similar artists
            </p>
          </div>
        </div>

        {/* Last.fm Attribution */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">Powered by</p>
            <a
              href="https://www.last.fm"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
            >
              <span className="font-semibold">Last.fm</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <img
            src="https://www.last.fm/static/images/lastfm_logo_red.png"
            alt="Last.fm"
            className="h-8 w-auto"
            onError={(e) => {
              // Fallback if image doesn't load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      </div>
    </header>
  );
};

export default Header; 