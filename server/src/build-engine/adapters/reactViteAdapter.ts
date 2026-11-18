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

export class ReactViteBuildAdapter extends BaseBuildAdapter {
  kind: ProjectKind = 'react_vite';
  name = 'React / Vite & TypeScript Web Application Adapter';

  public async detect(
    files: string[],
    readFile: (p: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null> {
    const hasPkg = files.some(f => /^(package\.json|frontend\/package\.json|client\/package\.json)$/i.test(f));
    const hasViteConfig = files.some(f => /vite\.config\.(js|ts|mjs|cjs)$/i.test(f));
    const hasTsConfig = files.some(f => f.toLowerCase().endsWith('tsconfig.json'));

    if (!hasPkg && !hasViteConfig) return null;

    let pkgStr: string | null = null;
    let rootPath = '';

    const candidates = ['package.json', 'frontend/package.json', 'client/package.json'];
    for (const c of candidates) {
      if (files.some(f => f.toLowerCase() === c.toLowerCase())) {
        pkgStr = await readFile(c);
        if (pkgStr) {
          rootPath = path.dirname(c) === '.' ? '' : path.dirname(c);
          break;
        }
      }
    }

    if (!pkgStr) return null;

    let pkg: any = {};
    try {
      pkg = JSON.parse(pkgStr);
    } catch {
      return null;
    }

    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const hasReact = !!(allDeps.react || allDeps['react-dom']);
    const hasVite = !!allDeps.vite || hasViteConfig;
    const hasTypeScript = hasTsConfig || !!allDeps.typescript;

    if (!hasReact && !hasVite && !hasTypeScript) return null;

    const frameworks: string[] = [];
    const evidence: string[] = [];

    if (hasReact) {
      frameworks.push('React');
      evidence.push('React framework dependencies found in package.json');
    }
    if (hasVite) {
      frameworks.push('Vite');
      evidence.push('Vite build tool configuration found');
    }
    if (hasTypeScript) {
      frameworks.push('TypeScript');
      evidence.push('tsconfig.json TypeScript configuration found');
    }
    if (allDeps.tailwindcss) frameworks.push('Tailwind CSS');
    if (allDeps['react-router-dom']) frameworks.push('React Router');

    return {
      kind: 'react_vite',
      name: pkg.name || 'React Vite Application',
      confidence: 0.95,
      description: `${frameworks.join(' + ')} modern single-page web application`,
      primaryLanguage: hasTypeScript ? 'TypeScript' : 'JavaScript',
      frameworks,
      buildSystem: hasVite ? 'Vite' : hasTypeScript ? 'tsc' : 'npm',
      rootPath,
      manifestFile: rootPath ? `${rootPath}/package.json` : 'package.json',
      entryPoint: files.find(f => /^(src\/main\.(jsx|tsx|js|ts)|index\.html)$/i.test(f)) || 'index.html',
      availableScripts: pkg.scripts || {},
      evidence,
      requiredTools: [
        {
          name: 'Node.js Runtime',
          command: 'node',
          minVersion: '18.0.0',
          required: true,
          purpose: 'JavaScript runtime for build tools and dev servers',
        },
        {
          name: 'npm Package Manager',
          command: 'npm',
          required: true,
          purpose: 'Package installation and asset bundling',
        },
      ],
      requiredServices: [],
    };
  }

  public async checkDependencies(wsDir: string, detected: ProjectDetectionResult): Promise<DependencyCheckResult> {
    const sub = detected.rootPath ? path.join(wsDir, detected.rootPath) : wsDir;
    const nm = path.join(sub, 'node_modules');
    const lock = path.join(sub, 'package-lock.json');

    return {
      installed: fs.existsSync(nm) && fs.existsSync(path.join(nm, 'vite')),
      lockFileFound: fs.existsSync(lock),
      suggestedInstallCommand: {
        command: 'npm',
        args: ['install', '--prefer-offline'],
      },
    };
  }

  public async generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan> {
    const { repositoryId, commitSha, changedFiles, affectedFiles, detection } = context;
    const sub = detection.rootPath ? `${detection.rootPath}/` : '';

    const targets = [
      {
        name: 'validate_frontend_manifest',
        type: 'validation',
        inputs: [`${sub}package.json`],
        outputs: [`${sub}build/frontend_ok.txt`],
        command: 'node',
        args: ['-e', 'require(\"fs\").writeFileSync(\"build/frontend_ok.txt\", JSON.stringify(JSON.parse(require(\"fs\").readFileSync(\"package.json\"))))'],
        dependencies: [],
      },
      {
        name: 'build_vite_production',
        type: 'bundler',
        inputs: [`${sub}src/**`, `${sub}index.html`],
        outputs: [`${sub}dist`],
        command: 'node',
        args: [`${sub}node_modules/vite/bin/vite.js`, 'build'],
        dependencies: ['validate_frontend_manifest'],
      },
    ];

    const manifest: BuildManifest = {
      version: 1,
      targets: targets as any,
      runTarget: `${sub}node_modules/vite/bin/vite.js`,
    };

    return this.createPlanFromManifest(repositoryId, commitSha, manifest, changedFiles, affectedFiles);
  }

  public async getRunConfigurations(wsDir: string, detected: ProjectDetectionResult): Promise<RunConfiguration[]> {
    const sub = detected.rootPath ? `${detected.rootPath}/` : '';
    const vitePath = `${sub}node_modules/vite/bin/vite.js`;

    return [
      {
        id: 'vite_dev',
        name: `${detected.name} (Vite Dev Server)`,
        type: 'frontend',
        command: 'node',
        args: [vitePath],
        defaultPort: 5173,
        description: 'Vite reactive hot-reloading development server',
      },
      {
        id: 'vite_preview',
        name: `${detected.name} (Vite Production Preview)`,
        type: 'frontend',
        command: 'node',
        args: [vitePath, 'preview'],
        defaultPort: 4173,
        description: 'Preview compiled production build from dist/',
      },
    ];
  }
}
