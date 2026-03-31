const { getPuter, setRuntimeToken } = require('../services/puter-client.service');

let cachedModels = null;
let cachedAt = 0;
const CACHE_MS = 60 * 1000;

async function listModels(req, res) {
  try {
    const puter = await getPuter();
    if (!puter)
      return res.status(400).json({ error: 'Thiếu Puter auth token. Hãy đăng nhập bằng getAuthToken() hoặc set PUTER_AUTH_TOKEN.' });

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

async function setToken(req, res) {
  try {
    const token = req.body && req.body.token ? String(req.body.token) : '';
    if (!token.trim()) return res.status(400).json({ error: 'token required' });
    setRuntimeToken(token);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { listModels, setToken };

