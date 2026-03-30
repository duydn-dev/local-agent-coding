const promptPresets = require('../services/prompt-presets.service');
const smartAction = require('../services/smart-action.service');

function presets(req, res) {
  res.json(promptPresets.getAll());
}

async function run(req, res) {
  const { presetKey, model } = req.body || {};
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  try {
    await smartAction.run(presetKey, { model: model ? String(model) : null }, (chunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

module.exports = { presets, run };

