import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
// @ts-ignore - cytoscape-cose-bilkent doesn't have types
import coseBilkent from 'cytoscape-cose-bilkent';
import { GraphCanvasProps, CytoscapeElements } from '../types';

// Register the layout
cytoscape.use(coseBilkent);

const GraphCanvas: React.FC<GraphCanvasProps> = ({
  data,
  filters,
  onNodeSelect,
  selectedArtist,
  isLoading
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Genre color mapping
  const genreColors = {
    pop: '#FF6B6B',
    rock: '#4ECDC4',
    'indie rock': '#45B7D1',
    'alternative rock': '#96CEB4',
    electronic: '#FECA57',
    'indie pop': '#FF9FF3',
    metal: '#54A0FF',
    punk: '#5F27CD',
    folk: '#00D2D3',
    country: '#FF9F43',
    blues: '#3742FA',
    jazz: '#FF6348',
    classical: '#2F3542',
    hip: '#FF3838',
    rap: '#FF4757',
    rnb: '#3D9970',
    soul: '#FF851B',
    funk: '#B10DC9',
    reggae: '#01A3A4',
    default: '#6C7B7F'
  };

  const getNodeColor = useCallback((genre: string) => {
    const normalizedGenre = genre.toLowerCase();
    return genreColors[normalizedGenre as keyof typeof genreColors] || genreColors.default;
  }, []);

  const transformDataToCytoscape = useCallback((graphData: typeof data): CytoscapeElements => {
    const elements: CytoscapeElements = [];
    
    console.log('🔍 DEBUG: Received data:', {
      totalNodes: graphData.nodes.length,
      totalEdges: graphData.edges.length,
      rootNode: graphData.nodes.find(n => n.isRoot)?.name,
      sampleEdges: graphData.edges.slice(0, 5)
    });

    // Add nodes
    graphData.nodes.forEach(node => {
      // Apply filters
      if (filters.selectedGenres.length > 0) {
        const hasMatchingGenre = node.tags.some(tag => 
          filters.selectedGenres.includes(tag.toLowerCase())
        );
        if (!hasMatchingGenre && !node.isRoot) return;
      }

      elements.push({
        data: {
          id: node.id,
          name: node.name,
          listeners: node.listeners,
          tags: node.tags,
          primaryGenre: node.primaryGenre,
          size: node.size,
          isRoot: node.isRoot
        }
      });
    });

    // Add edges
    let addedEdges = 0;
    let skippedEdges = 0;
    
    graphData.edges.forEach(edge => {
      // Apply similarity filter
      if (edge.match < filters.minSimilarity) {
        skippedEdges++;
        return;
      }

      // Only add edge if both nodes exist
      const sourceExists = elements.some(el => el.data.id === edge.source);
      const targetExists = elements.some(el => el.data.id === edge.target);
      
      if (sourceExists && targetExists) {
        elements.push({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            weight: edge.weight
          }
        });
        addedEdges++;
      } else {
        console.warn('🚨 MISSING NODES for edge:', edge.source, '→', edge.target, 
          'Source exists:', sourceExists, 'Target exists:', targetExists);
        skippedEdges++;
      }
    });
    
    console.log('🔍 EDGE PROCESSING:', {
      totalEdgesReceived: graphData.edges.length,
      addedEdges,
      skippedEdges,
      minSimilarity: filters.minSimilarity,
      finalElements: elements.length
    });

    return elements;
  }, [filters]);

  const initializeCytoscape = useCallback(() => {
    if (!containerRef.current || cyRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            'width': 'data(size)',
            'height': 'data(size)',
            'background-color': (node: any) => getNodeColor(node.data('primaryGenre')),
            'label': 'data(name)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 5,
            'font-size': '12px',
            'font-weight': 'bold',
            'color': '#333',
            'text-outline-color': '#fff',
            'text-outline-width': 2,
            'border-width': (node: any) => node.data('isRoot') ? 4 : 2,
            'border-color': (node: any) => node.data('isRoot') ? '#FFD700' : '#fff',
            'overlay-opacity': 0
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#007BFF',
            'overlay-opacity': 0.2,
            'overlay-color': '#007BFF'
          }
        },
        {
          selector: 'node:hover',
          style: {
            'overlay-opacity': 0.1,
            'overlay-color': '#333'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': (edge: any) => Math.max(1, edge.data('weight') * 3),
            'line-color': '#E0E0E0',
            'opacity': 0.7,
            'curve-style': 'bezier',
            'target-arrow-shape': 'none'
          }
        },
        {
          selector: 'edge:hover',
          style: {
            'line-color': '#007BFF',
            'opacity': 1
          }
        }
      ],
      layout: {
        name: 'cose-bilkent',
        fit: true,
        padding: 30,
        idealEdgeLength: 50,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        animate: 'end',
        animationDuration: 1000,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10
      } as any,
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 3
    });

    // Event handlers
    cy.on('tap', 'node', (event) => {
      const nodeData = event.target.data();
      const artist = data.nodes.find(node => node.id === nodeData.id);
      onNodeSelect(artist || null);
    });

    cy.on('tap', (event) => {
      if (event.target === cy) {
        onNodeSelect(null);
      }
    });

    // Add tooltip functionality
    let tooltip: HTMLDivElement | null = null;

    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      const nodeData = node.data();
      const renderedPosition = node.renderedPosition();

      if (tooltip) {
        tooltip.remove();
      }

      tooltip = document.createElement('div');
      tooltip.className = 'absolute z-50 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg pointer-events-none';
      tooltip.style.left = `${renderedPosition.x + 10}px`;
      tooltip.style.top = `${renderedPosition.y - 10}px`;
      
      const listeners = nodeData.listeners?.toLocaleString() || 'Unknown';
      const tags = nodeData.tags?.slice(0, 3).join(', ') || 'No genres';
      
      tooltip.innerHTML = `
        <div class="font-semibold">${nodeData.name}</div>
        <div class="text-xs text-gray-300">${listeners} listeners</div>
        <div class="text-xs text-gray-300">${tags}</div>
      `;

      containerRef.current?.appendChild(tooltip);
    });

    cy.on('mouseout', 'node', () => {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    });

    cyRef.current = cy;
  }, [data, onNodeSelect, getNodeColor]);

  // Initialize Cytoscape
  useEffect(() => {
    initializeCytoscape();
    
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);

  // Update graph data
  useEffect(() => {
    if (!cyRef.current) return;

    const elements = transformDataToCytoscape(data);
    setIsEmpty(elements.length === 0);

    cyRef.current.elements().remove();
    cyRef.current.add(elements);
    
    if (elements.length > 0) {
      cyRef.current.layout({
        name: 'cose-bilkent',
        nodeDimensionsIncludeLabels: true,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        nodeRepulsion: 4500,
        idealEdgeLength: 50,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        animate: 'end',
        animationDuration: 1000
      } as any).run();
    }
  }, [data, transformDataToCytoscape]);

  // Update selected node
  useEffect(() => {
    if (!cyRef.current) return;

    cyRef.current.nodes().removeClass('selected');
    
    if (selectedArtist) {
      const node = cyRef.current.getElementById(selectedArtist.id);
      if (node.length > 0) {
        node.addClass('selected');
      }
    }
  }, [selectedArtist]);

  return (
    <div className="w-full h-full relative bg-white">
      <div ref={containerRef} className="w-full h-full graph-container" />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Building artist network<span className="loading-dots"></span></p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No Artist Map Yet</h3>
            <p className="text-sm">Enter a Last.fm URL or artist name above to create your first network visualization.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphCanvas; 