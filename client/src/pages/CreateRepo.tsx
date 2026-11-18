import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderGit2, Lock, Globe, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const CreateRepo: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [initializeWithReadme, setInitializeWithReadme] = useState(true);
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/repositories', {
        name,
        description,
        visibility,
        initializeWithReadme,
        defaultBranch,
      });

      navigate(`/${user?.username}/${res.data.repository.name}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create repository');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="border-b border-dark-600 pb-4 mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FolderGit2 className="h-6 w-6 text-purple-400" />
          <span>Create a new repository</span>
        </h1>
        <p className="mt-1 text-xs text-dark-300">
          A repository contains all project files, revision history, branches, issues, and collaboration settings.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-500/50 p-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Owner / Name */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-dark-300 mb-1.5">Owner</label>
            <div className="flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-dark-200 font-medium">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`}
                alt={user?.username}
                className="h-5 w-5 rounded-full"
              />
              <span>{user?.username}</span>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-dark-300 mb-1.5">
              Repository name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '-'))}
              required
              placeholder="e.g. awesome-engine"
              className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3.5 py-2 text-sm text-white placeholder-dark-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-dark-300 mb-1.5">
            Description <span className="text-dark-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description of your project"
            className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3.5 py-2 text-sm text-white placeholder-dark-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Visibility */}
        <div className="space-y-3 pt-2 border-t border-dark-700">
          <label className="block text-xs font-semibold text-dark-300">Visibility</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                visibility === 'PUBLIC'
                  ? 'border-purple-500 bg-purple-950/20 text-white'
                  : 'border-dark-600 bg-dark-800 text-dark-300 hover:border-dark-500'
              }`}
            >
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'PUBLIC'}
                onChange={() => setVisibility('PUBLIC')}
                className="mt-1 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  <Globe className="h-4 w-4 text-purple-400" />
                  <span>Public</span>
                </div>
                <p className="mt-1 text-xs text-dark-400">
                  Anyone on the internet can see this repository. You choose who can commit.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                visibility === 'PRIVATE'
                  ? 'border-purple-500 bg-purple-950/20 text-white'
                  : 'border-dark-600 bg-dark-800 text-dark-300 hover:border-dark-500'
              }`}
            >
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'PRIVATE'}
                onChange={() => setVisibility('PRIVATE')}
                className="mt-1 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <span>Private</span>
                </div>
                <p className="mt-1 text-xs text-dark-400">
                  Only you and authorized repository members can view and commit.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Options */}
        <div className="pt-2 border-t border-dark-700 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={initializeWithReadme}
              onChange={(e) => setInitializeWithReadme(e.target.checked)}
              className="mt-1 rounded border-dark-600 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="text-xs font-semibold text-white">Add a README.md file</span>
              <p className="text-xs text-dark-400">
                This will initialize the bare Git repository with an initial commit on the default branch.
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-dark-600 px-4 py-2 text-xs font-semibold text-dark-300 hover:bg-dark-800 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-lg bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-purple-500 disabled:opacity-50"
          >
            {submitting ? 'Creating repository...' : 'Create Repository'}
          </button>
        </div>
      </form>
    </div>
  );
};
