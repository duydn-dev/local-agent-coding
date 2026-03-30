const fs = require('fs');
const path = require('path');
const codeContext = require('./code-context.service');
const versionHistory = require('./version-history.service');
const { getPuter } = require('./puter-client.service');

function safeJoin(root, target) {
  const resolved = path.resolve(root, target);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error('Path outside workspace');
  }
  return resolved;
}

class CodeEditService {
  async rewriteCurrentFile(instruction, options = {}, onChunk) {
    const ctx = codeContext.getCurrentContext();
    if (!ctx.currentFile) {
      throw new Error('Chưa chọn file');
    }

    const puter = getPuter();
    if (!puter) {
      const original = ctx.content || '';
      const generatedCode =
        original +
        `\n\n/* AI REWRITE (mock) */\n/* Instruction: ${String(instruction || '').slice(0, 500)} */\n`;
      onChunk({ type: 'text', content: generatedCode });
      return generatedCode;
    }

    let generatedCode = '';
    const model = options && options.model ? String(options.model) : null;
    const chatOpts = { stream: true };
    if (model) chatOpts.model = model;
    const stream = await puter.ai.chat(
      [
        {
          role: 'system',
          content: 'Bạn là trợ lý lập trình cấp cao. Chỉ trả về DUY NHẤT nội dung đầy đủ của file sau khi đã cập nhật.'
        },
        {
          role: 'user',
          content: `
File hiện tại: ${ctx.currentFile}

Mã hiện tại:
${(ctx.content || '').split('\n').slice(0, 400).join('\n')}

Yêu cầu:
${instruction}
`.trim()
        }
      ],
      chatOpts
    );

    for await (const chunk of stream) {
      const text = chunk?.text ?? chunk?.message?.content?.toString?.() ?? '';
      if (!text) continue;
      generatedCode += text;
      onChunk({ type: 'text', content: text });
    }

    return generatedCode;
  }

  saveCurrentFile(content) {
    const ctx = codeContext.getCurrentContext();
    if (!ctx.currentFile) {
      throw new Error('Chưa chọn file');
    }

    const fullPath = path.join(codeContext.workspaceRoot, ctx.currentFile);
    const backupPath = fullPath + '.bak';

    const oldContent = fs.readFileSync(fullPath, 'utf8');
    versionHistory.save(ctx.currentFile, oldContent, content);

    fs.copyFileSync(fullPath, backupPath);
    fs.writeFileSync(fullPath, content, 'utf8');

    return {
      saved: true,
      backupPath
    };
  }
}

module.exports = new CodeEditService();
