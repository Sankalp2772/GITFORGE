import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Server,
  Wrench,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Layers,
  Code2,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { api } from '../../api/client';

export const EngineEnvironment: React.FC = () => {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectionData, setDetectionData] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await api.get('/build-engine/repositories');
        setRepos(res.data.repositories || []);
        if (res.data.repositories?.length > 0) {
          setSelectedRepoId(res.data.repositories[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRepos();
  }, []);

  const handleDetect = async (repoId = selectedRepoId) => {
    if (!repoId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/build-engine/repositories/${repoId}/detect`);
      setDetectionData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Detection failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRepoId) {
      handleDetect(selectedRepoId);
    }
  }, [selectedRepoId]);

  const project = detectionData?.project;
  const env = detectionData?.environment;
  const deps = detectionData?.dependencies;
  const runConfigs = detectionData?.runConfigurations || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-700 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-purple-400" />
            C/C++ Project & Compiler Environment
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            Automated C/C++ project recognition, GCC/G++ & CMake toolchain inspection
          </p>
        </div>

        {/* Repository Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedRepoId}
            onChange={e => setSelectedRepoId(e.target.value)}
            className="rounded-lg border border-dark-600 bg-dark-900 px-3.5 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            {repos.map(r => (
              <option key={r.id} value={r.id}>
                {r.owner.username}/{r.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleDetect()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 border border-dark-600 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-400 flex items-center gap-3">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center p-12 text-dark-400 space-y-3">
          <RefreshCw className="h-8 w-8 text-purple-400 animate-spin" />
          <p className="text-sm font-medium">Inspecting repository tree, host compilers, and service ports...</p>
        </div>
      )}

      {!loading && project && (
        <div className="space-y-6">
          {/* Main Detected Project Card */}
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-6 space-y-5 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-dark-700/80 pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wide">
                    {project.kind}
                  </span>
                  <h2 className="text-xl font-bold text-white">{project.name}</h2>
                </div>
                <p className="text-sm text-dark-400 mt-1">{project.description}</p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-center">
                  <div className="text-dark-400 text-[10px] uppercase">Confidence</div>
                  <div className="text-green-400 font-bold text-sm">{(project.confidence * 100).toFixed(0)}%</div>
                </div>
                <div className="bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-center">
                  <div className="text-dark-400 text-[10px] uppercase">Primary Language</div>
                  <div className="text-purple-300 font-semibold">{project.primaryLanguage}</div>
                </div>
                <div className="bg-dark-900 border border-dark-700 rounded-lg px-3.5 py-2 text-center">
                  <div className="text-dark-400 text-[10px] uppercase">Build System</div>
                  <div className="text-blue-300 font-semibold">{project.buildSystem}</div>
                </div>
              </div>
            </div>

            {/* Frameworks & Evidence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-400" />
                  Detected Frameworks & Libraries
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.frameworks.map((fw: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-dark-900 border border-dark-700 text-dark-300 font-medium">
                      {fw}
                    </span>
                  ))}
                </div>
                <div className="pt-2 text-dark-400">
                  <span className="font-medium text-dark-300">Entry Point: </span>
                  <code className="text-purple-300 font-mono">{project.entryPoint || 'N/A'}</code>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-400" />
                  Evidence-Based Detection Rules
                </h3>
                <ul className="space-y-1.5 text-dark-300">
                  {project.evidence.map((ev: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-400 font-bold mt-0.5">•</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Multi-Component / Fullstack Breakdown */}
            {project.components && project.components.length > 0 && (
              <div className="border-t border-dark-700/80 pt-5 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-400" />
                  Multi-Tier Architectural Components ({project.components.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.components.map((c: any, i: number) => (
                    <div key={i} className="p-4 rounded-lg border border-dark-700 bg-dark-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{c.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">
                          /{c.rootPath}
                        </span>
                      </div>
                      <p className="text-xs text-dark-400">{c.description}</p>
                      <div className="text-xs text-dark-500 font-mono">
                        Frameworks: {c.frameworks.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tools & Services Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Host Compilers & Toolchains */}
            <div className="rounded-xl border border-dark-700 bg-dark-800 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-dark-700 pb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-yellow-400" />
                  Required Host Tools & Compilers
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  env?.tools.every((t: any) => t.installed)
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {env?.tools.every((t: any) => t.installed) ? 'All Installed' : 'Missing Tools'}
                </span>
              </div>

              <div className="space-y-3">
                {env?.tools.map((tool: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-dark-700 bg-dark-900 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white">{tool.name}</div>
                      <div className="text-dark-400 font-mono text-[11px]">{tool.version || 'Not installed'}</div>
                    </div>
                    {tool.installed ? (
                      <div className="flex items-center gap-1.5 text-green-400 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Ready</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-400 font-medium">
                        <XCircle className="h-4 w-4" />
                        <span>Missing</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* External Services (MySQL, Postgres, etc.) */}
            <div className="rounded-xl border border-dark-700 bg-dark-800 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-dark-700 pb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-400" />
                  Required External Services
                </h2>
                <span className="text-[11px] text-dark-400">Zero Password Exposure</span>
              </div>

              {env?.services.length === 0 ? (
                <div className="p-6 text-center text-xs text-dark-500">
                  No external database or messaging services required for this application.
                </div>
              ) : (
                <div className="space-y-3">
                  {env?.services.map((svc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-dark-700 bg-dark-900 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white">{svc.name}</div>
                        <div className="text-dark-400 font-mono text-[11px]">TCP Probe: {svc.host}:{svc.port}</div>
                      </div>
                      {svc.available ? (
                        <div className="flex items-center gap-1.5 text-green-400 font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Connected</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-400 font-medium">
                          <XCircle className="h-4 w-4" />
                          <span>Not Reachable</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Run Configurations Panel */}
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-700 pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Play className="h-4 w-4 text-purple-400" />
                Detected Run Configurations ({runConfigs.length})
              </h2>
              <button
                onClick={() => navigate('/build-engine/run')}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline flex items-center gap-1"
              >
                Go to Run Manager &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {runConfigs.map((rc: any, i: number) => (
                <div key={i} className="p-4 rounded-lg border border-dark-700 bg-dark-900 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{rc.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-dark-800 text-purple-300 border border-dark-700 uppercase">
                      {rc.type}
                    </span>
                  </div>
                  <div className="bg-black/40 p-2.5 rounded font-mono text-green-300 text-[11px]">
                    $ {rc.command} {rc.args.join(' ')}
                  </div>
                  <div className="flex items-center justify-between text-dark-400 text-[11px]">
                    <span>Default Port: <strong className="text-white">{rc.defaultPort || 'N/A'}</strong></span>
                    {rc.dependsOn && rc.dependsOn.length > 0 && (
                      <span>Requires: <strong className="text-yellow-400">{rc.dependsOn.join(', ')}</strong></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
