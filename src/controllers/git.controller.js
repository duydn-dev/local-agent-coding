const gitService = require('../services/git.service');

async function status(req, res) {
  try {
    const result = await gitService.status();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function diff(req, res) {
  try {
    const { file } = req.query;
    const result = await gitService.diff(file || null);
    res.json({ diff: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function commit(req, res) {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    const result = await gitService.commit(message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function rollback(req, res) {
  try {
    const { file } = req.body || {};
    if (!file) return res.status(400).json({ error: 'file required' });
    await gitService.checkoutFile(file);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { status, diff, commit, rollback };

