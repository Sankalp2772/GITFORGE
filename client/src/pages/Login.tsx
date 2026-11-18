import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderGit2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const Login: React.FC = () => {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/auth/login', {
        login: loginInput,
        password,
      });

      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-dark-600 bg-dark-800 p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 mb-3">
            <FolderGit2 className="h-6 w-6 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign in to GitForge</h1>
          <p className="mt-1 text-xs text-dark-400">Welcome back! Please enter your details.</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-500/50 p-3 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dark-300 mb-1.5">
              Username or Email
            </label>
            <input
              type="text"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              required
              placeholder="e.g. alice or alice@gitforge.dev"
              className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3.5 py-2.5 text-sm text-white placeholder-dark-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3.5 py-2.5 text-sm text-white placeholder-dark-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-dark-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-all"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-dark-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-purple-400 hover:text-purple-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};
