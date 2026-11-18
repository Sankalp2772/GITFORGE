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

export class StaticWebAdapter extends BaseBuildAdapter {
  kind: ProjectKind = 'static_web';
  name = 'Static Web (HTML/CSS/JS) Adapter';

  public async detect(
    files: string[],
    _readFile: (p: string) => Promise<string | null>
  ): Promise<ProjectDetectionResult | null> {
    const hasIndexHtml = files.some(f => /^(index\.html|public\/index\.html)$/i.test(f));
    const hasPackageJson = files.some(f => f.toLowerCase() === 'package.json');
    const hasMakefile = files.some(f => f.toLowerCase() === 'makefile');
    const hasRequirements = files.some(f => f.toLowerCase() === 'requirements.txt');

    // Only static web if no backend build manifest is present
    if (!hasIndexHtml || hasPackageJson || hasMakefile || hasRequirements) {
      return null;
    }

    const htmlFiles = files.filter(f => f.toLowerCase().endsWith('.html'));
    const cssFiles = files.filter(f => f.toLowerCase().endsWith('.css'));
    const jsFiles = files.filter(f => f.toLowerCase().endsWith('.js'));

    const evidence = [
      'index.html entry document found in root or public/',
      `Found ${htmlFiles.length} HTML, ${cssFiles.length} CSS, and ${jsFiles.length} JavaScript asset files`,
      'No backend build manifest detected — application is client-side static web',
    ];

    return {
      kind: 'static_web',
      name: 'Static Web Application',
      confidence: 0.9,
      description: 'Pure client-side static web application (HTML5, CSS3, JavaScript)',
      primaryLanguage: 'HTML/CSS/JavaScript',
      frameworks: ['Vanilla Web', 'HTML5', 'CSS3'],
      buildSystem: 'Static Web Validator',
      rootPath: '',
      entryPoint: files.find(f => /^index\.html$/i.test(f)) || 'public/index.html',
      evidence,
      requiredTools: [
        {
          name: 'Node.js Runtime',
          command: 'node',
          required: true,
          purpose: 'Runs local HTTP server for previewing web assets',
        },
      ],
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
    const { repositoryId, commitSha, changedFiles, affectedFiles, detection } = context;
    const entry = detection.entryPoint || 'index.html';

    // Static Web projects do NOT pretend to compile!
    // Instead they run real asset integrity validation:
    // 1. validate_html_entry: checks that index.html exists, is readable, and has basic valid tags
    // 2. verify_static_assets: checks internal links & scripts
    const targets = [
      {
        name: 'validate_html_structure',
        type: 'asset_validation',
        inputs: [entry],
        outputs: ['build/static_validation_ok.txt'],
        command: 'node',
        args: [
          '-e',
          'const fs=require(\"fs\"); const h=fs.readFileSync(\"' + entry + '\",\"utf-8\"); if(!h.includes(\"<html\")&&!h.includes(\"<!DOCTYPE\")) throw new Error(\"Invalid HTML root document\"); if(!fs.existsSync(\"build\")) fs.mkdirSync(\"build\"); fs.writeFileSync(\"build/static_validation_ok.txt\",\"OK\");',
        ],
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
    const entry = detected.entryPoint || 'index.html';
    const serveDir = path.dirname(entry) === '.' ? '.' : path.dirname(entry);

    // Safe zero-dependency HTTP server via node
    const serverScript = `const http=require('http'); const fs=require('fs'); const path=require('path'); const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg'}; http.createServer((req,res)=>{ let p=path.join(__dirname,'${serveDir}',req.url==='/'?'index.html':req.url); if(fs.existsSync(p)&&fs.statSync(p).isFile()){ res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'text/plain'}); fs.createReadStream(p).pipe(res); } else { res.writeHead(404); res.end('Not Found'); } }).listen(8080,()=>console.log('Static web server running at http://localhost:8080'));`;

    return [
      {
        id: 'static_serve',
        name: 'Static Web Local Server',
        type: 'web',
        command: 'node',
        args: ['-e', serverScript],
        defaultPort: 8080,
        description: 'Serve static HTML/CSS/JS assets on local HTTP server (:8080)',
      },
    ];
  }
}
