const terminalService = require('../services/terminal.service');

async function run(req, res) {
  try {
    const { command, args } = req.body || {};
    if (!command) return res.status(400).json({ error: 'command required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    terminalService.run(command, args || [], (chunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function stop(req, res) {
  terminalService.stop();
  res.json({ success: true });
}

function logs(req, res) {
  res.json(terminalService.getLogs());
}

module.exports = { run, stop, logs };

