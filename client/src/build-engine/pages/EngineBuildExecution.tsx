import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Cpu,
  Database,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { useBuildEngine } from '../context/BuildEngineContext';

export const EngineBuildExecution: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('planId');
  const { setActiveJobId } = useBuildEngine();

  const [concurrency, setConcurrency] = useState(8);
  const [executing, setExecuting] = useState(false);
  const [jobResult, setJobResult] = useState<any | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [error, setError] = useState('');

  const handleExecute = async () => {
    if (!planId) return;

    setError('');
    setExecuting(true);
    setJobResult(null);

    try {
      const res = await api.post(`/build-engine/plans/${planId}/execute`, {
        concurrencyLimit: concurrency,
      });
      setJobResult(res.data.job);
      if (res.data.job?.id) {
        setActiveJobId(res.data.job.id);
      }
    } catch (err: any) {
      setError(err.message || 'Build execution failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-dark-600 pb-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="h-6 w-6 text-purple-400" />
          <span>Parallel Build Execution Engine</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">
          Execute only required and affected compilation actions in bounded parallel workers with content-addressable build cache restoration.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-500/50 p-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Control Card */}
      <div className="rounded-xl border border-dark-600 bg-dark-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-dark-300">
            Selected Plan: <span className="font-mono text-purple-400">{planId || 'None'}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <label className="text-xs text-dark-400 font-medium">Worker Threads:</label>
            <select
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
              disabled={executing}
              className="rounded-lg border border-dark-600 bg-dark-900 px-3 py-1.5 text-xs text-white"
            >
              {[1, 2, 4, 8].map((n) => (
                <option key={n} value={n}>
                  {n} Parallel Workers {n === 8 ? '(Max)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleExecute}
          disabled={executing || !planId}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-purple-500 disabled:opacity-50 transition-all self-start md:self-auto"
        >
          <Play className="h-4 w-4" />
          <span>{executing ? 'Executing Build Pipeline...' : 'Start Build'}</span>
        </button>
      </div>

      {/* Execution Results */}
      {jobResult && (
        <div className="space-y-6">
          <div className="rounded-xl border border-dark-600 bg-dark-800 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {jobResult.status === 'SUCCESS' ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-400" />
              )}
              <div>
                <div className="text-sm font-bold text-white">
                  Build Status: {jobResult.status}
                </div>
                <div className="text-xs text-dark-400 mt-0.5">
                  Duration: {jobResult.totalDurationMs}ms &bull; Completed tasks: {jobResult.completedTasks} of {jobResult.totalTasks}
                </div>
              </div>
            </div>

            {jobResult.status === 'SUCCESS' && (
              <button
                onClick={() => navigate(`/build-engine/run?jobId=${jobResult.id}`)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <Terminal className="h-4 w-4" />
                <span>Run Application</span>
              </button>
            )}
          </div>

          {/* Task Log Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-dark-600 bg-dark-800 p-4 space-y-2">
              <div className="text-xs font-bold text-white mb-2">Executed Targets</div>
              {Object.values(jobResult.tasks || {}).map((task: any) => (
                <div
                  key={task.targetId}
                  onClick={() => setSelectedTask(task)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedTask?.targetId === task.targetId
                      ? 'border-purple-500 bg-purple-950/20'
                      : 'border-dark-600 hover:bg-dark-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{task.targetId}</span>
                    <span
                      className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                        task.status === 'CACHED'
                          ? 'bg-purple-950 text-purple-300'
                          : task.status === 'SUCCESS'
                          ? 'bg-emerald-950 text-emerald-300'
                          : 'bg-red-950 text-red-300'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-dark-400 mt-1 flex items-center justify-between">
                    <span>Worker {task.workerId}</span>
                    <span>{task.durationMs}ms</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Log Output Viewer */}
            <div className="md:col-span-2 rounded-xl border border-dark-600 bg-dark-900 p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-white border-b border-dark-700 pb-2 mb-3 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-purple-400" />
                  <span>Compilation Logs: {selectedTask?.targetId || 'Select a target'}</span>
                </div>
                <pre className="text-xs font-mono text-dark-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {selectedTask?.stdout || selectedTask?.stderr || 'Click on a target to inspect stdout and stderr.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
