# Step 20 + 21 + 22 - Production SaaS Bundle

Tài liệu này gộp 3 step cuối để đưa mini IDE AI của bạn lên mức **production / SaaS-ready** giống entity["software","Cursor"].

Bao gồm:

```text
Step 20 - Authentication + Multi User Sessions
Step 21 - Cloud Sync + GitHub Integration
Step 22 - AI Agent Tool Calling + Auto Refactor Workflow
```

---

# Step 20 - Authentication + Multi User Sessions

Mục tiêu: hỗ trợ nhiều người dùng, session riêng, workspace riêng.

---

## 20.1 Kiến trúc

```text
Vue Client
   ↓
Node API
   ↓
JWT Auth
   ↓
Session Store (Redis)
   ↓
Workspace Isolation
```

---

## 20.2 Packages

```bash
npm install jsonwebtoken bcrypt redis express-session
```

---

## 20.3 Auth service

Tạo `services/auth.service.js`

```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class AuthService {
    async hashPassword(password) {
        return await bcrypt.hash(password, 10);
    }

    async compare(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    generateToken(user) {
        return jwt.sign(
            {
                userId: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
    }
}

module.exports = new AuthService();
```

---

## 20.4 Multi user session

Tạo `services/user-session.service.js`

```javascript
class UserSessionService {
    constructor() {
        this.sessions = new Map();
    }

    set(userId, data) {
        this.sessions.set(userId, data);
    }

    get(userId) {
        return this.sessions.get(userId);
    }
}

module.exports = new UserSessionService();
```

Lưu riêng:

```text
chat history
workspace
current file
terminal logs
```

---

# Step 21 - Cloud Sync + GitHub Integration

Mục tiêu: đồng bộ cloud và tích hợp GitHub.

---

## 21.1 GitHub package

```bash
npm install simple-git octokit
```

---

## 21.2 GitHub service

Tạo `services/github.service.js`

```javascript
const { Octokit } = require('octokit');

class GithubService {
    constructor(token) {
        this.client = new Octokit({ auth: token });
    }

    async getRepos() {
        return await this.client.request('GET /user/repos');
    }

    async createBranch(owner, repo, branch, sha) {
        return await this.client.request(
            'POST /repos/{owner}/{repo}/git/refs',
            {
                owner,
                repo,
                ref: `refs/heads/${branch}`,
                sha
            }
        );
    }
}

module.exports = GithubService;
```

---

## 21.3 Cloud sync draft

Tạo `services/cloud-sync.service.js`

```javascript
class CloudSyncService {
    constructor() {
        this.storage = new Map();
    }

    save(userId, snapshot) {
        this.storage.set(userId, {
            ...snapshot,
            syncedAt: new Date()
        });
    }

    load(userId) {
        return this.storage.get(userId);
    }
}

module.exports = new CloudSyncService();
```

---

# Step 22 - AI Agent Tool Calling + Auto Refactor Workflow

Mục tiêu: AI tự gọi tool và thực hiện workflow tự động.

---

## 22.1 Workflow

```text
User prompt
→ analyze intent
→ call tools
→ read files
→ search related files
→ refactor
→ diff
→ apply
→ git commit
```

---

## 22.2 Tool registry

Tạo `services/agent-tools.service.js`

```javascript
const fs = require('fs');
const codeSearch = require('./code-search.service');

class AgentToolsService {
    async call(tool, args) {
        switch (tool) {
            case 'read_file':
                return fs.readFileSync(args.path, 'utf8');

            case 'search_code':
                return codeSearch.searchContent(args.keyword);

            case 'write_file':
                fs.writeFileSync(args.path, args.content, 'utf8');
                return { success: true };

            default:
                throw new Error('Unknown tool');
        }
    }
}

module.exports = new AgentToolsService();
```

---

## 22.3 Auto refactor workflow

Tạo `services/auto-refactor.service.js`

```javascript
const tools = require('./agent-tools.service');

class AutoRefactorService {
    async run(targetPath, keyword) {
        const code = await tools.call('read_file', {
            path: targetPath
        });

        const related = await tools.call('search_code', {
            keyword
        });

        return {
            targetCode: code,
            relatedFiles: related
        };
    }
}

module.exports = new AutoRefactorService();
```

---

## 22.4 Suggested full workflow

```text
Fix login bug
→ AI reads login controller
→ loads auth service
→ loads dto
→ checks logs
→ generates patch
→ previews diff
→ commits to git
→ syncs cloud snapshot
```

---

# Final progress

🎉 Chúc mừng, bạn đã hoàn thành:

```text
100% mini Cursor clone production roadmap
```

App của bạn hiện đã có thể phát triển thành một sản phẩm SaaS thực thụ.

