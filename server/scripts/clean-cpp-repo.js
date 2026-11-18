const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tempDir = path.resolve('D:/gitforge/data/temp-cpp-setup');

const content = `#ifndef SHARED_HPP
#define SHARED_HPP

#include <string>

struct TaskPayload {
    int id;
    std::string taskName;
    int computationCost;
};

#endif
`;

fs.writeFileSync(path.join(tempDir, 'src', 'shared.hpp'), content);

execSync('git add src/shared.hpp', { cwd: tempDir, stdio: 'inherit' });
execSync('git commit -m "Ensure header guard wraps shared.hpp cleanly"', { cwd: tempDir, stdio: 'inherit' });
execSync('git push origin main', { cwd: tempDir, stdio: 'inherit' });
console.log('Fixed shared.hpp header guard and pushed.');
