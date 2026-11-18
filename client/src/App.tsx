import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CreateRepo } from './pages/CreateRepo';
import { RepoCode } from './pages/RepoCode';
import { RepoCommits } from './pages/RepoCommits';
import { RepoMembers } from './pages/RepoMembers';
import { RepoPulls } from './pages/RepoPulls';
import { RepoIssues } from './pages/RepoIssues';
import { RepoSettings } from './pages/RepoSettings';
import { Explore } from './pages/Explore';
import { Profile } from './pages/Profile';

// Build Engine
import { BuildEngineLayout } from './build-engine/components/BuildEngineLayout';
import { EngineOverview } from './build-engine/pages/EngineOverview';
import { EngineScanner } from './build-engine/pages/EngineScanner';
import { EngineDependencyGraph } from './build-engine/pages/EngineDependencyGraph';
import { EngineChangeDetection } from './build-engine/pages/EngineChangeDetection';
import { EngineAffectedFiles } from './build-engine/pages/EngineAffectedFiles';
import { EngineBuildPlanner } from './build-engine/pages/EngineBuildPlanner';
import { EngineBuildExecution } from './build-engine/pages/EngineBuildExecution';
import { EngineCache } from './build-engine/pages/EngineCache';
import { EngineRunManager } from './build-engine/pages/EngineRunManager';
import { EngineBuildHistory } from './build-engine/pages/EngineBuildHistory';
import { EngineSettings } from './build-engine/pages/EngineSettings';
import { EngineEnvironment } from './build-engine/pages/EngineEnvironment';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Build Engine Dashboard - Separate Subsystem */}
          <Route path="/build-engine" element={<ProtectedRoute />}>
            <Route element={<BuildEngineLayout />}>
              <Route index element={<EngineOverview />} />
              <Route path="repositories" element={<EngineOverview />} />
              <Route path="environment" element={<EngineEnvironment />} />
              <Route path="scanner" element={<EngineScanner />} />
              <Route path="dependency-graph" element={<EngineDependencyGraph />} />
              <Route path="change-detection" element={<EngineChangeDetection />} />
              <Route path="affected-files" element={<EngineAffectedFiles />} />
              <Route path="planner" element={<EngineBuildPlanner />} />
              <Route path="scheduler" element={<EngineBuildPlanner />} />
              <Route path="execution" element={<EngineBuildExecution />} />
              <Route path="cache" element={<EngineCache />} />
              <Route path="run" element={<EngineRunManager />} />
              <Route path="history" element={<EngineBuildHistory />} />
              <Route path="settings" element={<EngineSettings />} />
            </Route>
          </Route>

          <Route element={<Layout />}>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/explore" element={<Explore />} />

            {/* Authenticated routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new" element={<CreateRepo />} />
              <Route path="/:username" element={<Profile />} />
            </Route>

            {/* Repository routes (Permissions checked internally per repository) */}
            <Route path="/:owner/:repo" element={<RepoCode />} />
            <Route path="/:owner/:repo/commits" element={<RepoCommits />} />
            <Route path="/:owner/:repo/members" element={<RepoMembers />} />
            <Route path="/:owner/:repo/pulls" element={<RepoPulls />} />
            <Route path="/:owner/:repo/issues" element={<RepoIssues />} />
            <Route path="/:owner/:repo/settings" element={<RepoSettings />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
