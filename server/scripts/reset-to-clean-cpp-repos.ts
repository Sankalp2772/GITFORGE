import { PrismaClient } from '../node_modules/@prisma/client/default.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function resetToCleanCppRepos() {
  console.log('--- Cleaning all existing repositories from DB ---');
  const allRepos = await prisma.repository.findMany();
  console.log(`Found ${allRepos.length} repos to remove.`);

  for (const r of allRepos) {
    try {
      await prisma.pullRequest.deleteMany({ where: { repositoryId: r.id } }).catch(() => {});
      await prisma.issue.deleteMany({ where: { repositoryId: r.id } }).catch(() => {});
      await prisma.member.deleteMany({ where: { repositoryId: r.id } }).catch(() => {});
      await prisma.repository.delete({ where: { id: r.id } });
      console.log('Removed DB record:', r.name);
    } catch (e: any) {
      console.warn('Could not remove repo:', r.name, e.message);
    }
  }

  let alice = await prisma.user.findFirst({ where: { username: 'alice' } });
  if (!alice) {
    alice = await prisma.user.create({
      data: {
        username: 'alice',
        email: 'alice@gitforge.internal',
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ek58mMxcdtjpG7i22',
      },
    });
  }

  const cppProjects = [
    {
      name: 'cpp-core-engine',
      description: 'C++ Modular High-Performance Incremental Engine',
      files: {
        'src/main.cpp': [
          '#include "worker.hpp"',
          '#include "shared.hpp"',
          '#include <iostream>',
          '',
          'int main() {',
          '    std::cout << "==================================================" << std::endl;',
          '    std::cout << "  GitForge C++ Core Engine Running" << std::endl;',
          '    std::cout << "==================================================" << std::endl;',
          '    Worker worker(42);',
          '    TaskPayload task{ 1001, "TopologicalBuildExecution", 8 };',
          '    worker.executeTask(task);',
          '    std::cout << "Build and Run Execution Completed Successfully!" << std::endl;',
          '    return 0;',
          '}',
        ].join('\n'),
        'src/worker.hpp': [
          '#ifndef WORKER_HPP',
          '#define WORKER_HPP',
          '#include "shared.hpp"',
          '',
          'class Worker {',
          'public:',
          '    Worker(int id);',
          '    void executeTask(const TaskPayload& task);',
          'private:',
          '    int workerId;',
          '};',
          '#endif',
        ].join('\n'),
        'src/worker.cpp': [
          '#include "worker.hpp"',
          '#include <iostream>',
          '',
          'Worker::Worker(int id) : workerId(id) {}',
          '',
          'void Worker::executeTask(const TaskPayload& task) {',
          '    std::cout << "[Worker #" << workerId << "] Processing Task: " << task.taskName << " (Concurrency: " << task.concurrency << ")" << std::endl;',
          '}',
        ].join('\n'),
        'src/shared.hpp': [
          '#ifndef SHARED_HPP',
          '#define SHARED_HPP',
          '#include <string>',
          '',
          'struct TaskPayload {',
          '    int id;',
          '    std::string taskName;',
          '    int concurrency;',
          '};',
          '#endif',
        ].join('\n'),
        'build.manifest.json': JSON.stringify(
          {
            version: 1,
            runTarget: 'link_app',
            targets: [
              {
                name: 'compile_worker',
                type: 'object',
                inputs: ['src/worker.cpp', 'src/worker.hpp', 'src/shared.hpp'],
                outputs: ['build/worker.o'],
                command: 'C:/msys64/ucrt64/bin/g++.exe',
                args: ['-c', 'src/worker.cpp', '-Isrc', '-o', 'build/worker.o'],
                dependencies: [],
              },
              {
                name: 'compile_main',
                type: 'object',
                inputs: ['src/main.cpp', 'src/worker.hpp', 'src/shared.hpp'],
                outputs: ['build/main.o'],
                command: 'C:/msys64/ucrt64/bin/g++.exe',
                args: ['-c', 'src/main.cpp', '-Isrc', '-o', 'build/main.o'],
                dependencies: [],
              },
              {
                name: 'link_app',
                type: 'executable',
                inputs: ['build/main.o', 'build/worker.o'],
                outputs: ['bin/app.exe'],
                command: 'C:/msys64/ucrt64/bin/g++.exe',
                args: ['build/main.o', 'build/worker.o', '-o', 'bin/app.exe'],
                dependencies: ['compile_main', 'compile_worker'],
              },
            ],
          },
          null,
          2
        ),
      },
    },
    {
      name: 'cpp-math-server',
      description: 'C++ Fast Math Computation & Evaluation Service',
      files: {
        'src/math_ops.hpp': [
          '#ifndef MATH_OPS_HPP',
          '#define MATH_OPS_HPP',
          '',
          'long long computeFactorial(int n);',
          'long long computeFibonacci(int n);',
          '',
          '#endif',
        ].join('\n'),
        'src/math_ops.cpp': [
          '#include "math_ops.hpp"',
          '',
          'long long computeFactorial(int n) {',
          '    if (n <= 1) return 1;',
          '    return n * computeFactorial(n - 1);',
          '}',
          '',
          'long long computeFibonacci(int n) {',
          '    if (n <= 0) return 0;',
          '    if (n == 1) return 1;',
          '    return computeFibonacci(n - 1) + computeFibonacci(n - 2);',
          '}',
        ].join('\n'),
        'src/main.cpp': [
          '#include "math_ops.hpp"',
          '#include <iostream>',
          '',
          'int main() {',
          '    std::cout << "==================================================" << std::endl;',
          '    std::cout << "  C++ Math Server Running" << std::endl;',
          '    std::cout << "==================================================" << std::endl;',
          '    std::cout << "Factorial(8) = " << computeFactorial(8) << std::endl;',
          '    std::cout << "Fibonacci(12) = " << computeFibonacci(12) << std::endl;',
          '    std::cout << "All math validations passed!" << std::endl;',
          '    return 0;',
          '}',
        ].join('\n'),
        'build.manifest.json': JSON.stringify(
          {
            version: 1,
            runTarget: 'link_math',
            targets: [
              {
                name: 'compile_ops',
                type: 'object',
                inputs: ['src/math_ops.cpp', 'src/math_ops.hpp'],
                outputs: ['build/math_ops.o'],
                command: 'C:/msys64/ucrt64/bin/g++.exe',
                args: ['-c', 'src/math_ops.cpp', '-Isrc', '-o', 'build/math_ops.o'],
                dependencies: [],
              },
              {
                name: 'compile_main',
                type: 'object',
                inputs: ['src/main.cpp', 'src/math_ops.hpp'],
                outputs: ['build/main.o'],
                command: 'C:/msys64/ucrt64/bin/g++.exe',
                args: ['-c', 'src/main.cpp', '-Isrc', '-o', 'build/main.o'],
                dependencies: [],
              },
              {
                name: 'link_math',
                type: 'executable',
                inputs: ['build/main.o', 'build/math_ops.o'],
                outputs: ['bin/app.exe'],
                command: 'C:/msys64/ucrt64/bin/g++.exe',
                args: ['build/main.o', 'build/math_ops.o', '-o', 'bin/app.exe'],
                dependencies: ['compile_main', 'compile_ops'],
              },
            ],
          },
          null,
          2
        ),
      },
    },
    {
      name: 'cpp-crypto-benchmark',
      description: 'C++ Cryptographic Hash & Benchmark Utility',
      files: {
        'src/hasher.hpp': [
          '#ifndef HASHER_HPP',
          '#define HASHER_HPP',
          '#include <string>',
          '',
          'class FastHasher {',
          'public:',
          '    unsigned long long hashString(const std::string& input);',
          '};',
          '#endif',
        ].join('\n'),
        'src/hasher.cpp': [
          '#include "hasher.hpp"',
          '',
          'unsigned long long FastHasher::hashString(const std::string& input) {',
          '    unsigned long long hash = 14695981039346656037ULL;',
          '    for (char c : input) {',
          '        hash ^= (unsigned char)c;',
          '        hash *= 1099511628211ULL;',
          '    }',
          '    return hash;',
          '}',
        ].join('\n'),
        'src/main.cpp': [
          '#include "hasher.hpp"',
          '#include <iostream>',
          '',
          'int main() {',
          '    std::cout << "==================================================" << std::endl;',
          '    std::cout << "  C++ Crypto Benchmark Suite" << std::endl;',
          '    std::cout << "==================================================" << std::endl;',
          '    FastHasher hasher;',
          '    std::string sample = "GitForge-Fast-Hash-Algorithm";',
          '    std::cout << "Input: " << sample << std::endl;',
          '    std::cout << "Computed Hash: 0x" << std::hex << hasher.hashString(sample) << std::endl;',
          '    std::cout << "Benchmark checks verified." << std::endl;',
          '    return 0;',
          '}',
        ].join('\n'),
        'build.manifest.json': JSON.stringify(
          {
            version: 1,
            runTarget: 'link_benchmark',
            targets: [
              {
                name: 'compile_hasher',
                type: 'object',
                inputs: ['src/hasher.cpp', 'src/hasher.hpp'],
                outputs: ['build/hasher.o'],
                command: 'C:/msys64/ucrt64/bin/g++.exe',
                args: ['-c', 'src/hasher.cpp', '-Isrc', '-o', 'build/hasher.o'],
                dependencies: [],
              },
              {
                name: 'compile_main',
                type: 'object',
                inputs: ['src/main.cpp', 'src/hasher.hpp'],
                outputs: ['build/main.o'],
                command: 'C:/msys64/ucrt64/bin/g++.exe',
                args: ['-c', 'src/main.cpp', '-Isrc', '-o', 'build/main.o'],
                dependencies: [],
              },
              {
                name: 'link_benchmark',
                type: 'executable',
                inputs: ['build/main.o', 'build/hasher.o'],
                outputs: ['bin/app.exe'],
                command: 'C:/msys64/ucrt64/bin/g++.exe',
                args: ['build/main.o', 'build/hasher.o', '-o', 'bin/app.exe'],
                dependencies: ['compile_main', 'compile_hasher'],
              },
            ],
          },
          null,
          2
        ),
      },
    },
  ];

  for (const proj of cppProjects) {
    const repoDir = path.join('D:/gitforge/data/repos/alice', `${proj.name}.git`);
    if (fs.existsSync(repoDir)) {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
    fs.mkdirSync(repoDir, { recursive: true });

    const tmpWs = path.join('D:/gitforge/data', `temp_init_${proj.name}`);
    if (fs.existsSync(tmpWs)) {
      fs.rmSync(tmpWs, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpWs, { recursive: true });

    for (const [relPath, content] of Object.entries(proj.files)) {
      const fullPath = path.join(tmpWs, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    execSync(`git init --bare "${repoDir}"`, { stdio: 'pipe' });
    execSync('git init -b main', { cwd: tmpWs, stdio: 'pipe' });
    execSync('git config user.name "Alice"', { cwd: tmpWs, stdio: 'pipe' });
    execSync('git config user.email "alice@gitforge.internal"', { cwd: tmpWs, stdio: 'pipe' });
    execSync('git add .', { cwd: tmpWs, stdio: 'pipe' });
    execSync(`git commit -m "Initial commit: ${proj.name}"`, { cwd: tmpWs, stdio: 'pipe' });
    execSync(`git remote add origin "${repoDir.replace(/\\/g, '/')}"`, { cwd: tmpWs, stdio: 'pipe' });
    execSync('git push -u origin main', { cwd: tmpWs, stdio: 'pipe' });

    fs.rmSync(tmpWs, { recursive: true, force: true });

    const created = await prisma.repository.create({
      data: {
        name: proj.name,
        description: proj.description,
        storagePath: repoDir,
        defaultBranch: 'main',
        ownerId: alice.id,
      },
    });

    console.log(`Created repository: ${proj.name} (${created.id})`);
  }

  console.log('--- Repository initialization finished successfully ---');
}

resetToCleanCppRepos()
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
