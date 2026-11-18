const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tempDir = path.resolve('D:/gitforge/data/temp-cpp-setup');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });

// 1. src/shared.hpp
fs.writeFileSync(path.join(tempDir, 'src', 'shared.hpp'), `#ifndef SHARED_HPP
#define SHARED_HPP

#include <string>

struct TaskPayload {
    int id;
    std::string taskName;
    int computationCost;
};

#endif
`);

// 2. src/worker.hpp
fs.writeFileSync(path.join(tempDir, 'src', 'worker.hpp'), `#ifndef WORKER_HPP
#define WORKER_HPP

#include "shared.hpp"

class Worker {
public:
    Worker(int workerId);
    void process(const TaskPayload& payload);
private:
    int id;
};

#endif
`);

// 3. src/worker.cpp
fs.writeFileSync(path.join(tempDir, 'src', 'worker.cpp'), `#include "worker.hpp"
#include <iostream>

Worker::Worker(int workerId) : id(workerId) {}

void Worker::process(const TaskPayload& payload) {
    std::cout << "[Worker " << id << "] Executing: " << payload.taskName 
              << " with cost " << payload.computationCost << std::endl;
}
`);

// 4. src/main.cpp
fs.writeFileSync(path.join(tempDir, 'src', 'main.cpp'), `#include "shared.hpp"
#include "worker.hpp"
#include <iostream>

int main() {
    std::cout << "=== GitForge Custom Incremental Build Engine Demo ===" << std::endl;
    Worker worker(1);
    TaskPayload task{ 101, "ComputeDependencyClosure", 42 };
    worker.process(task);
    std::cout << "Application execution completed successfully!" << std::endl;
    return 0;
}
`);

// 5. build.manifest.json
fs.writeFileSync(path.join(tempDir, 'build.manifest.json'), JSON.stringify({
  version: 1,
  runTarget: "link_app",
  targets: [
    {
      name: "compile_worker",
      type: "object",
      inputs: ["src/worker.cpp", "src/worker.hpp", "src/shared.hpp"],
      outputs: ["build/worker.o"],
      command: "C:/msys64/ucrt64/bin/g++.exe",
      args: ["-c", "src/worker.cpp", "-Isrc", "-o", "build/worker.o"],
      dependencies: []
    },
    {
      name: "compile_main",
      type: "object",
      inputs: ["src/main.cpp", "src/shared.hpp"],
      outputs: ["build/main.o"],
      command: "C:/msys64/ucrt64/bin/g++.exe",
      args: ["-c", "src/main.cpp", "-Isrc", "-o", "build/main.o"],
      dependencies: []
    },
    {
      name: "link_app",
      type: "executable",
      inputs: ["build/main.o", "build/worker.o"],
      outputs: ["bin/app.exe"],
      command: "C:/msys64/ucrt64/bin/g++.exe",
      args: ["build/main.o", "build/worker.o", "-o", "bin/app.exe"],
      dependencies: ["compile_main", "compile_worker"]
    }
  ]
}, null, 2));

console.log('Test C++ source files and manifest written to', tempDir);

execSync('git init', { cwd: tempDir, stdio: 'inherit' });
execSync('git config user.name "Alice Developer"', { cwd: tempDir, stdio: 'inherit' });
execSync('git config user.email "alice@gitforge.local"', { cwd: tempDir, stdio: 'inherit' });
execSync('git add .', { cwd: tempDir, stdio: 'inherit' });
execSync('git commit -m "Initial C++ project with build manifest"', { cwd: tempDir, stdio: 'inherit' });
execSync('git branch -M main', { cwd: tempDir, stdio: 'inherit' });
execSync('git remote add origin http://alice:DemoPassword123!@localhost:5000/git/alice/cpp-demo.git', { cwd: tempDir, stdio: 'inherit' });
execSync('git push -u origin main', { cwd: tempDir, stdio: 'inherit' });

console.log('Successfully pushed C++ test repository to GitForge!');
