import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Play, Square, RotateCcw, Terminal, Activity,
  AlertCircle, CheckCircle, Clock, Cpu, ExternalLink,
  Layers, Server, Globe, Sparkles, Download, Wrench
} from 'lucide-react';
import { api } from '../../api/client';
import { useBuildEngine } from '../context/BuildEngineContext';

type SessionStatus = 'RUNNING' | 'STOPPED' | 'FAILED' | 'STARTING';

export interface DetectedService {
  id: string;
  name: string;
  type: 'backend' | 'frontend' | 'binary' | 'script' | 'web';
  executablePath: string;
  defaultPort?: number;
  args?: string[];
  description: string;
}

export interface RunSession {
  sessionId?: string;
  id?: string;
  jobId?: string;
  buildJobId?: string;
  serviceId?: string;
  serviceName?: string;
  executablePath: string;
  status: SessionStatus;
  pid?: number;
  port?: number;
  startTime: string;
  logs?: string[];
  exitCode?: number;
  url?: string;
}

export const EngineRunManager: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlJobId = searchParams.get('jobId') || '';
  const { activeJobId, setActiveJobId, selectedRepo } = useBuildEngine();

  const [jobId, setJobId] = useState(urlJobId || activeJobId);
  const [detectedServices, setDetectedServices] = useState<DetectedService[]>([]);
  const [detectingServices, setDetectingServices] = useState(false);

  // Sessions map keyed by serviceId
  const [sessions, setSessions] = useState<Record<string, RunSession>>({});
  const [activeTab, setActiveTab] = useState<string>('all');

  // Custom runner form fields
  const [customPath, setCustomPath] = useState('');
  const [customArgs, setCustomArgs] = useState('');
  const [customPort, setCustomPort] = useState('');
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [inputMap, setInputMap] = useState<Record<string, string>>({});
  const [sendingInputMap, setSendingInputMap] = useState<Record<string, boolean>>({});

  // Dependency install state
  const [installingDeps, setInstallingDeps] = useState(false);
  const [installLog, setInstallLog] = useState('');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const logsEndRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync jobId with URL or Context, or auto-fetch latest successful build for repository
  useEffect(() => {
    if (urlJobId && urlJobId !== jobId) {
      setJobId(urlJobId);
      setActiveJobId(urlJobId);
      return;
    }

    if (!jobId && selectedRepo?.id) {
      api.get('/build-engine/history')
        .then((res) => {
          const list = res.data.builds || [];
          const forRepo = list.filter((b: any) => b.repositoryId === selectedRepo.storagePath || b.repositoryId === selectedRepo.id);
          const latestSuccessful = forRepo.find((b: any) => b.status === 'SUCCESS') || list.find((b: any) => b.status === 'SUCCESS');
          if (latestSuccessful) {
            setJobId(latestSuccessful.id);
            setActiveJobId(latestSuccessful.id);
          }
        })
        .catch(() => {});
    }
  }, [urlJobId, selectedRepo?.id]);

  // Reset services and sessions when repo or jobId changes
  useEffect(() => {
    setDetectedServices([]);
    setSessions({});
    setErrorMap({});
  }, [selectedRepo?.id]);

  // Auto-detect services whenever jobId changes
  useEffect(() => {
    if (!jobId.trim()) {
      setDetectedServices([]);
      return;
    }

    const fetchServices = async () => {
      setDetectingServices(true);
      try {
        const res = await api.get(`/build-engine/jobs/${jobId.trim()}/services`);
        if (res.data.services) {
          setDetectedServices(res.data.services);
        }
        if (res.data.activeSessions && res.data.activeSessions.length > 0) {
          const map: Record<string, RunSession> = {};
          for (const s of res.data.activeSessions) {
            const key = s.serviceId || 'custom';
            map[key] = s;
          }
          setSessions(prev => ({ ...prev, ...map }));
        }
      } catch {
        setDetectedServices([]);
      } finally {
        setDetectingServices(false);
      }
    };

    fetchServices();
  }, [jobId]);

  // Polling for all active sessions
  useEffect(() => {
    const activeIds = Object.values(sessions)
      .filter(s => s && s.status === 'RUNNING')
      .map(s => s.id || s.sessionId)
      .filter(Boolean) as string[];

    if (activeIds.length === 0) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      for (const sid of activeIds) {
        try {
          const res = await api.get(`/build-engine/run-sessions/${sid}`);
          const s: RunSession = res.data.session;
          if (s) {
            const key = s.serviceId || 'custom';
            setSessions(prev => ({ ...prev, [key]: s }));
          }
        } catch { /* ignore polling errors */ }
      }
    }, 1500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [sessions]);

  const handleStartService = async (service: { id: string; name: string; executablePath: string; args?: string[]; defaultPort?: number }) => {
    if (!jobId.trim()) {
      setErrorMap(prev => ({ ...prev, [service.id]: 'Job ID is required' }));
      return;
    }

    setLoadingMap(prev => ({ ...prev, [service.id]: true }));
    setErrorMap(prev => ({ ...prev, [service.id]: '' }));

    try {
      const res = await api.post(`/build-engine/jobs/${jobId}/run`, {
        executablePath: service.executablePath,
        args: service.args || [],
        serviceId: service.id,
        port: service.defaultPort,
      });
      const launched: RunSession = res.data.session;
      setSessions(prev => ({ ...prev, [service.id]: launched }));
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to start service';
      setErrorMap(prev => ({ ...prev, [service.id]: errMsg }));

      // If missing module/vite, prompt to install dependencies
      if (errMsg.includes('not found') || errMsg.includes('Cannot find module')) {
        setShowInstallPrompt(true);
      }
    } finally {
      setLoadingMap(prev => ({ ...prev, [service.id]: false }));
    }
  };

  const handleStopService = async (serviceId: string) => {
    const s = sessions[serviceId];
    const sid = s?.id || s?.sessionId;
    if (!sid) return;

    setLoadingMap(prev => ({ ...prev, [serviceId]: true }));
    try {
      await api.post(`/build-engine/run-sessions/${sid}/stop`);
      setSessions(prev => ({
        ...prev,
        [serviceId]: { ...prev[serviceId], status: 'STOPPED' }
      }));
    } catch (err: any) {
      setErrorMap(prev => ({
        ...prev,
        [serviceId]: err.response?.data?.error || 'Failed to stop service'
      }));
    } finally {
      setLoadingMap(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const handleSendInput = async (serviceId: string) => {
    const session = sessions[serviceId];
    const val = inputMap[serviceId];
    if (!session?.id || val === undefined || val === '') return;

    setSendingInputMap(prev => ({ ...prev, [serviceId]: true }));
    try {
      await api.post(`/build-engine/run-sessions/${session.id}/input`, { input: val });
      setInputMap(prev => ({ ...prev, [serviceId]: '' }));
    } catch (err: any) {
      setErrorMap(prev => ({
        ...prev,
        [serviceId]: err.response?.data?.error || 'Failed to send input'
      }));
    } finally {
      setSendingInputMap(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const handleStartAll = async () => {
    for (const s of detectedServices) {
      await handleStartService(s);
    }
  };

  const handleStopAll = async () => {
    for (const key of Object.keys(sessions)) {
      if (sessions[key]?.status === 'RUNNING') {
        await handleStopService(key);
      }
    }
  };

  const handleInstallDependencies = async (subDir = '') => {
    if (!jobId.trim()) return;
    setInstallingDeps(true);
    setInstallLog('Installing dependencies in workspace...');
    try {
      const res = await api.post(`/build-engine/jobs/${jobId}/install-dependencies`, { subDir });
      setInstallLog(res.data.log || (res.data.success ? 'Dependencies installed successfully!' : 'Installation encountered warnings.'));
      setShowInstallPrompt(false);
    } catch (err: any) {
      setInstallLog(`Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setInstallingDeps(false);
    }
  };

  const statusBadge = (status?: SessionStatus) => {
    if (!status) return null;
    const cfg: Record<SessionStatus, { color: string; icon: React.ReactNode; label: string }> = {
      RUNNING:  { color: 'text-green-400 bg-green-400/10 border-green-500/30', icon: <Activity className="h-3 w-3" />, label: 'RUNNING' },
      STOPPED:  { color: 'text-dark-400 bg-dark-700 border-dark-600',          icon: <Square className="h-3 w-3" />,   label: 'STOPPED' },
      FAILED:   { color: 'text-red-400 bg-red-400/10 border-red-500/30',       icon: <AlertCircle className="h-3 w-3" />, label: 'FAILED' },
      STARTING: { color: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30', icon: <Clock className="h-3 w-3" />, label: 'STARTING' },
    };
    const c = cfg[status] || cfg.STOPPED;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${c.color}`}>
        {c.icon}{c.label}
      </span>
    );
  };

  const stripAnsi = (str: string) =>
    str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

  const renderTerminal = (service: DetectedService) => {
    const session = sessions[service.id];
    const loading = !!loadingMap[service.id];
    const err = errorMap[service.id];

    const logs: { type: string; text: string }[] = [];
    (session?.logs || []).forEach(l => {
      const clean = stripAnsi(l).replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
      const lines = clean.split('\n');
      lines.forEach(line => {
        if (line.trim().length > 0) {
          logs.push({
            type: line.startsWith('>') ? 'input' : line.startsWith('[stderr]') ? 'stderr' : line.startsWith('[warn]') ? 'warn' : line.startsWith('[info]') ? 'info' : 'stdout',
            text: line.startsWith('>') ? line : line.replace(/^\[(?:stderr|warn|info)\]\s*/, '')
          });
        }
      });
    });

    const isRunning = session?.status === 'RUNNING';

    return (
      <div key={service.id} className="flex flex-col rounded-xl border border-dark-700 bg-dark-900 overflow-hidden shadow-xl">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-dark-800 border-b border-dark-700">
          <div className="flex items-center gap-2">
            <Terminal className={`h-4 w-4 ${service.type === 'backend' ? 'text-blue-400' : service.type === 'frontend' ? 'text-purple-400' : 'text-emerald-400'}`} />
            <div>
              <span className="text-sm font-semibold text-white">{service.name}</span>
              <span className="text-xs text-dark-400 ml-2 hidden sm:inline">({service.description})</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(session?.status)}
            {isRunning && (
              <span className="inline-flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
        </div>

        {/* Toolbar & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-dark-850 border-b border-dark-700/60 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStartService(service)}
              disabled={loading || isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-500 font-semibold text-white disabled:opacity-40 transition-colors"
            >
              <Play className="h-3.5 w-3.5" /> Start
            </button>
            <button
              onClick={() => handleStopService(service.id)}
              disabled={loading || !isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 disabled:opacity-40 transition-colors"
            >
              <Square className="h-3.5 w-3.5" /> Stop
            </button>
            <button
              onClick={async () => {
                await handleStopService(service.id);
                setTimeout(() => handleStartService(service), 600);
              }}
              disabled={loading || !session}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-dark-700 text-dark-200 hover:bg-dark-600 disabled:opacity-40 transition-colors"
              title="Restart Service"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Clean PID & Exit Code Info (No web localhost pill for native C++ executables) */}
          <div className="flex items-center gap-3 text-xs text-dark-400 font-mono">
            {session?.pid && (
              <span>PID: <strong className="text-white">{session.pid}</strong></span>
            )}
            {session?.exitCode !== undefined && (
              <span>Exit Code: <strong className={session.exitCode === 0 ? "text-emerald-400" : "text-red-400"}>{session.exitCode}</strong></span>
            )}
          </div>
        </div>

        {err && (
          <div className="px-4 py-2.5 bg-red-950/40 border-b border-red-900/50 text-xs text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <span>{err}</span>
            </div>
            {showInstallPrompt && (
              <button
                onClick={() => handleInstallDependencies(service.executablePath.startsWith('frontend') ? 'frontend' : '')}
                disabled={installingDeps}
                className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 text-white rounded text-[11px] font-semibold hover:bg-purple-500"
              >
                <Download className="h-3 w-3" /> Install Dependencies
              </button>
            )}
          </div>
        )}

        {/* Terminal Output */}
        <div className="h-80 overflow-y-auto p-4 font-mono text-xs space-y-1.5 bg-black/60">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-dark-500 text-center gap-1">
              <p>Process is idle.</p>
              <p className="text-[11px] text-dark-600">Click &quot;Start&quot; to execute and stream real-time output.</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap font-mono leading-relaxed ${
                  log.type === 'input' ? 'text-cyan-300 font-bold' :
                  log.type === 'stderr' ? 'text-red-400' :
                  log.type === 'warn' ? 'text-yellow-400' :
                  log.type === 'info' ? 'text-blue-400' :
                  'text-emerald-400'
                }`}
              >
                {log.text}
              </div>
            ))
          )}
          <div ref={el => { logsEndRefs.current[service.id] = el; }} />
        </div>

        {/* Interactive stdin input bar when process is running */}
        {isRunning && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendInput(service.id);
            }}
            className="flex items-center gap-2 p-2 bg-dark-850 border-t border-dark-700"
          >
            <span className="text-cyan-400 font-mono text-xs pl-2 font-bold">&gt;</span>
            <input
              type="text"
              value={inputMap[service.id] || ''}
              onChange={(e) => setInputMap(prev => ({ ...prev, [service.id]: e.target.value }))}
              placeholder="Type input and press Enter (or Send)..."
              disabled={sendingInputMap[service.id]}
              autoFocus
              className="flex-1 bg-dark-900 border border-dark-600 rounded px-3 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sendingInputMap[service.id] || !inputMap[service.id]?.trim()}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded text-xs font-semibold transition-colors"
            >
              Send
            </button>
          </form>
        )}

        {/* Terminal Footer */}
        <div className="px-4 py-1.5 bg-dark-800 border-t border-dark-700/80 flex items-center justify-between text-[11px] text-dark-400">
          <span>Target: <code className="text-dark-300">{service.executablePath}</code></span>
          <span>PID: <strong className="text-white">{session?.pid || '—'}</strong> &bull; {logs.length} lines</span>
        </div>
      </div>
    );
  };

  const hasRunningServices = Object.values(sessions).some(s => s && s.status === 'RUNNING');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-700 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Terminal className="h-6 w-6 text-purple-400" />
            Application Run Manager
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            Safe, isolated local execution with automatic port conflict prevention and real-time streaming
          </p>
        </div>

        {/* Global Master Controls */}
        <div className="flex items-center gap-2.5">
          {detectedServices.length > 1 && (
            <button
              onClick={handleStartAll}
              disabled={!jobId.trim() || hasRunningServices}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-lg shadow-purple-900/30 disabled:opacity-50 transition-colors"
            >
              <Play className="h-4 w-4" /> Start All Services
            </button>
          )}
          {hasRunningServices && (
            <button
              onClick={handleStopAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-red-400 border border-dark-600 text-sm font-semibold transition-colors"
            >
              <Square className="h-4 w-4" /> Stop All
            </button>
          )}
        </div>
      </div>

      {/* Build Job Input & Detected Services Card */}
      <div className="rounded-xl border border-dark-700 bg-dark-800/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-semibold text-dark-300 mb-1.5">
              Build Workspace Job ID (from Execution page)
            </label>
            <input
              type="text"
              value={jobId}
              onChange={e => {
                const val = e.target.value.trim();
                setJobId(val);
                setActiveJobId(val);
              }}
              placeholder="e.g. job_1794068383971_..."
              className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3.5 py-2 text-sm text-white placeholder-dark-500 focus:border-purple-500 focus:outline-none font-mono"
            />
          </div>

          {detectedServices.length > 0 && (
            <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-500/30 rounded-lg px-3.5 py-2">
              <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-purple-300">Auto-Detected {detectedServices.length} Components: </span>
                <span className="text-dark-300">
                  {detectedServices.map(s => s.name).join(' &bull; ')}
                </span>
              </div>
            </div>
          )}
        </div>

        {installLog && (
          <div className="p-3 bg-dark-900 border border-dark-700 rounded-lg text-xs font-mono text-dark-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
            {installLog}
          </div>
        )}
      </div>

      {/* Detected Terminals Grid */}
      {detectedServices.length > 0 ? (
        <div className={`grid grid-cols-1 ${detectedServices.length > 1 ? 'lg:grid-cols-2' : ''} gap-6`}>
          {detectedServices.map(renderTerminal)}
        </div>
      ) : jobId.trim() && !detectingServices ? (
        /* Manual Custom Launcher if no recognized service file */
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Wrench className="h-5 w-5 text-purple-400" />
            Custom Application Launcher
          </h2>
          <p className="text-xs text-dark-400">
            No standard manifest was automatically identified. You can run any executable or script inside the workspace:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-dark-300 font-semibold mb-1">Executable / Script Path</label>
              <input
                type="text"
                value={customPath}
                onChange={e => setCustomPath(e.target.value.trim())}
                placeholder="e.g. app.py, bin/app.exe, server.js"
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-dark-300 font-semibold mb-1">Arguments (optional)</label>
              <input
                type="text"
                value={customArgs}
                onChange={e => setCustomArgs(e.target.value)}
                placeholder="e.g. --port 8080"
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-dark-300 font-semibold mb-1">Preferred Port (optional)</label>
              <input
                type="text"
                value={customPort}
                onChange={e => setCustomPort(e.target.value.trim())}
                placeholder="e.g. 3000, 8080"
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-white font-mono"
              />
            </div>
          </div>
          <button
            onClick={() => handleStartService({
              id: 'custom',
              name: customPath || 'Custom Process',
              executablePath: customPath,
              args: customArgs.trim() ? customArgs.trim().split(/\s+/) : [],
              defaultPort: customPort ? parseInt(customPort, 10) : undefined,
            })}
            disabled={!customPath || !!loadingMap['custom']}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-xs disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" /> Launch Process
          </button>

          {sessions['custom'] && renderTerminal({
            id: 'custom',
            name: customPath || 'Custom Process',
            type: 'script',
            executablePath: customPath,
            description: 'User-specified workspace executable',
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-dark-500 gap-2 border border-dashed border-dark-700 rounded-xl">
          <Terminal className="h-8 w-8 text-dark-600" />
          <p className="text-sm font-medium">Select a repository and build a commit to launch applications.</p>
        </div>
      )}
    </div>
  );
};
