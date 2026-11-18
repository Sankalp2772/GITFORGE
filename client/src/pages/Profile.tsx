import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Calendar, Save, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/profile', { bio, avatar });
      await refreshUser();
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-dark-600 pb-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="h-6 w-6 text-purple-400" />
          <span>User Profile</span>
        </h1>
        <p className="text-xs text-dark-400 mt-1">Manage your public persona and account settings.</p>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      <div className="rounded-xl border border-dark-600 bg-dark-800 p-6">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={avatar || user.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`}
            alt={user.username}
            className="h-16 w-16 rounded-full border-2 border-purple-500 bg-dark-700"
          />
          <div>
            <h2 className="text-lg font-bold text-white">{user.username}</h2>
            <p className="text-xs text-dark-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3.5 w-3.5" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dark-300 mb-1">
              Custom Avatar URL
            </label>
            <input
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://example.com/my-avatar.png"
              className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-300 mb-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell other developers about yourself..."
              className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 shadow"
            >
              <Save className="h-4 w-4" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
