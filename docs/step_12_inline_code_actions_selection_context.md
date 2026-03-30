# Step 12 - Inline Code Actions + Selection Context

Mục tiêu của step này là mang trải nghiệm giống Cursor / VS Code AI khi người dùng **bôi đen một đoạn code** và chọn hành động trực tiếp.

Sau step này, flow sẽ là:

```text
User select code
→ open action menu
→ choose Explain / Refactor / Optimize / Generate Test
→ inject selected code + file context
→ AI stream response
→ preview / apply
```

---

# 1) Mục tiêu

Sau step này, agent phải có khả năng:

- [ ] lấy đoạn code đang được chọn
- [ ] biết range dòng start / end
- [ ] mở action menu
- [ ] gửi selected code vào AI context
- [ ] preview kết quả
- [ ] replace selected block

---

# 2) Kiến trúc

```text
Code Editor
   ↓
Selection Manager
   ↓
Inline Action Menu
   ↓
Selection Context Builder
   ↓
AI Stream
```

---

# 3) Vue selection state

Trong `chat.ejs` hoặc editor component thêm:

```javascript
selectionContext: {
    text: '',
    startLine: null,
    endLine: null,
    action: ''
},
showActionMenu: false,
inlinePreview: ''
```

---

# 4) Bắt sự kiện chọn text

Nếu đang dùng `<textarea>` hoặc code preview area:

```html
<textarea
    ref="editor"
    v-model="currentCode"
    @mouseup="captureSelection"
    class="w-full h-[400px] border rounded-lg p-3 font-mono"
></textarea>
```

---

## Vue method capture selection

```javascript
captureSelection() {
    const editor = this.$refs.editor;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    const text = this.currentCode.slice(start, end);

    if (!text.trim()) {
        this.showActionMenu = false;
        return;
    }

    this.selectionContext.text = text;
    this.selectionContext.startIndex = start;
    this.selectionContext.endIndex = end;

    this.showActionMenu = true;
}
```

---

# 5) Inline action menu UI

```html
<div
    v-if="showActionMenu"
    class="mt-3 flex gap-2 rounded-xl border bg-white p-3 shadow"
>
    <button @click="runInlineAction('explain')">Explain</button>
    <button @click="runInlineAction('refactor')">Refactor</button>
    <button @click="runInlineAction('optimize')">Optimize</button>
    <button @click="runInlineAction('test')">Generate Test</button>
</div>
```

---

# 6) Backend API

Thêm vào `server.js`

```javascript
app.post('/code/inline-action', async (req, res) => {
    const { action, selectedCode } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await runInlineActionStream(
        action,
        selectedCode,
        (chunk) => {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
    );

    res.write('data: [DONE]\n\n');
    res.end();
});
```

---

# 7) Inline action service

Tạo file `services/inline-action.service.js`

```javascript
const puter = require('puter');
const codeContext = require('./code-context.service');

async function runInlineActionStream(action, selectedCode, onChunk) {
    const ctx = codeContext.getCurrentContext();

    const promptMap = {
        explain: 'Explain this code clearly.',
        refactor: 'Refactor this code and improve readability.',
        optimize: 'Optimize performance and code quality.',
        test: 'Generate unit tests for this code.'
    };

    const stream = await puter.ai.chat([
        {
            role: 'system',
            content: `You are a senior coding assistant.\nCurrent file: ${ctx.currentFile}`
        },
        {
            role: 'user',
            content: `
Action: ${promptMap[action]}

Selected code:
${selectedCode}

File context:
${ctx.content}
`
        }
    ], {
        stream: true
    });

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
```

---

# 8) Vue method gọi action

```javascript
async runInlineAction(action) {
    this.inlinePreview = '';

    const response = await fetch('/code/inline-action', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action,
            selectedCode: this.selectionContext.text
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            const raw = line.replace('data: ', '');
            if (raw === '[DONE]') return;

            const data = JSON.parse(raw);
            this.inlinePreview += data.content;
        }
    }
}
```

---

# 9) Preview UI

```html
<div v-if="inlinePreview" class="mt-4 rounded-xl border bg-white p-4 shadow">
    <h3 class="font-bold mb-2">Inline Preview</h3>
    <pre class="whitespace-pre-wrap text-sm">{{ inlinePreview }}</pre>

    <button
        @click="applyInlineReplace"
        class="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg"
    >
        Replace Selection
    </button>
</div>
```

---

# 10) Replace selected block

```javascript
applyInlineReplace() {
    const start = this.selectionContext.startIndex;
    const end = this.selectionContext.endIndex;

    this.currentCode =
        this.currentCode.slice(0, start) +
        this.inlinePreview +
        this.currentCode.slice(end);

    this.showActionMenu = false;
}
```

---

# 11) Test case

```text
1. mở auth.service.js
2. bôi đen login method
3. chọn Refactor
4. xem preview
5. Replace Selection
```

---

# 12) Definition of Done

- [ ] bắt được selected code
- [ ] action menu hiển thị
- [ ] AI stream hoạt động
- [ ] replace selection hoạt động
- [ ] preview chính xác

---

# 13) Next step

```text
Step 13 - Terminal Panel + Run Project + Logs
```

Đây là bước để coding agent có terminal giống IDE AI nâng cao.

