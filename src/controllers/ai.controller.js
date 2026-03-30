const { getPuter } = require('../services/puter-client.service');

let cachedModels = null;
let cachedAt = 0;
const CACHE_MS = 60 * 1000;

async function listModels(req, res) {
  try {
    const puter = getPuter();
    if (!puter) return res.status(400).json({ error: 'Missing PUTER_AUTH_TOKEN' });

    const provider = req.query.provider ? String(req.query.provider) : null;
    const now = Date.now();
    const cacheKey = provider || '__all__';
    if (!cachedModels) cachedModels = new Map();

    const entry = cachedModels.get(cacheKey);
    if (entry && now - entry.at < CACHE_MS) {
      return res.json({ provider, cached: true, models: entry.models });
    }

    const models = await puter.ai.listModels(provider || null);
    cachedModels.set(cacheKey, { at: now, models });
    return res.json({ provider, cached: false, models });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { listModels };

