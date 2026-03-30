# Local Agent Backend (minimal)

This is a minimal Node.js backend providing workspace/file I/O APIs and a simple persistent chat memory used as the first milestone (Workspace + File IO).

Quick start (Windows PowerShell):

```powershell
cd c:\Users\Dell\Desktop\GitHubs\local-agent-coding
npm install
$env:WORKSPACE_ROOT = $PWD
npm start
```

Or run without setting WORKSPACE_ROOT (defaults to the repo folder):

```powershell
npm install
npm start
```

APIs:
- `GET /workspace/tree?path=<rel>&depth=<n>` - list files/dirs (relative to workspace root)
- `GET /files/read?path=<rel>` - read file content (limits apply)
- `POST /files/write` - body `{ path, content, backup=true }` to write file (creates bak file)
- `GET /memory` - view persistent chat memory
- `POST /memory` - add memory `{ role, text }`
- `DELETE /memory` - clear memory

- `GET /code/context?path=<rel>&maxLines=<n>&related=<m>` - get file snippet and up to `m` related file snippets

- `POST /agent/stream` - mock streaming endpoint (SSE-style). Body `{ prompt: string }`. Returns chunked `data:` events for frontend streaming integration.

- `POST /code/preview` - generate a preview suggestion and unified-diff patch. Body `{ path, instruction }`. Returns `{ originalPreview, suggestedPreview, patch }`.
- `POST /code/apply` - apply suggested content to file. Body `{ path, suggestedContent, backup=true }`.

Git integration endpoints:
- `GET /git/status` - get git status
- `GET /git/diff?path=<rel>` - get git diff (optionally for a path)
- `POST /git/commit` - body `{ message, files?: string[] }` - add & commit
- `POST /git/revert` - body `{ path?: string }` - revert changes for file or all

Terminal endpoints (use with caution — running commands on the host can be dangerous):
- `POST /terminal/run` - run a command. Body `{ cmd: string, args?: string[], cwd?: string }`. `cwd` is restricted inside workspace.
- `POST /terminal/stop` - stop a running process. Body `{ id }`.
- `GET /terminal/logs?id=<id>` - SSE stream of logs/events for the process id.

Security note: the terminal runner executes shell commands on the server. Do not expose this API publicly without authentication and strict allowlists/sandboxing.

Memory is persisted under `.agent_data/memory.json` inside the workspace root.

Next steps: implement code-context extraction and LLM streaming endpoints.
