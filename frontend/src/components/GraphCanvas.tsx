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



  const getNodeColorByHop = useCallback((hopLevel: number) => {
    switch (hopLevel) {
      case 0: return '#7c3aed'; // Violet for root
      case 1: return '#0891b2'; // Cyan for 1st hop
      case 2: return '#ea580c'; // Orange for 2nd hop
      default: return '#94a3b8'; // Slate for unknown
    }
  }, []);

  const getNodeBorderByHop = useCallback((hopLevel: number) => {
    switch (hopLevel) {
      case 0: return '#6d28d9';
      case 1: return '#0e7490';
      case 2: return '#c2410c';
      default: return '#64748b';
    }
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
    let filteredOutNodes = 0;
    graphData.nodes.forEach(node => {
      // Apply filters
      if (filters.selectedGenres.length > 0) {
        const hasMatchingGenre = node.tags.some(tag => 
          filters.selectedGenres.includes(tag.toLowerCase())
        );
        if (!hasMatchingGenre && !node.isRoot) {
          filteredOutNodes++;
          console.log(`🔍 FILTERED OUT NODE: ${node.name} (hop:${node.hopLevel}) - no matching genre from:`, node.tags);
          return;
        }
      }

      elements.push({
        data: {
          id: node.id,
          name: node.name,
          listeners: node.listeners,
          tags: node.tags,
          primaryGenre: node.primaryGenre,
          size: node.size,
          isRoot: node.isRoot,
          hopLevel: node.hopLevel
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

    console.log('🔍 FINAL ELEMENTS:', {
      nodeCount: elements.filter(el => !el.data.source).length,
      edgeCount: elements.filter(el => el.data.source).length,
      filteredOutNodes,
      nodeNames: elements.filter(el => !el.data.source).map(el => `${el.data.name} (hop:${el.data.hopLevel})`),
      appliedFilters: filters
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
            'background-color': (node: any) => getNodeColorByHop(node.data('hopLevel')),
            'background-opacity': 0.92,
            'label': 'data(name)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 10,
            'font-size': '11px',
            'font-weight': '500',
            'color': '#1e293b',
            'text-outline-color': '#ffffff',
            'text-outline-width': 2.5,
            'text-outline-opacity': 0.9,
            'text-wrap': 'ellipsis',
            'text-max-width': '90px',
            'border-width': 2.5,
            'border-color': (node: any) => getNodeBorderByHop(node.data('hopLevel')),
            'border-opacity': 0.6,
            'underlay-color': (node: any) => getNodeColorByHop(node.data('hopLevel')),
            'underlay-padding': 6,
            'underlay-opacity': 0.08,
            'underlay-shape': 'ellipse',
            'overlay-opacity': 0,
            'transition-property': 'border-width, border-opacity, underlay-opacity, underlay-padding, background-opacity',
            'transition-duration': '0.2s'
          } as any
        },
        {
          selector: 'node[?isRoot]',
          style: {
            'border-width': 4,
            'border-color': '#7c3aed',
            'border-opacity': 0.9,
            'underlay-padding': 12,
            'underlay-opacity': 0.12,
            'font-size': '13px',
            'font-weight': '700',
            'z-index': 10
          } as any
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3.5,
            'border-opacity': 1,
            'underlay-opacity': 0.18,
            'underlay-padding': 10,
            'overlay-opacity': 0
          } as any
        },
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0.06,
            'overlay-color': '#475569'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': (edge: any) => Math.max(0.75, edge.data('weight') * 4),
            'line-color': (edge: any) => {
              const w = edge.data('weight') || 0;
              if (w > 0.7) return '#7c3aed';
              if (w > 0.4) return '#94a3b8';
              return '#cbd5e1';
            },
            'opacity': (edge: any) => {
              const w = edge.data('weight') || 0;
              return Math.max(0.25, Math.min(0.85, w * 1.2));
            },
            'curve-style': 'unbundled-bezier',
            'control-point-distances': 20,
            'control-point-weights': 0.5,
            'target-arrow-shape': 'none',
            'line-cap': 'round',
            'transition-property': 'line-color, opacity, width',
            'transition-duration': '0.2s'
          } as any
        },
        {
          selector: 'edge:hover',
          style: {
            'line-color': '#7c3aed',
            'opacity': 1,
            'width': (edge: any) => Math.max(2, edge.data('weight') * 5),
            'z-index': 10
          } as any
        }
      ],
      layout: {
        name: 'cose-bilkent',
        fit: true,
        padding: 80,
        idealEdgeLength: 150,
        edgeElasticity: 0.4,
        nestingFactor: 0.1,
        gravity: 0.2,
        numIter: 2500,
        tile: true,
        animate: 'end',
        animationDuration: 800,
        animationEasing: 'ease-out',
        tilingPaddingVertical: 30,
        tilingPaddingHorizontal: 30,
        nodeRepulsion: 10000,
        nodeDimensionsIncludeLabels: true
      } as any,
      wheelSensitivity: 0.6,
      minZoom: 0.2,
      maxZoom: 5
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

      const hopLevel = nodeData.hopLevel || 0;
      const accentColor = hopLevel === 0 ? '#7c3aed' : hopLevel === 1 ? '#0891b2' : '#ea580c';

      tooltip = document.createElement('div');
      tooltip.className = 'absolute z-50 pointer-events-none';
      tooltip.style.left = `${renderedPosition.x + 14}px`;
      tooltip.style.top = `${renderedPosition.y - 14}px`;

      const listeners = nodeData.listeners?.toLocaleString() || 'Unknown';
      const tags = nodeData.tags?.slice(0, 3).join(', ') || 'No genres';
      const hopLabel = hopLevel === 0 ? 'Root' : hopLevel === 1 ? '1st hop' : '2nd hop';

      tooltip.innerHTML = `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06); min-width: 160px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${accentColor}; flex-shrink: 0;"></div>
            <div style="font-weight: 600; font-size: 13px; color: #0f172a;">${nodeData.name}</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px; padding-left: 16px;">
            <div style="font-size: 11px; color: #64748b;">${listeners} listeners</div>
            <div style="font-size: 11px; color: #64748b;">${tags}</div>
            <div style="font-size: 10px; color: ${accentColor}; font-weight: 500; margin-top: 2px;">${hopLabel}</div>
          </div>
        </div>
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
  }, [data, onNodeSelect, getNodeColorByHop, getNodeBorderByHop]);

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
        padding: 80,
        randomize: false,
        nodeRepulsion: 10000,
        idealEdgeLength: 150,
        edgeElasticity: 0.4,
        nestingFactor: 0.1,
        gravity: 0.2,
        numIter: 2500,
        tile: true,
        animate: 'end',
        animationDuration: 800,
        animationEasing: 'ease-out',
        tilingPaddingVertical: 30,
        tilingPaddingHorizontal: 30
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
    <div className="w-full h-full relative graph-bg">
      <div ref={containerRef} className="w-full h-full graph-container" />

      {/* Hop Legend */}
      {!isEmpty && !isLoading && (
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]" />
            <span className="text-[10px] font-medium text-slate-500">Root</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0891b2]" />
            <span className="text-[10px] font-medium text-slate-500">1st hop</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ea580c]" />
            <span className="text-[10px] font-medium text-slate-500">2nd hop</span>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center bg-white rounded-2xl shadow-lg border border-slate-100 px-8 py-6">
            <div className="w-10 h-10 border-[3px] border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-medium text-slate-700">Building artist network<span className="loading-dots"></span></p>
            <p className="text-xs text-slate-400 mt-1">Discovering connections</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center max-w-xs">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-50 to-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-slate-100">
              <svg className="w-9 h-9 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" strokeWidth={2} />
                <circle cx="4" cy="8" r="2" strokeWidth={1.5} />
                <circle cx="20" cy="8" r="2" strokeWidth={1.5} />
                <circle cx="6" cy="18" r="2" strokeWidth={1.5} />
                <circle cx="18" cy="18" r="2" strokeWidth={1.5} />
                <path strokeLinecap="round" strokeWidth={1.5} d="M9.5 10.5L5.5 8.5M14.5 10.5L18.5 8.5M10 14l-3 3M14 14l3 3" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1.5">No Artist Map Yet</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Enter an artist name above to create your first network visualization.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphCanvas; 