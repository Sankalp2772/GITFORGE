import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { Repository } from '../types';
import { RepoHeader } from '../components/repo/RepoHeader';

export const RepoSettings: React.FC = () => {
  const { owner, repo: repoName } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();

  const [repo, setRepo] = useState<Repository | null>(null);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadRepo = async () => {
      try {
        const res = await api.get(`/repositories/${owner}/${repoName}`);
        setRepo(res.data.repository);
        setDescription(res.data.repository.description || '');
        setVisibility(res.data.repository.visibility);
        setDefaultBranch(res.data.repository.defaultBranch);
      } catch (err) {
        console.error(err);
      }
    };
    loadRepo();
  }, [owner, repoName]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/repositories/${owner}/${repoName}`, {
        description,
        visibility,
        defaultBranch,
      });
      setMessage('Repository settings updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmation = prompt(`To confirm deletion, type "${repo?.name}" below:`);
    if (confirmation !== repo?.name) {
      alert('Repository name does not match. Deletion cancelled.');
      return;
    }

    try {
      await api.delete(`/repositories/${owner}/${repoName}`);
      alert('Repository deleted successfully.');
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete repository');
    }
  };

  if (!repo) return null;

  return (
    <div>
      <RepoHeader repo={repo} activeTab="settings" />

      {message && (
        <div className="mb-6 rounded-lg bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-300">
          {message}
        </div>
      )}

      <div className="space-y-8 max-w-3xl">
        {/* General Settings */}
        <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
          <h2 className="text-base font-bold text-white mb-4">General Settings</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-dark-300 mb-1">
                Repository Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-300 mb-1">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white"
              >
                <option value="PUBLIC">PUBLIC – Anyone can clone and read</option>
                <option value="PRIVATE">PRIVATE – Restricted to authorized members</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        {repo.userRole === 'OWNER' && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-6">
            <h2 className="text-base font-bold text-red-400 flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Danger Zone</span>
            </h2>
            <p className="text-xs text-dark-300 mb-4">
              Permanently delete this repository, all Git revision trees, commits, branches, issues, and member records. This action cannot be undone.
            </p>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors shadow"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Repository</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
