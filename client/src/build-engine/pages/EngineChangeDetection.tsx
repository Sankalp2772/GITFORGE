import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Diff, AlertCircle, ArrowRight, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import { api } from '../../api/client';
import { useBuildEngine } from '../context/BuildEngineContext';

export const EngineChangeDetection: React.FC = () => {
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

  const [baseScanId, setBaseScanId] = useState(activeScanId || '');
  const [targetCommit, setTargetCommit] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [changeData, setChangeData] = useState<any | null>(null);
  const [error, setError] = useState('');

  // Automatically fetch latest scanId if none active
  useEffect(() => {
    if (!selectedRepo) return;

    api.get(`/build-engine/repositories/${selectedRepo.id}/latest-scan?branch=${selectedBranch}`)
      .then((res) => {
        if (res.data.scanId) {
          setBaseScanId(res.data.scanId);
          setActiveScanId(res.data.scanId);
        }
      })
      .catch(() => {});
  }, [selectedRepo?.id, selectedBranch]);

  const handleDetect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedRepo || !baseScanId) return;

    setError('');
    setDetecting(true);
    setChangeData(null);

    try {
      const res = await api.post(`/build-engine/repositories/${selectedRepo.id}/detect-changes`, {
        baseScanId,
        targetCommitSha: targetCommit || undefined,
        branch: selectedBranch,
      });
      setChangeData(res.data);

      // Store in session for Affected Files view
      sessionStorage.setItem(`changeDetection_${res.data.changeId}`, JSON.stringify({
        changedFiles: (res.data.changes || []).filter((c: any) => c.status !== 'UNCHANGED').map((c: any) => c.path),
        directlyAffected: res.data.affected?.directlyAffectedFiles || [],
        transitivelyAffected: res.data.affected?.transitivelyAffectedFiles || [],
        unaffectedFiles: res.data.affected?.unchangedFiles || [],
        dependencyChains: res.data.affected?.dependencyChains || [],
      }));
      localStorage.setItem('gitforge_latest_change_id', res.data.changeId);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Change detection failed');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-dark-600 pb-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Diff className="h-6 w-6 text-purple-400" />
          <span>Manual Change Detection</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">
          Compare a previously scanned SHA-256 baseline against a new Git commit to identify added, modified, deleted, and unchanged files.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-500/50 p-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Detection Form */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
        <form onSubmit={handleDetect} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Base Scan ID <span className="text-purple-400 font-normal">(auto-resolved)</span>
              </label>
              <input
                type="text"
                value={baseScanId}
                onChange={(e) => setBaseScanId(e.target.value.trim())}
                required
                placeholder="Resolving latest scan..."
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3.5 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-300 mb-1.5">
                Target Commit / Branch <span className="text-dark-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={targetCommit}
                onChange={(e) => setTargetCommit(e.target.value)}
                placeholder={`Default (${selectedBranch})`}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3.5 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={detecting || !selectedRepo || !baseScanId}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-purple-500 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${detecting ? 'animate-spin' : ''}`} />
              <span>{detecting ? 'Comparing Hashes...' : 'Detect Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Changes Summary & File List */}
      {changeData && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-xl border border-dark-600 bg-dark-800 p-4">
              <div className="text-[11px] text-dark-400 uppercase font-semibold">Modified</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{changeData.summary.modified}</div>
            </div>
            <div className="rounded-xl border border-dark-600 bg-dark-800 p-4">
              <div className="text-[11px] text-dark-400 uppercase font-semibold">Added</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{changeData.summary.added}</div>
            </div>
            <div className="rounded-xl border border-dark-600 bg-dark-800 p-4">
              <div className="text-[11px] text-dark-400 uppercase font-semibold">Deleted</div>
              <div className="text-xl font-bold text-red-400 mt-1">{changeData.summary.deleted}</div>
            </div>
            <div className="rounded-xl border border-dark-600 bg-dark-800 p-4">
              <div className="text-[11px] text-dark-400 uppercase font-semibold">Unchanged</div>
              <div className="text-xl font-bold text-dark-300 mt-1">{changeData.summary.unchanged}</div>
            </div>
          </div>

          <div className="rounded-xl border border-dark-600 bg-dark-800 overflow-hidden divide-y divide-dark-700">
            <div className="p-3.5 bg-dark-850 flex items-center justify-between text-xs">
              <span className="font-semibold text-white">File Status List</span>
              <button
                onClick={() => navigate(`/build-engine/affected-files?changeId=${changeData.changeId}&repoId=${selectedRepo?.id}`)}
                className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-semibold"
              >
                <span>View Affected Downstream Files</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {changeData.changes.map((c: any) => (
              <div key={c.path} className="flex items-center justify-between p-3.5 text-xs">
                <span className="font-mono text-white">{c.path}</span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    c.status === 'MODIFIED'
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                      : c.status === 'ADDED'
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                      : c.status === 'DELETED'
                      ? 'bg-red-950/60 text-red-300 border border-red-500/40'
                      : 'bg-dark-700 text-dark-400'
                  }`}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
