import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Folder,
  FileText,
  GitBranch,
  GitCommit,
  Clock,
  ChevronRight,
  Eye,
  FileCode,
  Download,
  Plus
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { api } from '../api/client';
import { Repository, TreeItem, CommitInfo } from '../types';
import { RepoHeader } from '../components/repo/RepoHeader';
import { MarkdownViewer } from '../components/MarkdownViewer';

export const RepoCode: React.FC = () => {
  const { owner, repo: repoName } = useParams<{ owner: string; repo: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentRef = searchParams.get('ref') || 'main';
  const currentPath = searchParams.get('path') || '';

  const [repo, setRepo] = useState<Repository | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [latestCommits, setLatestCommits] = useState<CommitInfo[]>([]);
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New branch modal
  const [newBranchOpen, setNewBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [branchError, setBranchError] = useState('');

  const loadRepo = async () => {
    try {
      const res = await api.get(`/repositories/${owner}/${repoName}`);
      setRepo(res.data.repository);
      setBranches(res.data.repository.branches || ['main']);
    } catch (err: any) {
      setError(err.message || 'Failed to load repository');
    }
  };

  const loadTreeAndCommits = async () => {
    try {
      setLoading(true);
      const [treeRes, commitsRes] = await Promise.all([
        api.get(`/repositories/${owner}/${repoName}/tree?ref=${currentRef}&path=${currentPath}`),
        api.get(`/repositories/${owner}/${repoName}/commits?ref=${currentRef}&limit=5`),
      ]);

      setTree(treeRes.data.tree || []);
      setLatestCommits(commitsRes.data.commits || []);

      // Check if viewing a specific file or folder
      const isFile = currentPath && !treeRes.data.tree?.length;
      if (isFile) {
        try {
          const blobRes = await api.get(`/repositories/${owner}/${repoName}/blob?ref=${currentRef}&path=${currentPath}`);
          setSelectedFileContent(blobRes.data.content);
        } catch {
          setSelectedFileContent('Unable to display file content.');
        }
      } else {
        setSelectedFileContent(null);
        // Look for README.md in tree
        const hasReadme = treeRes.data.tree?.find((i: TreeItem) => i.name.toLowerCase() === 'readme.md');
        if (hasReadme) {
          try {
            const readmePath = currentPath ? `${currentPath}/README.md` : 'README.md';
            const blobRes = await api.get(`/repositories/${owner}/${repoName}/blob?ref=${currentRef}&path=${readmePath}`);
            setReadmeContent(blobRes.data.content);
          } catch {
            setReadmeContent('');
          }
        } else {
          setReadmeContent('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error browsing repository files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepo();
  }, [owner, repoName]);

  useEffect(() => {
    if (repo) {
      loadTreeAndCommits();
    }
  }, [owner, repoName, currentRef, currentPath, repo]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBranchError('');
    try {
      await api.post(`/repositories/${owner}/${repoName}/branches`, {
        name: newBranchName,
        startPoint: currentRef,
      });
      setNewBranchOpen(false);
      setNewBranchName('');
      loadRepo();
      setSearchParams({ ref: newBranchName, path: currentPath });
    } catch (err: any) {
      setBranchError(err.message || 'Failed to create branch');
    }
  };

  if (error || !repo) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-8 text-center text-red-300">
        <p className="font-semibold">{error || 'Repository not found'}</p>
      </div>
    );
  }

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div>
      <RepoHeader repo={repo} activeTab="code" />

      {/* Branch selector & Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {/* Branch Dropdown */}
          <div className="flex items-center rounded-lg border border-dark-600 bg-dark-800 px-3 py-1.5 text-xs font-semibold text-white">
            <GitBranch className="h-4 w-4 text-purple-400 mr-2" />
            <select
              value={currentRef}
              onChange={(e) => setSearchParams({ ref: e.target.value, path: currentPath })}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b} value={b} className="bg-dark-800 text-white">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* New branch button */}
          <button
            onClick={() => setNewBranchOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-dark-600 bg-dark-800 px-2.5 py-1.5 text-xs text-dark-300 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New branch</span>
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-dark-300">
            <button
              onClick={() => setSearchParams({ ref: currentRef, path: '' })}
              className="text-purple-400 hover:underline font-semibold"
            >
              {repo.name}
            </button>
            {breadcrumbs.map((part, idx) => {
              const full = breadcrumbs.slice(0, idx + 1).join('/');
              return (
                <React.Fragment key={full}>
                  <ChevronRight className="h-3 w-3 text-dark-500" />
                  <button
                    onClick={() => setSearchParams({ ref: currentRef, path: full })}
                    className="hover:underline text-dark-200"
                  >
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Commit History Link */}
        <Link
          to={`/${owner}/${repoName}/commits?ref=${currentRef}`}
          className="flex items-center gap-1.5 rounded-lg border border-dark-600 bg-dark-800 px-3 py-1.5 text-xs font-semibold text-dark-300 hover:text-white hover:bg-dark-700 transition-colors"
        >
          <GitCommit className="h-4 w-4 text-purple-400" />
          <span>Commits</span>
        </Link>
      </div>

      {/* Latest Commit Bar */}
      {latestCommits.length > 0 && (
        <div className="rounded-t-xl border border-dark-600 bg-dark-800 px-4 py-3 flex items-center justify-between text-xs text-dark-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{latestCommits[0].authorName}</span>
            <span className="text-dark-400 truncate max-w-md">{latestCommits[0].message}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-dark-400">
            <span className="font-mono text-purple-400">{latestCommits[0].sha.substring(0, 7)}</span>
            <span>{new Date(latestCommits[0].date).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      {/* Main Content Area: File Explorer or Monaco File Viewer */}
      {selectedFileContent !== null ? (
        /* Monaco Editor File Viewer */
        <div className="rounded-b-xl border border-t-0 border-dark-600 bg-dark-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-dark-700 bg-dark-800 px-4 py-2 text-xs text-dark-300">
            <span className="font-mono font-semibold text-white">{currentPath}</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-dark-400">{selectedFileContent.length} bytes</span>
            </div>
          </div>
          <div className="h-[550px] w-full">
            <Editor
              height="100%"
              theme="vs-dark"
              value={selectedFileContent}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>
      ) : (
        /* File Tree Table */
        <div className="rounded-b-xl border border-t-0 border-dark-600 bg-dark-800 overflow-hidden divide-y divide-dark-700">
          {tree.length === 0 ? (
            <div className="p-8 text-center text-xs text-dark-300 space-y-4">
              <div className="flex flex-col items-center justify-center gap-2">
                <Folder className="h-8 w-8 text-dark-500" />
                <h4 className="text-sm font-bold text-white">This repository is empty</h4>
                <p className="text-xs text-dark-400">Push an existing Git repository from your computer to get started.</p>
              </div>

              <div className="max-w-2xl mx-auto rounded-lg bg-dark-900 border border-dark-700 p-4 text-left font-mono text-[11px] space-y-3">
                <div>
                  <div className="text-purple-400 font-semibold mb-1 font-sans"># Option A: Push an existing folder / repository</div>
                  <pre className="text-dark-200 bg-dark-950 p-2.5 rounded border border-dark-800 overflow-x-auto select-all">
{`cd path/to/your/project
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin ${repo.cloneUrl}
git push -u origin main`}
                  </pre>
                </div>

                <div>
                  <div className="text-cyan-400 font-semibold mb-1 font-sans"># Option B: Push with existing remote</div>
                  <pre className="text-dark-200 bg-dark-950 p-2.5 rounded border border-dark-800 overflow-x-auto select-all">
{`git remote set-url origin ${repo.cloneUrl}
git push -u origin main`}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            tree.map((item) => (
              <div
                key={item.path}
                className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-dark-700/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {item.type === 'tree' ? (
                    <Folder className="h-4 w-4 text-purple-400" />
                  ) : (
                    <FileText className="h-4 w-4 text-dark-400" />
                  )}
                  <button
                    onClick={() => setSearchParams({ ref: currentRef, path: item.path })}
                    className="font-medium text-dark-200 hover:text-purple-400 hover:underline"
                  >
                    {item.name}
                  </button>
                </div>
                {item.size !== undefined && (
                  <span className="text-[11px] text-dark-500 font-mono">
                    {item.size} B
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* README.md Preview */}
      {readmeContent && (
        <div className="mt-8 rounded-xl border border-dark-600 bg-dark-800 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-dark-600 bg-dark-850 px-5 py-3 text-xs font-semibold text-white">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-purple-400" />
              <span className="font-mono">README.md</span>
            </div>
            <span className="text-[11px] text-dark-400 font-normal">Formatted Preview</span>
          </div>
          <div className="p-6 bg-dark-900/80">
            <MarkdownViewer content={readmeContent} />
          </div>
        </div>
      )}

      {/* New Branch Modal */}
      {newBranchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-dark-600 bg-dark-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Create a new branch</h3>
            <p className="text-xs text-dark-400 mb-4">
              Branch off from <span className="font-mono text-purple-400">{currentRef}</span>
            </p>

            {branchError && (
              <p className="text-xs text-red-400 mb-3">{branchError}</p>
            )}

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dark-300 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value.replace(/\s+/g, '-'))}
                  required
                  placeholder="e.g. feature/my-feature"
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewBranchOpen(false)}
                  className="rounded-lg border border-dark-600 px-3 py-1.5 text-xs text-dark-300 hover:bg-dark-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
