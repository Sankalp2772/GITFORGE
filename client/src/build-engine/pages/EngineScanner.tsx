import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Scan,
  FolderGit2,
  FileCode,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../api/client';
import { useBuildEngine } from '../context/BuildEngineContext';

export const EngineScanner: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    repositories,
    selectedRepo,
    selectedBranch,
    activeScanId,
    setSelectedRepoId,
    setSelectedBranch,
    setActiveScanId,
  } = useBuildEngine();

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  // Auto-load latest scan if activeScanId exists or when selectedRepo changes
  useEffect(() => {
    if (!selectedRepo) return;

    const loadLatest = async () => {
      try {
        const res = await api.get(`/build-engine/repositories/${selectedRepo.id}/latest-scan?branch=${selectedBranch}`);
        if (res.data.scanId) {
          setActiveScanId(res.data.scanId);
          setScanResult({
            scanId: res.data.scanId,
            commitSha: res.data.commitSha,
            fileCount: res.data.graph?.nodes?.length || 0,
            isolatedFilesCount: res.data.graph?.isolatedFiles?.length || 0,
            unresolvedCount: res.data.graph?.unresolvedDependencies?.length || 0,
          });
        }
      } catch {
        // No latest scan yet
      }
    };

    loadLatest();
  }, [selectedRepo?.id, selectedBranch]);

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedRepo) return;

    setError('');
    setScanning(true);

    try {
      const res = await api.post(`/build-engine/repositories/${selectedRepo.id}/scan`, {
        branch: selectedBranch,
      });
      setScanResult(res.data.scan);
      if (res.data.scan?.scanId) {
        setActiveScanId(res.data.scan.scanId);
      }
    } catch (err: any) {
      setError(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-dark-600 pb-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Scan className="h-6 w-6 text-purple-400" />
          <span>Repository Snapshot Scanner</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">
          Perform a manual, immutable snapshot scan of tracked files, detect languages, calculate SHA-256 baselines, and resolve source dependency relationships.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-500/50 p-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Selector & Scan Trigger */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
        <form onSubmit={handleScan} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                Target Repository
              </label>
              <select
                value={selectedRepo?.id || ''}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
              >
                {repositories.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.owner.username}/{r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                Branch / Git Ref
              </label>
              <input
                type="text"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3.5 py-2 text-xs text-white focus:border-purple-500 focus:outline-none font-mono"
                placeholder="main"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={scanning || !selectedRepo}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-purple-500 disabled:opacity-50 transition-all"
            >
              <Scan className="h-4 w-4" />
              <span>{scanning ? 'Scanning Snapshot...' : 'Scan Repository'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Scan Results Card */}
      {scanResult && (
        <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>Snapshot Scan Active</span>
            </div>
            <span className="text-xs font-mono text-purple-400 font-bold bg-purple-950/60 px-2.5 py-1 rounded border border-purple-500/30">
              Scan ID: {scanResult.scanId}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="rounded-lg bg-dark-800 p-3 border border-dark-600">
              <div className="text-[11px] text-dark-400">Commit SHA</div>
              <div className="text-sm font-bold font-mono text-purple-400 mt-0.5">
                {String(scanResult.commitSha || '').substring(0, 7)}
              </div>
            </div>
            <div className="rounded-lg bg-dark-800 p-3 border border-dark-600">
              <div className="text-[11px] text-dark-400">Tracked Files</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {scanResult.fileCount}
              </div>
            </div>
            <div className="rounded-lg bg-dark-800 p-3 border border-dark-600">
              <div className="text-[11px] text-dark-400">Isolated Files</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">
                {scanResult.isolatedFilesCount}
              </div>
            </div>
            <div className="rounded-lg bg-dark-800 p-3 border border-dark-600">
              <div className="text-[11px] text-dark-400">Unresolved Deps</div>
              <div className="text-sm font-bold text-dark-300 mt-0.5">
                {scanResult.unresolvedCount}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-purple-500/20">
            <button
              onClick={() => navigate(`/build-engine/dependency-graph?scanId=${scanResult.scanId}`)}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500"
            >
              <span>View Dependency Graph</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
