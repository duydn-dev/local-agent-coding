# Step 9 - Code Search + Related Files Context

Mục tiêu của step này là giúp agent **hiểu nhiều file trong codebase**, giống cách entity["software","Cursor"] và entity["software","Visual Studio Code"] AI đọc context liên quan trước khi trả lời.

Sau step này, flow sẽ là:

```text
User prompt
→ search keyword / symbol
→ load related files
→ inject top relevant files
→ AI stream response
```

---

# 1) Mục tiêu

Sau step này, agent phải có khả năng:

- [ ] tìm file theo tên
- [ ] tìm keyword trong toàn workspace
- [ ] load file liên quan
- [ ] inject top 3-5 file vào context
- [ ] tránh inject quá nhiều token

---

# 2) Cài package glob

```bash
npm install glob
```

---

# 3) Tạo search service

Tạo file `services/code-search.service.js`

```javascript
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const codeContext = require('./code-context.service');

class CodeSearchService {
    searchFiles(keyword) {
        const root = codeContext.workspaceRoot;

        const files = globSync('**/*.{js,ts,vue,json,cs}', {
            cwd: root,
            ignore: ['node_modules/**', '.git/**']
        });

        return files.filter(file =>
            file.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    searchContent(keyword) {
        const root = codeContext.workspaceRoot;

        const files = globSync('**/*.{js,ts,vue,json,cs}', {
            cwd: root,
            ignore: ['node_modules/**', '.git/**']
        });

        const results = [];

        for (const file of files) {
            const fullPath = path.join(root, file);
            const content = fs.readFileSync(fullPath, 'utf8');

            if (content.toLowerCase().includes(keyword.toLowerCase())) {
                results.push({
                    path: file,
                    snippet: content
                        .split('\n')
                        .slice(0, 30)
                        .join('\n')
                });
            }
        }

        return results;
    }
}

module.exports = new CodeSearchService();
```

---

# 4) API search code

Thêm vào `server.js`

```javascript
const codeSearch = require('./services/code-search.service');

app.get('/code/search', (req, res) => {
    const { keyword } = req.query;

    const files = codeSearch.searchContent(keyword);

    res.json(files);
});
```

---

# 5) Related files context builder

Tạo file `services/related-context.service.js`

```javascript
const codeSearch = require('./code-search.service');

class RelatedContextService {
    build(keyword) {
        const files = codeSearch
            .searchContent(keyword)
            .slice(0, 3);

        return files
            .map(x => `\nFile: ${x.path}\n${x.snippet}`)
            .join('\n\n');
    }
}

module.exports = new RelatedContextService();
```

---

# 6) Inject related context vào agent

Cập nhật `agent.service.js`

```javascript
const relatedContext = require('./related-context.service');

async function runAgentStream(userMessage, onChunk) {
    memory.addMessage('user', userMessage);

    const ctx = codeContext.getCurrentContext();
    const related = relatedContext.build(userMessage);

    const systemPrompt = {
        role: 'system',
        content: `
You are a coding assistant.

Current file: ${ctx.currentFile || 'none'}

Current code:
${ctx.content || ''}

Related files:
${related}
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
```

---

# 7) Frontend search panel

Thêm vào `chat.ejs`

```html
<div class="mt-4">
    <input
        v-model="searchKeyword"
        placeholder="Search code..."
        class="border rounded-lg px-3 py-2 w-full"
        @keyup.enter="searchCode"
    />
</div>

<div v-if="searchResults.length" class="mt-3">
    <div
        v-for="item in searchResults"
        :key="item.path"
        class="border rounded-lg p-3 mb-2"
    >
        <div class="font-semibold">{{ item.path }}</div>
        <pre class="text-xs mt-2">{{ item.snippet }}</pre>
    </div>
</div>
```

---

## Vue methods

```javascript
searchKeyword: '',
searchResults: []
```

```javascript
async searchCode() {
    const res = await axios.get('/code/search', {
        params: {
            keyword: this.searchKeyword
        }
    });

    this.searchResults = res.data;
}
```

---

# 8) Best practice

Chỉ inject:

```text
Top 3 files
Top 30 lines mỗi file
```

để tránh prompt quá dài.

---

# 9) Test case

```text
1. search AuthService
2. mở file login controller
3. chat: sửa login flow
4. AI phải hiểu service liên quan
```

---

# 10) Definition of Done

- [ ] search theo keyword hoạt động
- [ ] related files được inject
- [ ] AI trả lời theo nhiều file
- [ ] UI hiển thị search results

---

# 11) Next step

```text
Step 10 - Git Integration + Version History
```

Đây là bước giúp app gần hơn với mini Cursor production.

