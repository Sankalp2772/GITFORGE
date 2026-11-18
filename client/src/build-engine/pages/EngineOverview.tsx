import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Scan,
  Zap,
  CheckCircle2,
  XCircle,
  Database,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../api/client';

export const EngineOverview: React.FC = () => {
  const [repositories, setRepositories] = useState<any[]>([]);
  const [cacheMetrics, setCacheMetrics] = useState<any>({ entryCount: 0, totalSizeBytes: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rRes, cRes, hRes] = await Promise.all([
          api.get('/build-engine/repositories'),
          api.get('/build-engine/cache'),
          api.get('/build-engine/history'),
        ]);
        setRepositories(rRes.data.repositories || []);
        setCacheMetrics(cRes.data.cache || { entryCount: 0, totalSizeBytes: 0 });
        setHistory(hRes.data.builds || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalBuilds = history.length;
  const successfulBuilds = history.filter((h) => h.status === 'SUCCESS').length;
  const failedBuilds = history.filter((h) => h.status === 'FAILED').length;
  const cacheHitCount = history.reduce((acc, curr) => {
    const tasks = Object.values(curr.tasks || {}) as any[];
    return acc + tasks.filter((t) => t.status === 'CACHED').length;
  }, 0);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-dark-600 bg-gradient-to-r from-dark-800 via-dark-800 to-purple-950/30 p-6 md:p-8">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Zap className="h-7 w-7 text-purple-400" />
          <span>Incremental Build & Dependency Engine</span>
        </h1>
        <p className="mt-2 text-xs md:text-sm text-dark-300 max-w-3xl leading-relaxed">
          High-performance incremental compilation platform with content-addressable caching,
          automated DAG dependency analysis, reverse impact propagation, and bounded parallel execution (up to 8 workers).
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
          <div className="flex items-center justify-between text-dark-400">
            <span className="text-xs font-semibold">Connected Repos</span>
            <FolderGit2 className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{repositories.length}</div>
          <div className="mt-1 text-[11px] text-dark-400">Active in GitForge</div>
        </div>

        <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
          <div className="flex items-center justify-between text-dark-400">
            <span className="text-xs font-semibold">Total Builds</span>
            <Zap className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{totalBuilds}</div>
          <div className="mt-1 text-[11px] text-emerald-400 font-medium">
            {successfulBuilds} succeeded ({failedBuilds} failed)
          </div>
        </div>

        <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
          <div className="flex items-center justify-between text-dark-400">
            <span className="text-xs font-semibold">Cache Reuses</span>
            <Database className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{cacheHitCount}</div>
          <div className="mt-1 text-[11px] text-dark-400">
            {(cacheMetrics.totalSizeBytes / 1024).toFixed(1)} KB stored
          </div>
        </div>

        <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
          <div className="flex items-center justify-between text-dark-400">
            <span className="text-xs font-semibold">Worker Ceiling</span>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">8 Workers</div>
          <div className="mt-1 text-[11px] text-purple-300 font-medium">Configurable parallel limits</div>
        </div>
      </div>

      {/* Connected Repositories Grid */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FolderGit2 className="h-5 w-5 text-purple-400" />
            <span>Connected Repositories</span>
          </h2>
          <Link
            to="/build-engine/scanner"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <span>Scan repository</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-dark-700">
          {repositories.map((repo) => (
            <div key={repo.id} className="py-3.5 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-white hover:text-purple-400">
                  {repo.owner.username}/{repo.name}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-dark-400">
                  <span>Branch: <strong className="text-dark-200">{repo.defaultBranch}</strong></span>
                  <span>Scans: <strong className="text-purple-400">{repo.scanCount || 0}</strong></span>
                  {repo.lastScannedCommit && (
                    <span>Last commit: <strong className="font-mono text-dark-200">{repo.lastScannedCommit.substring(0, 7)}</strong></span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/build-engine/environment?repoId=${repo.id}`}
                  className="flex items-center gap-1.5 rounded-lg bg-dark-700 border border-dark-600 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-dark-600 hover:border-purple-500 transition-colors"
                >
                  <span>Project & Env</span>
                </Link>
                <Link
                  to={`/build-engine/scanner?repoId=${repo.id}`}
                  className="flex items-center gap-1.5 rounded-lg bg-dark-700 border border-dark-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-600 hover:border-purple-500 transition-colors"
                >
                  <Scan className="h-3.5 w-3.5" />
                  <span>Scan</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Builds Table */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-purple-400" />
          <span>Recent Incremental Build Jobs</span>
        </h2>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-dark-400 border border-dashed border-dark-700 rounded-lg">
            No builds executed yet. Run a repository scan and generate a build plan to start compiling.
          </div>
        ) : (
          <div className="divide-y divide-dark-700">
            {history.slice(0, 5).map((job) => (
              <div key={job.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span>{job.id}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        job.status === 'SUCCESS'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-950/60 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="text-dark-400 mt-1">
                    Tasks: {job.completedTasks} / {job.totalTasks} &bull; Duration: {job.totalDurationMs || 0}ms
                  </div>
                </div>

                <Link
                  to="/build-engine/execution"
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  View Details &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
