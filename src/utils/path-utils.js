const path = require('path');

function safeJoin(root, target) {
  const resolved = path.resolve(root, target);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error('Path outside workspace');
  }
  return resolved;
}

module.exports = { safeJoin };

