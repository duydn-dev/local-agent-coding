const presets = require('./prompt-presets.service');
const codeContext = require('./code-context.service');
const terminalService = require('./terminal.service');
const { getPuter } = require('./puter-client.service');

class SmartActionService {
  async run(presetKey, options = {}, onChunk) {
    const preset = presets.get(presetKey);
    if (!preset) throw new Error('Preset không tồn tại');

    const ctx = codeContext.getCurrentContext();
    const logs = terminalService.getLogs().join('\n');

    const puter = await getPuter();
    if (!puter) {
      onChunk({
        type: 'text',
        content: 'Thiếu Puter auth token. Hãy đăng nhập bằng getAuthToken() hoặc set PUTER_AUTH_TOKEN.\n'
      });
      return;
    }

    const model = options && options.model ? String(options.model) : null;
    const chatOpts = { stream: true };
    if (model) chatOpts.model = model;
    const stream = await puter.ai.chat(
      [
        { role: 'system', content: 'Bạn là trợ lý lập trình cấp cao. Trả lời bằng tiếng Việt.' },
        {
          role: 'user',
          content: `
Hành động: ${preset.prompt}

File hiện tại: ${ctx.currentFile}

Mã:
${(ctx.content || '').split('\n').slice(0, 400).join('\n')}

Log gần đây:
${logs}
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
}

module.exports = new SmartActionService();

