# Step 15 - Prompt Presets + Smart Actions

Mục tiêu của step này là tăng tốc trải nghiệm giống entity["software","Cursor"] với các **preset action thông minh**, giúp người dùng không cần gõ prompt thủ công nhiều lần.

Sau step này, flow sẽ là:

```text
User click preset
→ auto build prompt
→ inject file + selection + logs context
→ AI stream response
→ preview / apply
```

---

# 1) Mục tiêu

Sau step này, app phải có khả năng:

- [ ] preset Explain File
- [ ] preset Fix Bug
- [ ] preset Refactor Service
- [ ] preset Generate API
- [ ] preset Generate Unit Test
- [ ] custom smart action templates

---

# 2) Prompt preset config

Tạo file `services/prompt-presets.service.js`

```javascript
class PromptPresetsService {
    constructor() {
        this.presets = {
            explain_file: {
                label: 'Explain File',
                prompt: 'Explain the current file architecture, responsibilities, and key flows.'
            },
            fix_bug: {
                label: 'Fix Bug',
                prompt: 'Analyze the current file and recent logs, identify the bug and propose a safe fix.'
            },
            refactor_service: {
                label: 'Refactor Service',
                prompt: 'Refactor the current service for better readability, maintainability, and clean architecture.'
            },
            generate_api: {
                label: 'Generate API',
                prompt: 'Generate a new REST API endpoint based on the current module structure.'
            },
            generate_test: {
                label: 'Generate Unit Test',
                prompt: 'Generate unit tests with common success and failure scenarios.'
            }
        };
    }

    getAll() {
        return this.presets;
    }

    get(key) {
        return this.presets[key];
    }
}

module.exports = new PromptPresetsService();
```

---

# 3) Smart action service

Tạo file `services/smart-action.service.js`

```javascript
const puter = require('puter');
const presets = require('./prompt-presets.service');
const codeContext = require('./code-context.service');
const terminalService = require('./terminal.service');

class SmartActionService {
    async run(presetKey, onChunk) {
        const preset = presets.get(presetKey);
        const ctx = codeContext.getCurrentContext();
        const logs = terminalService.getLogs().join('\n');

        const stream = await puter.ai.chat([
            {
                role: 'system',
                content: 'You are a senior coding assistant.'
            },
            {
                role: 'user',
                content: `
Action: ${preset.prompt}

Current file: ${ctx.currentFile}

Code:
${ctx.content}

Recent logs:
${logs}
`
            }
        ], { stream: true });

        for await (const chunk of stream) {
            onChunk({
                type: 'text',
                content: chunk?.text || ''
            });
        }
    }
}

module.exports = new SmartActionService();
```

---

# 4) API presets list

Thêm vào `server.js`

```javascript
const promptPresets = require('./services/prompt-presets.service');
const smartAction = require('./services/smart-action.service');

app.get('/actions/presets', (req, res) => {
    res.json(promptPresets.getAll());
});
```

---

# 5) API run preset

```javascript
app.post('/actions/run', async (req, res) => {
    const { presetKey } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await smartAction.run(presetKey, (chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\\n\\n`);
    });

    res.write('data: [DONE]\\n\\n');
    res.end();
});
```

---

# 6) Frontend smart actions UI

Thêm vào `chat.ejs`

```html
<div class="mt-4 rounded-xl border bg-white shadow p-4">
    <h3 class="font-bold mb-3">Smart Actions</h3>

    <div class="flex flex-wrap gap-2">
        <button @click="runPreset('explain_file')">Explain File</button>
        <button @click="runPreset('fix_bug')">Fix Bug</button>
        <button @click="runPreset('refactor_service')">Refactor</button>
        <button @click="runPreset('generate_api')">Generate API</button>
        <button @click="runPreset('generate_test')">Generate Test</button>
    </div>
</div>
```

---

# 7) Vue method

```javascript
smartActionOutput: ''
```

```javascript
async runPreset(presetKey) {
    this.smartActionOutput = '';

    const response = await fetch('/actions/run', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ presetKey })
    });

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
            this.smartActionOutput += data.content;
        }
    }
}
```

---

# 8) Test case

```text
1. mở auth.service.js
2. click Explain File
3. click Refactor
4. click Generate Unit Test
```

---

# 9) Definition of Done

- [ ] preset buttons hoạt động
- [ ] AI stream output
- [ ] context được inject đúng
- [ ] output dùng lại cho patch flow

---

# 10) Roadmap progress

Bạn đã hoàn thành khoảng:

```text
85% MVP mini Cursor clone
```

Các step cốt lõi gần như đã đủ.

Còn lại khoảng 3-4 step nâng cao để polish production:

```text
Step 16 - Autosave + Recovery
Step 17 - Multi Workspace Profiles
Step 18 - Performance + Virtual Tree
Step 19 - Monaco Editor + Syntax Highlight
```

Sau step 19 là gần như hoàn chỉnh ở mức rất mạnh.

