# Step 16 - Autosave + Recovery

Mục tiêu của step này là giúp coding agent có khả năng **tự động lưu nháp và khôi phục phiên làm việc khi bị reload / crash**, giống trải nghiệm của entity["software","Cursor"] và entity["software","Visual Studio Code"].

Sau step này, flow sẽ là:

```text
User edit code
→ autosave draft định kỳ
→ browser refresh / app crash
→ detect draft
→ restore session
```

---

# 1) Mục tiêu

Sau step này, app phải có khả năng:

- [ ] autosave code draft
- [ ] autosave chat history
- [ ] autosave selected file
- [ ] restore sau reload
- [ ] recovery sau crash
- [ ] clear recovered draft khi save thành công

---

# 2) Kiến trúc

```text
Vue Editor / Chat
   ↓
Autosave Manager
   ↓
localStorage / file snapshot
   ↓
Recovery Loader
```

---

# 3) Frontend autosave manager

Tạo file `public/js/autosave-manager.js`

```javascript
class AutosaveManager {
    constructor() {
        this.key = 'mini_cursor_draft';
    }

    save(data) {
        localStorage.setItem(this.key, JSON.stringify({
            ...data,
            savedAt: new Date().toISOString()
        }));
    }

    load() {
        const raw = localStorage.getItem(this.key);
        return raw ? JSON.parse(raw) : null;
    }

    clear() {
        localStorage.removeItem(this.key);
    }
}

window.autosaveManager = new AutosaveManager();
```

---

# 4) Vue autosave state

Trong component chính thêm:

```javascript
autosaveTimer: null,
recoveredDraft: null
```

---

# 5) Bật autosave định kỳ

Trong `mounted()`:

```javascript
mounted() {
    this.startAutosave();
    this.restoreDraft();
}
```

---

## method start autosave

```javascript
startAutosave() {
    this.autosaveTimer = setInterval(() => {
        window.autosaveManager.save({
            currentCode: this.currentCode,
            messages: this.messages,
            currentFile: this.currentFile,
            terminalOutput: this.terminalOutput
        });
    }, 5000);
}
```

Lưu mỗi:

```text
5 giây
```

---

# 6) Restore draft

```javascript
restoreDraft() {
    const draft = window.autosaveManager.load();

    if (!draft) return;

    this.recoveredDraft = draft;

    this.currentCode = draft.currentCode || '';
    this.messages = draft.messages || [];
    this.currentFile = draft.currentFile || null;
    this.terminalOutput = draft.terminalOutput || '';
}
```

---

# 7) Recovery banner UI

Thêm vào `chat.ejs`

```html
<div
    v-if="recoveredDraft"
    class="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4"
>
    <div class="font-semibold">Recovered previous draft</div>
    <div class="text-sm mt-1">
        Last autosave: {{ recoveredDraft.savedAt }}
    </div>

    <div class="mt-3 flex gap-2">
        <button @click="keepRecoveredDraft">Keep</button>
        <button @click="discardRecoveredDraft">Discard</button>
    </div>
</div>
```

---

# 8) Recovery actions

```javascript
keepRecoveredDraft() {
    this.recoveredDraft = null;
}


discardRecoveredDraft() {
    window.autosaveManager.clear();
    this.recoveredDraft = null;
    this.currentCode = '';
    this.messages = [];
}
```

---

# 9) Clear autosave sau save thành công

Trong flow `saveEdit()` thêm:

```javascript
window.autosaveManager.clear();
```

Điều này tránh restore draft cũ sau khi đã save vào file thật.

---

# 10) Backend snapshot recovery (recommended)

Ngoài localStorage, nên lưu snapshot server-side.

Tạo file `services/recovery.service.js`

```javascript
const fs = require('fs');
const path = require('path');

class RecoveryService {
    constructor() {
        this.snapshotPath = path.join(process.cwd(), '.draft-recovery.json');
    }

    save(snapshot) {
        fs.writeFileSync(
            this.snapshotPath,
            JSON.stringify(snapshot, null, 2),
            'utf8'
        );
    }

    load() {
        if (!fs.existsSync(this.snapshotPath)) return null;

        return JSON.parse(
            fs.readFileSync(this.snapshotPath, 'utf8')
        );
    }

    clear() {
        if (fs.existsSync(this.snapshotPath)) {
            fs.unlinkSync(this.snapshotPath);
        }
    }
}

module.exports = new RecoveryService();
```

---

# 11) Best practice

Autosave các phần sau:

```text
current code
chat history
current file
diff preview
terminal logs gần nhất
```

Không nên autosave quá nhanh.

Khuyến nghị:

```text
3–5 giây
```

---

# 12) Test case

```text
1. sửa code
2. chat với AI
3. reload browser
4. kiểm tra recovery
5. save file
6. reload lại
```

---

# 13) Definition of Done

- [ ] autosave chạy định kỳ
- [ ] reload khôi phục draft
- [ ] save xong clear draft
- [ ] recovery banner hiển thị

---

# 14) Next step

```text
Step 17 - Multi Workspace Profiles
```

Đây là bước hỗ trợ nhiều project giống workspace switch trong IDE.

