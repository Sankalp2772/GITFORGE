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

export class JavaBuildAdapter extends BaseBuildAdapter {
  kind: ProjectKind = 'java';
  name = 'Java Enterprise & Spring Application Adapter';

  public async detect(
    files: string[],
    readFile: (p: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null> {
    const hasPom = files.some(f => f.toLowerCase() === 'pom.xml');
    const hasGradle = files.some(f => /build\.gradle(\.kts)?$/i.test(f));
    const javaFiles = files.filter(f => f.toLowerCase().endsWith('.java'));

    if (!hasPom && !hasGradle && javaFiles.length === 0) {
      return null;
    }

    let confidence = 0.5;
    const evidence: string[] = [];
    const frameworks: string[] = ['Java'];

    if (hasPom) {
      confidence = 0.95;
      evidence.push('pom.xml (Apache Maven build system) detected');
      const pomStr = await readFile('pom.xml');
      if (pomStr && /spring-boot/i.test(pomStr)) {
        frameworks.push('Spring Boot');
        evidence.push('Spring Boot framework dependency detected in pom.xml');
      }
    }
    if (hasGradle) {
      confidence = Math.max(confidence, 0.95);
      evidence.push('build.gradle (Gradle build system) detected');
    }
    if (javaFiles.length > 0) {
      evidence.push(`Found ${javaFiles.length} Java source files`);
      if (javaFiles.length >= 2) confidence = Math.max(confidence, 0.85);
    }

    const mainClass = javaFiles.find(f => /Application\.java$|Main\.java$/i.test(f)) || javaFiles[0] || 'src/main/java/Main.java';

    return {
      kind: 'java',
      name: frameworks.includes('Spring Boot') ? 'Spring Boot Application' : 'Java Application',
      confidence,
      description: frameworks.includes('Spring Boot') ? 'Spring Boot enterprise web application' : 'Java application',
      primaryLanguage: 'Java',
      frameworks,
      buildSystem: hasPom ? 'Maven' : hasGradle ? 'Gradle' : 'javac',
      rootPath: '',
      manifestFile: hasPom ? 'pom.xml' : hasGradle ? 'build.gradle' : undefined,
      entryPoint: mainClass,
      evidence,
      requiredTools: [
        {
          name: 'Java Development Kit (JDK)',
          command: 'javac',
          minVersion: '11.0.0',
          required: true,
          purpose: 'Compiles Java source files to bytecode',
        },
        {
          name: 'Java Runtime Environment (JRE)',
          command: 'java',
          minVersion: '11.0.0',
          required: true,
          purpose: 'Executes compiled Java bytecode and JARs',
        },
      ],
      requiredServices: [],
    };
  }

  public async checkDependencies(wsDir: string, detected: ProjectDetectionResult): Promise<DependencyCheckResult> {
    const hasTarget = fs.existsSync(path.join(wsDir, 'target')) || fs.existsSync(path.join(wsDir, 'build'));
    return {
      installed: hasTarget,
      lockFileFound: detected.manifestFile === 'pom.xml' || detected.manifestFile === 'build.gradle',
      suggestedInstallCommand: {
        command: detected.buildSystem === 'Maven' ? 'mvn' : 'gradle',
        args: ['dependency:resolve'],
      },
    };
  }

  public async generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan> {
    const { repositoryId, commitSha, changedFiles, affectedFiles, detection } = context;

    // Use javac for compilation DAG or Maven wrapper
    const targets = [
      {
        name: 'compile_java',
        type: 'compilation',
        inputs: ['src/main/java/**/*.java'],
        outputs: ['target/classes'],
        command: 'javac',
        args: ['-d', 'target/classes', detection.entryPoint || 'src/main/java/Main.java'],
        dependencies: [],
      },
    ];

    const manifest: BuildManifest = {
      version: 1,
      targets: targets as any,
      runTarget: 'target/classes',
    };

    return this.createPlanFromManifest(repositoryId, commitSha, manifest, changedFiles, affectedFiles);
  }

  public async getRunConfigurations(_wsDir: string, detected: ProjectDetectionResult): Promise<RunConfiguration[]> {
    return [
      {
        id: 'java_run',
        name: `${detected.name} (Java Application)`,
        type: 'backend',
        command: 'java',
        args: ['-cp', 'target/classes', 'Main'],
        defaultPort: 8080,
        description: 'Run compiled Java classes',
      },
    ];
  }
}
