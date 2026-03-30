const path = require('path');
const fsSync = require('fs');
const fs = require('fs').promises;

const workspaceService = require('../services/workspace.service');
const codeContext = require('../services/code-context.service');
const { safeJoin } = require('../utils/path-utils');

async function loadWorkspace(req, res) {
  try {
    const { rootPath } = req.body || {};
    if (!rootPath) return res.status(400).json({ error: 'rootPath required' });
    await workspaceService.loadWorkspace(rootPath);
    codeContext.setWorkspace(workspaceService.getWorkspaceRoot());
    res.json(workspaceService.getCurrentWorkspace());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function currentWorkspace(req, res) {
  try {
    res.json(workspaceService.getCurrentWorkspace());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listTree(workspaceRoot, dir, depth = 2) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const res = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(workspaceRoot, full).replace(/\\/g, '/');
    if (e.isDirectory()) {
      res.push({
        name: e.name,
        path: rel,
        type: 'dir',
        children: depth > 0 ? await listTree(workspaceRoot, full, depth - 1) : []
      });
    } else {
      res.push({
        name: e.name,
        path: rel,
        type: 'file'
      });
    }
  }
  return res;
}

async function workspaceTree(req, res) {
  try {
    const WORKSPACE_ROOT = workspaceService.getWorkspaceRoot();
    const p = req.query.path ? safeJoin(WORKSPACE_ROOT, req.query.path) : WORKSPACE_ROOT;
    const depth = Math.min(5, parseInt(req.query.depth || '2', 10));
    const tree = await listTree(WORKSPACE_ROOT, p, depth);
    res.json({ root: path.relative(WORKSPACE_ROOT, p).replace(/\\/g, '/'), tree });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

function workspaceTreeLazy(req, res) {
  try {
    const relativePath = req.query.path || '';
    const fullPath = path.join(codeContext.workspaceRoot, relativePath);
    const items = fsSync
      .readdirSync(fullPath, { withFileTypes: true })
      .map((item) => ({
        name: item.name,
        path: path.join(relativePath, item.name).replace(/\\/g, '/'),
        isDirectory: item.isDirectory(),
        hasChildren: item.isDirectory()
      }));
    res.json(items);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  loadWorkspace,
  currentWorkspace,
  workspaceTree,
  workspaceTreeLazy
};

