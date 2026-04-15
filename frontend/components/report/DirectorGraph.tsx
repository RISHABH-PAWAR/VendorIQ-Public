'use client';

/**
 * VendorIQ — Director Network Graph
 * ====================================
 * D3 force-directed graph showing director ↔ company relationships.
 * Obsidian Terminal aesthetic: dark nodes, glow effects, glass tooltip.
 *
 * Props:
 *   reportId — used to fetch /api/reports/:id/graph
 *
 * Node types:
 *   company  — hexagon, blue (#1A56DB) if root, slate if associated
 *   director — circle, amber (#F59E0B) if disqualified, white if clean
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { graphApi } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'director' | 'company';
  label: string;
  din?: string;
  cin?: string;
  vhs?: number;
  risk?: string;
  isRoot?: boolean;
  disqualified?: boolean;
  designation?: string;
  status?: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  role?: string;
  type?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  meta: { total_nodes: number; total_links: number; director_count: number; company_count: number };
}

interface TooltipState {
  x: number;
  y: number;
  node: GraphNode | null;
}

// ── Colour helpers ─────────────────────────────────────────────────────────
function nodeColor(node: GraphNode): string {
  if (node.type === 'director') return node.disqualified ? '#EF4444' : '#E2E8F0';
  if (node.isRoot) return '#1A56DB';
  return '#334155';
}

function nodeStroke(node: GraphNode): string {
  if (node.type === 'director') return node.disqualified ? '#FCA5A5' : '#64748B';
  if (node.isRoot) return '#60A5FA';
  return '#475569';
}

function riskColor(risk?: string): string {
  if (risk === 'HIGH') return '#EF4444';
  if (risk === 'MEDIUM') return '#F59E0B';
  if (risk === 'LOW') return '#22C55E';
  return '#64748B';
}

// ── Main component ─────────────────────────────────────────────────────────
export default function DirectorGraph({ reportId }: { reportId: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, node: null });
  const [filter, setFilter] = useState<'all' | 'directors' | 'companies'>('all');
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // ── Fetch graph data ─────────────────────────────────────────────────────
  useEffect(() => {
    graphApi.get(reportId)
      .then(res => setData(res.data.data))
      .catch(err => setError(err.response?.data?.error?.message || 'Failed to load graph'))
      .finally(() => setLoading(false));
  }, [reportId]);

  // ── Draw D3 graph ────────────────────────────────────────────────────────
  const drawGraph = useCallback(() => {
    if (!data || !svgRef.current) return;

    const svg    = d3.select(svgRef.current);
    const width  = svgRef.current.clientWidth  || 800;
    const height = svgRef.current.clientHeight || 520;

    // Clear previous render
    svg.selectAll('*').remove();

    // Filter nodes based on active filter
    const visibleNodes = filter === 'all' ? data.nodes
      : data.nodes.filter(n => n.type === filter.slice(0, -1) || n.isRoot);

    const visibleIds  = new Set(visibleNodes.map(n => n.id));
    const visibleLinks = data.links.filter(l => {
      const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      return visibleIds.has(sId) && visibleIds.has(tId);
    });

    // Zoom + pan
    const g = svg.append('g');
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    // Defs: glow filter
    const defs = svg.append('defs');
    ['blue', 'amber', 'red'].forEach((name, i) => {
      const colors = ['#3B82F6', '#F59E0B', '#EF4444'];
      const f = defs.append('filter').attr('id', `glow-${name}`).attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
      f.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
      const merge = f.append('feMerge');
      merge.append('feMergeNode').attr('in', 'blur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // Arrow marker for links
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#475569');

    // Links
    const link = g.append('g').selectAll<SVGLineElement, GraphLink>('line')
      .data(visibleLinks)
      .join('line')
      .attr('stroke', d => d.type === 'serves_as' ? '#1A56DB40' : '#33415540')
      .attr('stroke-width', d => d.type === 'serves_as' ? 1.5 : 1)
      .attr('stroke-dasharray', d => d.type === 'associated' ? '4 3' : null)
      .attr('marker-end', 'url(#arrow)');

    // Nodes group
    const nodeGroup = g.append('g').selectAll<SVGGElement, GraphNode>('g')
      .data(visibleNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => { if (!event.active) simRef.current?.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end',   (event, d) => { if (!event.active) simRef.current?.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Node shapes: hexagon for companies, circle for directors
    nodeGroup.each(function(d) {
      const el = d3.select(this);
      const color  = nodeColor(d);
      const stroke = nodeStroke(d);
      const size   = d.isRoot ? 28 : d.type === 'company' ? 18 : 14;
      const filter = d.isRoot ? 'url(#glow-blue)' : d.disqualified ? 'url(#glow-red)' : undefined;

      if (d.type === 'company') {
        // Hexagon
        const r = size;
        const pts = Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 180) * (60 * i - 30);
          return `${r * Math.cos(a)},${r * Math.sin(a)}`;
        }).join(' ');
        el.append('polygon')
          .attr('points', pts)
          .attr('fill', color)
          .attr('stroke', stroke)
          .attr('stroke-width', d.isRoot ? 2 : 1)
          .attr('opacity', 0.9)
          .attr('filter', filter || null);
      } else {
        // Circle
        el.append('circle')
          .attr('r', size)
          .attr('fill', color)
          .attr('stroke', stroke)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.9)
          .attr('filter', filter || null);
      }

      // Label
      el.append('text')
        .attr('dy', size + 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', d.isRoot ? 11 : 9)
        .attr('fill', d.isRoot ? '#93C5FD' : '#94A3B8')
        .attr('font-family', 'Satoshi, sans-serif')
        .text(d.label.length > 18 ? d.label.slice(0, 17) + '…' : d.label);

      // VHS badge on root node
      if (d.isRoot && d.vhs != null) {
        el.append('text')
          .attr('dy', 5)
          .attr('text-anchor', 'middle')
          .attr('font-size', 11)
          .attr('font-weight', 700)
          .attr('fill', riskColor(d.risk))
          .attr('font-family', 'JetBrains Mono, monospace')
          .text(String(d.vhs));
      }

      // Disqualified badge
      if (d.disqualified) {
        el.append('circle')
          .attr('cx', size - 4).attr('cy', -(size - 4))
          .attr('r', 5)
          .attr('fill', '#EF4444');
        el.append('text')
          .attr('x', size - 4).attr('y', -(size - 9))
          .attr('text-anchor', 'middle')
          .attr('font-size', 7)
          .attr('fill', '#fff')
          .text('!');
      }
    });

    // Tooltip interaction
    nodeGroup
      .on('mouseenter', (event, d) => {
        const [x, y] = d3.pointer(event, svgRef.current);
        setTooltip({ x, y, node: d });
      })
      .on('mouseleave', () => setTooltip(t => ({ ...t, node: null })));

    // Force simulation
    const sim = d3.forceSimulation<GraphNode>(visibleNodes)
      .force('link',    d3.forceLink<GraphNode, GraphLink>(visibleLinks).id(d => d.id).distance(d => (d as GraphLink).type === 'serves_as' ? 120 : 180).strength(0.6))
      .force('charge',  d3.forceManyBody().strength(-280))
      .force('center',  d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(40))
      .on('tick', () => {
        link
          .attr('x1', d => (d.source as GraphNode).x!)
          .attr('y1', d => (d.source as GraphNode).y!)
          .attr('x2', d => (d.target as GraphNode).x!)
          .attr('y2', d => (d.target as GraphNode).y!);
        nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
      });

    simRef.current = sim;
  }, [data, filter]);

  useEffect(() => {
    drawGraph();
    return () => { simRef.current?.stop(); };
  }, [drawGraph]);

  // Redraw on resize
  useEffect(() => {
    const ro = new ResizeObserver(() => drawGraph());
    if (svgRef.current) ro.observe(svgRef.current.parentElement!);
    return () => ro.disconnect();
  }, [drawGraph]);

  // ── Legend data ─────────────────────────────────────────────────────────
  const legend = [
    { label: 'Target Company',      color: '#1A56DB', shape: 'hex' },
    { label: 'Associated Company',  color: '#334155', shape: 'hex' },
    { label: 'Director (Clean)',     color: '#E2E8F0', shape: 'circle' },
    { label: 'Director (Disqualified)', color: '#EF4444', shape: 'circle' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface-dark/50 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-sm font-mono">Loading director graph…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 bg-surface-dark/50 rounded-2xl border border-red-500/20 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="relative bg-[#0A1628] rounded-2xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight">Director Network</h3>
          {data && (
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              {data.meta.director_count} directors · {data.meta.company_count} companies · {data.meta.total_links} connections
            </p>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5">
          {(['all', 'directors', 'companies'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-brand text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* SVG canvas */}
      <svg
        ref={svgRef}
        className="w-full"
        style={{ height: 520 }}
      />

      {/* Tooltip */}
      {tooltip.node && (
        <div
          className="absolute pointer-events-none z-20 bg-[#1E293B]/95 backdrop-blur border border-white/10 rounded-xl p-3 shadow-2xl max-w-xs"
          style={{ left: Math.min(tooltip.x + 12, (svgRef.current?.clientWidth || 800) - 200), top: tooltip.y - 12 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${tooltip.node.type === 'director' ? 'bg-slate-200' : 'bg-brand'}`} />
            <span className="text-xs font-medium text-white uppercase tracking-wider">
              {tooltip.node.type}
            </span>
            {tooltip.node.disqualified && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-mono">DISQUALIFIED</span>
            )}
          </div>
          <p className="text-sm font-semibold text-white leading-tight">{tooltip.node.label}</p>
          {tooltip.node.din && <p className="text-xs text-slate-400 mt-1 font-mono">DIN: {tooltip.node.din}</p>}
          {tooltip.node.cin && <p className="text-xs text-slate-400 font-mono">CIN: {tooltip.node.cin}</p>}
          {tooltip.node.designation && <p className="text-xs text-slate-500 mt-1">{tooltip.node.designation}</p>}
          {tooltip.node.vhs != null && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-400">VHS</span>
              <span className={`text-sm font-mono font-bold`} style={{ color: riskColor(tooltip.node.risk) }}>
                {tooltip.node.vhs}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: riskColor(tooltip.node.risk) + '20', color: riskColor(tooltip.node.risk) }}>
                {tooltip.node.risk}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-white/5 flex-wrap">
        {legend.map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            {item.shape === 'circle'
              ? <div className="w-3 h-3 rounded-full border" style={{ background: item.color, borderColor: item.color }} />
              : <div className="w-3 h-3 rotate-45 border" style={{ background: item.color, borderColor: item.color }} />
            }
            <span className="text-xs text-slate-500">{item.label}</span>
          </div>
        ))}
        <span className="text-xs text-slate-600 ml-auto">Scroll to zoom · Drag to pan · Drag nodes</span>
      </div>
    </div>
  );
}
