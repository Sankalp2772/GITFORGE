import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Lock,
  Globe,
  GitBranch,
  Clock,
  Mail,
  UserCheck,
  UserX,
  ExternalLink,
  Activity,
  CheckCircle2,
  GitPullRequest,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Repository, Invitation, ActivityItem } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  const loadDashboardData = async () => {
    try {
      const [repoRes, invRes, actRes] = await Promise.all([
        api.get('/repositories'),
        api.get('/user/invitations'),
        api.get('/notifications/activity'),
      ]);

      setRepositories(repoRes.data.repositories || []);
      setInvitations(invRes.data.invitations || []);
      setActivities(actRes.data.activityLogs || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleInvitation = async (invitationId: string, action: 'accept' | 'reject') => {
    try {
      await api.patch(`/user/invitations/${invitationId}/respond`, { action });
      setActionMessage(`Invitation ${action === 'accept' ? 'accepted' : 'rejected'}`);
      setTimeout(() => setActionMessage(''), 4000);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  const myRepos = repositories.filter((r) => r.ownerId === user?.id);
  const collabRepos = repositories.filter(
    (r) => r.ownerId !== user?.id && r.members?.some((m: any) => m.userId === user?.id)
  );

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-dark-600 bg-gradient-to-r from-dark-800 via-dark-800 to-purple-950/40 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back, <span className="text-purple-400">{user?.username}</span> 👋
            </h1>
            <p className="mt-1 text-sm text-dark-300">
              Host repositories, push & pull Git branches, review code, and manage team members.
            </p>
          </div>
          <Link
            to="/new"
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-purple-500 transition-all self-start md:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Repository</span>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Pending Invitations Alert */}
      {invitations.length > 0 && (
        <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-5">
          <div className="flex items-center gap-2 font-semibold text-sm text-purple-300 mb-3">
            <Mail className="h-4 w-4 text-purple-400" />
            <span>Pending Repository Invitations ({invitations.length})</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-dark-600 bg-dark-800 p-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-white">
                    {inv.repository?.owner?.username}/{inv.repository?.name}
                  </div>
                  <div className="text-dark-400 mt-0.5">
                    Invited as <span className="text-purple-400 font-medium">{inv.role}</span> by {inv.invitedBy?.username}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleInvitation(inv.id, 'accept')}
                    className="flex items-center gap-1 rounded bg-purple-600 px-2.5 py-1 text-white hover:bg-purple-500 transition-colors"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleInvitation(inv.id, 'reject')}
                    className="flex items-center gap-1 rounded bg-dark-700 px-2.5 py-1 text-dark-300 hover:bg-dark-600 transition-colors"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Repositories */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Repositories */}
          <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-purple-400" />
                <span>My Repositories ({myRepos.length})</span>
              </h2>
              <Link to="/new" className="text-xs font-semibold text-purple-400 hover:text-purple-300">
                + New
              </Link>
            </div>

            {myRepos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-dark-600 p-8 text-center">
                <FolderGit2 className="mx-auto h-8 w-8 text-dark-500 mb-2" />
                <p className="text-sm text-dark-300 font-medium">You don't have any repositories yet</p>
                <p className="text-xs text-dark-500 mt-1">Get started by creating your first bare Git repository.</p>
                <Link
                  to="/new"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-500"
                >
                  <Plus className="h-4 w-4" />
                  Create Repository
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-dark-700">
                {myRepos.map((repo) => (
                  <div key={repo.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/${repo.owner.username}/${repo.name}`}
                          className="font-bold text-sm text-purple-400 hover:text-purple-300 hover:underline"
                        >
                          {repo.name}
                        </Link>
                        <span className="flex items-center gap-1 rounded-full border border-dark-600 px-2 py-0.5 text-[10px] text-dark-400 font-medium">
                          {repo.visibility === 'PUBLIC' ? (
                            <><Globe className="h-3 w-3" /> Public</>
                          ) : (
                            <><Lock className="h-3 w-3 text-amber-400" /> Private</>
                          )}
                        </span>
                      </div>
                      {repo.description && (
                        <p className="mt-1 text-xs text-dark-300 line-clamp-1">{repo.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-dark-400">
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          {repo.defaultBranch}
                        </span>
                        <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <Link
                      to={`/${repo.owner.username}/${repo.name}`}
                      className="rounded p-1 text-dark-400 hover:bg-dark-700 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collaborator Repositories */}
          {collabRepos.length > 0 && (
            <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <GitBranch className="h-5 w-5 text-purple-400" />
                <span>Collaborating Repositories ({collabRepos.length})</span>
              </h2>
              <div className="divide-y divide-dark-700">
                {collabRepos.map((repo) => (
                  <div key={repo.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/${repo.owner.username}/${repo.name}`}
                          className="font-bold text-sm text-purple-400 hover:text-purple-300 hover:underline"
                        >
                          {repo.owner.username}/{repo.name}
                        </Link>
                        <span className="rounded-full border border-dark-600 px-2 py-0.5 text-[10px] text-dark-400 font-medium">
                          {repo.visibility}
                        </span>
                      </div>
                      {repo.description && (
                        <p className="mt-1 text-xs text-dark-300">{repo.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: User Profile Card & Recent Activity */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
            <div className="flex items-center gap-4">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${user?.username}`}
                alt={user?.username}
                className="h-14 w-14 rounded-full border-2 border-purple-500/50 bg-dark-700"
              />
              <div>
                <h3 className="font-bold text-white">{user?.username}</h3>
                <p className="text-xs text-dark-400">{user?.email}</p>
              </div>
            </div>
            {user?.bio && (
              <p className="mt-3 text-xs text-dark-300 italic border-l-2 border-purple-500/40 pl-2">
                "{user.bio}"
              </p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-dark-700 pt-3 text-center">
              <div>
                <div className="text-sm font-bold text-white">{myRepos.length}</div>
                <div className="text-[10px] text-dark-400 uppercase tracking-wider">Repos</div>
              </div>
              <div>
                <div className="text-sm font-bold text-white">{collabRepos.length}</div>
                <div className="text-[10px] text-dark-400 uppercase tracking-wider">Collab</div>
              </div>
              <div>
                <div className="text-sm font-bold text-white">{invitations.length}</div>
                <div className="text-[10px] text-dark-400 uppercase tracking-wider">Invites</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-purple-400" />
              <span>Recent Activity</span>
            </h3>
            {activities.length === 0 ? (
              <p className="text-xs text-dark-400 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 6).map((act, idx) => (
                  <div key={idx} className="text-xs border-l-2 border-purple-500/30 pl-3 py-0.5">
                    <p className="text-dark-200 font-medium">{act.details || act.action}</p>
                    <p className="text-[10px] text-dark-500 mt-0.5">
                      {new Date(act.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
