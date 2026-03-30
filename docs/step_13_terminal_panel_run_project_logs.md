# Step 13 - Terminal Panel + Run Project + Logs

Mục tiêu của step này là thêm **terminal panel giống IDE AI** để có thể chạy project, xem logs realtime và hỗ trợ debug.

Sau step này, flow sẽ là:

```text
User click Run
→ backend spawn process
→ stream stdout / stderr
→ terminal panel realtime
→ AI đọc logs để debug
```

---

# 1) Mục tiêu

Sau step này, app phải có khả năng:

- [ ] chạy command (`npm`, `dotnet`, `node`, ...)
- [ ] stream logs realtime
- [ ] dừng process
- [ ] restart process
- [ ] lưu log history gần nhất
- [ ] cho AI dùng logs để debug

---

# 2) Kiến trúc

```text
Vue Terminal Panel
   ↓
Node Process Manager
   ↓
child_process.spawn
   ↓
stdout / stderr stream
```

---

# 3) Tạo process manager service

Tạo file `services/terminal.service.js`

```javascript
const { spawn } = require('child_process');
const codeContext = require('./code-context.service');

class TerminalService {
    constructor() {
        this.currentProcess = null;
        this.logs = [];
    }

    run(command, args = [], onChunk) {
        this.stop();
        this.logs = [];

        this.currentProcess = spawn(command, args, {
            cwd: codeContext.workspaceRoot,
            shell: true
        });

        this.currentProcess.stdout.on('data', (data) => {
            const text = data.toString();
            this.logs.push(text);
            onChunk({ type: 'stdout', content: text });
        });

        this.currentProcess.stderr.on('data', (data) => {
            const text = data.toString();
            this.logs.push(text);
            onChunk({ type: 'stderr', content: text });
        });

        this.currentProcess.on('close', (code) => {
            onChunk({
                type: 'exit',
                content: `Process exited with code ${code}`
            });
            this.currentProcess = null;
        });
    }

    stop() {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
        }
    }

    getLogs() {
        return this.logs.slice(-200);
    }
}

module.exports = new TerminalService();
```

---

# 4) API run command

Thêm vào `server.js`

```javascript
const terminalService = require('./services/terminal.service');

app.post('/terminal/run', async (req, res) => {
    const { command, args } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    terminalService.run(command, args || [], (chunk) => {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });
});
```

---

# 5) API stop process

```javascript
app.post('/terminal/stop', (req, res) => {
    terminalService.stop();
    res.json({ success: true });
});
```

---

# 6) API get logs

```javascript
app.get('/terminal/logs', (req, res) => {
    res.json(terminalService.getLogs());
});
```

---

# 7) Frontend terminal panel UI

Thêm vào `chat.ejs`

```html
<div class="mt-4 rounded-xl border bg-white shadow p-4">
    <h3 class="font-bold mb-3">Terminal</h3>

    <div class="flex gap-2 mb-3">
        <button @click="runProject" class="bg-black text-white px-3 py-2 rounded-lg">
            Run
        </button>
        <button @click="stopProject" class="bg-red-600 text-white px-3 py-2 rounded-lg">
            Stop
        </button>
    </div>

    <pre class="bg-gray-900 text-white p-3 rounded-lg h-[300px] overflow-auto whitespace-pre-wrap">{{ terminalOutput }}</pre>
</div>
```

---

# 8) Vue state

```javascript
terminalOutput: ''
```

---

# 9) Vue methods

```javascript
async runProject() {
    this.terminalOutput = '';

    const response = await fetch('/terminal/run', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            command: 'npm',
            args: ['run', 'dev']
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

            this.terminalOutput += data.content;
        }
    }
}

async stopProject() {
    await axios.post('/terminal/stop');
}
```

---

# 10) Common presets

Cho sẵn các preset command:

```text
npm run dev
npm test
dotnet run
dotnet test
node server.js
```

Có thể dùng dropdown:

```html
<select v-model="selectedCommand">
  <option>npm run dev</option>
  <option>dotnet run</option>
</select>
```

---

# 11) AI debug integration

Bước tiếp theo AI có thể đọc logs:

```javascript
const logs = terminalService.getLogs().join('\n');
```

Inject vào prompt:

```text
Recent terminal logs:
...
```

để hỗ trợ fix bug.

---

# 12) Test case

```text
1. click Run
2. project start
3. logs stream realtime
4. click Stop
5. process dừng
```

---

# 13) Definition of Done

- [ ] run command hoạt động
- [ ] logs stream realtime
- [ ] stop hoạt động
- [ ] log history lưu được

---

# 14) Next step

```text
Step 14 - Error Debug Agent + Auto Fix Suggestions
```

Đây là bước để AI đọc lỗi runtime và tự đề xuất fix.

