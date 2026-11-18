import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, FolderGit2, Search, GitBranch } from 'lucide-react';
import { api } from '../api/client';
import { Repository } from '../types';

export const Explore: React.FC = () => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await api.get('/repositories');
        setRepos(res.data.repositories || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.owner.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-purple-400" />
            <span>Explore Repositories</span>
          </h1>
          <p className="text-xs text-dark-400 mt-1">
            Discover public repositories hosted on GitForge.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-dark-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search repositories..."
            className="w-full rounded-lg border border-dark-600 bg-dark-800 pl-9 pr-3 py-2 text-xs text-white placeholder-dark-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((repo) => (
          <div
            key={repo.id}
            className="flex flex-col justify-between rounded-xl border border-dark-600 bg-dark-800 p-5 hover:border-purple-500/50 transition-all"
          >
            <div>
              <div className="flex items-center gap-2">
                <img
                  src={repo.owner.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${repo.owner.username}`}
                  alt={repo.owner.username}
                  className="h-5 w-5 rounded-full"
                />
                <span className="text-xs text-dark-400">{repo.owner.username}</span>
              </div>
              <Link
                to={`/${repo.owner.username}/${repo.name}`}
                className="mt-2 block font-bold text-base text-purple-400 hover:underline"
              >
                {repo.name}
              </Link>
              {repo.description && (
                <p className="mt-2 text-xs text-dark-300 line-clamp-2">{repo.description}</p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-dark-700 pt-3 text-[11px] text-dark-400">
              <span className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                {repo.defaultBranch}
              </span>
              <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
