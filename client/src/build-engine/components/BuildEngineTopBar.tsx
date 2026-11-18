import React from 'react';
import {
  FolderGit2,
  GitBranch,
  GitCommit,
  Sparkles,
  Cpu,
  RefreshCw,
  Layers,
  Zap,
} from 'lucide-react';
import { useBuildEngine } from '../context/BuildEngineContext';

export const BuildEngineTopBar: React.FC = () => {
  const {
    repositories,
    selectedRepo,
    selectedBranch,
    selectedCommit,
    detectedProject,
    activeJobId,
    loadingDetection,
    setSelectedRepoId,
    setSelectedBranch,
    refreshDetection,
  } = useBuildEngine();

  return (
    <div className="border-b border-dark-700 bg-dark-850 px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Repo + Branch + Commit Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Repository Selector */}
          <div className="flex items-center gap-1.5 bg-dark-900 border border-dark-600 rounded-lg px-2.5 py-1.5 shadow-sm">
            <FolderGit2 className="h-4 w-4 text-purple-400" />
            <span className="text-dark-400 font-medium">Repository:</span>
            <select
              value={selectedRepo?.id || ''}
              onChange={e => setSelectedRepoId(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
            >
              {repositories.map(r => (
                <option key={r.id} value={r.id} className="bg-dark-900 text-white">
                  {r.owner.username}/{r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Selector */}
          <div className="flex items-center gap-1.5 bg-dark-900 border border-dark-600 rounded-lg px-2.5 py-1.5 shadow-sm">
            <GitBranch className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-dark-400 font-medium">Branch:</span>
            <input
              type="text"
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="bg-transparent text-white font-mono w-20 focus:outline-none"
              placeholder="main"
            />
          </div>

          {/* Commit Indicator */}
          <div className="flex items-center gap-1.5 bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-dark-300 font-mono">
            <GitCommit className="h-3.5 w-3.5 text-dark-400" />
            <span>{selectedCommit.substring(0, 7)}</span>
          </div>
        </div>

        {/* Right: Detected Stack & Active Job ID */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Detected Project Badge */}
          {loadingDetection ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/30 border border-purple-500/20 text-purple-300">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Detecting stack...</span>
            </div>
          ) : detectedProject ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/40 border border-purple-500/30 text-purple-300 font-medium">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span className="uppercase font-bold tracking-wider text-[11px]">{detectedProject.kind}</span>
                <span className="text-dark-400">&bull;</span>
                <span className="text-white">{detectedProject.primaryLanguage}</span>
                <span className="text-dark-400 text-[10px]">({(detectedProject.confidence * 100).toFixed(0)}%)</span>
              </div>

              {/* Components preview if fullstack */}
              {detectedProject.components && detectedProject.components.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-dark-300 hidden md:flex">
                  <Layers className="h-3 w-3 text-dark-400" />
                  <span>{detectedProject.components.map((c: any) => c.name).join(' + ')}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-dark-500 text-[11px]">No project detected</div>
          )}

          {/* Active Job ID */}
          {activeJobId ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
              <Zap className="h-3 w-3 text-emerald-400" />
              <span>Job: {activeJobId.replace(/^job_/, '').substring(0, 14)}...</span>
            </div>
          ) : (
            <div className="text-dark-500 text-[11px] font-mono hidden sm:inline">No active build job</div>
          )}

          {/* Quick Refresh Button */}
          <button
            onClick={() => refreshDetection()}
            disabled={loadingDetection}
            className="p-1.5 rounded-lg border border-dark-600 bg-dark-900 text-dark-400 hover:text-white hover:border-purple-500 transition-colors"
            title="Re-run project detection"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingDetection ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
