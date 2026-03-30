# Step 7 - Code Edit Flow

Mục tiêu của step này là cho agent **tự sửa code local** giống mini Cursor.

Sau step này, flow sẽ là:

```text
User prompt
→ đọc file hiện tại
→ inject code context
→ Puter stream sinh code mới
→ preview diff
→ ghi file local
→ cập nhật UI
```

---

# 1) Mục tiêu

Sau step này, agent phải có khả năng:

- [ ] đọc file hiện tại
- [ ] generate code mới bằng AI
- [ ] stream code trả về
- [ ] preview trước khi ghi
- [ ] ghi file local
- [ ] rollback nếu lỗi

---

# 2) Kiến trúc

```text
Vue UI
   ↓
Node API
   ↓
Code Context Service
   ↓
AI Rewrite Service
   ↓
File Writer
```

---

# 3) Tạo file edit service

Tạo file `services/code-edit.service.js`

```javascript
const fs = require('fs');
const path = require('path');
const puter = require('puter');
const codeContext = require('./code-context.service');

class CodeEditService {
    async rewriteCurrentFile(instruction, onChunk) {
        const ctx = codeContext.getCurrentContext();

        if (!ctx.currentFile) {
            throw new Error('Chưa chọn file');
        }

        let generatedCode = '';

        const stream = await puter.ai.chat([
            {
                role: 'system',
                content: 'You are a senior coding assistant. Return ONLY the full updated code file.'
            },
            {
                role: 'user',
                content: `
Current file: ${ctx.currentFile}

Current code:
${ctx.content}

Instruction:
${instruction}
`
            }
        ], {
            stream: true
        });

        for await (const chunk of stream) {
            const text = chunk?.text || '';
            generatedCode += text;

            onChunk({
                type: 'text',
                content: text
            });
        }

        return generatedCode;
    }

    saveCurrentFile(content) {
        const ctx = codeContext.getCurrentContext();

        const fullPath = path.join(
            codeContext.workspaceRoot,
            ctx.currentFile
        );

        const backupPath = fullPath + '.bak';

        fs.copyFileSync(fullPath, backupPath);
        fs.writeFileSync(fullPath, content, 'utf8');

        return {
            saved: true,
            backupPath
        };
    }
}

module.exports = new CodeEditService();
```

---

# 4) API preview edit

Thêm vào `server.js`

```javascript
const codeEdit = require('./services/code-edit.service');

app.post('/code/preview-edit', async (req, res) => {
    const { instruction } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await codeEdit.rewriteCurrentFile(
        instruction,
        (chunk) => {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
    );

    res.write(`data: ${JSON.stringify({
        type: 'done',
        content: result
    })}\n\n`);

    res.end();
});
```

---

# 5) API save edit

```javascript
app.post('/code/save-edit', (req, res) => {
    const { content } = req.body;

    const result = codeEdit.saveCurrentFile(content);

    res.json(result);
});
```

---

# 6) Frontend preview UI

Trong Vue thêm state:

```javascript
previewCode: '',
isPreviewing: false
```

---

## method preview

```javascript
async previewEdit() {
    this.isPreviewing = true;
    this.previewCode = '';

    const response = await fetch('/code/preview-edit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            instruction: this.input
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
            const data = JSON.parse(raw);

            if (data.type === 'text') {
                this.previewCode += data.content;
            }
        }
    }
}
```

---

# 7) Save button

```html
<button @click="saveEdit">
    Apply Changes
</button>
```

```javascript
async saveEdit() {
    await axios.post('/code/save-edit', {
        content: this.previewCode
    });
}
```

---

# 8) Best practice

Luôn preview trước khi ghi file.

Không ghi trực tiếp ngay.

Giống entity["software","Cursor"]:

```text
Preview diff
→ user approve
→ apply changes
```

---

# 9) Test case

```text
1. chọn auth.service.js
2. nhập: thêm refresh token method
3. preview code
4. apply changes
5. kiểm tra file local
```

---

# 10) Definition of Done

- [ ] preview code hoạt động
- [ ] stream code mới
- [ ] save file local thành công
- [ ] tạo file backup
- [ ] UI apply changes hoạt động

---

# 11) Next step

```text
Step 8 - Diff / Patch View
```

Đây là bước hiển thị diff giống Cursor trước khi apply.

