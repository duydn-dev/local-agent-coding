const debugAgent = require('../services/debug-agent.service');

async function analyze(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  const model = req.body && req.body.model ? String(req.body.model) : null;
  await debugAgent.analyze({ model }, (chunk) => {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  });

  res.write('data: [DONE]\n\n');
  res.end();
}

module.exports = { analyze };

