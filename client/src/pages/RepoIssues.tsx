import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Plus, CheckCircle2, MessageSquare } from 'lucide-react';
import { api } from '../api/client';
import { Repository, Issue } from '../types';
import { RepoHeader } from '../components/repo/RepoHeader';

export const RepoIssues: React.FC = () => {
  const { owner, repo: repoName } = useParams<{ owner: string; repo: string }>();

  const [repo, setRepo] = useState<Repository | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [newIssueOpen, setNewIssueOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [commentText, setCommentText] = useState('');

  const loadData = async () => {
    try {
      const [rRes, iRes] = await Promise.all([
        api.get(`/repositories/${owner}/${repoName}`),
        api.get(`/repositories/${owner}/${repoName}/issues`),
      ]);
      setRepo(rRes.data.repository);
      setIssues(iRes.data.issues || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [owner, repoName]);

  const viewIssue = async (num: number) => {
    try {
      const res = await api.get(`/repositories/${owner}/${repoName}/issues/${num}`);
      setSelectedIssue(res.data.issue);
    } catch (err: any) {
      alert(err.message || 'Failed to load issue');
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/repositories/${owner}/${repoName}/issues`, {
        title,
        description,
      });
      setNewIssueOpen(false);
      setTitle('');
      setDescription('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create issue');
    }
  };

  const handleToggleStatus = async (num: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
      await api.patch(`/repositories/${owner}/${repoName}/issues/${num}/status`, {
        status: newStatus,
      });
      viewIssue(num);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update issue');
    }
  };

  const handleAddComment = async (num: number) => {
    if (!commentText.trim()) return;
    try {
      await api.post(`/repositories/${owner}/${repoName}/issues/${num}/comments`, {
        content: commentText,
      });
      setCommentText('');
      viewIssue(num);
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    }
  };

  if (!repo) return null;

  return (
    <div>
      <RepoHeader repo={repo} activeTab="issues" />

      {selectedIssue ? (
        /* Issue Detail View */
        <div className="space-y-6">
          <button
            onClick={() => setSelectedIssue(null)}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
          >
            &larr; Back to issues
          </button>

          <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{selectedIssue.title}</span>
                  <span className="text-dark-400 font-mono text-base font-normal">#{selectedIssue.number}</span>
                </h2>
                <div className="mt-2 flex items-center gap-3 text-xs text-dark-300">
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-semibold uppercase ${
                      selectedIssue.status === 'OPEN'
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                        : 'bg-purple-950/60 border border-purple-500/40 text-purple-300'
                    }`}
                  >
                    {selectedIssue.status}
                  </span>
                  <span>
                    Opened by <strong className="text-white">{selectedIssue.author.username}</strong> on{' '}
                    {new Date(selectedIssue.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleToggleStatus(selectedIssue.number, selectedIssue.status)}
                className="rounded-lg border border-dark-600 bg-dark-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-dark-600"
              >
                {selectedIssue.status === 'OPEN' ? 'Close Issue' : 'Reopen Issue'}
              </button>
            </div>

            {selectedIssue.description && (
              <div className="mt-4 pt-4 border-t border-dark-700 text-sm text-dark-200">
                {selectedIssue.description}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Comments</h3>
            <div className="space-y-3">
              {selectedIssue.comments?.map((c) => (
                <div key={c.id} className="rounded-xl border border-dark-600 bg-dark-800 p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs text-dark-400">
                    <img
                      src={c.author.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.author.username}`}
                      alt={c.author.username}
                      className="h-5 w-5 rounded-full"
                    />
                    <span className="font-bold text-white">{c.author.username}</span>
                    <span>on {new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-dark-200">{c.content}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-dark-600 bg-dark-800 p-4">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Leave a comment..."
                rows={3}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 p-3 text-xs text-white placeholder-dark-500 focus:border-purple-500 focus:outline-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => handleAddComment(selectedIssue.number)}
                  className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500"
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Issues List */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-purple-400" />
              <span>Issues</span>
            </h2>
            <button
              onClick={() => setNewIssueOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-purple-500"
            >
              <Plus className="h-4 w-4" />
              <span>New Issue</span>
            </button>
          </div>

          <div className="rounded-xl border border-dark-600 bg-dark-800 overflow-hidden divide-y divide-dark-700">
            {issues.length === 0 ? (
              <div className="p-8 text-center text-xs text-dark-400">
                No issues found.
              </div>
            ) : (
              issues.map((i) => (
                <div
                  key={i.id}
                  onClick={() => viewIssue(i.number)}
                  className="flex items-center justify-between p-4 hover:bg-dark-700/50 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm text-white hover:text-purple-400">
                      {i.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-dark-400">
                      <span>#{i.number}</span>
                      <span>opened by {i.author.username}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-dark-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {i._count?.comments || 0}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* New Issue Modal */}
      {newIssueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-dark-600 bg-dark-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create New Issue</h3>
            <form onSubmit={handleCreateIssue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dark-300 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Title of the issue"
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the issue or feature request in detail..."
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewIssueOpen(false)}
                  className="rounded-lg border border-dark-600 px-3 py-1.5 text-xs text-dark-300 hover:bg-dark-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500"
                >
                  Submit Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
