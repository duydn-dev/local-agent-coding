# Step 18 - Performance + Virtual Tree + Lazy Loading

Mục tiêu của step này là tối ưu hiệu năng cho project lớn có **hàng nghìn file / thư mục**, giúp mini IDE AI của bạn hoạt động mượt như entity["software","Visual Studio Code"] và entity["software","Cursor"].

Sau step này, flow sẽ là:

```text
Open large workspace
→ load root folders only
→ expand node
→ lazy load children
→ virtual render visible rows only
```

---

# 1) Mục tiêu

Sau step này, app phải có khả năng:

- [ ] lazy load folder tree
- [ ] virtual scrolling
- [ ] debounce search
- [ ] cache file content
- [ ] cache search results
- [ ] giảm memory usage

---

# 2) Kiến trúc

```text
Workspace Tree UI
   ↓
Virtual Tree Renderer
   ↓
Lazy Folder Loader
   ↓
Cache Manager
```

---

# 3) Backend lazy tree API

Thêm vào `server.js`

```javascript
const fs = require('fs');
const path = require('path');
const codeContext = require('./services/code-context.service');

app.get('/workspace/tree/lazy', (req, res) => {
    const relativePath = req.query.path || '';

    const fullPath = path.join(
        codeContext.workspaceRoot,
        relativePath
    );

    const items = fs.readdirSync(fullPath, {
        withFileTypes: true
    }).map(item => ({
        name: item.name,
        path: path.join(relativePath, item.name),
        isDirectory: item.isDirectory(),
        hasChildren: item.isDirectory()
    }));

    res.json(items);
});
```

---

# 4) Frontend tree state

```javascript
treeNodes: [],
expandedNodes: new Set(),
visibleNodes: [],
fileCache: new Map(),
searchCache: new Map()
```

---

# 5) Load root tree

```javascript
async loadRootTree() {
    const res = await axios.get('/workspace/tree/lazy');
    this.treeNodes = res.data;
    this.refreshVisibleNodes();
}
```

---

# 6) Lazy expand folder

```javascript
async expandNode(node) {
    if (!node.isDirectory) return;

    if (node.children) {
        node.isExpanded = !node.isExpanded;
        this.refreshVisibleNodes();
        return;
    }

    const res = await axios.get('/workspace/tree/lazy', {
        params: {
            path: node.path
        }
    });

    node.children = res.data;
    node.isExpanded = true;

    this.refreshVisibleNodes();
}
```

---

# 7) Virtual visible rows

```javascript
refreshVisibleNodes() {
    const rows = [];

    const walk = (nodes, level = 0) => {
        for (const node of nodes) {
            rows.push({ ...node, level });

            if (node.isExpanded && node.children) {
                walk(node.children, level + 1);
            }
        }
    };

    walk(this.treeNodes);

    this.visibleNodes = rows.slice(
        this.scrollStart,
        this.scrollStart + 100
    );
}
```

Chỉ render:

```text
100 rows
```

mỗi lần.

---

# 8) Virtual tree UI

```html
<div class="h-[500px] overflow-auto" @scroll="onTreeScroll">
    <div
        v-for="node in visibleNodes"
        :key="node.path"
        :style="{ paddingLeft: `${node.level * 16}px` }"
        class="py-1 cursor-pointer"
        @click="expandNode(node)"
    >
        {{ node.isDirectory ? '📁' : '📄' }} {{ node.name }}
    </div>
</div>
```

---

# 9) Scroll virtualization

```javascript
scrollStart: 0
```

```javascript
onTreeScroll(event) {
    const rowHeight = 28;

    this.scrollStart = Math.floor(
        event.target.scrollTop / rowHeight
    );

    this.refreshVisibleNodes();
}
```

---

# 10) File cache

```javascript
async openFile(path) {
    if (this.fileCache.has(path)) {
        this.currentCode = this.fileCache.get(path);
        return;
    }

    const res = await axios.get('/files/read', {
        params: { path }
    });

    this.fileCache.set(path, res.data);
    this.currentCode = res.data;
}
```

---

# 11) Debounce search

```javascript
debouncedSearch: null
```

```javascript
created() {
    this.debouncedSearch = this.debounce(
        this.searchCode,
        300
    );
}
```

```javascript
debounce(fn, delay) {
    let timer;

    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
```

---

# 12) Best practice

Khuyến nghị:

```text
lazy load folders
cache open files
limit visible rows
300ms debounce
```

Rất quan trọng cho solution lớn.

---

# 13) Test case

```text
1. load workspace 3000+ files
2. expand multiple folders
3. search code
4. switch files nhanh
```

---

# 14) Definition of Done

- [ ] tree load nhanh
- [ ] expand folder mượt
- [ ] scroll không lag
- [ ] cache hoạt động
- [ ] search debounce ổn

---

# 15) Next step

```text
Step 19 - Monaco Editor + Syntax Highlight + IntelliSense-like UX
```

Đây là bước gần như hoàn thiện mini IDE AI clone.

