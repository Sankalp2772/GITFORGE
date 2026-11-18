import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  Scan,
  Network,
  Diff,
  Flame,
  FileSpreadsheet,
  Cpu,
  Play,
  Database,
  Terminal,
  History,
  Settings,
  ArrowLeft,
  Zap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const BuildEngineSidebar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Overview', to: '/build-engine', icon: LayoutDashboard },
    { name: 'Project & Environment', to: '/build-engine/environment', icon: Sparkles },
    { name: 'Repositories', to: '/build-engine/repositories', icon: FolderGit2 },
    { name: 'Scanner', to: '/build-engine/scanner', icon: Scan },
    { name: 'Dependency Graph', to: '/build-engine/dependency-graph', icon: Network },
    { name: 'Change Detection', to: '/build-engine/change-detection', icon: Diff },
    { name: 'Affected Files', to: '/build-engine/affected-files', icon: Flame },
    { name: 'Build Planner', to: '/build-engine/planner', icon: FileSpreadsheet },
    { name: 'Build Scheduler', to: '/build-engine/scheduler', icon: Cpu },
    { name: 'Build Execution', to: '/build-engine/execution', icon: Zap },
    { name: 'Build Cache', to: '/build-engine/cache', icon: Database },
    { name: 'Run Manager', to: '/build-engine/run', icon: Play },
    { name: 'Build History', to: '/build-engine/history', icon: History },
    { name: 'Settings', to: '/build-engine/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-dark-600 bg-dark-800 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4 space-y-4 overflow-y-auto">
        {/* Back to GitForge */}
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs font-semibold text-dark-300 hover:text-white hover:border-purple-500 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-purple-400" />
          <span>Back to GitForge</span>
        </Link>

        {/* Engine Badge */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-purple-950/40 border border-purple-500/30">
          <Zap className="h-5 w-5 text-purple-400 animate-pulse" />
          <div>
            <div className="text-xs font-bold text-white tracking-wide">BUILD ENGINE</div>
            <div className="text-[10px] text-purple-300">Incremental &bull; Max 8 Workers</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/build-engine'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white font-semibold shadow-md'
                    : 'text-dark-300 hover:bg-dark-700 hover:text-white'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-dark-700 bg-dark-800/80">
        <div className="flex items-center gap-3">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`}
            alt={user?.username}
            className="h-8 w-8 rounded-full bg-dark-700"
          />
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">{user?.username}</div>
            <div className="text-[10px] text-dark-400">Authenticated</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
