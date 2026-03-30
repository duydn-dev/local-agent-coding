# Step 6 - Code Context Injection

Mục tiêu của step này là biến chat memory thành **coding memory**, giúp agent hiểu codebase thay vì chỉ hiểu hội thoại.

Sau step này, AI phải có khả năng:

- [ ] biết file nào đang được mở
- [ ] đọc nội dung file hiện tại
- [ ] hiểu cấu trúc workspace
- [ ] inject context vào prompt trước khi gọi Puter
- [ ] chuẩn bị cho bước tự sửa code ở step 7

---

# 1) Kiến trúc

```text
Vue UI
   ↓
Node API
   ↓
Workspace Service
   ↓
File Context Service
   ↓
Chat Memory
   ↓
Puter Stream
```

---

# 2) Context cần inject

Tối thiểu nên inject 4 phần:

```text
workspace tree
current file path
current file content
chat history
```

Ví dụ:

```text
Workspace:
src/
 ├── services/
 └── controllers/

Current file:
src/services/auth.service.js

Instruction:
Thêm refresh token
```

---

# 3) Tạo workspace context service

Tạo file `services/code-context.service.js`

```javascript
const fs = require('fs');
const path = require('path');

class CodeContextService {
    constructor() {
        this.workspaceRoot = process.cwd();
        this.currentFile = null;
    }

    setWorkspace(root) {
        this.workspaceRoot = root;
    }

    setCurrentFile(filePath) {
        this.currentFile = filePath;
    }

    getCurrentFileContent() {
        if (!this.currentFile) return '';

        const fullPath = path.join(
            this.workspaceRoot,
            this.currentFile
        );

        return fs.readFileSync(fullPath, 'utf8');
    }

    getCurrentContext() {
        return {
            currentFile: this.currentFile,
            content: this.getCurrentFileContent()
        };
    }
}

module.exports = new CodeContextService();
```

---

# 4) API chọn file hiện tại

Thêm vào `server.js`

```javascript
const codeContext = require('./services/code-context.service');

app.post('/files/select', (req, res) => {
    const { path } = req.body;

    codeContext.setCurrentFile(path);

    res.json({ success: true });
});
```

---

# 5) Inject context vào agent

Cập nhật `agent.service.js`

```javascript
const puter = require('puter');
const memory = require('./chat-memory.service');
const codeContext = require('./code-context.service');

async function runAgentStream(userMessage, onChunk) {
    memory.addMessage('user', userMessage);

    const ctx = codeContext.getCurrentContext();

    const systemPrompt = {
        role: 'system',
        content: `
You are a coding assistant.

Current file: ${ctx.currentFile || 'none'}

Code:
${ctx.content || ''}
`
    };

    const messages = [
        systemPrompt,
        ...memory.getMessages()
    ];

    let assistantResponse = '';

    const stream = await puter.ai.chat(messages, {
        stream: true
    });

    for await (const chunk of stream) {
        const text = chunk?.text || '';

        assistantResponse += text;

        onChunk({
            type: 'text',
            content: text
        });
    }

    memory.addMessage('assistant', assistantResponse);
}

module.exports = { runAgentStream };
```

---

# 6) Frontend - chọn file đang edit

Trong Vue, khi click file tree:

```javascript
async selectFile(path) {
    await axios.post('/files/select', {
        path
    });
}
```

Ví dụ:

```text
src/services/auth.service.js
```

---

# 7) Test case

Test theo flow:

```text
1. chọn auth.service.js
2. chat: thêm refresh token
3. chat: tối ưu login method
```

AI phải trả lời dựa trên file đang chọn.

---

# 8) Best practice

Không nên inject file quá dài.

Giới hạn:

```text
max 300-500 lines
```

Nếu file dài hơn thì cắt:

```javascript
content.split('\n').slice(0, 400).join('\n')
```

---

# 9) Definition of Done

Step 6 hoàn thành khi:

- [ ] AI biết file hiện tại
- [ ] AI trả lời theo code context
- [ ] multi-turn memory vẫn giữ
- [ ] stream vẫn hoạt động

---

# 10) Next step

Sau step này sẽ tới:

```text
Step 7 - Code Edit Flow
```

Đây là bước agent bắt đầu tự sửa code local giống mini Cursor.

