# Step 11 - Multi File Context + Dependency Graph

Mục tiêu của step này là giúp coding agent hiểu **mối quan hệ giữa nhiều file trong codebase**, giống trải nghiệm của entity["software","Cursor"] và entity["software","Visual Studio Code"] AI.

Sau step này, agent phải hiểu được flow như:

```text
Controller
→ Service
→ DTO / Model
→ Repository
→ Database Layer
```

Điều này đặc biệt phù hợp với kiến trúc Clean Architecture / .NET mà bạn đang quen.

---

# 1) Mục tiêu

Sau step này, agent phải có khả năng:

- [ ] tìm các file import / dependency liên quan
- [ ] build graph giữa các file
- [ ] load top dependencies gần nhất
- [ ] inject nhiều file theo graph
- [ ] ưu tiên file gần current file

---

# 2) Kiến trúc

```text
Current File
   ↓
Import Scanner
   ↓
Dependency Graph
   ↓
Related Files Loader
   ↓
AI Context Builder
```

---

# 3) Tạo dependency graph service

Tạo file `services/dependency-graph.service.js`

```javascript
const fs = require('fs');
const path = require('path');
const codeContext = require('./code-context.service');

class DependencyGraphService {
    extractImports(content) {
        const regex = /import\s+.*?from\s+['\"](.*?)['\"]/g;
        const matches = [];
        let match;

        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1]);
        }

        return matches;
    }

    resolveDependency(currentFile, importPath) {
        const baseDir = path.dirname(currentFile);
        return path.normalize(
            path.join(baseDir, importPath)
        );
    }

    build(currentFile, content) {
        const imports = this.extractImports(content);

        return imports.map(x => ({
            source: currentFile,
            target: this.resolveDependency(currentFile, x)
        }));
    }
}

module.exports = new DependencyGraphService();
```

---

# 4) Related dependency loader

Tạo file `services/dependency-context.service.js`

```javascript
const fs = require('fs');
const path = require('path');
const codeContext = require('./code-context.service');
const graphService = require('./dependency-graph.service');

class DependencyContextService {
    load() {
        const ctx = codeContext.getCurrentContext();

        if (!ctx.currentFile || !ctx.content) {
            return '';
        }

        const graph = graphService.build(
            ctx.currentFile,
            ctx.content
        );

        const root = codeContext.workspaceRoot;
        const results = [];

        for (const edge of graph.slice(0, 3)) {
            const fullPath = path.join(root, edge.target + '.js');

            if (!fs.existsSync(fullPath)) continue;

            const content = fs.readFileSync(fullPath, 'utf8')
                .split('\n')
                .slice(0, 50)
                .join('\n');

            results.push(`\nDependency File: ${edge.target}\n${content}`);
        }

        return results.join('\n\n');
    }
}

module.exports = new DependencyContextService();
```

---

# 5) Inject dependency context vào agent

Cập nhật `agent.service.js`

```javascript
const dependencyContext = require('./dependency-context.service');
```

Trong `runAgentStream()` thêm:

```javascript
const deps = dependencyContext.load();
```

Update system prompt:

```javascript
const systemPrompt = {
    role: 'system',
    content: `
You are a senior coding assistant.

Current file: ${ctx.currentFile}

Current code:
${ctx.content}

Dependencies:
${deps}

Related files:
${related}
`
};
```

---

# 6) API debug graph

Thêm route để debug graph

```javascript
const graphService = require('./services/dependency-graph.service');

app.get('/dependency/graph', (req, res) => {
    const ctx = codeContext.getCurrentContext();

    const graph = graphService.build(
        ctx.currentFile,
        ctx.content
    );

    res.json(graph);
});
```

---

# 7) Frontend dependency panel

Thêm vào `chat.ejs`

```html
<div class="mt-4 rounded-xl border bg-white p-4 shadow">
    <h3 class="font-bold mb-3">Dependency Graph</h3>

    <button
        @click="loadDependencyGraph"
        class="bg-indigo-600 text-white px-3 py-2 rounded-lg"
    >
        Load Graph
    </button>

    <div v-if="dependencyGraph.length" class="mt-3">
        <div
            v-for="(edge, index) in dependencyGraph"
            :key="index"
            class="text-sm font-mono"
        >
            {{ edge.source }} → {{ edge.target }}
        </div>
    </div>
</div>
```

---

## Vue state

```javascript
dependencyGraph: []
```

---

## Vue method

```javascript
async loadDependencyGraph() {
    const res = await axios.get('/dependency/graph');
    this.dependencyGraph = res.data;
}
```

---

# 8) Best practice

Ưu tiên load:

```text
current imports
service layer
dto layer
repository layer
```

Không load quá nhiều.

Giới hạn:

```text
3 files
50 lines / file
```

---

# 9) Test case

```text
1. mở login.controller.js
2. load dependency graph
3. chat: sửa login flow
4. AI phải hiểu login.service
```

---

# 10) Definition of Done

- [ ] graph build đúng
- [ ] dependency files load đúng
- [ ] AI hiểu nhiều layer
- [ ] UI hiển thị graph

---

# 11) Next step

```text
Step 12 - Inline Code Actions + Selection Context
```

Đây là bước giống Cursor khi bôi đen code và chọn Explain / Refactor.

