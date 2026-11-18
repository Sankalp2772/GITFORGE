import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { RunSessionState } from '../types';
import { config } from '../../config';

export interface DetectedService {
  id: string;
  name: string;
  type: 'backend' | 'frontend' | 'binary' | 'script' | 'web';
  executablePath: string;
  defaultPort?: number;
  args?: string[];
  description: string;
}

export class LocalRunManager {
  private static workspaceRoot = path.resolve(config.gitStorageRoot, '..', 'build-workspaces');
  private static activeSessions: Record<string, { session: RunSessionState; process?: ChildProcess }> = {};

  /**
   * Find an available TCP port starting from preferredPort
   * Avoids EADDRINUSE without terminating unrelated user processes.
   */
  public static async findAvailablePort(preferredPort: number, maxTries = 30): Promise<number> {
    // Avoid GitForge core port 5000 and client port 5174
    const reservedPorts = new Set([5000, 5174]);

    for (let port = preferredPort; port < preferredPort + maxTries; port++) {
      if (reservedPorts.has(port)) continue;

      const isFree = await new Promise<boolean>((resolve) => {
        const srv = net.createServer();
        srv.once('error', () => resolve(false));
        srv.once('listening', () => {
          srv.close(() => resolve(true));
        });
        srv.listen(port, '0.0.0.0');
      });

      if (isFree) return port;
    }
    return preferredPort + 10;
  }

  /**
   * Dynamically detect runnable services in the actual workspace directory
   * Purely evidence-based: NO hardcoded project assumptions.
   */
  public static detectServices(buildJobId: string): DetectedService[] {
    const wsDir = path.join(this.workspaceRoot, buildJobId);
    const services: DetectedService[] = [];
    if (!fs.existsSync(wsDir)) return services;

    // 1. Check for compiled native binaries
    const binCandidates = [
      'bin/app.exe',
      'build/bin/app.exe',
      'build/app.exe',
      'build/gitforge_cpp_sample.exe',
      'gitforge_cpp_sample.exe',
      'bin/app',
      'app.exe',
      'main.exe',
    ];
    // Also scan build/ directory for any .exe produced by CMake
    if (fs.existsSync(path.join(wsDir, 'build'))) {
      try {
        const buildFiles = fs.readdirSync(path.join(wsDir, 'build'));
        for (const bf of buildFiles) {
          if (bf.endsWith('.exe') && !binCandidates.includes(`build/${bf}`)) {
            binCandidates.unshift(`build/${bf}`);
          }
        }
      } catch {}
    }
    for (const b of binCandidates) {
      if (fs.existsSync(path.join(wsDir, b))) {
        services.push({
          id: 'binary',
          name: 'Native Executable',
          type: 'binary',
          executablePath: b,
          description: `Compiled binary: ${b}`,
        });
        break;
      }
    }

    // 2. Check for Python applications
    const pyCandidates = ['main.py', 'app.py', 'server.py', 'run.py'];
    for (const py of pyCandidates) {
      if (fs.existsSync(path.join(wsDir, py))) {
        services.push({
          id: 'python_app',
          name: 'Python Application',
          type: 'script',
          executablePath: py,
          defaultPort: 8000,
          description: `Python script: ${py}`,
        });
        break;
      }
    }

    // 3. Check for root Node.js application
    if (fs.existsSync(path.join(wsDir, 'package.json'))) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(wsDir, 'package.json'), 'utf-8'));
        const mainFile = pkg.main || 'server.js';
        const hasVite = pkg.devDependencies?.vite || pkg.dependencies?.vite;

        if (hasVite) {
          services.push({
            id: 'frontend',
            name: pkg.name ? `${pkg.name} (Vite App)` : 'Vite Web Application',
            type: 'frontend',
            executablePath: 'node_modules/vite/bin/vite.js',
            defaultPort: 5173,
            description: 'Vite Development Server',
          });
        } else if (fs.existsSync(path.join(wsDir, mainFile)) || fs.existsSync(path.join(wsDir, 'server.js')) || fs.existsSync(path.join(wsDir, 'app.js'))) {
          const entry = fs.existsSync(path.join(wsDir, mainFile)) ? mainFile : fs.existsSync(path.join(wsDir, 'server.js')) ? 'server.js' : 'app.js';
          services.push({
            id: 'backend',
            name: pkg.name ? `${pkg.name} (Node.js Server)` : 'Node.js Server',
            type: 'backend',
            executablePath: entry,
            defaultPort: 3000,
            description: `Node.js server: ${entry}`,
          });
        }
      } catch { /* ignore json parse errors */ }
    }

    // 4. Check for nested backend directory (e.g. backend/package.json or backend/src/server.js)
    const backendPkg = path.join(wsDir, 'backend', 'package.json');
    if (fs.existsSync(backendPkg)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(backendPkg, 'utf-8'));
        const main = pkg.main ? path.join('backend', pkg.main) : path.join('backend', 'src', 'server.js');
        const entry = fs.existsSync(path.join(wsDir, main)) ? main : 'backend/server.js';
        services.push({
          id: 'backend',
          name: pkg.name || 'Backend API Service',
          type: 'backend',
          executablePath: entry.replace(/\\/g, '/'),
          defaultPort: 5050,
          description: 'Node.js backend service in /backend',
        });
      } catch { /* ignore */ }
    }

    // 5. Check for nested frontend directory (e.g. frontend/package.json or client/package.json)
    for (const feDir of ['frontend', 'client']) {
      const fePkg = path.join(wsDir, feDir, 'package.json');
      if (fs.existsSync(fePkg)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(fePkg, 'utf-8'));
          services.push({
            id: 'frontend',
            name: pkg.name || `${feDir} Web Application`,
            type: 'frontend',
            executablePath: `${feDir}/node_modules/vite/bin/vite.js`,
            defaultPort: 5173,
            description: `Frontend web application in /${feDir}`,
          });
        } catch { /* ignore */ }
      }
    }

    // 6. Check for static web HTML
    if (services.length === 0 && (fs.existsSync(path.join(wsDir, 'index.html')) || fs.existsSync(path.join(wsDir, 'public', 'index.html')))) {
      services.push({
        id: 'static_web',
        name: 'Static Web Application',
        type: 'web',
        executablePath: fs.existsSync(path.join(wsDir, 'index.html')) ? 'index.html' : 'public/index.html',
        defaultPort: 8080,
        description: 'Static HTML/CSS/JavaScript web application',
      });
    }

    return services;
  }

  /**
   * Run compiled application or script safely
   */
  public static async runApplication(
    buildJobId: string,
    repositoryId: string,
    executableRelPath: string,
    args: string[] = [],
    serviceId?: string,
    requestedPort?: number
  ): Promise<RunSessionState> {
    const wsDir = path.join(this.workspaceRoot, buildJobId);
    let resolvedRelPath = executableRelPath;

    // Normalization: if someone passes "frontend" or directory, resolve intelligently
    if (resolvedRelPath === 'frontend' || resolvedRelPath === 'frontend/' || resolvedRelPath === 'client') {
      const fe = resolvedRelPath.replace(/\/$/, '');
      resolvedRelPath = `${fe}/node_modules/vite/bin/vite.js`;
    }

    const exeFullPath = path.join(wsDir, resolvedRelPath);

    // Stop existing managed session for this component in this job
    if (serviceId) {
      for (const [sid, entry] of Object.entries(this.activeSessions)) {
        if (entry.session.buildJobId === buildJobId && entry.session.serviceId === serviceId && entry.session.status === 'RUNNING') {
          if (entry.process) {
            try { entry.process.kill(); } catch { /* ignore */ }
          }
          entry.session.status = 'STOPPED';
          entry.session.endTime = new Date().toISOString();
        }
      }
    }

    const sessionId = `run_${serviceId ? serviceId + '_' : ''}${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const isNode = resolvedRelPath.endsWith('.js') || resolvedRelPath.includes('node_modules');
    const isPython = resolvedRelPath.endsWith('.py');
    const isHtml = resolvedRelPath.endsWith('.html');
    const isNativeBinary = resolvedRelPath.endsWith('.exe') || (!isNode && !isPython && !isHtml && !resolvedRelPath.includes('.'));

    let allocatedPort: number | undefined;
    let allocatedUrl: string | undefined;

    // Only assign and probe network ports if the application is an actual web/network service
    if (isHtml || isNode || isPython || requestedPort) {
      const preferredPort = requestedPort || (isHtml ? 8080 : isPython ? 8000 : resolvedRelPath.includes('frontend') ? 5173 : 3000);
      allocatedPort = await this.findAvailablePort(preferredPort);
      allocatedUrl = `http://localhost:${allocatedPort}`;
    }

    const sessionState: RunSessionState = {
      id: sessionId,
      buildJobId,
      repositoryId,
      serviceId,
      serviceName: serviceId ? serviceId.toUpperCase() : path.basename(resolvedRelPath),
      executablePath: resolvedRelPath,
      status: 'RUNNING',
      port: allocatedPort,
      url: allocatedUrl,
      logs: [],
      startTime: new Date().toISOString(),
    };

    let spawnCmd = exeFullPath;
    let spawnArgs: string[] = args;
    let spawnCwd = path.dirname(exeFullPath);

    // Set working directory relative to component root
    if (resolvedRelPath.startsWith('frontend/') || resolvedRelPath.startsWith('client/')) {
      const topDir = resolvedRelPath.split('/')[0];
      spawnCwd = path.join(wsDir, topDir);
    } else if (resolvedRelPath.startsWith('backend/')) {
      spawnCwd = path.join(wsDir, 'backend');
    } else {
      spawnCwd = wsDir;
    }

    // Configure runner command and arguments
    if (isNode) {
      spawnCmd = 'node';
      spawnArgs = [exeFullPath, ...args];
    } else if (isPython) {
      spawnCmd = 'python';
      spawnArgs = [exeFullPath, ...args];
    } else if (isHtml) {
      spawnCmd = 'node';
      const serveDir = path.dirname(exeFullPath);
      const serverCode = `const http=require('http'); const fs=require('fs'); const path=require('path'); const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg'}; http.createServer((req,res)=>{ let p=path.join('${serveDir.replace(/\\/g, '/')}',req.url==='/'?'${path.basename(exeFullPath)}':req.url); if(fs.existsSync(p)&&fs.statSync(p).isFile()){ res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'text/plain'}); fs.createReadStream(p).pipe(res); } else { res.writeHead(404); res.end('Not Found'); } }).listen(${allocatedPort},()=>console.log('Static web app running at http://localhost:${allocatedPort}'));`;
      spawnArgs = ['-e', serverCode];
    }

    // Prepare clean child environment
    const childEnv: Record<string, string | undefined> = {
      ...process.env,
      NODE_ENV: 'development',
    };
    if (allocatedPort !== undefined) {
      childEnv.PORT = String(allocatedPort);
    }

    // Safe execution with argument arrays (wrap Windows binaries with cmd.exe to handle DeviceGuard/AV cleanly and stream stderr)
    let child: ChildProcess;
    if (process.platform === 'win32' && !isNode && !isPython && !isHtml) {
      child = spawn('cmd.exe', ['/c', spawnCmd, ...spawnArgs], {
        cwd: spawnCwd,
        windowsHide: true,
        env: childEnv,
      });
    } else {
      child = spawn(spawnCmd, spawnArgs, {
        cwd: spawnCwd,
        windowsHide: true,
        env: childEnv,
      });
    }

    sessionState.pid = child.pid;
    this.activeSessions[sessionId] = { session: sessionState, process: child };

    const checkPortAndUrl = (text: string) => {
      // Ignore stack traces
      if (text.includes('node:net') || text.includes('EADDRINUSE') || text.includes('Error:') || text.includes('at Server.')) {
        return;
      }
      const clean = text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
      const urlMatch = clean.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d{4,5})\/?/i);
      if (urlMatch) {
        sessionState.port = parseInt(urlMatch[1], 10);
        sessionState.url = urlMatch[0];
      }
    };

    child.stdout?.on('data', (d) => {
      const line = d.toString('utf-8');
      sessionState.logs.push(line);
      checkPortAndUrl(line);
    });

    child.stderr?.on('data', (d) => {
      const line = d.toString('utf-8');
      sessionState.logs.push(`[stderr] ${line}`);
      checkPortAndUrl(line);
    });

    child.on('close', (code) => {
      sessionState.status = code === 0 ? 'STOPPED' : 'FAILED';
      sessionState.exitCode = code ?? undefined;
      sessionState.endTime = new Date().toISOString();
    });

    child.on('error', (err) => {
      sessionState.status = 'FAILED';
      sessionState.logs.push(`[error] Process failed to spawn: ${err.message}\n`);
    });

    return sessionState;
  }

  /**
   * Run dependency installation inside workspace upon user approval
   */
  public static async installDependencies(buildJobId: string, subDir = ''): Promise<{ success: boolean; log: string }> {
    const wsDir = path.join(this.workspaceRoot, buildJobId, subDir);
    if (!fs.existsSync(wsDir)) {
      throw new Error(`Workspace directory ${wsDir} does not exist`);
    }

    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';
      const npmCmd = isWin ? 'npm.cmd' : 'npm';
      const child = spawn(npmCmd, ['install', '--prefer-offline', '--no-audit'], {
        cwd: wsDir,
        windowsHide: true,
      });

      let output = '';
      child.stdout?.on('data', d => { output += d.toString('utf-8'); });
      child.stderr?.on('data', d => { output += d.toString('utf-8'); });

      child.on('close', code => {
        resolve({ success: code === 0, log: output });
      });
      child.on('error', err => {
        resolve({ success: false, log: err.message });
      });
    });
  }

  public static sendInput(sessionId: string, input: string): boolean {
    const entry = this.activeSessions[sessionId];
    if (entry && entry.process && entry.session.status === 'RUNNING') {
      try {
        const textWithNewline = input.endsWith('\n') ? input : input + '\n';
        // Echo input into the session logs so the user sees what they typed
        entry.session.logs.push(`> ${input}\n`);
        entry.process.stdin?.write(textWithNewline);
        return true;
      } catch (e) {
        console.warn('[sendInput] Error writing to stdin:', e);
      }
    }
    return false;
  }

  public static stopSession(sessionId: string): boolean {
    const entry = this.activeSessions[sessionId];
    if (entry && entry.process) {
      try {
        entry.process.kill();
      } catch { /* ignore */ }
      entry.session.status = 'STOPPED';
      entry.session.endTime = new Date().toISOString();
      return true;
    }
    return false;
  }

  public static getSession(sessionId: string): RunSessionState | undefined {
    return this.activeSessions[sessionId]?.session;
  }

  public static getSessionsForJob(buildJobId: string): RunSessionState[] {
    return Object.values(this.activeSessions)
      .map(entry => entry.session)
      .filter(s => s.buildJobId === buildJobId);
  }
}
