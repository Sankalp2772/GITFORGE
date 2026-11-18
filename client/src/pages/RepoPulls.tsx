import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GitPullRequest, Plus, MessageSquare, CheckCircle, Clock, GitMerge, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { Repository, PullRequest } from '../types';
import { RepoHeader } from '../components/repo/RepoHeader';
import { useAuth } from '../context/AuthContext';

export const RepoPulls: React.FC = () => {
  const { owner, repo: repoName } = useParams<{ owner: string; repo: string }>();
  const { user } = useAuth();

  const [repo, setRepo] = useState<Repository | null>(null);
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [newPROpen, setNewPROpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // New PR state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceBranch, setSourceBranch] = useState('');
  const [targetBranch, setTargetBranch] = useState('main');
  const [newPRError, setNewPRError] = useState('');

  // Comment state
  const [commentText, setCommentText] = useState('');

  const loadData = async () => {
    try {
      const [rRes, pRes] = await Promise.all([
        api.get(`/repositories/${owner}/${repoName}`),
        api.get(`/repositories/${owner}/${repoName}/pulls?status=OPEN`),
      ]);
      setRepo(rRes.data.repository);
      setBranches(rRes.data.repository.branches || ['main']);
      if (rRes.data.repository.branches?.length > 1) {
        setSourceBranch(rRes.data.repository.branches[1]);
      }
      setPulls(pRes.data.pullRequests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [owner, repoName]);

  const viewPRDetails = async (prNumber: number) => {
    try {
      const res = await api.get(`/repositories/${owner}/${repoName}/pulls/${prNumber}`);
      setSelectedPR(res.data.pullRequest);
    } catch (err: any) {
      alert(err.message || 'Failed to load pull request details');
    }
  };

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewPRError('');
    try {
      await api.post(`/repositories/${owner}/${repoName}/pulls`, {
        title,
        description,
        sourceBranch,
        targetBranch,
      });
      setNewPROpen(false);
      setTitle('');
      setDescription('');
      loadData();
    } catch (err: any) {
      setNewPRError(err.message || 'Failed to create pull request');
    }
  };

  const handleMergePR = async (prNumber: number) => {
    if (!window.confirm('Are you sure you want to merge this pull request?')) return;
    try {
      await api.post(`/repositories/${owner}/${repoName}/pulls/${prNumber}/merge`);
      alert('Pull request merged successfully!');
      setSelectedPR(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Merge failed');
    }
  };

  const handleAddComment = async (prNumber: number) => {
    if (!commentText.trim()) return;
    try {
      await api.post(`/repositories/${owner}/${repoName}/pulls/${prNumber}/comments`, {
        content: commentText,
      });
      setCommentText('');
      viewPRDetails(prNumber);
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    }
  };

  if (!repo) return null;

  return (
    <div>
      <RepoHeader repo={repo} activeTab="pulls" />

      {selectedPR ? (
        /* PR Detail View */
        <div className="space-y-6">
          <button
            onClick={() => setSelectedPR(null)}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
          >
            &larr; Back to pull requests
          </button>

          <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{selectedPR.title}</span>
                  <span className="text-dark-400 font-mono text-base font-normal">#{selectedPR.number}</span>
                </h2>
                <div className="mt-2 flex items-center gap-3 text-xs text-dark-300">
                  <span className="rounded-full bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 text-emerald-300 font-semibold uppercase">
                    {selectedPR.status}
                  </span>
                  <span>
                    <strong className="text-white">{selectedPR.author.username}</strong> wants to merge into{' '}
                    <span className="font-mono text-purple-400">{selectedPR.targetBranch}</span> from{' '}
                    <span className="font-mono text-purple-400">{selectedPR.sourceBranch}</span>
                  </span>
                </div>
              </div>

              {selectedPR.status === 'OPEN' && (
                <button
                  onClick={() => handleMergePR(selectedPR.number)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500"
                >
                  <GitMerge className="h-4 w-4" />
                  <span>Merge Pull Request</span>
                </button>
              )}
            </div>

            {selectedPR.description && (
              <div className="mt-4 pt-4 border-t border-dark-700 text-sm text-dark-200">
                {selectedPR.description}
              </div>
            )}
          </div>

          {/* Unified Diff */}
          {selectedPR.diff && (
            <div className="rounded-xl border border-dark-600 bg-dark-900 overflow-hidden">
              <div className="border-b border-dark-700 bg-dark-800 px-4 py-2.5 text-xs font-semibold text-white">
                Changes ({selectedPR.sourceBranch} &rarr; {selectedPR.targetBranch})
              </div>
              <pre className="p-4 text-xs font-mono text-dark-200 overflow-x-auto whitespace-pre leading-relaxed">
                {selectedPR.diff}
              </pre>
            </div>
          )}

          {/* Comments & Discussion */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Discussion</h3>
            <div className="space-y-3">
              {selectedPR.comments?.map((c) => (
                <div key={c.id} className="rounded-xl border border-dark-600 bg-dark-800 p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs text-dark-400">
                    <img
                      src={c.author.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.author.username}`}
                      alt={c.author.username}
                      className="h-5 w-5 rounded-full"
                    />
                    <span className="font-bold text-white">{c.author.username}</span>
                    <span>commented on {new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-dark-200">{c.content}</p>
                </div>
              ))}
            </div>

            {/* Add Comment Box */}
            <div className="rounded-xl border border-dark-600 bg-dark-800 p-4">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Leave a comment on this pull request..."
                rows={3}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 p-3 text-xs text-white placeholder-dark-500 focus:border-purple-500 focus:outline-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => handleAddComment(selectedPR.number)}
                  className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500"
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PR List */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-purple-400" />
              <span>Pull Requests</span>
            </h2>
            <button
              onClick={() => setNewPROpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-purple-500"
            >
              <Plus className="h-4 w-4" />
              <span>New Pull Request</span>
            </button>
          </div>

          <div className="rounded-xl border border-dark-600 bg-dark-800 overflow-hidden divide-y divide-dark-700">
            {pulls.length === 0 ? (
              <div className="p-8 text-center text-xs text-dark-400">
                No open pull requests found.
              </div>
            ) : (
              pulls.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => viewPRDetails(pr.number)}
                  className="flex items-center justify-between p-4 hover:bg-dark-700/50 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm text-white hover:text-purple-400">
                      {pr.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-dark-400">
                      <span>#{pr.number}</span>
                      <span>by {pr.author.username}</span>
                      <span>({pr.sourceBranch} &rarr; {pr.targetBranch})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-dark-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {pr._count?.comments || 0}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* New PR Modal */}
      {newPROpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-dark-600 bg-dark-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Open a Pull Request</h3>

            {newPRError && (
              <p className="text-xs text-red-400 mb-3">{newPRError}</p>
            )}

            <form onSubmit={handleCreatePR} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-300 mb-1">
                    Target Branch (Base)
                  </label>
                  <select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white"
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-300 mb-1">
                    Source Branch (Compare)
                  </label>
                  <select
                    value={sourceBranch}
                    onChange={(e) => setSourceBranch(e.target.value)}
                    className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white"
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-300 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Implement thread pooling"
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Explain what changes are being proposed..."
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewPROpen(false)}
                  className="rounded-lg border border-dark-600 px-3 py-1.5 text-xs text-dark-300 hover:bg-dark-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500"
                >
                  Create Pull Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
