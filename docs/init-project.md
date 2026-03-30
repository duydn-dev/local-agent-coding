# Mini Coding Agent giống Cursor - Roadmap Step by Step

Tài liệu này giúp bạn code **từng bước** để build một mini coding agent giống Cursor / VS Code AI.

---

# Phase 1 - MVP bắt buộc

Mục tiêu: tạo được web coding agent có thể chat + đọc ghi file local.

---

## Step 1 - Workspace Management

### Mục tiêu

Cho phép agent biết project đang làm việc ở thư mục nào.

### Checklist

- [ ] tạo API load workspace
- [ ] lưu `workspaceRoot`
- [ ] validate path
- [ ] chống path traversal
- [ ] load workspace hiện tại

### API

```text
POST /workspace/load
GET /workspace/current
```

### Model

```javascript
{
  rootPath: "D:/Projects/MyApi",
  projectName: "MyApi"
}
```

### Khi xong step này

Agent phải biết:

```text
workspace root = D:/Projects/MyApi
```

---

## Step 2 - File Tree Explorer

### Mục tiêu

Tạo sidebar giống Cursor.

### Checklist

- [ ] load folder tree
- [ ] recursive folder scan
- [ ] expand / collapse
- [ ] click file để open
- [ ] refresh tree

### API

```text
GET /workspace/tree
```

### UI

```text
src/
 ├── controllers/
 ├── services/
 └── app.js
```

---

## Step 3 - Read File

### Mục tiêu

Cho AI đọc file hiện tại.

### Checklist

- [ ] đọc file theo path
- [ ] open file content
- [ ] read line range
- [ ] handle utf8

### API

```text
GET /files/read?path=src/app.js
```

### Node.js

```javascript
const fs = require('fs')

function readFile(path) {
   return fs.readFileSync(path, 'utf8')
}
```

---

## Step 4 - Write File

### Mục tiêu

Cho agent sửa code local.

### Checklist

- [ ] overwrite file
- [ ] create file mới
- [ ] backup file cũ
- [ ] rollback nếu lỗi

### API

```text
POST /files/write
```

### Body

```javascript
{
  path: "src/app.js",
  content: "..."
}
```

### Node.js

```javascript
function writeFile(path, content) {
   fs.writeFileSync(path, content, 'utf8')
}
```

---

# Phase 2 - Coding Agent Core

---

## Step 5 - Chat History Memory

### Mục tiêu

Cơ chế chat giống ChatGPT.

### Checklist

- [ ] lưu multi-turn messages
- [ ] assistant response history
- [ ] current file context
- [ ] workspace context

### Model

```javascript
[
  { role: 'user', content: '...' },
  { role: 'assistant', content: '...' }
]
```

---

## Step 6 - Inject Code Context

### Mục tiêu

Cho AI hiểu codebase.

### Checklist

- [ ] current file content
- [ ] related file content
- [ ] workspace tree
- [ ] previous messages

### Prompt template

```text
Current file:
...

Workspace tree:
...

Instruction:
Refactor login service
```

---

## Step 7 - Code Edit Flow

### Mục tiêu

Cho AI tự sửa code.

### Flow

```text
user prompt
→ read file
→ send puter stream
→ receive new code
→ write file
→ update UI
```

### Checklist

- [ ] read file
- [ ] call AI stream
- [ ] accumulate response
- [ ] write file
- [ ] show result

---

# Phase 3 - Giống Cursor

---

## Step 8 - Diff / Patch View

### Mục tiêu

Hiển thị code thay đổi.

### Checklist

- [ ] old code
- [ ] new code
- [ ] line diff
- [ ] accept changes
- [ ] reject changes

### Example

```diff
+ app.use(logger)
- app.use(oldLogger)
```

---

## Step 9 - Code Search

### Checklist

- [ ] search keyword
- [ ] search class name
- [ ] search method
- [ ] search references

### API

```text
GET /files/search?keyword=AuthService
```

---

## Step 10 - Git Integration

### Checklist

- [ ] git status
- [ ] git diff
- [ ] revert file
- [ ] commit

---

# Recommended order

Code đúng thứ tự này:

```text
1 workspace
2 tree explorer
3 read file
4 write file
5 memory
6 ai edit
7 diff
8 git
```

---

# Definition of Done

Khi hoàn thành step 7 trở lên, app của bạn đã là mini coding agent giống Cursor ở mức MVP.


---

# Phase 4 - Nâng cao giống Cursor Pro

---

## Step 11 - Multi File Context

### Mục tiêu

Cho AI đọc nhiều file liên quan trước khi sửa.

### Checklist

- [ ] load import dependencies
- [ ] load parent service / interface
- [ ] load DTO / model liên quan
- [ ] giới hạn số file context
- [ ] summarize context dài

### Flow

```text
user prompt
→ search related files
→ read top 3-5 files
→ inject vào AI
→ edit target file
```

---

## Step 12 - Inline Code Actions

### Mục tiêu

Cho phép thao tác trực tiếp trên đoạn code được chọn.

### Checklist

- [ ] explain selected code
- [ ] refactor selected code
- [ ] optimize selected query
- [ ] generate unit test
- [ ] add comments

### UI

```text
Right click selection
 ├── Explain
 ├── Refactor
 ├── Optimize
 └── Generate Test
```

---

## Step 13 - Terminal Panel

### Mục tiêu

Panel riêng để chạy project.

### Checklist

- [ ] run npm install
- [ ] run npm run dev
- [ ] run dotnet run
- [ ] run unit tests
- [ ] stream logs realtime

### Layout

```text
Explorer | Chat | Editor | Terminal
```

---

## Step 14 - Error Debug Agent

### Mục tiêu

Cho AI hỗ trợ fix lỗi runtime.

### Checklist

- [ ] đọc terminal logs
- [ ] parse stack trace
- [ ] locate source file
- [ ] suggest fix patch
- [ ] auto apply fix

### Example

```text
ORA-12570
→ locate Oracle connection code
→ suggest retry policy
```

---

## Step 15 - Prompt Presets

### Mục tiêu

Tăng tốc thao tác giống Cursor.

### Checklist

- [ ] explain file
- [ ] refactor service
- [ ] add api endpoint
- [ ] write unit test
- [ ] fix bug from log

---

# Phase 5 - Production Ready

---

## Step 16 - Autosave + Version History

### Checklist

- [ ] autosave changes
- [ ] file snapshots
- [ ] rollback version
- [ ] compare versions

---

## Step 17 - Authentication + Workspace Profiles

### Checklist

- [ ] login user
- [ ] save workspace profiles
- [ ] recent projects
- [ ] pinned projects

---

## Step 18 - Performance Optimization

### Checklist

- [ ] lazy load file tree
- [ ] virtual scrolling
- [ ] cache file content
- [ ] debounce search
- [ ] stream markdown rendering

---

# Next Immediate Task

Ưu tiên code tiếp theo:

```text
Step 5 - Chat History Memory
Step 6 - Inject Code Context
Step 7 - Code Edit Flow
```

Ba step này sẽ biến app của bạn từ chat app thành coding agent thực sự.

