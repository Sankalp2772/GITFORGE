import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../../api/client';

export interface RepositoryItem {
  id: string;
  name: string;
  defaultBranch: string;
  storagePath?: string;
  owner: {
    id: string;
    username: string;
    avatar?: string;
  };
}

export interface DetectedProjectInfo {
  kind: string;
  name: string;
  confidence: number;
  description: string;
  primaryLanguage: string;
  frameworks: string[];
  buildSystem: string;
  entryPoint?: string;
  components?: any[];
  evidence: string[];
}

interface BuildEngineContextType {
  repositories: RepositoryItem[];
  selectedRepo: RepositoryItem | null;
  selectedBranch: string;
  selectedCommit: string;
  detectedProject: DetectedProjectInfo | null;
  activeScanId: string;
  activeJobId: string;
  loadingDetection: boolean;
  setSelectedRepoId: (id: string) => void;
  setSelectedBranch: (branch: string) => void;
  setSelectedCommit: (sha: string) => void;
  setActiveScanId: (scanId: string) => void;
  setActiveJobId: (jobId: string) => void;
  refreshDetection: () => Promise<void>;
}

const BuildEngineContext = createContext<BuildEngineContextType | undefined>(undefined);

export const BuildEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<RepositoryItem[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepositoryItem | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [selectedCommit, setSelectedCommit] = useState<string>('HEAD');
  const [detectedProject, setDetectedProject] = useState<DetectedProjectInfo | null>(null);
  const [activeScanId, setActiveScanIdState] = useState<string>(() => {
    return localStorage.getItem('gitforge_active_scan_id') || '';
  });
  const [activeJobId, setActiveJobIdState] = useState<string>(() => {
    return localStorage.getItem('gitforge_build_job_id') || '';
  });
  const [loadingDetection, setLoadingDetection] = useState<boolean>(false);

  // Fetch repositories on mount
  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await api.get('/build-engine/repositories');
        const list: RepositoryItem[] = res.data.repositories || [];
        setRepositories(list);

        if (list.length > 0) {
          const savedId = localStorage.getItem('gitforge_selected_repo_id');
          const found = list.find(r => r.id === savedId) || list[0];
          setSelectedRepo(found);
          setSelectedBranch(found.defaultBranch || 'main');
        }
      } catch (err) {
        console.error('Failed to load repositories for Build Engine:', err);
      }
    };
    fetchRepos();
  }, []);

  const runDetection = async (repo: RepositoryItem, branch: string) => {
    setLoadingDetection(true);
    setDetectedProject(null);
    try {
      const res = await api.get(`/build-engine/repositories/${repo.id}/detect?commitSha=${branch}`);
      if (res.data.detected && res.data.project) {
        setDetectedProject(res.data.project);
      }
    } catch (err) {
      console.warn('Detection failed for repository:', repo.name, err);
    } finally {
      setLoadingDetection(false);
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      localStorage.setItem('gitforge_selected_repo_id', selectedRepo.id);
      runDetection(selectedRepo, selectedBranch);
    }
  }, [selectedRepo?.id, selectedBranch]);

  const setSelectedRepoId = (id: string) => {
    const found = repositories.find(r => r.id === id);
    if (found && found.id !== selectedRepo?.id) {
      setSelectedRepo(found);
      setSelectedBranch(found.defaultBranch || 'main');
      setSelectedCommit('HEAD');
      // Invalidate previous job ID and scan ID when switching repos
      setActiveJobIdState('');
      setActiveScanIdState('');
      localStorage.removeItem('gitforge_build_job_id');
      localStorage.removeItem('gitforge_active_scan_id');
    }
  };

  const setActiveScanId = (scanId: string) => {
    setActiveScanIdState(scanId);
    if (scanId) {
      localStorage.setItem('gitforge_active_scan_id', scanId);
    } else {
      localStorage.removeItem('gitforge_active_scan_id');
    }
  };

  const setActiveJobId = (jobId: string) => {
    setActiveJobIdState(jobId);
    if (jobId) {
      localStorage.setItem('gitforge_build_job_id', jobId);
    } else {
      localStorage.removeItem('gitforge_build_job_id');
    }
  };

  const refreshDetection = async () => {
    if (selectedRepo) {
      await runDetection(selectedRepo, selectedBranch);
    }
  };

  return (
    <BuildEngineContext.Provider
      value={{
        repositories,
        selectedRepo,
        selectedBranch,
        selectedCommit,
        detectedProject,
        activeScanId,
        activeJobId,
        loadingDetection,
        setSelectedRepoId,
        setSelectedBranch,
        setSelectedCommit,
        setActiveScanId,
        setActiveJobId,
        refreshDetection,
      }}
    >
      {children}
    </BuildEngineContext.Provider>
  );
};

export const useBuildEngine = () => {
  const context = useContext(BuildEngineContext);
  if (!context) {
    throw new Error('useBuildEngine must be used within a BuildEngineProvider');
  }
  return context;
};
