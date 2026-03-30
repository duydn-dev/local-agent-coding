const terminalService = require('./terminal.service');
const codeContext = require('./code-context.service');
const { getPuter } = require('./puter-client.service');

class DebugAgentService {
  async analyze(options = {}, onChunk) {
    const logs = terminalService.getLogs().join('\n');
    const ctx = codeContext.getCurrentContext();

    const puter = getPuter();
    if (!puter) {
      onChunk({
        type: 'text',
        content: 'Thiếu PUTER_AUTH_TOKEN trong env. Không thể phân tích log bằng AI.\n'
      });
      return '';
    }

    let responseText = '';
    const model = options && options.model ? String(options.model) : null;
    const chatOpts = { stream: true };
    if (model) chatOpts.model = model;
    const stream = await puter.ai.chat(
      [
        {
          role: 'system',
          content:
            'Bạn là trợ lý gỡ lỗi cấp cao. Hãy phân tích log, xác định nguyên nhân gốc, và đề xuất cách sửa an toàn.'
        },
        {
          role: 'user',
          content: `
File hiện tại: ${ctx.currentFile || 'không có'}

Mã hiện tại:
${(ctx.content || '').split('\n').slice(0, 400).join('\n')}

Log terminal gần đây:
${logs}
`.trim()
        }
      ],
      chatOpts
    );

    for await (const chunk of stream) {
      const text = chunk?.text || '';
      responseText += text;
      onChunk({
        type: 'text',
        content: text
      });
    }

    return responseText;
  }
}

module.exports = new DebugAgentService();

