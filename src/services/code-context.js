const fs = require('fs').promises;
const path = require('path');

function safeJoin(root, target) {
  const resolved = path.resolve(root, target);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error('Path outside workspace');
  }
  return resolved;
}

async function walkFiles(dir, opts = {}) {
  const { ignore = ['node_modules', '.git', '.agent_data'] } = opts;
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (ignore.includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = await walkFiles(full, opts);
      results.push(...sub);
    } else {
      results.push(full);
    }
  }
  return results;
}

function extractTokens(text, limit = 20) {
  const re = /\b[A-Za-z_][A-Za-z0-9_]{3,}\b/g;
  const map = new Map();
  let m;
  while ((m = re.exec(text))) {
    const t = m[0];
    map.set(t, (map.get(t) || 0) + 1);
    if (map.size >= limit) break;
  }
  return Array.from(map.keys());
}

function snippetAround(lines, idx, radius = 2) {
  const start = Math.max(0, idx - radius);
  const end = Math.min(lines.length, idx + radius + 1);
  return lines.slice(start, end).join('\n');
}

async function getContext(workspaceRoot, relPath, opts = {}) {
  const { maxLines = 300, related = 3 } = opts;
  const full = safeJoin(workspaceRoot, relPath);
  const raw = await fs.readFile(full, 'utf8');
  const lines = raw.split(/\r?\n/);
  const content = lines.slice(0, maxLines).join('\n');

  const tokens = extractTokens(raw, 30);
  const allFiles = await walkFiles(workspaceRoot);
  const relatedFiles = [];
  for (const f of allFiles) {
    if (f === full) continue;
    try {
      const txt = await fs.readFile(f, 'utf8');
      let found = false;
      let firstIdx = 0;
      for (const t of tokens) {
        const idx = txt.indexOf(t);
        if (idx !== -1) {
          found = true;
          const before = txt.slice(0, idx);
          firstIdx = before.split(/\r?\n/).length - 1;
          break;
        }
      }
      if (found) {
        const fLines = txt.split(/\r?\n/);
        relatedFiles.push({
          path: path.relative(workspaceRoot, f).replace(/\\/g, '/'),
          snippet: snippetAround(fLines, firstIdx, 2)
        });
      }
    } catch (err) {}
    if (relatedFiles.length >= related) break;
  }

  return {
    file: { path: relPath, content },
    related: relatedFiles
  };
}

module.exports = { getContext };
