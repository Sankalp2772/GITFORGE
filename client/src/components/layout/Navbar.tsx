import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitBranch, Plus, Bell, Search, LogOut, User, FolderGit2, Check, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { NotificationItem } from '../../types';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Ignore background errors
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/all/read');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Ignore
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-dark-600 bg-dark-800 px-6">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-white hover:text-purple-400 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <FolderGit2 className="h-5 w-5 text-purple-400" />
          </div>
          <span>GitForge</span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-dark-300">
            <Link to="/" className="hover:text-white transition-colors">Dashboard</Link>
            <Link to="/explore" className="hover:text-white transition-colors">Explore</Link>
            <Link to="/build-engine" className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors font-semibold">
              <FolderGit2 className="h-4 w-4 text-purple-400" />
              Build Engine
            </Link>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link
              to="/new"
              className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>New Repo</span>
            </Link>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative rounded-lg p-2 text-dark-300 hover:bg-dark-700 hover:text-white transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] font-bold text-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-dark-600 bg-dark-800 shadow-xl py-2 z-50">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-dark-700">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-dark-700">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-dark-400">No notifications</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs ${!n.isRead ? 'bg-purple-900/10' : ''} hover:bg-dark-700/50`}
                        >
                          <div className="font-medium text-white">{n.title}</div>
                          <div className="mt-0.5 text-dark-300">{n.content}</div>
                          <div className="mt-1 text-[10px] text-dark-400">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-dark-600 p-0.5 hover:ring-2 hover:ring-purple-500 transition-all"
              >
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`}
                  alt={user.username}
                  className="h-8 w-8 rounded-full bg-dark-700"
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-lg border border-dark-600 bg-dark-800 shadow-xl py-1 z-50">
                  <div className="px-4 py-2 border-b border-dark-700">
                    <p className="text-xs text-dark-400">Signed in as</p>
                    <p className="truncate text-sm font-semibold text-white">{user.username}</p>
                  </div>
                  <Link
                    to={`/${user.username}`}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-dark-200 hover:bg-dark-700 hover:text-white"
                  >
                    <User className="h-4 w-4" />
                    <span>Your Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-dark-700 hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-dark-200 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
