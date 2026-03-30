const createMemoryStore = require('../services/memory-store');
const workspaceService = require('../services/workspace.service');

const MEMORY_LIMIT = parseInt(process.env.MEMORY_LIMIT || '50', 10);

function getStore() {
  return createMemoryStore(workspaceService.getWorkspaceRoot());
}

async function getMemory(req, res) {
  try {
    const store = getStore();
    const mem = await store.loadMemory();
    res.json({ memory: mem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function addMemory(req, res) {
  try {
    const { role = 'user', text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });
    const item = { role, text, ts: Date.now() };
    const store = getStore();
    await store.addMemory(item, MEMORY_LIMIT);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function clearMemory(req, res) {
  try {
    const store = getStore();
    await store.clearMemory();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getMemory, addMemory, clearMemory };

