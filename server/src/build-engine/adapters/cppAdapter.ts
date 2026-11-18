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

export class CppBuildAdapter extends BaseBuildAdapter {
  kind: ProjectKind = 'cpp';
  name = 'C/C++ Native & CMake Build Adapter';

  private resolveCMake(): string {
    if (process.platform === 'win32') {
      const localCmake = path.resolve(__dirname, '../../../../../tools/cmake/bin/cmake.exe');
      if (fs.existsSync(localCmake)) return localCmake;
      if (fs.existsSync('C:\\msys64\\ucrt64\\bin\\cmake.exe')) return 'C:\\msys64\\ucrt64\\bin\\cmake.exe';
    }
    return 'cmake';
  }

  private resolveNinja(): string {
    if (process.platform === 'win32') {
      const localNinja1 = path.resolve(__dirname, '../../../../../tools/cmake/bin/ninja.exe');
      if (fs.existsSync(localNinja1)) return localNinja1;
      const localNinja2 = path.resolve(__dirname, '../../../../../tools/ninja.exe');
      if (fs.existsSync(localNinja2)) return localNinja2;
      if (fs.existsSync('C:\\msys64\\ucrt64\\bin\\ninja.exe')) return 'C:\\msys64\\ucrt64\\bin\\ninja.exe';
    }
    return 'ninja';
  }

  private resolveGpp(): string {
    if (process.platform === 'win32') {
      if (fs.existsSync('C:\\MinGW\\bin\\g++.exe')) return 'C:\\MinGW\\bin\\g++.exe';
      if (fs.existsSync('C:\\msys64\\ucrt64\\bin\\g++.exe')) return 'C:\\msys64\\ucrt64\\bin\\g++.exe';
    }
    return 'g++';
  }

  public async detect(
    files: string[],
    readFile: (p: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null> {
    const hasCMake = files.some(f => f.toLowerCase() === 'cmakelists.txt' || f.toLowerCase().endsWith('/cmakelists.txt'));
    const hasManifest = files.some(f => f.toLowerCase() === 'build.manifest.json' || f.toLowerCase().endsWith('/build.manifest.json'));
    const hasMakefile = files.some(f => f.toLowerCase() === 'makefile' || f.toLowerCase().endsWith('/makefile'));
    const cppFiles = files.filter(f => /\.(cpp|cc|cxx|c|hpp|h)$/i.test(f));

    if (!hasCMake && !hasManifest && !hasMakefile && cppFiles.length === 0) {
      return null;
    }

    let confidence = 0.5;
    const evidence: string[] = [];

    if (hasCMake) {
      confidence = 0.98;
      evidence.push('CMakeLists.txt project build configuration detected');
    }
    if (hasManifest) {
      confidence = Math.max(confidence, 0.95);
      evidence.push('build.manifest.json native DAG definition detected');
    }
    if (hasMakefile) {
      confidence = Math.max(confidence, 0.85);
      evidence.push('Makefile build script detected');
    }
    if (cppFiles.length > 0) {
      evidence.push(`Found ${cppFiles.length} C/C++ source and header files (.cpp, .hpp, .c, .h)`);
      if (cppFiles.length >= 2) confidence = Math.max(confidence, 0.8);
    }

    const cmakePath = this.resolveCMake();
    const ninjaPath = this.resolveNinja();
    const gppPath = this.resolveGpp();

    const requiredTools = [
      {
        name: 'G++ Compiler',
        command: gppPath,
        required: true,
        purpose: 'Compiles and links C/C++ translation units and native binaries',
      },
    ];

    if (hasCMake) {
      requiredTools.unshift({
        name: 'CMake Build System',
        command: cmakePath,
        required: true,
        purpose: 'Generates build configurations and drives compilation',
      });
      requiredTools.push({
        name: 'Ninja Build Generator',
        command: ninjaPath,
        required: false,
        purpose: 'High-speed generator for CMake compilation',
      });
    }

    const buildSystem = hasCMake ? 'CMake (Ninja / MinGW)' : hasManifest ? 'GitForge DAG (GCC/G++)' : hasMakefile ? 'Make' : 'Direct GCC/G++';

    return {
      kind: 'cpp',
      name: 'C/C++ Native Application',
      confidence,
      description: hasCMake
        ? 'CMake-driven C/C++ native build system'
        : hasManifest
        ? 'GitForge incremental DAG build system with GCC/G++'
        : 'C/C++ native source project',
      primaryLanguage: 'C++',
      frameworks: hasCMake ? ['CMake', 'Ninja'] : ['GCC/G++'],
      buildSystem,
      rootPath: '',
      manifestFile: hasCMake ? 'CMakeLists.txt' : hasManifest ? 'build.manifest.json' : hasMakefile ? 'Makefile' : undefined,
      entryPoint: cppFiles.find(f => f.toLowerCase().includes('main')) || cppFiles[0] || 'src/main.cpp',
      evidence,
      requiredTools,
      requiredServices: [],
    };
  }

  public async checkDependencies(_wsDir: string, _detected: ProjectDetectionResult): Promise<DependencyCheckResult> {
    return {
      installed: true,
      lockFileFound: false,
    };
  }

  public async generateBuildPlan(context: AdapterBuildContext): Promise<BuildPlan> {
    const { repositoryId, commitSha, changedFiles, affectedFiles, existingManifest } = context;

    let manifest: BuildManifest;

    const cmake = this.resolveCMake();
    const gpp = this.resolveGpp();

    // Check if existing manifest exists and is valid
    if (existingManifest && existingManifest.targets && existingManifest.targets.length > 0) {
      manifest = existingManifest;
    } else {
      // Check if project has CMakeLists.txt (either in context.files or detection evidence)
      const cmakeFiles = (context as any).files || [];
      const hasCMake = (Array.isArray(cmakeFiles) && cmakeFiles.some((f: string) => f.toLowerCase().endsWith('cmakelists.txt'))) ||
        context.detection?.manifestFile?.toLowerCase().endsWith('cmakelists.txt') ||
        context.detection?.frameworks?.includes('CMake');

      if (hasCMake) {
        const sourceInputs = Array.isArray(cmakeFiles) && cmakeFiles.length > 0
          ? cmakeFiles.filter((f: string) => /\.(cpp|cc|cxx|c|hpp|h)$/i.test(f))
          : ['src/main.cpp', 'src/calculator.cpp', 'src/formatter.cpp'];

        manifest = {
          version: 1,
          targets: [
            {
              name: 'cmake_configure',
              type: 'object',
              inputs: ['CMakeLists.txt', ...sourceInputs],
              outputs: ['build/build.ninja', 'build/CMakeCache.txt'],
              command: cmake,
              args: ['-B', 'build', '-G', 'Ninja'],
              dependencies: [],
            },
            {
              name: 'cmake_build',
              type: 'executable',
              inputs: ['build/build.ninja', ...sourceInputs],
              outputs: ['build/gitforge_cpp_sample.exe', 'build/app.exe', 'bin/app.exe'],
              command: cmake,
              args: ['--build', 'build', '--parallel', '8'],
              dependencies: ['cmake_configure'],
            },
          ],
          runTarget: 'build/gitforge_cpp_sample.exe',
        };
      } else {
        // Safe direct GCC/G++ build path
        manifest = {
          version: 1,
          targets: [
            {
              name: 'compile_main',
              type: 'executable',
              inputs: ['src/main.cpp'],
              outputs: ['bin/app.exe'],
              command: gpp,
              args: ['-std=c++17', '-O2', 'src/main.cpp', '-o', 'bin/app.exe'],
              dependencies: [],
            },
          ],
          runTarget: 'bin/app.exe',
        };
      }
    }

    return this.createPlanFromManifest(repositoryId, commitSha, manifest, changedFiles, affectedFiles);
  }

  public async getRunConfigurations(wsDir: string, detected: ProjectDetectionResult): Promise<RunConfiguration[]> {
    const candidates = [
      'bin/app.exe',
      'build/bin/app.exe',
      'build/app.exe',
      'bin/app',
      'build/app',
      'app.exe',
    ];

    let target = candidates.find(c => fs.existsSync(path.join(wsDir, c))) || 'bin/app.exe';

    return [
      {
        id: 'native_bin',
        name: detected.name || 'C/C++ Executable',
        type: 'binary',
        command: target,
        args: [],
        description: 'Run native compiled C/C++ executable',
      },
    ];
  }
}
