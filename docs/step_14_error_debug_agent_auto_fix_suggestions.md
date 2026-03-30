# Step 14 - Error Debug Agent + Auto Fix Suggestions

Mục tiêu của step này là giúp coding agent **đọc lỗi runtime / build logs và tự đề xuất cách sửa**, tiến gần trải nghiệm của entity["software","Cursor"].

Sau step này, flow sẽ là:

```text
Run project
→ logs / stack trace
→ AI parse lỗi
→ suggest root cause
→ generate fix patch
→ preview diff
→ apply
```

---

# 1) Mục tiêu

Sau step này, agent phải có khả năng:

- [ ] đọc terminal logs gần nhất
- [ ] parse stack trace
- [ ] xác định file / line lỗi
- [ ] gợi ý nguyên nhân
- [ ] generate code fix preview
- [ ] optional auto patch

---

# 2) Kiến trúc

```text
Terminal Logs
   ↓
Log Analyzer
   ↓
Error Context Builder
   ↓
AI Debug Service
   ↓
Patch Suggestion
```

---

# 3) Tạo debug service

Tạo file `services/debug-agent.service.js`

```javascript
const puter = require('puter');
const terminalService = require('./terminal.service');
const codeContext = require('./code-context.service');

class DebugAgentService {
    async analyze(onChunk) {
        const logs = terminalService.getLogs().join('\n');
        const ctx = codeContext.getCurrentContext();

        let responseText = '';

        const stream = await puter.ai.chat([
            {
                role: 'system',
                content: `You are a senior debugging assistant. Analyze logs, identify root cause, and propose a safe fix.`
            },
            {
                role: 'user',
                content: `
Current file: ${ctx.currentFile || 'none'}

Current code:
${ctx.content || ''}

Recent terminal logs:
${logs}
`
            }
        ], {
            stream: true
        });

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
```

---

# 4) API analyze error

Thêm vào `server.js`

```javascript
const debugAgent = require('./services/debug-agent.service');

app.get('/debug/analyze', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await debugAgent.analyze((chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\\n\\n`);
    });

    res.write('data: [DONE]\\n\\n');
    res.end();
});
```

---

# 5) Parse stack trace helper (optional)

Tạo file `services/stack-trace-parser.service.js`

```javascript
class StackTraceParserService {
    extractLines(logs) {
        const patterns = [
            /at\s+(.*):(\d+):(\d+)/g,
            /(.*\.cs):(\d+)/g,
            /(.*\.js):(\d+):(\d+)/g
        ];

        const matches = [];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(logs)) !== null) {
                matches.push(match[0]);
            }
        }

        return matches;
    }
}

module.exports = new StackTraceParserService();
```

---

# 6) Frontend debug panel

Thêm vào `chat.ejs`

```html
<div class="mt-4 rounded-xl border bg-white shadow p-4">
    <h3 class="font-bold mb-3">AI Debug</h3>

    <button
        @click="analyzeError"
        class="bg-orange-600 text-white px-3 py-2 rounded-lg"
    >
        Analyze Error
    </button>

    <pre class="mt-3 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{{ debugOutput }}</pre>
</div>
```

---

# 7) Vue state

```javascript
debugOutput: ''
```

---

# 8) Vue method

```javascript
async analyzeError() {
    this.debugOutput = '';

    const response = await fetch('/debug/analyze');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n\\n');

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            const raw = line.replace('data: ', '');
            if (raw === '[DONE]') return;

            const data = JSON.parse(raw);
            this.debugOutput += data.content;
        }
    }
}
```

---

# 9) Auto fix integration (recommended)

Sau khi AI phân tích xong, cho phép click:

```text
Generate Fix Patch
```

nối trực tiếp sang:

```text
Step 7 + Step 8 flow
```

Tức là:

```text
AI debug result
→ generate fix code
→ diff preview
→ apply
```

---

# 10) Test case

```text
1. chạy project
2. gây lỗi runtime
3. click Analyze Error
4. AI chỉ ra nguyên nhân
5. generate fix patch
```

---

# 11) Definition of Done

- [ ] đọc logs thành công
- [ ] AI phân tích đúng lỗi
- [ ] hiển thị nguyên nhân
- [ ] có đề xuất fix

---

# 12) Next step

```text
Step 15 - Prompt Presets + Smart Actions
```

Đây là bước tăng tốc trải nghiệm với các preset như Explain File, Fix Bug, Generate API.

