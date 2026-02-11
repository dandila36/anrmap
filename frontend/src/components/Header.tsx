import React from 'react';
import { Orbit } from 'lucide-react';
import { HeaderProps } from '../types';

const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* App Title */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-violet-600 rounded-lg">
            <Orbit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Galaxy</h1>
            <p className="text-sm text-gray-600">
              Artist cluster analysis &amp; network mapping
            </p>
          </div>
        </div>

        {/* Spacer */}
        <div />
      </div>
    </header>
  );
};

export default Header; 