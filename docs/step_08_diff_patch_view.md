# Step 8 - Diff / Patch View

Mục tiêu của step này là hiển thị **diff / patch giống Cursor** trước khi apply code vào file local.

Sau step này, flow sẽ là:

```text
User prompt
→ AI generate code preview
→ compare old vs new
→ show diff UI
→ user Accept / Reject
→ apply file
```

---

# 1) Mục tiêu

Sau step này, agent phải có khả năng:

- [ ] so sánh code cũ và code mới
- [ ] highlight dòng thay đổi
- [ ] phân biệt added / removed / unchanged
- [ ] Accept Changes
- [ ] Reject Changes
- [ ] chỉ apply sau khi user confirm

---

# 2) Cài package diff

```bash
npm install diff
```

Package sử dụng:

```text
diff
```

---

# 3) Tạo diff service

Tạo file `services/diff.service.js`

```javascript
const { diffLines } = require('diff');

class DiffService {
    compare(oldCode, newCode) {
        return diffLines(oldCode, newCode).map(part => ({
            added: !!part.added,
            removed: !!part.removed,
            value: part.value
        }));
    }
}

module.exports = new DiffService();
```

---

# 4) API preview diff

Thêm vào `server.js`

```javascript
const diffService = require('./services/diff.service');
const codeContext = require('./services/code-context.service');

app.post('/code/diff', (req, res) => {
    const { newCode } = req.body;

    const ctx = codeContext.getCurrentContext();

    const result = diffService.compare(
        ctx.content,
        newCode
    );

    res.json(result);
});
```

---

# 5) Frontend state

Trong Vue thêm:

```javascript
diffLines: [],
showDiff: false
```

---

# 6) Load diff sau preview

Sau khi `previewEdit()` hoàn thành:

```javascript
await this.loadDiff();
```

---

## method loadDiff

```javascript
async loadDiff() {
    const res = await axios.post('/code/diff', {
        newCode: this.previewCode
    });

    this.diffLines = res.data;
    this.showDiff = true;
}
```

---

# 7) Diff UI

Thêm vào `chat.ejs`

```html
<div
    v-if="showDiff"
    class="mt-4 rounded-xl border bg-white shadow p-4 max-h-[400px] overflow-auto"
>
    <h3 class="font-bold mb-3">Code Diff Preview</h3>

    <div
        v-for="(line, index) in diffLines"
        :key="index"
        :class="{
            'bg-green-100': line.added,
            'bg-red-100': line.removed,
            'bg-gray-50': !line.added && !line.removed
        }"
        class="px-2 py-1 font-mono text-sm whitespace-pre-wrap"
    >
        {{ line.value }}
    </div>

    <div class="mt-4 flex gap-2">
        <button
            @click="saveEdit"
            class="bg-green-600 text-white px-4 py-2 rounded-lg"
        >
            Accept Changes
        </button>

        <button
            @click="rejectDiff"
            class="bg-red-600 text-white px-4 py-2 rounded-lg"
        >
            Reject
        </button>
    </div>
</div>
```

---

# 8) Reject action

```javascript
rejectDiff() {
    this.showDiff = false;
    this.diffLines = [];
    this.previewCode = '';
}
```

---

# 9) UX flow giống Cursor

```text
Preview code
→ show diff
→ user review
→ Accept / Reject
```

Đây là bước cực kỳ quan trọng để tránh AI ghi đè sai code.

---

# 10) Best practice

Nên hiển thị ký hiệu:

```text
+ added
- removed
  unchanged
```

Ví dụ nâng cấp UI:

```javascript
prefix: line.added ? '+' : line.removed ? '-' : ' '
```

---

# 11) Test case

```text
1. mở auth.service.js
2. prompt: thêm refresh token
3. preview
4. xem diff
5. accept
6. kiểm tra file local
```

---

# 12) Definition of Done

- [ ] diff hiển thị đúng
- [ ] added line màu xanh
- [ ] removed line màu đỏ
- [ ] reject hoạt động
- [ ] accept hoạt động

---

# 13) Next step

```text
Step 9 - Code Search + Related Files Context
```

Đây là bước giúp agent hiểu nhiều file giống Cursor.

