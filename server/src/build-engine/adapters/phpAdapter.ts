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

export class PhpBuildAdapter extends BaseBuildAdapter {
  kind: ProjectKind = 'php';
  name = 'PHP Application Adapter';

  public async detect(
    files: string[],
    readFile: (p: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null> {
    const hasComposer = files.some(f => f.toLowerCase() === 'composer.json');
    const phpFiles = files.filter(f => f.toLowerCase().endsWith('.php'));

    if (!hasComposer && phpFiles.length === 0) {
      return null;
    }

    const evidence: string[] = [];
    const frameworks: string[] = ['PHP'];

    if (hasComposer) {
      evidence.push('composer.json Composer package manifest detected');
      const compStr = await readFile('composer.json');
      if (compStr) {
        if (/laravel\/framework/i.test(compStr)) frameworks.push('Laravel');
        if (/symfony\/framework/i.test(compStr)) frameworks.push('Symfony');
      }
    }
    if (phpFiles.length > 0) evidence.push(`Found ${phpFiles.length} PHP (.php) script files`);

    const entryPoint = files.find(f => /^(public\/index|index|server)\.php$/i.test(f)) || phpFiles[0] || 'index.php';

    return {
      kind: 'php',
      name: frameworks.includes('Laravel') ? 'Laravel Application' : 'PHP Web Application',
      confidence: hasComposer ? 0.95 : 0.8,
      description: frameworks.includes('Laravel') ? 'Laravel PHP web framework application' : 'PHP web application',
      primaryLanguage: 'PHP',
      frameworks,
      buildSystem: hasComposer ? 'Composer' : 'PHP Built-in Server',
      rootPath: '',
      manifestFile: hasComposer ? 'composer.json' : undefined,
      entryPoint,
      evidence,
      requiredTools: [
        {
          name: 'PHP CLI',
          command: 'php',
          minVersion: '8.0.0',
          required: true,
          purpose: 'PHP interpreter and built-in web server',
        },
      ],
      requiredServices: [],
    };
  }

  public async checkDependencies(wsDir: string, _detected: ProjectDetectionResult): Promise<DependencyCheckResult> {
    const hasVendor = fs.existsSync(path.join(wsDir, 'vendor'));
    return {
      installed: hasVendor,
      lockFileFound: fs.existsSync(path.join(wsDir, 'composer.lock')),
      suggestedInstallCommand: {
        command: 'composer',
        args: ['install'],
      },
    };
  }

  public async generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan> {
    const { repositoryId, commitSha, changedFiles, affectedFiles, detection } = context;
    const entry = detection.entryPoint || 'index.php';

    const targets = [
      {
        name: 'php_syntax_check',
        type: 'syntax_validation',
        inputs: [entry],
        outputs: ['build/php_ok.txt'],
        command: 'php',
        args: ['-l', entry],
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
    const entry = detected.entryPoint || 'index.php';
    const docRoot = path.dirname(entry) === '.' ? '.' : path.dirname(entry);

    return [
      {
        id: 'php_server',
        name: `${detected.name} (Built-in Server)`,
        type: 'web',
        command: 'php',
        args: ['-S', 'localhost:8000', '-t', docRoot],
        defaultPort: 8000,
        description: 'Run PHP built-in web server on :8000',
      },
    ];
  }
}
