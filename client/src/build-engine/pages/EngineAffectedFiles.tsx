import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ChevronDown, ChevronRight, FileCode,
  GitMerge, ArrowRight, Layers, RefreshCw, Play
} from 'lucide-react';
import { api } from '../../api/client';
import { useBuildEngine } from '../context/BuildEngineContext';

interface AffectedFilesResult {
  changeId: string;
  repositoryId: string;
  changedFiles: string[];
  directlyAffected: string[];
  transitivelyAffected: string[];
  unaffected: string[];
  dependencyChains: { file: string; chain: string[] }[];
}

export const EngineAffectedFiles: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedRepo } = useBuildEngine();
  const changeId = searchParams.get('changeId') || localStorage.getItem('gitforge_latest_change_id');
  const repoId = searchParams.get('repoId') || selectedRepo?.id;

  const [result, setResult] = useState<AffectedFilesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (changeId && repoId) {
      runAffectedAnalysis();
    }
  }, [changeId, repoId]);

  const runAffectedAnalysis = async () => {
    if (!repoId || !changeId) return;
    setLoading(true);
    setError('');
    try {
      // Get stored change detection results from sessionStorage
      const stored = sessionStorage.getItem(`changeDetection_${changeId}`);
      if (stored) {
        const data = JSON.parse(stored);
        setResult({
          changeId,
          repositoryId: repoId,
          changedFiles: data.changedFiles || [],
          directlyAffected: data.directlyAffected || [],
          transitivelyAffected: data.transitivelyAffected || [],
          unaffected: data.unaffectedFiles || [],
          dependencyChains: data.dependencyChains || [],
        });
      } else {
        setError('No change detection data found. Run Change Detection first.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load affected files analysis');
    } finally {
      setLoading(false);
    }
  };

  const toggleChain = (file: string) => {
    setExpandedChains(prev => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  const statusColor = (type: string) => {
    switch (type) {
      case 'changed': return 'text-orange-400 bg-orange-400/10 border-orange-500/30';
      case 'direct': return 'text-red-400 bg-red-400/10 border-red-500/30';
      case 'transitive': return 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30';
      case 'unaffected': return 'text-green-400 bg-green-400/10 border-green-500/30';
      default: return 'text-dark-300 bg-dark-700 border-dark-600';
    }
  };

  if (!changeId || !repoId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-dark-400">
        <AlertTriangle className="h-10 w-10 text-yellow-500" />
        <p className="text-sm">No change detection data selected.</p>
        <button
          onClick={() => navigate('/build-engine/change-detection')}
          className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-500"
        >
          Go to Change Detection
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-400" />
            Affected Files Analysis
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            BFS reverse dependency traversal — files impacted by the detected changes
          </p>
        </div>
        <button
          onClick={runAffectedAnalysis}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-dark-700 border border-dark-600 px-4 py-2 text-sm text-white hover:bg-dark-600 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-dark-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-purple-400" />
          <p>Analyzing dependency impact...</p>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-orange-500/30 bg-orange-400/5 p-4">
              <p className="text-xs text-dark-400">Changed Files</p>
              <p className="text-2xl font-bold text-orange-400 mt-1">{result.changedFiles.length}</p>
              <p className="text-xs text-dark-500 mt-1">git diff detected</p>
            </div>
            <div className="rounded-lg border border-red-500/30 bg-red-400/5 p-4">
              <p className="text-xs text-dark-400">Directly Affected</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{result.directlyAffected.length}</p>
              <p className="text-xs text-dark-500 mt-1">1-hop dependencies</p>
            </div>
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-400/5 p-4">
              <p className="text-xs text-dark-400">Transitively Affected</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">{result.transitivelyAffected.length}</p>
              <p className="text-xs text-dark-500 mt-1">multi-hop dependencies</p>
            </div>
            <div className="rounded-lg border border-green-500/30 bg-green-400/5 p-4">
              <p className="text-xs text-dark-400">Unaffected</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{result.unaffected.length}</p>
              <p className="text-xs text-dark-500 mt-1">safe to cache</p>
            </div>
          </div>

          {/* Changed Files */}
          {result.changedFiles.length > 0 && (
            <div className="rounded-lg border border-dark-700 bg-dark-800">
              <div className="px-4 py-3 border-b border-dark-700">
                <h2 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                  <GitMerge className="h-4 w-4" />
                  Changed Files (SHA-256 diff detected)
                </h2>
              </div>
              <div className="divide-y divide-dark-700">
                {result.changedFiles.map(file => (
                  <div key={file} className="flex items-center gap-3 px-4 py-2.5">
                    <FileCode className="h-4 w-4 text-orange-400 shrink-0" />
                    <span className="text-sm font-mono text-white">{file}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor('changed')}`}>
                      CHANGED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Directly Affected */}
          {result.directlyAffected.length > 0 && (
            <div className="rounded-lg border border-dark-700 bg-dark-800">
              <div className="px-4 py-3 border-b border-dark-700">
                <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Directly Affected (imports changed files)
                </h2>
              </div>
              <div className="divide-y divide-dark-700">
                {result.directlyAffected.map(file => (
                  <div key={file} className="flex items-center gap-3 px-4 py-2.5">
                    <FileCode className="h-4 w-4 text-red-400 shrink-0" />
                    <span className="text-sm font-mono text-white">{file}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor('direct')}`}>
                      DIRECT
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transitively Affected */}
          {result.transitivelyAffected.length > 0 && (
            <div className="rounded-lg border border-dark-700 bg-dark-800">
              <div className="px-4 py-3 border-b border-dark-700">
                <h2 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Transitively Affected (multi-hop)
                </h2>
              </div>
              <div className="divide-y divide-dark-700">
                {result.transitivelyAffected.map(file => (
                  <div key={file} className="flex items-center gap-3 px-4 py-2.5">
                    <FileCode className="h-4 w-4 text-yellow-400 shrink-0" />
                    <span className="text-sm font-mono text-white">{file}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor('transitive')}`}>
                      TRANSITIVE
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependency Chains */}
          {result.dependencyChains && result.dependencyChains.length > 0 && (
            <div className="rounded-lg border border-dark-700 bg-dark-800">
              <div className="px-4 py-3 border-b border-dark-700">
                <h2 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Dependency Chains
                </h2>
              </div>
              <div className="divide-y divide-dark-700">
                {result.dependencyChains.map(({ file, chain }) => (
                  <div key={file}>
                    <button
                      onClick={() => toggleChain(file)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-dark-700/50 text-left"
                    >
                      {expandedChains.has(file)
                        ? <ChevronDown className="h-4 w-4 text-dark-400 shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-dark-400 shrink-0" />
                      }
                      <FileCode className="h-4 w-4 text-purple-400 shrink-0" />
                      <span className="text-sm font-mono text-white">{file}</span>
                      <span className="ml-auto text-xs text-dark-400">{chain.length} hops</span>
                    </button>
                    {expandedChains.has(file) && (
                      <div className="px-10 py-3 bg-dark-900/50">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                          {chain.map((step, i) => (
                            <React.Fragment key={i}>
                              <span className={`px-2 py-1 rounded ${i === 0 ? 'text-orange-400 bg-orange-400/10' : i === chain.length - 1 ? 'text-purple-400 bg-purple-400/10' : 'text-dark-200 bg-dark-700'}`}>
                                {step}
                              </span>
                              {i < chain.length - 1 && (
                                <ArrowRight className="h-3 w-3 text-dark-500" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                        <p className="text-xs text-dark-500 mt-2">
                          {chain[0]} changed → {chain[chain.length - 1]} must rebuild
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unaffected Files (collapsed) */}
          {result.unaffected.length > 0 && (
            <div className="rounded-lg border border-dark-700 bg-dark-800">
              <button
                onClick={() => toggleChain('__unaffected__')}
                className="flex w-full items-center gap-3 px-4 py-3 hover:bg-dark-700/30"
              >
                {expandedChains.has('__unaffected__')
                  ? <ChevronDown className="h-4 w-4 text-dark-400" />
                  : <ChevronRight className="h-4 w-4 text-dark-400" />
                }
                <span className="text-sm font-semibold text-green-400">
                  Unaffected Files ({result.unaffected.length}) — safe to skip rebuilding
                </span>
              </button>
              {expandedChains.has('__unaffected__') && (
                <div className="divide-y divide-dark-700 border-t border-dark-700">
                  {result.unaffected.map(file => (
                    <div key={file} className="flex items-center gap-3 px-4 py-2">
                      <FileCode className="h-4 w-4 text-green-500/60 shrink-0" />
                      <span className="text-sm font-mono text-dark-400">{file}</span>
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full border border-green-500/20 text-green-600 bg-green-400/5">
                        CACHED
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action to proceed with Incremental Build */}
          <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Ready to compile affected files</span>
              </div>
              <p className="text-xs text-dark-300 mt-1">
                The incremental build planner will compile only the changed & affected source units, reusing cache for unaffected components.
              </p>
            </div>
            <button
              onClick={() => {
                sessionStorage.setItem('gitforge_build_plan_inputs', JSON.stringify({
                  changedFiles: result.changedFiles,
                  affectedFiles: [...result.directlyAffected, ...result.transitivelyAffected],
                }));
                navigate('/build-engine/planner');
              }}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-purple-500 transition-all self-start md:self-auto"
            >
              <Play className="h-4 w-4" />
              <span>Proceed to Build Planner</span>
            </button>
          </div>
        </>
      )}

      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center h-48 text-dark-400 gap-3">
          <Layers className="h-10 w-10 text-dark-600" />
          <p className="text-sm">Loading analysis data...</p>
        </div>
      )}
    </div>
  );
};
