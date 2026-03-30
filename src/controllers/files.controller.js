const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const workspaceService = require('../services/workspace.service');
const codeContext = require('../services/code-context.service');
const { safeJoin } = require('../utils/path-utils');

async function readFile(req, res) {
  try {
    const WORKSPACE_ROOT = workspaceService.getWorkspaceRoot();
    if (!req.query.path) return res.status(400).json({ error: 'path required' });
    const full = safeJoin(WORKSPACE_ROOT, req.query.path);
    const stat = await fs.stat(full);
    if (stat.isDirectory()) return res.status(400).json({ error: 'path is directory' });
    const MAX = 1024 * 1024;
    if (stat.size > MAX) return res.status(400).json({ error: 'file too large' });

    const raw = await fs.readFile(full, 'utf8');
    const startLine = req.query.startLine ? Math.max(1, parseInt(req.query.startLine, 10)) : null;
    const endLine = req.query.endLine ? Math.max(1, parseInt(req.query.endLine, 10)) : null;
    let content = raw;
    if (startLine || endLine) {
      const lines = raw.split(/\r?\n/);
      const s = (startLine || 1) - 1;
      const e = endLine ? endLine : lines.length;
      content = lines.slice(s, e).join('\n');
    }

    res.json({ path: req.query.path, content });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function writeFile(req, res) {
  try {
    const WORKSPACE_ROOT = workspaceService.getWorkspaceRoot();
    const { path: relPath, content, backup = true } = req.body;
    if (!relPath) return res.status(400).json({ error: 'path required' });
    const full = safeJoin(WORKSPACE_ROOT, relPath);

    let bak = null;
    if (backup && fsSync.existsSync(full)) {
      bak = full + '.bak.' + Date.now();
      await fs.copyFile(full, bak);
    }
    await fs.mkdir(path.dirname(full), { recursive: true });
    try {
      await fs.writeFile(full, content, 'utf8');
    } catch (e) {
      if (bak && fsSync.existsSync(bak)) {
        await fs.copyFile(bak, full);
      }
      throw e;
    }
    res.json({ ok: true, path: relPath });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function selectFile(req, res) {
  try {
    const { path: relPath } = req.body || {};
    if (!relPath) return res.status(400).json({ error: 'path required' });
    codeContext.setCurrentFile(relPath);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { readFile, writeFile, selectFile };

