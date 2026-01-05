/**
 * NetworkGraph Component
 *
 * Interactive force-directed graph visualization for lexical relationships.
 * Shows collocations, morphological families, and semantic clusters.
 *
 * Design Philosophy:
 * - Nodes represent language objects (words, phrases)
 * - Edges represent relationships (PMI strength, morphological ties)
 * - Node size indicates mastery level
 * - Color coding for component types and mastery stages
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GlassCard, GlassBadge, GlassButton } from '../ui';

// ============================================================================
// Types
// ============================================================================

export interface GraphNode {
  id: string;
  label: string;
  /** Type of language object */
  type: 'word' | 'phrase' | 'collocation' | 'root';
  /** Mastery stage 0-4 */
  masteryStage: number;
  /** Linguistic component (PHON, MORPH, LEX, SYNT, PRAG) */
  component?: 'PHON' | 'MORPH' | 'LEX' | 'SYNT' | 'PRAG';
  /** Frequency rank (lower = more common) */
  frequencyRank?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  /** Relationship type */
  type: 'collocation' | 'morphological' | 'semantic' | 'syntactic';
  /** Strength of relationship (0-1) */
  weight: number;
  /** PMI score for collocations */
  pmi?: number;
  /** Label to display on edge */
  label?: string;
}

export interface NetworkGraphProps {
  /** Array of nodes to display */
  nodes: GraphNode[];
  /** Array of edges connecting nodes */
  edges: GraphEdge[];
  /** Currently selected node ID */
  selectedNode?: string | null;
  /** Callback when node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Callback when node is double-clicked */
  onNodeDoubleClick?: (nodeId: string) => void;
  /** Width of the canvas */
  width?: number;
  /** Height of the canvas */
  height?: number;
  /** Show edge labels */
  showEdgeLabels?: boolean;
  /** Enable physics simulation */
  enablePhysics?: boolean;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Force Simulation Types (Pure TypeScript, no D3)
// ============================================================================

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimEdge extends GraphEdge {
  sourceNode: SimNode;
  targetNode: SimNode;
}

// ============================================================================
// Color Palettes
// ============================================================================

const MASTERY_COLORS = [
  'rgba(156, 163, 175, 0.8)',  // 0 - New (gray)
  'rgba(251, 191, 36, 0.8)',   // 1 - Learning (amber)
  'rgba(59, 130, 246, 0.8)',   // 2 - Familiar (blue)
  'rgba(34, 197, 94, 0.8)',    // 3 - Proficient (green)
  'rgba(168, 85, 247, 0.8)',   // 4 - Mastered (purple)
];

const COMPONENT_COLORS: Record<string, string> = {
  PHON: 'rgba(236, 72, 153, 0.8)',   // Pink
  MORPH: 'rgba(139, 92, 246, 0.8)',  // Violet
  LEX: 'rgba(59, 130, 246, 0.8)',    // Blue
  SYNT: 'rgba(34, 197, 94, 0.8)',    // Green
  PRAG: 'rgba(251, 146, 60, 0.8)',   // Orange
};

const EDGE_COLORS: Record<string, string> = {
  collocation: 'rgba(59, 130, 246, 0.5)',
  morphological: 'rgba(139, 92, 246, 0.5)',
  semantic: 'rgba(34, 197, 94, 0.5)',
  syntactic: 'rgba(251, 146, 60, 0.5)',
};

// ============================================================================
// Force Simulation Engine (Pure TypeScript)
// ============================================================================

function initializeSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
): { simNodes: SimNode[]; simEdges: SimEdge[] } {
  // Initialize node positions in a circle
  const simNodes: SimNode[] = nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const radius = Math.min(width, height) * 0.3;
    return {
      ...node,
      x: width / 2 + radius * Math.cos(angle),
      y: height / 2 + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });

  // Create node lookup
  const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

  // Initialize edges with node references
  const simEdges: SimEdge[] = edges
    .map((edge) => ({
      ...edge,
      sourceNode: nodeMap.get(edge.source)!,
      targetNode: nodeMap.get(edge.target)!,
    }))
    .filter((e) => e.sourceNode && e.targetNode);

  return { simNodes, simEdges };
}

function simulationStep(
  nodes: SimNode[],
  edges: SimEdge[],
  width: number,
  height: number,
  alpha: number
): void {
  const centerX = width / 2;
  const centerY = height / 2;

  // Repulsion between all nodes (Coulomb's law)
  const repulsionStrength = 5000;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = repulsionStrength / (dist * dist);

      const fx = (dx / dist) * force * alpha;
      const fy = (dy / dist) * force * alpha;

      if (nodes[i].fx == null) nodes[i].vx -= fx;
      if (nodes[i].fy == null) nodes[i].vy -= fy;
      if (nodes[j].fx == null) nodes[j].vx += fx;
      if (nodes[j].fy == null) nodes[j].vy += fy;
    }
  }

  // Attraction along edges (Hooke's law)
  const springStrength = 0.1;
  const idealDistance = 100;
  for (const edge of edges) {
    const dx = edge.targetNode.x - edge.sourceNode.x;
    const dy = edge.targetNode.y - edge.sourceNode.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const displacement = dist - idealDistance * (1 - edge.weight * 0.5);
    const force = springStrength * displacement * alpha;

    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    if (edge.sourceNode.fx == null) edge.sourceNode.vx += fx;
    if (edge.sourceNode.fy == null) edge.sourceNode.vy += fy;
    if (edge.targetNode.fx == null) edge.targetNode.vx -= fx;
    if (edge.targetNode.fy == null) edge.targetNode.vy -= fy;
  }

  // Center gravity
  const gravityStrength = 0.02;
  for (const node of nodes) {
    if (node.fx == null) node.vx += (centerX - node.x) * gravityStrength * alpha;
    if (node.fy == null) node.vy += (centerY - node.y) * gravityStrength * alpha;
  }

  // Apply velocities and damping
  const damping = 0.6;
  const padding = 30;
  for (const node of nodes) {
    if (node.fx != null) {
      node.x = node.fx;
      node.vx = 0;
    } else {
      node.vx *= damping;
      node.x += node.vx;
      // Boundary constraints
      node.x = Math.max(padding, Math.min(width - padding, node.x));
    }

    if (node.fy != null) {
      node.y = node.fy;
      node.vy = 0;
    } else {
      node.vy *= damping;
      node.y += node.vy;
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    }
  }
}

// ============================================================================
// Canvas Rendering
// ============================================================================

function renderGraph(
  ctx: CanvasRenderingContext2D,
  nodes: SimNode[],
  edges: SimEdge[],
  selectedNode: string | null,
  hoveredNode: string | null,
  showEdgeLabels: boolean,
  width: number,
  height: number
): void {
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, width, height);

  // Draw edges
  for (const edge of edges) {
    const isHighlighted =
      edge.source === selectedNode ||
      edge.target === selectedNode ||
      edge.source === hoveredNode ||
      edge.target === hoveredNode;

    ctx.beginPath();
    ctx.moveTo(edge.sourceNode.x, edge.sourceNode.y);
    ctx.lineTo(edge.targetNode.x, edge.targetNode.y);
    ctx.strokeStyle = isHighlighted
      ? EDGE_COLORS[edge.type].replace('0.5', '0.9')
      : EDGE_COLORS[edge.type];
    ctx.lineWidth = isHighlighted ? 3 * edge.weight + 1 : 2 * edge.weight + 0.5;
    ctx.stroke();

    // Edge labels
    if (showEdgeLabels && edge.label) {
      const midX = (edge.sourceNode.x + edge.targetNode.x) / 2;
      const midY = (edge.sourceNode.y + edge.targetNode.y) / 2;
      ctx.font = '10px system-ui';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(edge.label, midX, midY);
    }
  }

  // Draw nodes
  for (const node of nodes) {
    const isSelected = node.id === selectedNode;
    const isHovered = node.id === hoveredNode;
    const radius = getNodeRadius(node, isSelected || isHovered);

    // Node glow for selected/hovered
    if (isSelected || isHovered) {
      const gradient = ctx.createRadialGradient(
        node.x,
        node.y,
        radius,
        node.x,
        node.y,
        radius * 2
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

    // Fill with mastery or component color
    const fillColor = node.component
      ? COMPONENT_COLORS[node.component]
      : MASTERY_COLORS[node.masteryStage] || MASTERY_COLORS[0];
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Border
    ctx.strokeStyle = isSelected
      ? 'rgba(255, 255, 255, 0.9)'
      : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.stroke();

    // Node label
    ctx.font = isSelected || isHovered ? 'bold 12px system-ui' : '11px system-ui';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Truncate long labels
    const maxLabelWidth = radius * 3;
    let label = node.label;
    while (ctx.measureText(label).width > maxLabelWidth && label.length > 3) {
      label = label.slice(0, -4) + '...';
    }

    ctx.fillText(label, node.x, node.y + radius + 14);
  }
}

function getNodeRadius(node: SimNode, isHighlighted: boolean): number {
  const base = 12;
  const masteryBonus = node.masteryStage * 2;
  const highlightBonus = isHighlighted ? 4 : 0;
  return base + masteryBonus + highlightBonus;
}

// ============================================================================
// Hit Testing
// ============================================================================

function findNodeAtPosition(
  nodes: SimNode[],
  x: number,
  y: number
): SimNode | null {
  // Search in reverse order (topmost first)
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    const radius = getNodeRadius(node, false) + 5; // Extra hit area
    const dx = x - node.x;
    const dy = y - node.y;
    if (dx * dx + dy * dy <= radius * radius) {
      return node;
    }
  }
  return null;
}

// ============================================================================
// NetworkGraph Component
// ============================================================================

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  edges,
  selectedNode = null,
  onNodeClick,
  onNodeDoubleClick,
  width = 600,
  height = 400,
  showEdgeLabels = false,
  enablePhysics = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simEdges, setSimEdges] = useState<SimEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimNode | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const alphaRef = useRef(1);
  const frameRef = useRef<number>();

  // Initialize simulation when nodes/edges change
  useEffect(() => {
    if (nodes.length === 0) {
      setSimNodes([]);
      setSimEdges([]);
      return;
    }

    const { simNodes: newNodes, simEdges: newEdges } = initializeSimulation(
      nodes,
      edges,
      width,
      height
    );
    setSimNodes(newNodes);
    setSimEdges(newEdges);
    alphaRef.current = 1;
    setIsSimulating(true);
  }, [nodes, edges, width, height]);

  // Animation loop
  useEffect(() => {
    if (!enablePhysics || simNodes.length === 0) return;

    const animate = () => {
      if (alphaRef.current > 0.001 && isSimulating) {
        simulationStep(simNodes, simEdges, width, height, alphaRef.current);
        alphaRef.current *= 0.99; // Decay

        // Force re-render
        setSimNodes([...simNodes]);
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [simNodes, simEdges, enablePhysics, isSimulating, width, height]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    renderGraph(ctx, simNodes, simEdges, selectedNode, hoveredNode, showEdgeLabels, width, height);
  }, [simNodes, simEdges, selectedNode, hoveredNode, showEdgeLabels, width, height]);

  // Mouse event handlers
  const getMousePos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getMousePos(e);

      if (draggedNode) {
        draggedNode.fx = x;
        draggedNode.fy = y;
        alphaRef.current = Math.max(alphaRef.current, 0.3);
        setIsSimulating(true);
        return;
      }

      const node = findNodeAtPosition(simNodes, x, y);
      setHoveredNode(node?.id || null);
    },
    [simNodes, draggedNode, getMousePos]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getMousePos(e);
      const node = findNodeAtPosition(simNodes, x, y);

      if (node) {
        setDraggedNode(node);
        node.fx = x;
        node.fy = y;
      }
    },
    [simNodes, getMousePos]
  );

  const handleMouseUp = useCallback(() => {
    if (draggedNode) {
      draggedNode.fx = null;
      draggedNode.fy = null;
      setDraggedNode(null);
    }
  }, [draggedNode]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getMousePos(e);
      const node = findNodeAtPosition(simNodes, x, y);

      if (node && onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [simNodes, onNodeClick, getMousePos]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getMousePos(e);
      const node = findNodeAtPosition(simNodes, x, y);

      if (node && onNodeDoubleClick) {
        onNodeDoubleClick(node.id);
      }
    },
    [simNodes, onNodeDoubleClick, getMousePos]
  );

  // Empty state
  if (nodes.length === 0) {
    return (
      <GlassCard className={`network-graph-empty ${className}`}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-4xl mb-4">🕸️</span>
          <p className="text-muted">No lexical relationships to display.</p>
          <p className="text-sm text-muted mt-2">
            Start learning words to build your vocabulary network.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className={`network-graph ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width,
          height,
          borderRadius: '12px',
          background: 'rgba(0, 0, 0, 0.2)',
          cursor: hoveredNode ? 'pointer' : draggedNode ? 'grabbing' : 'grab',
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        <GlassBadge size="sm" variant="default">
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: MASTERY_COLORS[0] }} />
          New
        </GlassBadge>
        <GlassBadge size="sm" variant="default">
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: MASTERY_COLORS[2] }} />
          Learning
        </GlassBadge>
        <GlassBadge size="sm" variant="default">
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: MASTERY_COLORS[4] }} />
          Mastered
        </GlassBadge>
      </div>
    </div>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

export interface NetworkGraphCardProps extends NetworkGraphProps {
  title?: string;
  onRefresh?: () => void;
  loading?: boolean;
}

/**
 * NetworkGraph wrapped in a GlassCard with title and controls.
 */
export const NetworkGraphCard: React.FC<NetworkGraphCardProps> = ({
  title = 'Vocabulary Network',
  onRefresh,
  loading = false,
  ...graphProps
}) => {
  const header = (
    <div className="flex items-center justify-between w-full">
      <span>{title}</span>
      {onRefresh && (
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? '...' : '↻'}
        </GlassButton>
      )}
    </div>
  );

  return (
    <GlassCard header={header} loading={loading} className="network-graph-card">
      <NetworkGraph {...graphProps} />
    </GlassCard>
  );
};

// ============================================================================
// Data Transformation Utilities
// ============================================================================

/**
 * Convert PMI collocations to graph format.
 */
export function collocationsToGraph(
  centerWord: string,
  collocations: Array<{ word: string; pmi: number; npmi: number }>,
  masteryMap?: Map<string, number>
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    {
      id: centerWord,
      label: centerWord,
      type: 'word',
      masteryStage: masteryMap?.get(centerWord) ?? 0,
    },
  ];

  const edges: GraphEdge[] = [];

  for (const col of collocations) {
    nodes.push({
      id: col.word,
      label: col.word,
      type: 'collocation',
      masteryStage: masteryMap?.get(col.word) ?? 0,
    });

    edges.push({
      source: centerWord,
      target: col.word,
      type: 'collocation',
      weight: Math.min(1, Math.max(0.1, (col.npmi + 1) / 2)), // Normalize NPMI to [0,1]
      pmi: col.pmi,
      label: col.pmi.toFixed(1),
    });
  }

  return { nodes, edges };
}

/**
 * Convert morphological family to graph format.
 */
export function morphologyToGraph(
  root: string,
  family: string[],
  masteryMap?: Map<string, number>
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    {
      id: root,
      label: root,
      type: 'root',
      masteryStage: masteryMap?.get(root) ?? 0,
      component: 'MORPH',
    },
  ];

  const edges: GraphEdge[] = [];

  for (const word of family) {
    if (word !== root) {
      nodes.push({
        id: word,
        label: word,
        type: 'word',
        masteryStage: masteryMap?.get(word) ?? 0,
      });

      edges.push({
        source: root,
        target: word,
        type: 'morphological',
        weight: 0.7,
      });
    }
  }

  return { nodes, edges };
}

export default NetworkGraph;
