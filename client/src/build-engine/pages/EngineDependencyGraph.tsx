import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, Search, Filter, AlertCircle, FileCode, Info, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { useBuildEngine } from '../context/BuildEngineContext';

export const EngineDependencyGraph: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlScanId = searchParams.get('scanId');
  const { selectedRepo, selectedBranch, activeScanId, setActiveScanId } = useBuildEngine();

  const [effectiveScanId, setEffectiveScanId] = useState<string>(urlScanId || activeScanId || '');
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Resolve scanId automatically: if none provided in URL, fetch latest scan for the selected repo
  useEffect(() => {
    if (urlScanId) {
      setEffectiveScanId(urlScanId);
      setActiveScanId(urlScanId);
      return;
    }

    if (!selectedRepo) return;

    const autoFetchScan = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/build-engine/repositories/${selectedRepo.id}/latest-scan?branch=${selectedBranch}`);
        if (res.data.scanId) {
          setEffectiveScanId(res.data.scanId);
          setActiveScanId(res.data.scanId);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to resolve latest scan for repository');
      } finally {
        setLoading(false);
      }
    };

    autoFetchScan();
  }, [urlScanId, selectedRepo?.id, selectedBranch]);

  // 2. Load graph whenever effectiveScanId is resolved
  useEffect(() => {
    if (!effectiveScanId) return;

    const fetchGraph = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/build-engine/scans/${effectiveScanId}`);
        const rawGraph = res.data.graph;

        // Transform into React Flow nodes
        const rfNodes = (rawGraph.nodes || []).map((n: any, idx: number) => {
          const col = idx % 4;
          const row = Math.floor(idx / 4);
          return {
            id: n.id,
            data: { label: n.id, ...n },
            position: { x: col * 260 + 50, y: row * 140 + 50 },
            style: {
              background: n.isEntryPoint ? '#7c3aed' : '#161b22',
              color: '#ffffff',
              border: '1px solid #30363d',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px',
              width: 200,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            },
          };
        });

        // Transform into React Flow edges (A -> B: A depends on B)
        const rfEdges = (rawGraph.edges || []).map((e: any, idx: number) => ({
          id: `edge_${idx}`,
          source: e.source,
          target: e.target,
          label: e.type,
          animated: true,
          style: { stroke: '#8b5cf6', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#8b5cf6',
          },
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch graph data');
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [effectiveScanId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-600 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="h-6 w-6 text-purple-400" />
            <span>Interactive Source-File Dependency Graph</span>
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-dark-400">
            <span>Arrow direction: <span className="font-mono text-purple-400">A &rarr; B</span> means <strong>A depends on B</strong>.</span>
            {effectiveScanId && (
              <span className="font-mono text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/30">
                Active Scan: {effectiveScanId}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-dark-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files in graph..."
            className="w-full rounded-lg border border-dark-600 bg-dark-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder-dark-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-500/50 p-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-12 text-dark-400 gap-2 border border-dark-700 rounded-xl bg-dark-800/40">
          <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
          <span className="text-xs">Resolving repository scan and building visual DAG...</span>
        </div>
      )}

      {/* Graph Canvas */}
      {!loading && (
        <div className="h-[600px] w-full rounded-xl border border-dark-600 bg-dark-900 relative overflow-hidden">
          <ReactFlow
            nodes={nodes.filter((n) => n.id.toLowerCase().includes(searchTerm.toLowerCase()))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_evt, node) => setSelectedNode(node.data)}
            fitView
          >
            <Background color="#30363d" gap={16} />
            <Controls />
            <MiniMap
              nodeColor={(n: any) => (n.data?.isEntryPoint ? '#7c3aed' : '#21262d')}
              maskColor="rgba(13, 17, 23, 0.7)"
            />
          </ReactFlow>

          {/* Selected Node Details Drawer */}
          {selectedNode && (
            <div className="absolute right-4 top-4 w-80 rounded-xl border border-dark-600 bg-dark-800 p-4 shadow-2xl z-10 space-y-3">
              <div className="flex items-center justify-between border-b border-dark-700 pb-2">
                <span className="text-xs font-bold text-white truncate max-w-[200px]">
                  {selectedNode.path}
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-dark-400 hover:text-white text-xs"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-dark-300">
                <div>Language: <strong className="text-white capitalize">{selectedNode.language}</strong></div>
                <div>Size: <strong className="text-white">{selectedNode.size} bytes</strong></div>
                <div>Entry Point: <strong className={selectedNode.isEntryPoint ? 'text-emerald-400' : 'text-dark-400'}>{selectedNode.isEntryPoint ? 'Yes' : 'No'}</strong></div>
                <div>
                  SHA-256:
                  <div className="font-mono text-[10px] text-purple-400 truncate mt-0.5">
                    {selectedNode.sha256}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
