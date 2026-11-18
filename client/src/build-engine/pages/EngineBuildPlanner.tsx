import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  AlertCircle,
  Play,
  Layers,
  CheckCircle2,
  Cpu,
  ArrowRight,
  FolderGit2,
} from 'lucide-react';
import { api } from '../../api/client';
import { useBuildEngine } from '../context/BuildEngineContext';

export const EngineBuildPlanner: React.FC = () => {
  const navigate = useNavigate();
  const { repositories, selectedRepo, selectedBranch, detectedProject, setSelectedRepoId, setSelectedBranch } = useBuildEngine();
  const [planning, setPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  // Clear stale plan when repo changes
  useEffect(() => {
    setPlanResult(null);
    setError('');
  }, [selectedRepo?.id]);

  const handleGeneratePlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedRepo) return;

    setError('');
    setPlanning(true);
    setPlanResult(null);

    try {
      const storedInputs = sessionStorage.getItem('gitforge_build_plan_inputs');
      let planPayload: any = { commitSha: selectedBranch || undefined };
      if (storedInputs) {
        try {
          const parsed = JSON.parse(storedInputs);
          planPayload.changedFiles = parsed.changedFiles || [];
          planPayload.affectedFiles = parsed.affectedFiles || [];
        } catch {}
      }

      const res = await api.post(`/build-engine/repositories/${selectedRepo.id}/plan`, planPayload);
      setPlanResult(res.data.plan);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Build plan generation failed');
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-dark-600 pb-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-purple-400" />
          <span>Incremental Build Planner & DAG</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">
          Validate <code className="text-purple-400">build.manifest.json</code>, perform cycle detection, topological sorting (Kahn's algorithm), and identify independent parallel batches.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-500/50 p-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Target Repo Form */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-dark-300">Target Repository & Branch</div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 shadow-sm">
                <FolderGit2 className="h-4 w-4 text-purple-400" />
                <select
                  value={selectedRepo?.id || ''}
                  onChange={e => setSelectedRepoId(e.target.value)}
                  className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer"
                >
                  {repositories.map(r => (
                    <option key={r.id} value={r.id} className="bg-dark-900 text-white">
                      {r.owner.username}/{r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-dark-900 border border-dark-600 rounded-lg px-2.5 py-1.5 text-xs">
                <span className="text-dark-400 font-medium">Branch:</span>
                <input
                  type="text"
                  value={selectedBranch}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className="bg-transparent text-purple-300 font-mono w-16 focus:outline-none"
                  placeholder="main"
                />
              </div>

              {detectedProject && (
                <span className="text-xs font-semibold text-purple-300 bg-purple-950/40 px-2.5 py-1.5 rounded-lg border border-purple-500/30">
                  {detectedProject.name} ({detectedProject.kind.toUpperCase()})
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => handleGeneratePlan()}
            disabled={planning || !selectedRepo}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-purple-500 disabled:opacity-50 transition-colors shrink-0"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{planning ? 'Analyzing DAG & Targets...' : 'Generate Build Plan'}</span>
          </button>
        </div>
      </div>

      {/* Plan Details & Execution Trigger */}
      {planResult && (
        <div className="space-y-6">
          {planResult.hasCycle ? (
            <div className="rounded-xl border border-red-500/50 bg-red-950/30 p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-base font-bold text-red-300">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <span>Cyclic Dependency Detected! (Build Blocked)</span>
              </div>
              <p className="text-xs text-red-200 leading-relaxed">
                The dependency graph contains a cycle that prevents topological ordering. The build cannot proceed until the circular dependency is broken.
              </p>
              {planResult.cycleNodes && planResult.cycleNodes.length > 0 && (
                <div className="rounded-lg bg-dark-900 border border-red-900/60 p-3 font-mono text-xs text-red-300">
                  <span className="font-sans font-semibold text-red-400 block mb-1">Involved Cycle Targets / Nodes:</span>
                  <div className="flex flex-wrap gap-2">
                    {planResult.cycleNodes.map((n: string) => (
                      <span key={n} className="rounded bg-red-950/80 border border-red-500/50 px-2 py-0.5 text-red-300">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-base font-bold text-white">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>Valid Build Plan Generated (No Cycles Detected)</span>
                </div>
                <div className="mt-1 text-xs text-dark-300">
                  Plan ID: <span className="font-mono text-purple-400">{planResult.id}</span> &bull; Affected Targets: {planResult.affectedTargetCount} of {planResult.totalTargetCount}
                </div>
              </div>

              <button
                onClick={() => navigate(`/build-engine/execution?planId=${planResult.id}`)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 transition-all self-start md:self-auto"
              >
                <Play className="h-4 w-4" />
                <span>Proceed to Build</span>
              </button>
            </div>
          )}

          {/* Action List */}
          <div className="rounded-xl border border-dark-600 bg-dark-800 overflow-hidden divide-y divide-dark-700">
            <div className="px-5 py-3 text-xs font-semibold text-white bg-dark-800">
              Topological Execution Order ({planResult.executionOrder.length} targets)
            </div>
            {planResult.actions.map((act: any, idx: number) => (
              <div key={act.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="font-mono text-purple-400">#{idx + 1}</span>
                    <span>{act.name}</span>
                    <span className="rounded bg-dark-700 px-2 py-0.5 text-[10px] text-dark-300">
                      {act.type}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-dark-400">
                    {act.command} {act.args.join(' ')}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      act.isAffected
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                        : 'bg-dark-700 text-dark-400'
                    }`}
                  >
                    {act.isAffected ? 'AFFECTED (Recompile)' : 'UNAFFECTED (Skip)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
