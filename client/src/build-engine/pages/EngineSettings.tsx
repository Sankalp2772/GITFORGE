import React, { useState, useEffect } from 'react';
import { Settings, Cpu, HardDrive, Shield, Check, Save } from 'lucide-react';

export const EngineSettings: React.FC = () => {
  const [maxWorkers, setMaxWorkers] = useState<number>(() => {
    return parseInt(localStorage.getItem('gitforge_build_workers') || '4', 10);
  });
  const [cacheRetentionDays, setCacheRetentionDays] = useState<number>(30);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('gitforge_build_workers', maxWorkers.toString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-purple-400" />
          Build Engine Settings
        </h1>
        <p className="text-sm text-dark-400 mt-1">
          Configure compiler parameters, bounded parallel executor, and caching limits
        </p>
      </div>

      <div className="space-y-6">
        {/* Parallelism Configuration */}
        <div className="rounded-lg border border-dark-700 bg-dark-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-semibold text-white">Parallel Scheduler</h2>
          </div>
          <p className="text-xs text-dark-400">
            Define the maximum number of concurrent task execution workers. Bounds CPU usage during DAG task builds.
          </p>

          <div className="grid grid-cols-4 gap-3 max-w-md pt-2">
            {[1, 2, 4, 8].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setMaxWorkers(num)}
                className={`py-2 px-4 rounded-lg font-mono text-sm font-semibold border transition-all ${
                  maxWorkers === num
                    ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                    : 'border-dark-600 bg-dark-900 text-dark-300 hover:border-dark-500 hover:text-white'
                }`}
              >
                {num} {num === 1 ? 'Worker' : 'Workers'}
              </button>
            ))}
          </div>
        </div>

        {/* Environment Paths & System Information */}
        <div className="rounded-lg border border-dark-700 bg-dark-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-semibold text-white">System Runtime & Cache</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-dark-400 block mb-1">Native G++ Compiler Location</span>
              <div className="bg-dark-900 border border-dark-700 rounded-md p-2.5 font-mono text-dark-200 select-all">
                C:\msys64\ucrt64\bin\g++.exe (GCC 16.1.0)
              </div>
            </div>

            <div>
              <span className="text-dark-400 block mb-1">Build Cache Directory</span>
              <div className="bg-dark-900 border border-dark-700 rounded-md p-2.5 font-mono text-dark-200 select-all">
                D:\gitforge\data\build-cache
              </div>
            </div>

            <div>
              <span className="text-dark-400 block mb-1">Build Workspaces Directory</span>
              <div className="bg-dark-900 border border-dark-700 rounded-md p-2.5 font-mono text-dark-200 select-all">
                D:\gitforge\data\build-workspaces
              </div>
            </div>
          </div>
        </div>

        {/* Safety & Isolation Policy */}
        <div className="rounded-lg border border-dark-700 bg-dark-800 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-semibold text-white">Execution Sandbox Policy</h2>
          </div>
          <p className="text-xs text-dark-300 leading-relaxed">
            All commands are strictly validated against command injection exploits. Shell pipes (<code className="text-purple-400">|</code>), 
            command chaining (<code className="text-purple-400">&amp;&amp;</code>, <code className="text-purple-400">;</code>), subshell evaluation 
            (<code className="text-purple-400">$(...)</code>), and destructive filesystem instructions are blocked. 
            Native processes are spawned with isolated parameter arrays directly in designated job workspaces.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-md bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 shadow-sm transition-all"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved Successfully' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
