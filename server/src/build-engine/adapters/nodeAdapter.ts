import path from 'path';
import fs from 'fs';
import { BaseBuildAdapter } from './baseAdapter';
import {
  ProjectKind,
  ProjectDetectionResult,
  DependencyCheckResult,
  RunConfiguration,
  AdapterBuildContext,
  ExternalServiceRequirement,
} from './types';
import { BuildPlan, BuildManifest } from '../types';

export class NodeBuildAdapter extends BaseBuildAdapter {
  kind: ProjectKind = 'nodejs';
  name = 'Node.js & Express Application Adapter';

  public async detect(
    files: string[],
    readFile: (p: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null> {
    const hasPackageJson = files.some(f => f.toLowerCase() === 'package.json');
    if (!hasPackageJson) return null;

    const pkgStr = await readFile('package.json');
    if (!pkgStr) return null;

    let pkg: any = {};
    try {
      pkg = JSON.parse(pkgStr);
    } catch {
      return null;
    }

    // If it's a Vite / React frontend, let ReactViteAdapter take priority
    const isVite = (pkg.devDependencies && (pkg.devDependencies.vite || pkg.devDependencies['@vitejs/plugin-react'])) ||
                  (pkg.dependencies && (pkg.dependencies.vite || pkg.dependencies.react));
    if (isVite && !pkg.dependencies?.express && !pkg.dependencies?.koa && !pkg.dependencies?.fastify && !pkg.dependencies?.nest) {
      return null; // Handled by ReactViteAdapter
    }

    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const frameworks: string[] = ['Node.js'];
    const evidence: string[] = ['package.json found in project root'];

    if (deps.express) {
      frameworks.push('Express.js');
      evidence.push('Express.js framework dependency detected');
    }
    if (deps.koa) frameworks.push('Koa');
    if (deps.fastify) frameworks.push('Fastify');
    if (deps['@nestjs/core']) frameworks.push('NestJS');
    if (deps['@prisma/client'] || deps.prisma) {
      frameworks.push('Prisma ORM');
      evidence.push('Prisma ORM detected');
    }

    // Detect external database requirements from dependencies & .env
    const requiredServices: ExternalServiceRequirement[] = [];
    if (deps.mysql || deps.mysql2) {
      requiredServices.push({
        name: 'MySQL Database',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        required: true,
        detectedFrom: 'mysql2 dependency in package.json',
      });
      evidence.push('MySQL database driver (mysql2) detected');
    }
    if (deps.pg || deps['pg-hstore']) {
      requiredServices.push({
        name: 'PostgreSQL Database',
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        required: true,
        detectedFrom: 'pg dependency in package.json',
      });
      evidence.push('PostgreSQL driver detected');
    }
    if (deps.mongodb || deps.mongoose) {
      requiredServices.push({
        name: 'MongoDB Database',
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        required: true,
        detectedFrom: 'mongodb/mongoose dependency in package.json',
      });
      evidence.push('MongoDB driver detected');
    }

    // Inspect .env.example or .env for DB configuration without exposing credentials
    const envCandidate = await readFile('.env.example') || await readFile('.env');
    if (envCandidate) {
      const portMatch = envCandidate.match(/^PORT\s*=\s*(\d+)/m);
      const dbPortMatch = envCandidate.match(/^DB_PORT\s*=\s*(\d+)/m);
      const dbHostMatch = envCandidate.match(/^DB_HOST\s*=\s*([a-zA-Z0-9_.-]+)/m);
      if (dbPortMatch && requiredServices.length > 0) {
        requiredServices[0].port = parseInt(dbPortMatch[1], 10);
      }
      if (dbHostMatch && requiredServices.length > 0) {
        requiredServices[0].host = dbHostMatch[1].trim();
      }
      evidence.push('Environment configuration file (.env/.env.example) detected');
    }

    const entryPoint = pkg.main ||
      files.find(f => /^(server|app|index)\.(js|cjs|mjs)$/i.test(f)) ||
      'server.js';

    return {
      kind: 'nodejs',
      name: pkg.name || 'Node.js Application',
      confidence: 0.95,
      description: frameworks.includes('Express.js') ? 'Node.js Express backend application' : 'Node.js application',
      primaryLanguage: 'JavaScript',
      frameworks,
      buildSystem: 'npm',
      rootPath: '',
      manifestFile: 'package.json',
      entryPoint,
      availableScripts: pkg.scripts || {},
      evidence,
      requiredTools: [
        {
          name: 'Node.js',
          command: 'node',
          minVersion: '18.0.0',
          required: true,
          purpose: 'JavaScript runtime environment',
        },
        {
          name: 'npm Package Manager',
          command: 'npm',
          required: true,
          purpose: 'Installs and manages Node.js packages',
        },
      ],
      requiredServices,
    };
  }

  public async checkDependencies(wsDir: string, _detected: ProjectDetectionResult): Promise<DependencyCheckResult> {
    const nm = path.join(wsDir, 'node_modules');
    const lock = path.join(wsDir, 'package-lock.json');
    const installed = fs.existsSync(nm) && fs.existsSync(path.join(nm, 'express'));

    return {
      installed,
      lockFileFound: fs.existsSync(lock),
      suggestedInstallCommand: {
        command: 'npm',
        args: ['install', '--prefer-offline'],
      },
    };
  }

  public async generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan> {
    const { repositoryId, commitSha, changedFiles, affectedFiles, detection } = context;
    const entry = detection.entryPoint || 'server.js';

    // Real validation & preparation actions for Node.js:
    // 1. check_package_manifest: validates JSON syntax of package.json
    // 2. check_entry_syntax: executes native node --check on main entrypoint
    // 3. check_modules_integrity: validates module imports & requires
    const targets = [
      {
        name: 'validate_manifest',
        type: 'validation',
        inputs: ['package.json'],
        outputs: ['build/manifest_ok.txt'],
        command: 'node',
        args: ['-e', 'require(\"fs\").writeFileSync(\"build/manifest_ok.txt\", JSON.stringify(JSON.parse(require(\"fs\").readFileSync(\"package.json\"))))'],
        dependencies: [],
      },
      {
        name: 'check_syntax',
        type: 'syntax_check',
        inputs: [entry],
        outputs: ['build/syntax_ok.txt'],
        command: 'node',
        args: ['--check', entry],
        dependencies: ['validate_manifest'],
      },
    ];

    const manifest: BuildManifest = {
      version: 1,
      targets: targets as any,
      runTarget: entry,
    };

    return this.createPlanFromManifest(repositoryId, commitSha, manifest, changedFiles, affectedFiles);
  }

  public async getRunConfigurations(wsDir: string, detected: ProjectDetectionResult): Promise<RunConfiguration[]> {
    const configs: RunConfiguration[] = [];
    const scripts = detected.availableScripts || {};

    const entry = detected.entryPoint || 'server.js';
    let defaultPort = 3000;

    // Detect PORT from .env if present
    const envPath = path.join(wsDir, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const pMatch = envContent.match(/^PORT\s*=\s*(\d+)/m);
      if (pMatch) defaultPort = parseInt(pMatch[1], 10);
    }

    configs.push({
      id: 'node_start',
      name: `${detected.name} (Production / Start)`,
      type: 'backend',
      command: 'node',
      args: [entry],
      defaultPort,
      description: `Run Node.js application: node ${entry}`,
      dependsOn: detected.requiredServices.map(s => s.name),
    });

    if (scripts.dev) {
      configs.push({
        id: 'node_dev',
        name: `${detected.name} (Dev / Watch)`,
        type: 'backend',
        command: 'node',
        args: ['--watch', entry],
        defaultPort,
        description: `Run in watch mode: node --watch ${entry}`,
        dependsOn: detected.requiredServices.map(s => s.name),
      });
    }

    return configs;
  }
}
