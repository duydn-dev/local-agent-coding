# Step 17 - Multi Workspace Profiles

Mục tiêu của step này là cho phép coding agent quản lý **nhiều project / workspace** giống trải nghiệm của entity["software","Visual Studio Code"] và entity["software","Cursor"].

Sau step này, flow sẽ là:

```text
User add workspace
→ save profile
→ switch workspace
→ restore recent session
→ continue coding
```

Rất phù hợp với mô hình microservice của bạn, ví dụ:

```text
AuthService
Gateway
ProductService
NotificationService
```

---

# 1) Mục tiêu

Sau step này, app phải có khả năng:

- [ ] lưu nhiều workspace profiles
- [ ] switch nhanh giữa workspace
- [ ] lưu recent workspace
- [ ] restore last opened file theo workspace
- [ ] favorite / pin workspace

---

# 2) Kiến trúc

```text
Workspace Switcher UI
   ↓
Workspace Profile Manager
   ↓
localStorage + server config
   ↓
Code Context reload
```

---

# 3) Frontend workspace profile manager

Tạo file `public/js/workspace-profile-manager.js`

```javascript
class WorkspaceProfileManager {
    constructor() {
        this.key = 'workspace_profiles';
    }

    getAll() {
        return JSON.parse(localStorage.getItem(this.key) || '[]');
    }

    saveAll(items) {
        localStorage.setItem(this.key, JSON.stringify(items));
    }

    add(profile) {
        const items = this.getAll();
        items.push(profile);
        this.saveAll(items);
    }

    setLastActive(id) {
        const items = this.getAll().map(x => ({
            ...x,
            isLastActive: x.id === id
        }));

        this.saveAll(items);
    }
}

window.workspaceProfileManager = new WorkspaceProfileManager();
```

---

# 4) Vue state

```javascript
workspaceProfiles: [],
currentWorkspaceId: null,
newWorkspacePath: ''
```

---

# 5) Load profiles on mounted

```javascript
mounted() {
    this.loadWorkspaceProfiles();
}
```

```javascript
loadWorkspaceProfiles() {
    this.workspaceProfiles =
        window.workspaceProfileManager.getAll();

    const last = this.workspaceProfiles.find(x => x.isLastActive);

    if (last) {
        this.switchWorkspace(last.id);
    }
}
```

---

# 6) Add workspace

```javascript
addWorkspace() {
    const profile = {
        id: Date.now(),
        name: this.newWorkspacePath.split('/').pop(),
        path: this.newWorkspacePath,
        pinned: false,
        lastOpenedFile: null,
        createdAt: new Date().toISOString()
    };

    window.workspaceProfileManager.add(profile);

    this.loadWorkspaceProfiles();
    this.newWorkspacePath = '';
}
```

---

# 7) Switch workspace

```javascript
async switchWorkspace(id) {
    const profile = this.workspaceProfiles.find(x => x.id === id);

    if (!profile) return;

    this.currentWorkspaceId = id;

    window.workspaceProfileManager.setLastActive(id);

    await axios.post('/workspace/load', {
        rootPath: profile.path
    });

    this.currentFile = profile.lastOpenedFile;

    this.messages.push({
        role: 'system',
        content: `Switched to workspace: ${profile.name}`
    });
}
```

---

# 8) Pin / favorite workspace

```javascript
pinWorkspace(id) {
    const items = this.workspaceProfiles.map(x =>
        x.id === id
            ? { ...x, pinned: !x.pinned }
            : x
    );

    window.workspaceProfileManager.saveAll(items);
    this.loadWorkspaceProfiles();
}
```

---

# 9) Workspace switcher UI

Thêm vào `chat.ejs`

```html
<div class="mb-4 rounded-xl border bg-white shadow p-4">
    <h3 class="font-bold mb-3">Workspaces</h3>

    <div class="flex gap-2 mb-3">
        <input
            v-model="newWorkspacePath"
            placeholder="D:/Projects/AuthService"
            class="flex-1 border rounded-lg px-3 py-2"
        />

        <button
            @click="addWorkspace"
            class="bg-black text-white px-3 py-2 rounded-lg"
        >
            Add
        </button>
    </div>

    <div class="space-y-2">
        <div
            v-for="item in workspaceProfiles"
            :key="item.id"
            class="flex items-center justify-between rounded-lg border p-3"
        >
            <div>
                <div class="font-semibold">{{ item.name }}</div>
                <div class="text-xs text-gray-500">{{ item.path }}</div>
            </div>

            <div class="flex gap-2">
                <button @click="switchWorkspace(item.id)">Open</button>
                <button @click="pinWorkspace(item.id)">
                    {{ item.pinned ? 'Unpin' : 'Pin' }}
                </button>
            </div>
        </div>
    </div>
</div>
```

---

# 10) Backend workspace session (recommended)

Tạo file `services/workspace-session.service.js`

```javascript
class WorkspaceSessionService {
    constructor() {
        this.sessions = new Map();
    }

    set(workspaceId, session) {
        this.sessions.set(workspaceId, session);
    }

    get(workspaceId) {
        return this.sessions.get(workspaceId);
    }
}

module.exports = new WorkspaceSessionService();
```

Dùng để lưu:

```text
chat history
current file
diff state
terminal logs
```

riêng cho từng workspace.

---

# 11) Best practice

Sắp xếp workspace:

```text
pinned first
last active second
recent third
```

Ví dụ:

```text
📌 AuthService
📌 Gateway
🕒 ProductService
```

---

# 12) Test case

```text
1. add AuthService
2. add Gateway
3. switch qua lại
4. restore chat riêng từng workspace
```

---

# 13) Definition of Done

- [ ] add workspace
- [ ] switch workspace
- [ ] last active restore
- [ ] pin hoạt động
- [ ] context reload đúng

---

# 14) Next step

```text
Step 18 - Performance + Virtual Tree + Lazy Loading
```

Đây là bước tối ưu cho project lớn nhiều file.

