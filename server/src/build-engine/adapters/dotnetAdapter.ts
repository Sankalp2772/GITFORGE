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

export class DotNetBuildAdapter extends BaseBuildAdapter {
  kind: ProjectKind = 'dotnet';
  name = '.NET / C# Application Adapter';

  public async detect(
    files: string[],
    _readFile: (p: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null> {
    const projFile = files.find(f => /\.csproj$/i.test(f));
    const slnFile = files.find(f => /\.sln$/i.test(f));
    const csFiles = files.filter(f => /\.cs$/i.test(f));

    if (!projFile && !slnFile && csFiles.length === 0) {
      return null;
    }

    const evidence: string[] = [];
    if (projFile) evidence.push(`C# project file (${path.basename(projFile)}) detected`);
    if (slnFile) evidence.push(`.NET solution file (${path.basename(slnFile)}) detected`);
    if (csFiles.length > 0) evidence.push(`Found ${csFiles.length} C# source files`);

    const isWeb = files.some(f => /Program\.cs|appsettings\.json|Controllers\//i.test(f));

    return {
      kind: 'dotnet',
      name: projFile ? path.basename(projFile, '.csproj') : '.NET Application',
      confidence: projFile || slnFile ? 0.95 : 0.7,
      description: isWeb ? 'ASP.NET Core Web API / Application' : '.NET Console Application',
      primaryLanguage: 'C#',
      frameworks: isWeb ? ['ASP.NET Core', '.NET'] : ['.NET'],
      buildSystem: 'dotnet CLI',
      rootPath: projFile ? path.dirname(projFile) === '.' ? '' : path.dirname(projFile) : '',
      manifestFile: projFile || slnFile,
      entryPoint: files.find(f => /Program\.cs$/i.test(f)) || projFile || 'Program.cs',
      evidence,
      requiredTools: [
        {
          name: '.NET SDK',
          command: 'dotnet',
          minVersion: '6.0.0',
          required: true,
          purpose: 'Compiles, builds and runs .NET assemblies and C# projects',
        },
      ],
      requiredServices: [],
    };
  }

  public async checkDependencies(wsDir: string, detected: ProjectDetectionResult): Promise<DependencyCheckResult> {
    const projDir = detected.rootPath ? path.join(wsDir, detected.rootPath) : wsDir;
    const hasObj = fs.existsSync(path.join(projDir, 'obj'));
    return {
      installed: hasObj,
      lockFileFound: fs.existsSync(path.join(projDir, 'packages.lock.json')),
      suggestedInstallCommand: {
        command: 'dotnet',
        args: ['restore'],
      },
    };
  }

  public async generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan> {
    const { repositoryId, commitSha, changedFiles, affectedFiles, detection } = context;

    const targets = [
      {
        name: 'dotnet_build',
        type: 'compilation',
        inputs: ['**/*.cs', detection.manifestFile || '*.csproj'],
        outputs: ['bin/Debug'],
        command: 'dotnet',
        args: ['build', '--nologo'],
        dependencies: [],
      },
    ];

    const manifest: BuildManifest = {
      version: 1,
      targets: targets as any,
      runTarget: 'dotnet_run',
    };

    return this.createPlanFromManifest(repositoryId, commitSha, manifest, changedFiles, affectedFiles);
  }

  public async getRunConfigurations(_wsDir: string, detected: ProjectDetectionResult): Promise<RunConfiguration[]> {
    return [
      {
        id: 'dotnet_run',
        name: `${detected.name} (dotnet run)`,
        type: 'backend',
        command: 'dotnet',
        args: ['run', '--no-build'],
        defaultPort: 5000,
        description: 'Execute compiled .NET application with dotnet run',
      },
    ];
  }
}
