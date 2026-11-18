import React, { useState, useEffect } from 'react';
import {
  History, CheckCircle, XCircle, Clock, RefreshCw,
  ChevronDown, ChevronRight, Cpu, Package, AlertTriangle
} from 'lucide-react';
import { api } from '../../api/client';

type BuildStatus = 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'RUNNING';

interface BuildTask {
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'CACHED' | 'SKIPPED';
  durationMs?: number;
  cached?: boolean;
}

interface BuildRecord {
  id: string;
  repositoryId: string;
  repositoryName?: string;
  status: BuildStatus;
  totalTasks: number;
  completedTasks: number;
  cachedTasks: number;
  failedTasks: number;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  tasks?: BuildTask[];
  error?: string;
}

export const EngineBuildHistory: React.FC = () => {
  const [history, setHistory] = useState<BuildRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/build-engine/history');
      setHistory(res.data.history || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch build history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const statusBadge = (status: BuildStatus) => {
    const cfg = {
      SUCCESS: { color: 'text-green-400 bg-green-400/10 border-green-500/30', Icon: CheckCircle },
      FAILED:  { color: 'text-red-400 bg-red-400/10 border-red-500/30',       Icon: XCircle },
      PARTIAL: { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30', Icon: AlertTriangle },
      RUNNING: { color: 'text-blue-400 bg-blue-400/10 border-blue-500/30',    Icon: RefreshCw },
    };
    const c = cfg[status] || cfg.FAILED;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${c.color}`}>
        <c.Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  const taskStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="h-3.5 w-3.5 text-green-400" />;
      case 'FAILED':  return <XCircle className="h-3.5 w-3.5 text-red-400" />;
      case 'CACHED':  return <Package className="h-3.5 w-3.5 text-blue-400" />;
      default:        return <Clock className="h-3.5 w-3.5 text-dark-400" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-purple-400" />
            Build History
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            All previous build executions — click to expand task details
          </p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-2 rounded-md border border-dark-600 bg-dark-700 px-4 py-2 text-sm text-white hover:bg-dark-600 disabled:opacity-50"
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
          <p>Loading build history...</p>
        </div>
      )}

      {!loading && history.length === 0 && !error && (
        <div className="rounded-lg border border-dark-700 bg-dark-800 p-12 text-center">
          <History className="h-12 w-12 mx-auto mb-3 text-dark-600" />
          <p className="text-dark-400 text-sm">No build history yet.</p>
          <p className="text-dark-500 text-xs mt-1">Execute a build plan to see records here.</p>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="rounded-lg border border-dark-700 bg-dark-800 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-2 border-b border-dark-700 text-xs font-medium text-dark-400 uppercase tracking-wide">
            <div className="col-span-1"></div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Build ID</div>
            <div className="col-span-2">Tasks</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2">Started</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-dark-700">
            {history.map(build => (
              <div key={build.id}>
                <button
                  onClick={() => toggle(build.id)}
                  className="grid grid-cols-12 w-full px-4 py-3 hover:bg-dark-700/40 text-left items-center"
                >
                  <div className="col-span-1">
                    {expanded.has(build.id)
                      ? <ChevronDown className="h-4 w-4 text-dark-400" />
                      : <ChevronRight className="h-4 w-4 text-dark-400" />
                    }
                  </div>
                  <div className="col-span-2">{statusBadge(build.status)}</div>
                  <div className="col-span-3">
                    <p className="text-xs font-mono text-white truncate">{build.id}</p>
                    {build.repositoryName && (
                      <p className="text-xs text-dark-400 mt-0.5">{build.repositoryName}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-400">{build.completedTasks}✓</span>
                      {build.cachedTasks > 0 && <span className="text-blue-400">{build.cachedTasks} cached</span>}
                      {build.failedTasks > 0 && <span className="text-red-400">{build.failedTasks}✗</span>}
                      <span className="text-dark-400">/ {build.totalTasks}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-dark-300 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(build.durationMs)}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-dark-400">
                    {new Date(build.startTime).toLocaleString()}
                  </div>
                </button>

                {/* Expanded task details */}
                {expanded.has(build.id) && (
                  <div className="px-6 pb-4 bg-dark-900/50">
                    {build.error && (
                      <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                        {build.error}
                      </div>
                    )}
                    {build.tasks && build.tasks.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs text-dark-400 mb-2 font-medium uppercase tracking-wide">Build Tasks</p>
                        {build.tasks.map((task, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-md bg-dark-800 px-3 py-2">
                            {taskStatusIcon(task.status)}
                            <span className="text-sm font-mono text-white">{task.name}</span>
                            {task.cached && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">CACHED</span>
                            )}
                            {task.durationMs !== undefined && (
                              <span className="ml-auto text-xs text-dark-400">{formatDuration(task.durationMs)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-dark-500 py-2">No task details available.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-dark-700 bg-dark-800 p-4 text-center">
            <p className="text-2xl font-bold text-white">{history.length}</p>
            <p className="text-xs text-dark-400 mt-1">Total Builds</p>
          </div>
          <div className="rounded-lg border border-dark-700 bg-dark-800 p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{history.filter(b => b.status === 'SUCCESS').length}</p>
            <p className="text-xs text-dark-400 mt-1">Successful</p>
          </div>
          <div className="rounded-lg border border-dark-700 bg-dark-800 p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{history.filter(b => b.status === 'FAILED').length}</p>
            <p className="text-xs text-dark-400 mt-1">Failed</p>
          </div>
          <div className="rounded-lg border border-dark-700 bg-dark-800 p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{history.reduce((s, b) => s + (b.cachedTasks || 0), 0)}</p>
            <p className="text-xs text-dark-400 mt-1">Cache Hits (total)</p>
          </div>
        </div>
      )}
    </div>
  );
};
