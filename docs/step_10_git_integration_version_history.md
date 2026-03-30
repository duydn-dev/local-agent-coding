# Step 10 - Git Integration + Version History

Mục tiêu của step này là đưa coding agent của bạn tiến gần hơn tới trải nghiệm của entity["software","Cursor"] và entity["software","Visual Studio Code"] với khả năng:

- [ ] xem git status
- [ ] xem diff với HEAD
- [ ] commit thay đổi
- [ ] rollback file
- [ ] lưu version history nội bộ

Sau step này, flow sẽ là:

```text
Edit code
→ preview diff
→ apply
→ save snapshot
→ git diff / rollback / commit
```

---

# 1) Cài package simple-git

```bash
npm install simple-git
```

---

# 2) Tạo git service

Tạo file `services/git.service.js`

```javascript
const simpleGit = require('simple-git');
const codeContext = require('./code-context.service');

class GitService {
    getClient() {
        return simpleGit(codeContext.workspaceRoot);
    }

    async status() {
        return await this.getClient().status();
    }

    async diff(filePath = null) {
        const git = this.getClient();

        if (filePath) {
            return await git.diff([filePath]);
        }

        return await git.diff();
    }

    async commit(message) {
        const git = this.getClient();

        await git.add('.');
        return await git.commit(message);
    }

    async checkoutFile(filePath) {
        const git = this.getClient();
        return await git.checkout([filePath]);
    }
}

module.exports = new GitService();
```

---

# 3) API git status

Thêm vào `server.js`

```javascript
const gitService = require('./services/git.service');

app.get('/git/status', async (req, res) => {
    const result = await gitService.status();
    res.json(result);
});
```

---

# 4) API git diff

```javascript
app.get('/git/diff', async (req, res) => {
    const { file } = req.query;

    const result = await gitService.diff(file);

    res.json({
        diff: result
    });
});
```

---

# 5) API commit

```javascript
app.post('/git/commit', async (req, res) => {
    const { message } = req.body;

    const result = await gitService.commit(message);

    res.json(result);
});
```

---

# 6) API rollback file

```javascript
app.post('/git/rollback', async (req, res) => {
    const { file } = req.body;

    await gitService.checkoutFile(file);

    res.json({
        success: true
    });
});
```

---

# 7) Version history service (snapshot nội bộ)

Tạo file `services/version-history.service.js`

```javascript
class VersionHistoryService {
    constructor() {
        this.snapshots = [];
    }

    save(filePath, oldContent, newContent) {
        this.snapshots.push({
            id: Date.now(),
            filePath,
            oldContent,
            newContent,
            createdAt: new Date()
        });
    }

    list() {
        return this.snapshots;
    }

    get(id) {
        return this.snapshots.find(x => x.id == id);
    }
}

module.exports = new VersionHistoryService();
```

---

# 8) Tích hợp snapshot vào save flow

Cập nhật `code-edit.service.js`

```javascript
const versionHistory = require('./version-history.service');
```

Trong `saveCurrentFile()` thêm:

```javascript
const oldContent = fs.readFileSync(fullPath, 'utf8');

versionHistory.save(
    ctx.currentFile,
    oldContent,
    content
);
```

---

# 9) API history

```javascript
const versionHistory = require('./services/version-history.service');

app.get('/history', (req, res) => {
    res.json(versionHistory.list());
});
```

---

# 10) Frontend Git panel

Thêm vào `chat.ejs`

```html
<div class="mt-4 rounded-xl border bg-white p-4 shadow">
    <h3 class="font-bold mb-3">Git Actions</h3>

    <div class="flex gap-2">
        <button
            @click="loadGitStatus"
            class="bg-black text-white px-3 py-2 rounded-lg"
        >
            Git Status
        </button>

        <button
            @click="loadGitDiff"
            class="bg-blue-600 text-white px-3 py-2 rounded-lg"
        >
            Git Diff
        </button>

        <button
            @click="commitChanges"
            class="bg-green-600 text-white px-3 py-2 rounded-lg"
        >
            Commit
        </button>
    </div>
</div>
```

---

## Vue state

```javascript
gitStatus: null,
gitDiff: ''
```

---

## Vue methods

```javascript
async loadGitStatus() {
    const res = await axios.get('/git/status');
    this.gitStatus = res.data;
}

async loadGitDiff() {
    const res = await axios.get('/git/diff');
    this.gitDiff = res.data.diff;
}

async commitChanges() {
    await axios.post('/git/commit', {
        message: 'AI code update'
    });
}
```

---

# 11) Test case

```text
1. sửa auth.service.js
2. apply changes
3. git diff
4. commit
5. rollback
```

---

# 12) Definition of Done

- [ ] git status hoạt động
- [ ] git diff hiển thị
- [ ] commit thành công
- [ ] rollback file hoạt động
- [ ] version history lưu snapshot

---

# 13) Next step

```text
Step 11 - Multi File Context + Dependency Graph
```

Đây là bước để agent hiểu dependency giữa service / controller / dto giống coding IDE AI nâng cao.

