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

export class RustBuildAdapter extends BaseBuildAdapter {
  kind: ProjectKind = 'rust';
  name = 'Rust Application Adapter';

  public async detect(
    files: string[],
    _readFile: (p: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null> {
    const hasCargo = files.some(f => f.toLowerCase() === 'cargo.toml');
    const rsFiles = files.filter(f => f.toLowerCase().endsWith('.rs'));

    if (!hasCargo && rsFiles.length === 0) {
      return null;
    }

    const evidence: string[] = [];
    if (hasCargo) evidence.push('Cargo.toml Rust package manifest detected');
    if (rsFiles.length > 0) evidence.push(`Found ${rsFiles.length} Rust (.rs) source files`);

    const entryPoint = files.find(f => /src\/main\.rs$/i.test(f)) || rsFiles[0] || 'src/main.rs';

    return {
      kind: 'rust',
      name: 'Rust Application',
      confidence: hasCargo ? 0.95 : 0.8,
      description: 'Rust systems application (Cargo build system)',
      primaryLanguage: 'Rust',
      frameworks: ['Cargo / Rust standard library'],
      buildSystem: 'cargo',
      rootPath: '',
      manifestFile: hasCargo ? 'Cargo.toml' : undefined,
      entryPoint,
      evidence,
      requiredTools: [
        {
          name: 'Cargo Package Manager & Build Tool',
          command: 'cargo',
          minVersion: '1.60.0',
          required: true,
          purpose: 'Compiles and manages Rust crates',
        },
        {
          name: 'Rust Compiler',
          command: 'rustc',
          minVersion: '1.60.0',
          required: true,
          purpose: 'Rust native compiler',
        },
      ],
      requiredServices: [],
    };
  }

  public async checkDependencies(wsDir: string, _detected: ProjectDetectionResult): Promise<DependencyCheckResult> {
    const hasLock = fs.existsSync(path.join(wsDir, 'Cargo.lock'));
    return {
      installed: hasLock,
      lockFileFound: hasLock,
      suggestedInstallCommand: {
        command: 'cargo',
        args: ['fetch'],
      },
    };
  }

  public async generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan> {
    const { repositoryId, commitSha, changedFiles, affectedFiles } = context;

    const targets = [
      {
        name: 'cargo_build',
        type: 'compilation',
        inputs: ['src/**/*.rs', 'Cargo.toml'],
        outputs: ['target/debug'],
        command: 'cargo',
        args: ['build'],
        dependencies: [],
      },
    ];

    const manifest: BuildManifest = {
      version: 1,
      targets: targets as any,
      runTarget: 'cargo_run',
    };

    return this.createPlanFromManifest(repositoryId, commitSha, manifest, changedFiles, affectedFiles);
  }

  public async getRunConfigurations(_wsDir: string, detected: ProjectDetectionResult): Promise<RunConfiguration[]> {
    return [
      {
        id: 'cargo_run',
        name: `${detected.name} (cargo run)`,
        type: 'binary',
        command: 'cargo',
        args: ['run', '--quiet'],
        description: 'Execute Rust binary using cargo run',
      },
    ];
  }
}
