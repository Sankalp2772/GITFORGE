import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, UserPlus, Shield, Trash2, Mail, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { Repository, Member, Invitation } from '../types';
import { RepoHeader } from '../components/repo/RepoHeader';
import { useAuth } from '../context/AuthContext';

export const RepoMembers: React.FC = () => {
  const { owner, repo: repoName } = useParams<{ owner: string; repo: string }>();
  const { user } = useAuth();

  const [repo, setRepo] = useState<Repository | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'WRITE' | 'READ'>('WRITE');
  const [inviteError, setInviteError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = async () => {
    try {
      const [rRes, mRes] = await Promise.all([
        api.get(`/repositories/${owner}/${repoName}`),
        api.get(`/repositories/${owner}/${repoName}/members`),
      ]);
      setRepo(rRes.data.repository);
      setMembers(mRes.data.members || []);

      // If user has admin/owner rights, load pending invitations
      if (rRes.data.repository.userRole === 'OWNER' || rRes.data.repository.userRole === 'ADMIN') {
        const invRes = await api.get(`/repositories/${owner}/${repoName}/members/invitations`);
        setInvitations(invRes.data.invitations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [owner, repoName]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    try {
      await api.post(`/repositories/${owner}/${repoName}/members/invite`, {
        username: inviteInput.includes('@') ? undefined : inviteInput,
        email: inviteInput.includes('@') ? inviteInput : undefined,
        role: inviteRole,
      });

      setSuccessMessage(`Invitation sent to ${inviteInput}`);
      setInviteModalOpen(false);
      setInviteInput('');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadData();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    try {
      await api.patch(`/repositories/${owner}/${repoName}/members/${memberId}/role`, { role });
      setSuccessMessage('Member role updated');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the repository?')) return;
    try {
      await api.delete(`/repositories/${owner}/${repoName}/members/${memberId}`);
      setSuccessMessage('Member removed');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    try {
      await api.delete(`/repositories/${owner}/${repoName}/members/invitations/${invitationId}`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invitation');
    }
  };

  if (!repo) return null;

  const canManage = repo.userRole === 'OWNER' || repo.userRole === 'ADMIN';

  return (
    <div>
      <RepoHeader repo={repo} activeTab="members" />

      {successMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header action bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            <span>Repository Collaborators</span>
          </h2>
          <p className="text-xs text-dark-400 mt-0.5">
            Manage who has read, write, or administrative access to this Git repository.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-purple-500 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Members Table */}
        <div className="rounded-xl border border-dark-600 bg-dark-800 overflow-hidden">
          <div className="border-b border-dark-600 bg-dark-800 px-5 py-3 text-xs font-semibold text-white">
            Members ({members.length + 1})
          </div>

          <div className="divide-y divide-dark-700">
            {/* Repository Owner */}
            <div className="flex items-center justify-between p-4 bg-dark-800">
              <div className="flex items-center gap-3">
                <img
                  src={repo.owner.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${repo.owner.username}`}
                  alt={repo.owner.username}
                  className="h-9 w-9 rounded-full bg-dark-700"
                />
                <div>
                  <div className="font-semibold text-sm text-white flex items-center gap-2">
                    <span>{repo.owner.username}</span>
                    <span className="rounded bg-purple-950/50 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                      OWNER
                    </span>
                  </div>
                  <div className="text-xs text-dark-400">{repo.owner.email}</div>
                </div>
              </div>
              <span className="text-xs text-dark-400 italic">Repository Owner</span>
            </div>

            {/* Other Members */}
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4 hover:bg-dark-700/40 transition-colors">
                <div className="flex items-center gap-3">
                  <img
                    src={m.user.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${m.user.username}`}
                    alt={m.user.username}
                    className="h-9 w-9 rounded-full bg-dark-700"
                  />
                  <div>
                    <div className="font-semibold text-sm text-white">{m.user.username}</div>
                    <div className="text-xs text-dark-400">{m.user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {canManage ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleChangeRole(m.id, e.target.value)}
                      className="rounded border border-dark-600 bg-dark-900 px-2.5 py-1 text-xs text-white focus:border-purple-500 focus:outline-none cursor-pointer"
                    >
                      <option value="READ">READ (View/Clone)</option>
                      <option value="WRITE">WRITE (Push/Branch)</option>
                      <option value="ADMIN">ADMIN (Full Access)</option>
                    </select>
                  ) : (
                    <span className="rounded bg-dark-700 border border-dark-600 px-2 py-0.5 text-xs text-dark-300 font-medium">
                      {m.role}
                    </span>
                  )}

                  {canManage && (
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="rounded p-1 text-dark-400 hover:text-red-400 hover:bg-dark-700 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invitations Table */}
        {canManage && invitations.length > 0 && (
          <div className="rounded-xl border border-dark-600 bg-dark-800 overflow-hidden">
            <div className="border-b border-dark-600 bg-dark-800 px-5 py-3 text-xs font-semibold text-white flex items-center gap-2">
              <Mail className="h-4 w-4 text-purple-400" />
              <span>Pending Invitations ({invitations.length})</span>
            </div>

            <div className="divide-y divide-dark-700">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-4 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={inv.invitedUser?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${inv.invitedUser?.username}`}
                      alt={inv.invitedUser?.username}
                      className="h-8 w-8 rounded-full bg-dark-700"
                    />
                    <div>
                      <div className="font-semibold text-white">{inv.invitedUser?.username}</div>
                      <div className="text-dark-400">{inv.invitedUser?.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded bg-purple-950/40 border border-purple-500/30 px-2 py-0.5 text-[11px] text-purple-300">
                      Role: {inv.role}
                    </span>
                    <button
                      onClick={() => handleCancelInvite(inv.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-medium"
                    >
                      Cancel Invitation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-dark-600 bg-dark-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Invite a collaborator</h3>
            <p className="text-xs text-dark-400 mb-4">
              Search for registered GitForge users by username or email.
            </p>

            {inviteError && (
              <p className="text-xs text-red-400 mb-3">{inviteError}</p>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dark-300 mb-1">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  required
                  placeholder="e.g. bob or bob@gitforge.dev"
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-300 mb-1">
                  Permission Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="READ">READ – Clone, pull, and browse code</option>
                  <option value="WRITE">WRITE – Clone, pull, push, and create branches</option>
                  <option value="ADMIN">ADMIN – Full repository and member management</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-lg border border-dark-600 px-3 py-1.5 text-xs text-dark-300 hover:bg-dark-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
