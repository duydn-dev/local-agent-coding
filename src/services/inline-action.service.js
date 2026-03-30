const codeContext = require('./code-context.service');
const { getPuter } = require('./puter-client.service');

async function runInlineActionStream(action, selectedCode, options = {}, onChunk) {
  const ctx = codeContext.getCurrentContext();

  const promptMap = {
    explain: 'Giải thích đoạn mã này rõ ràng, dễ hiểu.',
    refactor: 'Refactor đoạn mã này để dễ đọc và dễ bảo trì hơn.',
    optimize: 'Tối ưu hiệu năng và chất lượng mã cho đoạn này.',
    test: 'Sinh unit test cho đoạn mã này.'
  };

  const puter = getPuter();
  if (!puter) {
    onChunk({
      type: 'text',
      content: 'Thiếu PUTER_AUTH_TOKEN trong env. Không thể chạy inline action bằng AI.\n'
    });
    return;
  }

  const model = options && options.model ? String(options.model) : null;
  const chatOpts = { stream: true };
  if (model) chatOpts.model = model;
  const stream = await puter.ai.chat(
    [
      {
        role: 'system',
        content: `Bạn là trợ lý lập trình cấp cao.\nFile hiện tại: ${ctx.currentFile}`
      },
      {
        role: 'user',
        content: `
Hành động: ${promptMap[action] || String(action)}

Đoạn mã được chọn:
${selectedCode}

Ngữ cảnh file:
${(ctx.content || '').split('\n').slice(0, 400).join('\n')}
`.trim()
      }
    ],
    chatOpts
  );

  for await (const chunk of stream) {
    onChunk({
      type: 'text',
      content: chunk?.text || ''
    });
  }
}

module.exports = {
  runInlineActionStream
};

