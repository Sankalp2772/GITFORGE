const { PrismaClient } = require('../node_modules/@prisma/client');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function setupRepos() {
  console.log('===========================================================');
  console.log('📦 CREATING SAMPLE REPOSITORIES IN GITFORGE');
  console.log('===========================================================');

  const alice = await prisma.user.findFirst({ where: { username: 'alice' } });
  if (!alice) throw new Error('User alice not found');

  const gitStorageRoot = path.resolve('D:/gitforge/data/repos');
  const tempScratchRoot = path.resolve('D:/gitforge/data/sample-projects');
  if (!fs.existsSync(tempScratchRoot)) fs.mkdirSync(tempScratchRoot, { recursive: true });

  const sampleDefinitions = [
    // 1. Python Sample App
    {
      name: 'python-demo',
      description: 'Python HTTP server microservice with health check',
      files: {
        'requirements.txt': 'urllib3>=2.0.0\nrequests>=2.31.0\n',
        'app.py': `import http.server
import socketserver
import os

PORT = int(os.environ.get("PORT", 8000))

class HealthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"UP","service":"python-demo"}')
        else:
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(b'<h1>Python Demo Service Running</h1>')

with socketserver.TCPServer(("", PORT), HealthHandler) as httpd:
    print(f"Python Server is listening on http://localhost:{PORT}")
    httpd.serve_forever()
`,
        'README.md': '# Python Demo Application\nBuilt for GitForge Build Engine testing.\n',
      }
    },

    // 2. Node.js Standalone API Demo
    {
      name: 'node-api-demo',
      description: 'Lightweight Node.js REST microservice with JSON API',
      files: {
        'package.json': JSON.stringify({
          name: 'node-api-demo',
          version: '1.0.0',
          main: 'server.js',
          scripts: {
            start: 'node server.js',
            dev: 'node --watch server.js'
          },
          dependencies: {}
        }, null, 2),
        'server.js': `const http = require('http');
const port = parseInt(process.env.PORT || '4000', 10);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'HEALTHY', app: 'node-api-demo' }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Node.js Microservice Active', timestamp: new Date() }));
  }
});

server.listen(port, () => {
  console.log('Node.js REST Service running at http://localhost:' + port);
});
`,
        'README.md': '# Node.js REST Microservice\nPure standard-library HTTP server.\n',
      }
    },

    // 3. React / Vite Standalone Frontend Demo
    {
      name: 'react-vite-demo',
      description: 'React single-page application bundled with Vite',
      files: {
        'package.json': JSON.stringify({
          name: 'react-vite-demo',
          private: true,
          version: '1.0.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview'
          },
          dependencies: {
            react: '^18.3.1',
            'react-dom': '^18.3.1'
          },
          devDependencies: {
            vite: '^6.0.1',
            '@vitejs/plugin-react': '^4.3.4'
          }
        }, null, 2),
        'vite.config.js': `import { defineConfig } from 'vite';
export default defineConfig({
  server: { port: parseInt(process.env.PORT || '5173', 10) }
});
`,
        'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>React Vite Demo</title>
  </head>
  <body>
    <div id="root"><h1>React Vite Single Page Application</h1></div>
  </body>
</html>
`,
        'src/main.jsx': `console.log('React Vite App mounted');`,
        'README.md': '# React Vite Single Page App\nFrontend demo application for GitForge Build Engine.\n',
      }
    }
  ];

  for (const s of sampleDefinitions) {
    const bareRepoPath = path.join(gitStorageRoot, alice.username, `${s.name}.git`);
    const scratchDir = path.join(tempScratchRoot, s.name);

    if (fs.existsSync(scratchDir)) {
      try { fs.rmSync(scratchDir, { recursive: true, force: true }); } catch(e){}
    }
    fs.mkdirSync(scratchDir, { recursive: true });

    // Write files
    for (const [fName, content] of Object.entries(s.files)) {
      const fullF = path.join(scratchDir, fName);
      fs.mkdirSync(path.dirname(fullF), { recursive: true });
      fs.writeFileSync(fullF, content);
    }

    // Git init scratch and push to bare
    if (!fs.existsSync(bareRepoPath)) {
      fs.mkdirSync(bareRepoPath, { recursive: true });
      execSync('git init --bare', { cwd: bareRepoPath });
    }

    execSync('git init', { cwd: scratchDir });
    execSync('git checkout -b main', { cwd: scratchDir });
    execSync('git add -A', { cwd: scratchDir });
    execSync(`git commit -m "Initial commit of ${s.name}"`, { cwd: scratchDir });
    execSync(`git push -u "${bareRepoPath}" HEAD:main --force`, { cwd: scratchDir });

    // Database record
    let repo = await prisma.repository.findFirst({
      where: { ownerId: alice.id, name: s.name }
    });
    if (!repo) {
      repo = await prisma.repository.create({
        data: {
          name: s.name,
          description: s.description,
          ownerId: alice.id,
          visibility: 'PUBLIC',
          storagePath: bareRepoPath,
          defaultBranch: 'main',
        }
      });
      console.log(`✅ Created DB repository: alice/${s.name} (${repo.id})`);
    } else {
      console.log(`ℹ️ Existing DB repository: alice/${s.name} (${repo.id})`);
    }
  }

  await prisma.$disconnect();
  console.log('\nAll sample repositories created and populated!');
}

setupRepos().catch(console.error);
