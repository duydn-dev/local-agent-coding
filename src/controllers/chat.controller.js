const memory = require('../services/chat-memory.service');
const agent = require('../services/agent.service');

function clearChat(req, res) {
  memory.clear();
  res.json({ success: true });
}

async function streamAgent(req, res) {
  try {
    console.log('streamAgent', 'send agent test');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    const prompt = (req.body && req.body.prompt) || 'no prompt';
    const model = req.body && req.body.model ? String(req.body.model) : null;
    await agent.runAgentStream(prompt, { model }, (chunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    try {
      res.status(500).json({ error: err });
    } catch (e) {

    }
  }
}

module.exports = { clearChat, streamAgent };

