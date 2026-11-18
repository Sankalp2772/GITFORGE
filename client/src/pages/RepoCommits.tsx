import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { GitCommit, Clock, ArrowLeft, GitCompare } from 'lucide-react';
import { api } from '../api/client';
import { Repository, CommitInfo } from '../types';
import { RepoHeader } from '../components/repo/RepoHeader';

export const RepoCommits: React.FC = () => {
  const { owner, repo: repoName } = useParams<{ owner: string; repo: string }>();
  const [searchParams] = useSearchParams();
  const currentRef = searchParams.get('ref') || 'main';

  const [repo, setRepo] = useState<Repository | null>(null);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rRes, cRes] = await Promise.all([
          api.get(`/repositories/${owner}/${repoName}`),
          api.get(`/repositories/${owner}/${repoName}/commits?ref=${currentRef}&limit=50`),
        ]);
        setRepo(rRes.data.repository);
        setCommits(cRes.data.commits || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [owner, repoName, currentRef]);

  const viewCommitDiff = async (sha: string) => {
    try {
      const res = await api.get(`/repositories/${owner}/${repoName}/commits/${sha}`);
      setSelectedCommit(res.data.commit);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch commit details');
    }
  };

  if (!repo) return null;

  return (
    <div>
      <RepoHeader repo={repo} activeTab="code" />

      {selectedCommit ? (
        /* Commit Details & Diff View */
        <div className="space-y-4">
          <button
            onClick={() => setSelectedCommit(null)}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to commit history</span>
          </button>

          <div className="rounded-xl border border-dark-600 bg-dark-800 p-5">
            <h2 className="text-base font-bold text-white mb-2">{selectedCommit.message}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-dark-400">
              <span>Author: <strong className="text-dark-200">{selectedCommit.authorName}</strong></span>
              <span>SHA: <strong className="font-mono text-purple-400">{selectedCommit.sha}</strong></span>
              <span>Date: {new Date(selectedCommit.date).toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-xl border border-dark-600 bg-dark-900 overflow-hidden">
            <div className="border-b border-dark-700 bg-dark-800 px-4 py-2.5 text-xs font-semibold text-white flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-purple-400" />
              <span>Commit Diff</span>
            </div>
            <pre className="p-4 text-xs font-mono text-dark-200 overflow-x-auto whitespace-pre leading-relaxed">
              {selectedCommit.diff || 'No text changes in this commit.'}
            </pre>
          </div>
        </div>
      ) : (
        /* Commits List */
        <div className="rounded-xl border border-dark-600 bg-dark-800 overflow-hidden">
          <div className="border-b border-dark-600 bg-dark-800 px-5 py-3 text-xs font-semibold text-white flex items-center gap-2">
            <GitCommit className="h-4 w-4 text-purple-400" />
            <span>Commits on ref: <span className="text-purple-400 font-mono">{currentRef}</span></span>
          </div>

          <div className="divide-y divide-dark-700">
            {commits.length === 0 ? (
              <div className="p-8 text-center text-xs text-dark-400">No commits found</div>
            ) : (
              commits.map((c) => (
                <div
                  key={c.sha}
                  onClick={() => viewCommitDiff(c.sha)}
                  className="flex items-center justify-between p-4 hover:bg-dark-700/50 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm text-white hover:text-purple-400">
                      {c.message}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-dark-400">
                      <span>{c.authorName}</span>
                      <span>committed on {new Date(c.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-purple-400 bg-purple-950/40 border border-purple-500/30 rounded px-2 py-0.5">
                      {c.sha.substring(0, 7)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
