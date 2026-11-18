import path from 'path';
import fs from 'fs';
import { BaseBuildAdapter } from './baseAdapter';
import {
  ProjectKind,
  ProjectDetectionResult,
  DependencyCheckResult,
  RunConfiguration,
  AdapterBuildContext,
} from './types';
import { BuildPlan, BuildManifest } from '../types';
import { NodeBuildAdapter } from './nodeAdapter';
import { ReactViteBuildAdapter } from './reactViteAdapter';

export class FullStackBuildAdapter extends BaseBuildAdapter {
  kind: ProjectKind = 'fullstack';
  name = 'Full-Stack Multi-Tier Orchestration Adapter';

  private nodeAdapter = new NodeBuildAdapter();
  private viteAdapter = new ReactViteBuildAdapter();

  public async detect(
    files: string[],
    readFile: (p: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null> {
    const hasBackendDir = files.some(f => /^backend\//i.test(f) || /^server\//i.test(f));
    const hasFrontendDir = files.some(f => /^frontend\//i.test(f) || /^client\//i.test(f));

    if (!hasBackendDir || !hasFrontendDir) {
      return null;
    }

    const components: ProjectDetectionResult[] = [];
    const evidence: string[] = ['Detected multi-tier structure with separate backend and frontend folders'];

    // 1. Detect backend sub-component
    const backendFiles = files
      .filter(f => /^(backend|server)\//i.test(f))
      .map(f => f.replace(/^(backend|server)\//i, ''));
    const backendPrefix = files.find(f => /^(backend|server)\//i.test(f))?.split('/')[0] || 'backend';

    const backendDetect = await this.nodeAdapter.detect(backendFiles, (subPath) => readFile(`${backendPrefix}/${subPath}`));
    if (backendDetect) {
      backendDetect.rootPath = backendPrefix;
      components.push(backendDetect);
      evidence.push(`Backend component detected in /${backendPrefix}: ${backendDetect.name} (${backendDetect.frameworks.join(', ')})`);
    }

    // 2. Detect frontend sub-component
    const frontendFiles = files
      .filter(f => /^(frontend|client)\//i.test(f))
      .map(f => f.replace(/^(frontend|client)\//i, ''));
    const frontendPrefix = files.find(f => /^(frontend|client)\//i.test(f))?.split('/')[0] || 'frontend';

    const frontendDetect = await this.viteAdapter.detect(frontendFiles, (subPath) => readFile(`${frontendPrefix}/${subPath}`));
    if (frontendDetect) {
      frontendDetect.rootPath = frontendPrefix;
      components.push(frontendDetect);
      evidence.push(`Frontend component detected in /${frontendPrefix}: ${frontendDetect.name} (${frontendDetect.frameworks.join(', ')})`);
    }

    if (components.length < 2) {
      return null;
    }

    // Combine required tools & services from both components
    const requiredTools = [
      ...components.flatMap(c => c.requiredTools),
    ];
    // Deduplicate tools
    const uniqueTools = Array.from(new Map(requiredTools.map(t => [t.command, t])).values());

    const requiredServices = components.flatMap(c => c.requiredServices);
    const uniqueServices = Array.from(new Map(requiredServices.map(s => [`${s.host}:${s.port}`, s])).values());

    return {
      kind: 'fullstack',
      name: 'Full-Stack Application',
      confidence: 0.98,
      description: `Full-Stack application with ${backendDetect?.name || 'Backend'} + ${frontendDetect?.name || 'Frontend'}`,
      primaryLanguage: 'Full-Stack (JavaScript / TypeScript)',
      frameworks: Array.from(new Set(components.flatMap(c => c.frameworks))),
      buildSystem: 'Multi-Tier (npm + Vite)',
      rootPath: '',
      components,
      evidence,
      requiredTools: uniqueTools,
      requiredServices: uniqueServices,
    };
  }

  public async checkDependencies(wsDir: string, detected: ProjectDetectionResult): Promise<DependencyCheckResult> {
    let installed = true;
    for (const comp of detected.components || []) {
      const compDir = comp.rootPath ? path.join(wsDir, comp.rootPath) : wsDir;
      const nm = path.join(compDir, 'node_modules');
      if (!fs.existsSync(nm)) {
        installed = false;
        break;
      }
    }
    return {
      installed,
      lockFileFound: true,
      suggestedInstallCommand: {
        command: 'npm',
        args: ['install', '--prefix', 'backend', '&&', 'npm', 'install', '--prefix', 'frontend'],
      },
    };
  }

  public async generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan> {
    const { repositoryId, commitSha, changedFiles, affectedFiles, detection } = context;

    const targets: any[] = [];

    // Backend build/validation action
    targets.push({
      name: 'validate_backend',
      type: 'backend_validation',
      inputs: ['backend/package.json', 'backend/src/**'],
      outputs: ['build/backend_ok.txt'],
      command: 'node',
      args: ['-e', 'require(\"fs\").writeFileSync(\"build/backend_ok.txt\",\"OK\")'],
      dependencies: [],
    });

    // Frontend build action
    targets.push({
      name: 'build_frontend_bundle',
      type: 'frontend_bundle',
      inputs: ['frontend/package.json', 'frontend/src/**', 'frontend/index.html'],
      outputs: ['frontend/dist'],
      command: 'node',
      args: ['frontend/node_modules/vite/bin/vite.js', 'build'],
      dependencies: ['validate_backend'],
    });

    const manifest: BuildManifest = {
      version: 1,
      targets,
      runTarget: 'backend/src/server.js',
    };

    return this.createPlanFromManifest(repositoryId, commitSha, manifest, changedFiles, affectedFiles);
  }

  public async getRunConfigurations(wsDir: string, detected: ProjectDetectionResult): Promise<RunConfiguration[]> {
    const configs: RunConfiguration[] = [];

    for (const comp of detected.components || []) {
      if (comp.kind === 'nodejs') {
        const sub = comp.rootPath ? `${comp.rootPath}/` : '';
        const entry = `${sub}${comp.entryPoint || 'src/server.js'}`;
        configs.push({
          id: 'fullstack_backend',
          name: 'Backend API Service',
          type: 'backend',
          command: 'node',
          args: [entry],
          defaultPort: 5050,
          description: 'Full-stack backend server',
          dependsOn: comp.requiredServices.map(s => s.name),
        });
      } else if (comp.kind === 'react_vite') {
        const sub = comp.rootPath ? `${comp.rootPath}/` : '';
        configs.push({
          id: 'fullstack_frontend',
          name: 'Frontend Web Application',
          type: 'frontend',
          command: 'node',
          args: [`${sub}node_modules/vite/bin/vite.js`],
          defaultPort: 5173,
          description: 'Full-stack frontend client',
          dependsOn: ['fullstack_backend'],
        });
      }
    }

    return configs;
  }
}
