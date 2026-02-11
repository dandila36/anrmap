import axios from 'axios';
import {
  MapApiResponse,
  ExpandApiResponse,
  SearchApiResponse,
  ArtistDetail,
  ApiError,
  SpotifyAuthResponse,
  SpotifyPlaylistResponse,
  SpotifyArtistUrlResponse,
  SpotifyArtistImageResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increase to 60 seconds for complex graphs with root-relative similarity
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('Artist not found. Please check the spelling and try again.');
    }
    
    if (error.response?.status === 504) {
      throw new Error('API is responding slowly. Please try again in a moment.');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    if (!error.response) {
      throw new Error('Network error. Please check your connection.');
    }
    
    const apiError: ApiError = error.response.data;
    throw new Error(apiError.message || 'An unexpected error occurred');
  }
);

export const apiService = {
  // Create artist similarity map
  createMap: async (url: string, depth = 1, limit = 25): Promise<MapApiResponse> => {
    const response = await api.post('/map', { url, depth, limit });
    return response.data;
  },

  // Expand node to show more similar artists
  expandNode: async (artistName: string, limit = 25): Promise<ExpandApiResponse> => {
    const response = await api.post('/expand', { artistName, limit });
    return response.data;
  },

  // Get individual artist information
  getArtist: async (artistId: string): Promise<ArtistDetail> => {
    const response = await api.get(`/artist/${encodeURIComponent(artistId)}`);
    return response.data.artist;
  },

  // Search for artists (autocomplete)
  searchArtists: async (query: string, limit = 10): Promise<SearchApiResponse> => {
    const response = await api.get('/search', { params: { q: query, limit } });
    return response.data;
  },

  // Export graph as CSV
  exportCSV: async (rootArtist: string, depth = 1, limit = 25): Promise<Blob> => {
    const response = await api.get('/export/csv', {
      params: { root: rootArtist, depth, limit },
      responseType: 'blob'
    });
    return response.data;
  },

  // Export connections as CSV from graph data
  exportConnections: async (nodes: any[], edges: any[]): Promise<Blob> => {
    const response = await api.post('/export/connections', { nodes, edges }, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<{ ok: boolean; timestamp: string }> => {
    const response = await api.get('/healthz');
    return response.data;
  },

  // Spotify API calls
  spotify: {
    // Get Spotify authorization URL
    getAuthUrl: async (): Promise<SpotifyAuthResponse> => {
      const response = await api.get('/spotify/auth');
      return response.data;
    },

    // Create playlist from artist list
    createPlaylist: async (
      accessToken: string, 
      artists: string[], 
      playlistName?: string, 
      trackType: 'popular' | 'recent' = 'popular'
    ): Promise<SpotifyPlaylistResponse> => {
      const response = await api.post('/spotify/create-playlist', {
        accessToken,
        artists,
        playlistName,
        trackType
      });
      return response.data;
    },

    // Get correct Spotify URL for an artist
    getArtistUrl: async (artistName: string): Promise<SpotifyArtistUrlResponse> => {
      const response = await api.get(`/spotify/artist-url/${encodeURIComponent(artistName)}`);
      return response.data;
    },

    // Get artist image from Spotify
    getArtistImage: async (artistName: string): Promise<SpotifyArtistImageResponse> => {
      const response = await api.get(`/spotify/artist-image/${encodeURIComponent(artistName)}`);
      return response.data;
    }
  }
};

// Utility functions
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const parseArtistInput = (input: string): string => {
  // Handle URL formats
  const urlMatch = input.match(/last\.fm\/music\/([^/?]+)/i);
  if (urlMatch) {
    return decodeURIComponent(urlMatch[1]).replace(/\+/g, ' ');
  }
  
  // Return plain artist name
  return input.trim();
};

export default apiService; 