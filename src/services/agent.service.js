const memory = require('./chat-memory.service');
const codeContext = require('./code-context.service');
const relatedContext = require('./related-context.service');
const dependencyContext = require('./dependency-context.service');
const { getPuter } = require('./puter-client.service');

async function runAgentStream(userMessage, options = {}, onChunk) {
  memory.addMessage('user', userMessage);

  const ctx = codeContext.getCurrentContext();
  const related = relatedContext.build(userMessage);
  const deps = dependencyContext.load();

  const systemPrompt = {
    role: 'system',
    content: `
Bạn là trợ lý lập trình cấp cao. Trả lời bằng tiếng Việt.

File hiện tại: ${ctx.currentFile || 'không có'}

Mã nguồn hiện tại:
${(ctx.content || '').split('\n').slice(0, 400).join('\n')}

Phụ thuộc:
${deps}

Các file liên quan:
${related}
`.trim()
  };

  const messages = [systemPrompt, ...memory.getMessages()];
  const puter = await getPuter();

  let assistantResponse = '';
  if (!puter) {
    const text =
      'Thiếu PUTER_AUTH_TOKEN trong env. Hãy set PUTER_AUTH_TOKEN để bật chat stream thật.\n';
    assistantResponse += text;
    onChunk({ type: 'text', content: text });
  } else {
    const model = options && options.model ? String(options.model) : null;
    const chatOpts = { stream: true };
    if (model) chatOpts.model = model;
    const stream = await puter.ai.chat(messages, chatOpts);
    for await (const chunk of stream) {
      const text = chunk?.text ?? chunk?.message?.content?.toString?.() ?? '';
      if (!text) continue;
      assistantResponse += text;
      onChunk({ type: 'text', content: text });
    }
  }

  memory.addMessage('assistant', assistantResponse);
}

module.exports = { runAgentStream };

