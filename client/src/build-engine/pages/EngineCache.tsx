import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, HardDrive, Package, Clock } from 'lucide-react';
import { api } from '../../api/client';

interface CacheMetrics {
  totalEntries: number;
  totalSizeBytes: number;
  cacheDirectory: string;
  entries?: { key: string; sizeBytes: number; createdAt: string }[];
}

export const EngineCache: React.FC = () => {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/build-engine/cache');
      setMetrics(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch cache metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const handleClearCache = async () => {
    if (!window.confirm('Clear all build cache entries? This will force all files to be recompiled on the next build.')) return;
    setClearing(true);
    setError('');
    setSuccess('');
    try {
      await api.delete('/build-engine/cache');
      setSuccess('Build cache cleared successfully. All entries removed.');
      await fetchMetrics();
    } catch (err: any) {
      // If endpoint doesn't exist yet, show helpful message
      if (err.response?.status === 404) {
        setError('Cache clear endpoint not yet implemented. Manually delete D:/gitforge/data/build-cache contents.');
      } else {
        setError(err.response?.data?.error || 'Failed to clear cache');
      }
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-400" />
            Build Cache
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            Content-addressable cache — keyed by input file SHA-256 hashes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 rounded-md border border-dark-600 bg-dark-700 px-4 py-2 text-sm text-white hover:bg-dark-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleClearCache}
            disabled={clearing || loading}
            className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {clearing ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
          {success}
        </div>
      )}

      {loading && (
        <div className="text-center py-16 text-dark-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-purple-400" />
          <p>Loading cache metrics...</p>
        </div>
      )}

      {metrics && !loading && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-dark-700 bg-dark-800 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-600/20">
                  <Package className="h-5 w-5 text-purple-400" />
                </div>
                <span className="text-sm text-dark-400">Total Entries</span>
              </div>
              <p className="text-3xl font-bold text-white">{metrics.totalEntries}</p>
              <p className="text-xs text-dark-500 mt-1">cached build artifacts</p>
            </div>

            <div className="rounded-lg border border-dark-700 bg-dark-800 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-blue-600/20">
                  <HardDrive className="h-5 w-5 text-blue-400" />
                </div>
                <span className="text-sm text-dark-400">Total Size</span>
              </div>
              <p className="text-3xl font-bold text-white">{formatBytes(metrics.totalSizeBytes)}</p>
              <p className="text-xs text-dark-500 mt-1">disk space used</p>
            </div>

            <div className="rounded-lg border border-dark-700 bg-dark-800 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-green-600/20">
                  <Database className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-sm text-dark-400">Cache Directory</span>
              </div>
              <p className="text-sm font-mono text-green-400 break-all">{metrics.cacheDirectory || 'D:/gitforge/data/build-cache'}</p>
              <p className="text-xs text-dark-500 mt-1">content-addressable store</p>
            </div>
          </div>

          {/* How Cache Works */}
          <div className="rounded-lg border border-dark-700 bg-dark-800 p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-400" />
              How the Build Cache Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-dark-300">
              <div className="rounded-md bg-dark-900 p-3">
                <p className="font-semibold text-purple-400 mb-1">1. Cache Key Generation</p>
                <p>Each build target's cache key is derived from: command + args + SHA-256 of all input files. If nothing changes, the key is identical.</p>
              </div>
              <div className="rounded-md bg-dark-900 p-3">
                <p className="font-semibold text-purple-400 mb-1">2. Cache Hit</p>
                <p>Before executing a target, the scheduler checks for a cached artifact. If found, it copies the output directly — zero compilation time.</p>
              </div>
              <div className="rounded-md bg-dark-900 p-3">
                <p className="font-semibold text-purple-400 mb-1">3. Cache Miss</p>
                <p>If no cache entry exists, the target is compiled. The output artifact is then stored in the cache for future builds.</p>
              </div>
            </div>
          </div>

          {/* Cache Entries Table */}
          {metrics.entries && metrics.entries.length > 0 ? (
            <div className="rounded-lg border border-dark-700 bg-dark-800">
              <div className="px-4 py-3 border-b border-dark-700">
                <h2 className="text-sm font-semibold text-white">Cache Entries</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-dark-700">
                    <tr className="text-left text-xs text-dark-400">
                      <th className="px-4 py-2 font-medium">Cache Key</th>
                      <th className="px-4 py-2 font-medium">Size</th>
                      <th className="px-4 py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {metrics.entries.map(entry => (
                      <tr key={entry.key} className="hover:bg-dark-700/30">
                        <td className="px-4 py-2.5 font-mono text-xs text-dark-300 max-w-xs truncate">{entry.key}</td>
                        <td className="px-4 py-2.5 text-xs text-dark-300">{formatBytes(entry.sizeBytes)}</td>
                        <td className="px-4 py-2.5 text-xs text-dark-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dark-700 bg-dark-800 p-8 text-center text-dark-400">
              <Database className="h-10 w-10 mx-auto mb-3 text-dark-600" />
              <p className="text-sm">Cache is empty.</p>
              <p className="text-xs mt-1 text-dark-500">Run a build to populate the cache.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
