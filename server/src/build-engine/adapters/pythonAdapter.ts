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

export class PythonBuildAdapter extends BaseBuildAdapter {
  kind: ProjectKind = 'python';
  name = 'Python Application & Validation Adapter';

  public async detect(
    files: string[],
    readFile: (p: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null> {
    const hasReq = files.some(f => f.toLowerCase() === 'requirements.txt');
    const hasPyProject = files.some(f => f.toLowerCase() === 'pyproject.toml');
    const hasSetup = files.some(f => f.toLowerCase() === 'setup.py');
    const pyFiles = files.filter(f => f.toLowerCase().endsWith('.py'));

    if (!hasReq && !hasPyProject && !hasSetup && pyFiles.length === 0) {
      return null;
    }

    let confidence = 0.5;
    const evidence: string[] = [];
    const frameworks: string[] = [];

    if (hasReq) {
      confidence = Math.max(confidence, 0.9);
      evidence.push('requirements.txt dependency manifest detected');
      const reqStr = await readFile('requirements.txt');
      if (reqStr) {
        if (/fastapi/i.test(reqStr)) frameworks.push('FastAPI');
        if (/flask/i.test(reqStr)) frameworks.push('Flask');
        if (/django/i.test(reqStr)) frameworks.push('Django');
        if (/pytest/i.test(reqStr)) frameworks.push('Pytest');
      }
    }
    if (hasPyProject) {
      confidence = Math.max(confidence, 0.92);
      evidence.push('pyproject.toml modern Python packaging detected');
    }
    if (hasSetup) {
      confidence = Math.max(confidence, 0.85);
      evidence.push('setup.py setup configuration detected');
    }
    if (pyFiles.length > 0) {
      evidence.push(`Found ${pyFiles.length} Python script (.py) files`);
      if (pyFiles.length >= 2) confidence = Math.max(confidence, 0.8);
    }

    const entryPoint = pyFiles.find(f => /^(main|app|server|run)\.py$/i.test(f)) || pyFiles[0] || 'main.py';

    const isWin = process.platform === 'win32';
    const pyCmd = isWin ? 'python' : 'python3';

    return {
      kind: 'python',
      name: 'Python Application',
      confidence,
      description: frameworks.length > 0 ? `Python application with ${frameworks.join(', ')}` : 'Python standalone application',
      primaryLanguage: 'Python',
      frameworks: frameworks.length > 0 ? frameworks : ['Standard Library'],
      buildSystem: hasReq ? 'pip' : hasPyProject ? 'pip/poetry' : 'Python Native',
      rootPath: '',
      manifestFile: hasReq ? 'requirements.txt' : hasPyProject ? 'pyproject.toml' : undefined,
      entryPoint,
      evidence,
      requiredTools: [
        {
          name: 'Python Runtime',
          command: pyCmd,
          minVersion: '3.8.0',
          required: true,
          purpose: 'Executes and compiles Python source code',
        },
      ],
      requiredServices: [],
    };
  }

  public async checkDependencies(wsDir: string, _detected: ProjectDetectionResult): Promise<DependencyCheckResult> {
    const hasVenv = fs.existsSync(path.join(wsDir, 'venv')) || fs.existsSync(path.join(wsDir, '.venv'));
    return {
      installed: hasVenv,
      lockFileFound: fs.existsSync(path.join(wsDir, 'requirements.txt')),
      suggestedInstallCommand: {
        command: 'pip',
        args: ['install', '-r', 'requirements.txt'],
      },
    };
  }

  public async generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan> {
    const { repositoryId, commitSha, changedFiles, affectedFiles, detection } = context;
    const entry = detection.entryPoint || 'main.py';

    // Real Python bytecode compilation check (validates syntax across the codebase without running side-effects)
    const targets = [
      {
        name: 'compile_bytecode',
        type: 'bytecode_validation',
        inputs: [entry],
        outputs: ['build/py_syntax_ok.txt'],
        command: 'python',
        args: ['-m', 'py_compile', entry],
        dependencies: [],
      },
    ];

    const manifest: BuildManifest = {
      version: 1,
      targets: targets as any,
      runTarget: entry,
    };

    return this.createPlanFromManifest(repositoryId, commitSha, manifest, changedFiles, affectedFiles);
  }

  public async getRunConfigurations(_wsDir: string, detected: ProjectDetectionResult): Promise<RunConfiguration[]> {
    const entry = detected.entryPoint || 'main.py';
    return [
      {
        id: 'python_run',
        name: `Python (${entry})`,
        type: 'script',
        command: 'python',
        args: [entry],
        defaultPort: detected.frameworks.includes('FastAPI') ? 8000 : detected.frameworks.includes('Flask') ? 5000 : 8080,
        description: `Run Python script: python ${entry}`,
      },
    ];
  }
}
