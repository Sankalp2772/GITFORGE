import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderGit2,
  Lock,
  Globe,
  GitBranch,
  Code2,
  GitPullRequest,
  AlertCircle,
  Users,
  Settings as SettingsIcon,
  Copy,
  Check,
  Terminal,
  HelpCircle,
  X
} from 'lucide-react';
import { api } from '../../api/client';
import { Repository } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const RepoHeader: React.FC<{
  repo: Repository;
  activeTab: 'code' | 'issues' | 'pulls' | 'members' | 'settings';
}> = ({ repo, activeTab }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showPushHelp, setShowPushHelp] = useState(false);

  const copyCloneUrl = () => {
    navigator.clipboard.writeText(repo.cloneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-b border-dark-600 bg-dark-800 -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 px-4 sm:px-6 lg:px-8 pt-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <FolderGit2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link
                to={`/${repo.owner.username}`}
                className="text-base text-purple-400 hover:text-purple-300 font-medium"
              >
                {repo.owner.username}
              </Link>
              <span className="text-dark-500 font-bold">/</span>
              <span className="text-base font-bold text-white">{repo.name}</span>
              <span className="flex items-center gap-1 rounded-full border border-dark-600 px-2 py-0.5 text-[10px] text-dark-400 font-medium ml-2">
                {repo.visibility === 'PUBLIC' ? (
                  <><Globe className="h-3 w-3" /> Public</>
                ) : (
                  <><Lock className="h-3 w-3 text-amber-400" /> Private</>
                )}
              </span>
              {repo.userRole && repo.userRole !== 'NONE' && (
                <span className="rounded bg-purple-900/40 border border-purple-500/40 px-2 py-0.5 text-[10px] text-purple-300 font-semibold uppercase">
                  {repo.userRole}
                </span>
              )}
            </div>
            {repo.description && (
              <p className="mt-1 text-xs text-dark-300">{repo.description}</p>
            )}
          </div>
        </div>

        {/* Clone URL Bar */}
        <div className="flex items-center gap-2 self-start md:self-auto relative">
          <div className="flex items-center rounded-lg border border-dark-600 bg-dark-900 px-3 py-1.5 text-xs font-mono text-dark-300">
            <span className="text-purple-400 mr-1.5 font-bold">git:</span>
            <span className="truncate max-w-[240px]">{repo.cloneUrl}</span>
          </div>
          <button
            onClick={copyCloneUrl}
            className="flex items-center gap-1 rounded-lg bg-dark-700 border border-dark-600 px-2.5 py-1.5 text-xs text-white hover:bg-dark-600 transition-colors"
            title="Copy Git Clone URL"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>

          {/* Quick Push Instructions Toggle Button */}
          <button
            onClick={() => setShowPushHelp(!showPushHelp)}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600/20 border border-purple-500/40 px-2.5 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-600/30 transition-colors"
            title="Push Instructions"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>How to push</span>
          </button>

          {/* Modal / Flyout Instructions */}
          {showPushHelp && (
            <div className="absolute right-0 top-11 z-50 w-96 rounded-xl border border-dark-600 bg-dark-850 p-4 shadow-2xl space-y-3 font-sans">
              <div className="flex items-center justify-between border-b border-dark-700 pb-2">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Terminal className="h-4 w-4 text-purple-400" />
                  Push to this repository
                </span>
                <button
                  onClick={() => setShowPushHelp(false)}
                  className="text-dark-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 text-[11px]">
                <p className="font-semibold text-purple-300">1. Push an existing folder / project:</p>
                <pre className="bg-dark-950 p-2 rounded border border-dark-800 text-dark-200 font-mono text-[10px] select-all overflow-x-auto">
{`git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin ${repo.cloneUrl}
git push -u origin main`}
                </pre>

                <p className="font-semibold text-cyan-300 pt-1">2. Push changes in an existing Git repo:</p>
                <pre className="bg-dark-950 p-2 rounded border border-dark-800 text-dark-200 font-mono text-[10px] select-all overflow-x-auto">
{`git add .
git commit -m "Update code"
git push`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex space-x-6 text-sm font-medium">
        <Link
          to={`/${repo.owner.username}/${repo.name}`}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'code'
              ? 'border-purple-500 text-purple-400 font-semibold'
              : 'border-transparent text-dark-400 hover:text-white'
          }`}
        >
          <Code2 className="h-4 w-4" />
          <span>Code</span>
        </Link>

        <Link
          to={`/${repo.owner.username}/${repo.name}/issues`}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'issues'
              ? 'border-purple-500 text-purple-400 font-semibold'
              : 'border-transparent text-dark-400 hover:text-white'
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          <span>Issues</span>
        </Link>

        <Link
          to={`/${repo.owner.username}/${repo.name}/pulls`}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'pulls'
              ? 'border-purple-500 text-purple-400 font-semibold'
              : 'border-transparent text-dark-400 hover:text-white'
          }`}
        >
          <GitPullRequest className="h-4 w-4" />
          <span>Pull Requests</span>
        </Link>

        <Link
          to={`/${repo.owner.username}/${repo.name}/members`}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
            activeTab === 'members'
              ? 'border-purple-500 text-purple-400 font-semibold'
              : 'border-transparent text-dark-400 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Members</span>
        </Link>

        {(repo.userRole === 'OWNER' || repo.userRole === 'ADMIN') && (
          <Link
            to={`/${repo.owner.username}/${repo.name}/settings`}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-purple-500 text-purple-400 font-semibold'
                : 'border-transparent text-dark-400 hover:text-white'
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        )}
      </nav>
    </div>
  );
};
