import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-dark-900 text-dark-100">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-dark-700 bg-dark-800 py-6 text-center text-xs text-dark-400">
        <p>GitForge &copy; 2026 – High-Performance Code Hosting Platform. Phase 2.</p>
      </footer>
    </div>
  );
};
