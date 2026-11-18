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

export class GoBuildAdapter extends BaseBuildAdapter {
  kind: ProjectKind = 'go';
  name = 'Go (Golang) Application Adapter';

  public async detect(
    files: string[],
    _readFile: (p: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null> {
    const hasGoMod = files.some(f => f.toLowerCase() === 'go.mod');
    const goFiles = files.filter(f => f.toLowerCase().endsWith('.go'));

    if (!hasGoMod && goFiles.length === 0) {
      return null;
    }

    const evidence: string[] = [];
    if (hasGoMod) evidence.push('go.mod module definition detected');
    if (goFiles.length > 0) evidence.push(`Found ${goFiles.length} Go (.go) source files`);

    const entryPoint = files.find(f => /main\.go$/i.test(f)) || goFiles[0] || 'main.go';

    return {
      kind: 'go',
      name: 'Go Application',
      confidence: hasGoMod ? 0.95 : 0.8,
      description: 'Go (Golang) compiled application',
      primaryLanguage: 'Go',
      frameworks: ['Go standard library'],
      buildSystem: 'go build',
      rootPath: '',
      manifestFile: hasGoMod ? 'go.mod' : undefined,
      entryPoint,
      evidence,
      requiredTools: [
        {
          name: 'Go Compiler',
          command: 'go',
          minVersion: '1.18.0',
          required: true,
          purpose: 'Compiles Go packages and dependencies into native binaries',
        },
      ],
      requiredServices: [],
    };
  }

  public async checkDependencies(wsDir: string, _detected: ProjectDetectionResult): Promise<DependencyCheckResult> {
    const hasSum = fs.existsSync(path.join(wsDir, 'go.sum'));
    return {
      installed: hasSum,
      lockFileFound: hasSum,
      suggestedInstallCommand: {
        command: 'go',
        args: ['mod', 'download'],
      },
    };
  }

  public async generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan> {
    const { repositoryId, commitSha, changedFiles, affectedFiles, detection } = context;

    const outBin = process.platform === 'win32' ? 'bin/app.exe' : 'bin/app';
    const targets = [
      {
        name: 'go_compile',
        type: 'compilation',
        inputs: ['**/*.go', 'go.mod'],
        outputs: [outBin],
        command: 'go',
        args: ['build', '-o', outBin, detection.entryPoint || '.'],
        dependencies: [],
      },
    ];

    const manifest: BuildManifest = {
      version: 1,
      targets: targets as any,
      runTarget: outBin,
    };

    return this.createPlanFromManifest(repositoryId, commitSha, manifest, changedFiles, affectedFiles);
  }

  public async getRunConfigurations(_wsDir: string, detected: ProjectDetectionResult): Promise<RunConfiguration[]> {
    const outBin = process.platform === 'win32' ? 'bin/app.exe' : 'bin/app';
    return [
      {
        id: 'go_run',
        name: `${detected.name} Binary`,
        type: 'binary',
        command: outBin,
        args: [],
        defaultPort: 8080,
        description: `Execute compiled Go binary (${outBin})`,
      },
    ];
  }
}
