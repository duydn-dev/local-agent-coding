# Step 5 - Chat History Memory

Mục tiêu của step này là biến chat app hiện tại thành **multi-turn conversation giống ChatGPT** và làm nền tảng cho coding agent.

---

# 1) Mục tiêu

Sau step này, agent phải có khả năng:

- [ ] lưu lịch sử chat nhiều lượt
- [ ] giữ context giữa các câu hỏi
- [ ] stream response theo conversation hiện tại
- [ ] giới hạn số message để tránh quá dài
- [ ] chuẩn bị context cho step 6

Ví dụ:

```text
User: tạo login service
Assistant: ...
User: thêm refresh token
```

AI phải hiểu câu thứ 2 đang nói tiếp câu thứ 1.

---

# 2) Kiến trúc

```text
Vue UI
   ↓
Node API
   ↓
Conversation Memory Store
   ↓
Puter Stream
```

---

# 3) Data model

Tạo model messages:

```javascript
[
  {
    id: 1,
    role: 'user',
    content: 'Tạo login service',
    createdAt: new Date()
  },
  {
    id: 2,
    role: 'assistant',
    content: 'Đây là code...',
    createdAt: new Date()
  }
]
```

---

# 4) Backend memory store

Tạo file `services/chat-memory.service.js`

```javascript
class ChatMemoryService {
    constructor() {
        this.messages = [];
        this.maxMessages = 20;
    }

    addMessage(role, content) {
        this.messages.push({
            id: Date.now(),
            role,
            content,
            createdAt: new Date()
        });

        if (this.messages.length > this.maxMessages) {
            this.messages = this.messages.slice(-this.maxMessages);
        }
    }

    getMessages() {
        return this.messages.map(x => ({
            role: x.role,
            content: x.content
        }));
    }

    clear() {
        this.messages = [];
    }
}

module.exports = new ChatMemoryService();
```

---

# 5) Update agent service

Cập nhật `services/agent.service.js`

```javascript
const puter = require('puter');
const memory = require('./chat-memory.service');

async function runAgentStream(userMessage, onChunk) {
    memory.addMessage('user', userMessage);

    let assistantResponse = '';

    const stream = await puter.ai.chat(
        memory.getMessages(),
        { stream: true }
    );

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

# 6) API clear history

Thêm route trong `server.js`

```javascript
const memory = require('./services/chat-memory.service');

app.post('/chat/clear', (req, res) => {
    memory.clear();
    res.json({ success: true });
});
```

---

# 7) Frontend button clear chat

Thêm vào `chat.ejs`

```html
<button
    @click="clearChat"
    class="bg-red-500 text-white px-4 py-2 rounded-lg"
>
    Clear Chat
</button>
```

---

# 8) Vue method

```javascript
async clearChat() {
    await axios.post('/chat/clear');
    this.messages = [];
}
```

---

# 9) Test case

Test theo đúng thứ tự:

```text
1. tạo login service
2. thêm refresh token
3. thêm logout
```

Nếu AI hiểu đúng context => step hoàn thành.

---

# 10) Definition of Done

Step 5 hoàn thành khi:

- [ ] AI nhớ câu trước
- [ ] UI hiển thị nhiều lượt chat
- [ ] clear chat hoạt động
- [ ] giới hạn 20 messages
- [ ] stream response vẫn hoạt động

---

# 11) Next step

Sau khi xong step này, tiếp theo là:

```text
Step 6 - Code Context Injection
```

Đây là bước biến chat memory thành coding memory.

