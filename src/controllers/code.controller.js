const Diff = require('diff');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const workspaceService = require('../services/workspace.service');
const codeSearch = require('../services/code-search.service');
const codeContext = require('../services/code-context.service');
const codeEdit = require('../services/code-edit.service');
const diffService = require('../services/diff.service');
const graphService = require('../services/dependency-graph.service');
const inlineAction = require('../services/inline-action.service');
const { getContext } = require('../services/code-context');
const { safeJoin } = require('../utils/path-utils');

function codeSearchHandler(req, res) {
  try {
    const { keyword } = req.query;
    const files = codeSearch.searchContent(keyword);
    res.json(files);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function codeContextHandler(req, res) {
  try {
    const WORKSPACE_ROOT = workspaceService.getWorkspaceRoot();
    const rel = req.query.path;
    if (!rel) return res.status(400).json({ error: 'path required' });
    const maxLines = Math.min(2000, parseInt(req.query.maxLines || '300', 10));
    const related = Math.min(10, parseInt(req.query.related || '3', 10));
    const ctx = await getContext(WORKSPACE_ROOT, rel, { maxLines, related });
    res.json(ctx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

function dependencyGraph(req, res) {
  try {
    const ctx = codeContext.getCurrentContext();
    const graph = graphService.build(ctx.currentFile, ctx.content);
    res.json(graph);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function previewEdit(req, res) {
  try {
    const { instruction, model } = req.body || {};
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    const result = await codeEdit.rewriteCurrentFile(
      instruction || '',
      { model: model ? String(model) : null },
      (chunk) => res.write(`data: ${JSON.stringify(chunk)}\n\n`)
    );
    res.write(`data: ${JSON.stringify({ type: 'done', content: result })}\n\n`);
    res.end();
  } catch (err) {
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    } catch (e) {}
  }
}

async function saveEdit(req, res) {
  try {
    const { content } = req.body || {};
    if (typeof content !== 'string') return res.status(400).json({ error: 'content required' });
    const result = codeEdit.saveCurrentFile(content);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

function codeDiff(req, res) {
  try {
    const { newCode } = req.body || {};
    const ctx = codeContext.getCurrentContext();
    const result = diffService.compare(ctx.content || '', String(newCode || ''));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function legacyPreview(req, res) {
  try {
    const WORKSPACE_ROOT = workspaceService.getWorkspaceRoot();
    const { path: relPath, instruction } = req.body || {};
    if (!relPath) return res.status(400).json({ error: 'path required' });
    const full = safeJoin(WORKSPACE_ROOT, relPath);
    const original = await fs.readFile(full, 'utf8');
    const suggested = original + '\n\n/* AI SUGGESTION: ' + (instruction || 'no instruction') + ' */\n';
    const patch = Diff.createTwoFilesPatch(relPath, relPath, original, suggested, '', '');
    res.json({ path: relPath, originalPreview: original.slice(0, 10000), suggestedPreview: suggested.slice(0, 10000), patch });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function legacyApply(req, res) {
  try {
    const WORKSPACE_ROOT = workspaceService.getWorkspaceRoot();
    const { path: relPath, suggestedContent, backup = true } = req.body || {};
    if (!relPath || typeof suggestedContent !== 'string') return res.status(400).json({ error: 'path and suggestedContent required' });
    const full = safeJoin(WORKSPACE_ROOT, relPath);
    if (backup && fsSync.existsSync(full)) {
      const bak = full + '.bak.' + Date.now();
      await fs.copyFile(full, bak);
    }
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, suggestedContent, 'utf8');
    res.json({ ok: true, path: relPath });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function inlineActionHandler(req, res) {
  try {
    const { action, selectedCode, model } = req.body || {};
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    await inlineAction.runInlineActionStream(action, selectedCode, { model: model ? String(model) : null }, (chunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
}

module.exports = {
  codeSearchHandler,
  codeContextHandler,
  dependencyGraph,
  previewEdit,
  saveEdit,
  codeDiff,
  legacyPreview,
  legacyApply,
  inlineActionHandler
};

