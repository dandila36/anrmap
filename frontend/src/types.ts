export interface ArtistNode {
  id: string;
  name: string;
  listeners: number;
  playcount: number;
  url: string;
  image: string;
  bio: string;
  tags: string[];
  primaryGenre: string;
  size: number;
  isRoot: boolean;
  data?: {
    id: string;
    name: string;
    listeners: number;
    tags: string[];
    primaryGenre: string;
    size: number;
    isRoot: boolean;
  };
}

export interface ArtistEdge {
  id: string;
  source: string;
  target: string;
  match: number;
  weight: number;
  data?: {
    id: string;
    source: string;
    target: string;
    weight: number;
  };
}

export interface GraphData {
  nodes: ArtistNode[];
  edges: ArtistEdge[];
  stats?: {
    totalNodes: number;
    totalEdges: number;
    rootArtist: string;
  };
}

export interface FilterState {
  minSimilarity: number;
  selectedGenres: string[];
  depth: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LastFmArtist {
  name: string;
  listeners: number;
  playcount: number;
  url: string;
  image: string;
  bio: string;
  tags: string[];
  similar?: Array<{
    name: string;
    match: number;
    url: string;
  }>;
}

export interface MapApiResponse {
  success: boolean;
  rootArtist: string;
  depth: number;
  limit: number;
  nodes: ArtistNode[];
  edges: ArtistEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    rootArtist: string;
  };
}

export interface ExpandApiResponse {
  success: boolean;
  artist: string;
  nodes: ArtistNode[];
  edges: ArtistEdge[];
}

export interface ArtistSearchResult {
  name: string;
  listeners: number;
  url: string;
  image: string;
}

export interface SearchApiResponse {
  success: boolean;
  query: string;
  results: ArtistSearchResult[];
}

// Cytoscape.js specific types
export interface CytoscapeNode {
  data: {
    id: string;
    name: string;
    listeners: number;
    tags: string[];
    primaryGenre: string;
    size: number;
    isRoot: boolean;
  };
  position?: {
    x: number;
    y: number;
  };
}

export interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    weight: number;
  };
}

export type CytoscapeElements = Array<CytoscapeNode | CytoscapeEdge>;

// Component Props Types
export interface HeaderProps {}

export interface InputBarProps {
  onGraphData: (data: GraphData) => void;
  onLoadingChange: (loading: boolean) => void;
  isLoading: boolean;
}

export interface GraphCanvasProps {
  data: GraphData;
  filters: FilterState;
  onNodeSelect: (node: ArtistNode | null) => void;
  selectedArtist: ArtistNode | null;
  isLoading: boolean;
}

export interface SideDrawerProps {
  artist: ArtistNode | null;
  isOpen: boolean;
  onClose: () => void;
  onExpand: (artistName: string) => void;
}

export interface ToolbarProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  onExport: (format: 'csv' | 'png') => void;
  graphData: GraphData;
  viewMode?: 'graph' | 'list';
  onViewModeChange?: (mode: 'graph' | 'list') => void;
}

// Error Types
export interface ApiError {
  error: string;
  message: string;
  statusCode?: number;
} 