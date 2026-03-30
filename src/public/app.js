// Minimal frontend (EJS-served) to interact with backend APIs
(function () {
  const backend = window.DEBUG_AGENT_BACKEND || '';
  const api = (p) => (backend ? backend + p : p);
  let editor;
  let currentPath;
  let lastSuggested = null;
  let previewCode = '';
  let autosaveTimer = null;
  let recoveredDraft = null;
  let openTabs = [];
  let activeTab = null;
  let terminalStreamAbort = null;
  let bottomCollapsed = false;
  let leftCollapsed = false;
  let rightCollapsed = false;
  let prevLeftWidth = 288;
  let prevRightWidth = 320;
  let prevBottomHeight = 288;
  let selectedModel = '';
  const localFileCache = new Map(); // virtualPath -> content (local files)

  // Step 18 state (simple virtualization + lazy load)
  let treeNodes = [];
  let visibleNodes = [];
  let scrollStart = 0;
  const fileCache = new Map();
  const searchCache = new Map();
  const TREE_ROW_HEIGHT = 22;

  function el(id) {
    return document.getElementById(id);
  }

  function getSelectedModel() {
    return (selectedModel || '').toString().trim();
  }

  async function loadModelsIntoSelect() {
    // Backward-compat name; now uses searchable input + datalist
    const input = el('modelInput');
    const list = el('modelList');
    if (!input || !list) return;

    const saved = localStorage.getItem('selectedModel') || '';
    selectedModel = saved;
    input.value = selectedModel;

    list.innerHTML = '';
    const known = new Set();

    try {
      const res = await fetch(api('/ai/models'));
      const json = await res.json();
      const models = Array.isArray(json.models) ? json.models : [];

      for (const m of models) {
        const id = typeof m === 'string' ? m : m?.id || m?.name || m?.model || '';
        if (!id || known.has(id)) continue;
        known.add(id);
        const opt = document.createElement('option');
        opt.value = id;
        list.appendChild(opt);
      }
    } catch (e) {
      // ignore; user can still type manually / leave blank
    }

    function commitModelFromInput() {
      const v = (input.value || '').toString().trim();
      selectedModel = v;
      localStorage.setItem('selectedModel', selectedModel);
    }

    input.addEventListener('change', commitModelFromInput);
    input.addEventListener('blur', commitModelFromInput);
    input.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') commitModelFromInput();
    });
  }

  // Important: keep references to original nodes (no spreading),
  // otherwise expand/collapse mutates a copy and the tree won't change.
  function flattenVisible(nodes, level = 0, out = []) {
    for (const node of nodes) {
      out.push({ node, level });
      if (node.isExpanded && node.children) {
        flattenVisible(node.children, level + 1, out);
      }
    }
    return out;
  }

  function refreshVisibleNodes() {
    const rows = flattenVisible(treeNodes, 0, []);
    visibleNodes = rows.slice(scrollStart, scrollStart + 100);

    const container = el('tree');
    container.innerHTML = '';
    container.style.position = 'relative';

    const totalRows = rows.length;
    const spacer = document.createElement('div');
    spacer.style.height = `${totalRows * TREE_ROW_HEIGHT}px`;
    container.appendChild(spacer);

    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.top = `${scrollStart * TREE_ROW_HEIGHT}px`;
    overlay.style.pointerEvents = 'none';
    container.appendChild(overlay);

    const ul = document.createElement('ul');
    ul.style.pointerEvents = 'auto';

    for (const row of visibleNodes) {
      const node = row.node;
      const li = document.createElement('li');
      li.style.paddingLeft = `${row.level * 12}px`;

      const twisty = document.createElement('span');
      twisty.className = 'inline-block w-4 text-center opacity-80';
      twisty.textContent = node.isDirectory ? (node.isExpanded ? '▾' : '▸') : '';
      twisty.onclick = (e) => {
        e.stopPropagation();
        if (node.isDirectory) expandNode(node);
      };

      const icon = document.createElement('i');
      icon.className =
        (node.isDirectory ? 'fa-regular fa-folder' : 'fa-regular fa-file') +
        ' mr-2 text-zinc-300';

      const label = document.createElement('span');
      label.textContent = node.name;

      li.onclick = () => {
        if (node.isDirectory) expandNode(node);
        else loadFile(node.path);
      };

      li.appendChild(twisty);
      li.appendChild(icon);
      li.appendChild(label);
      ul.appendChild(li);
    }

    overlay.appendChild(ul);
  }

  async function loadRootTree() {
    const res = await fetch(api('/workspace/tree/lazy'));
    const json = await res.json();
    if (json.error) return alert(json.error);
    treeNodes = json.map((x) => ({ ...x, isExpanded: false, children: null }));
    scrollStart = 0;
    refreshVisibleNodes();
  }

  function renderTabs() {
    const tabs = el('tabs');
    if (!tabs) return;
    tabs.innerHTML = '';

    for (const t of openTabs) {
      const btn = document.createElement('button');
      const isActive = t.path === activeTab;
      btn.className =
        'flex items-center gap-2 px-3 text-xs border-r border-zinc-800 ' +
        (isActive ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800');
      btn.style.minWidth = '140px';
      btn.title = t.path;

      const icon = document.createElement('i');
      icon.className = 'fa-regular fa-file text-zinc-300';
      const name = document.createElement('span');
      name.className = 'truncate';
      name.textContent = t.name;

      const close = document.createElement('span');
      close.className = 'ml-auto opacity-70 hover:opacity-100';
      close.textContent = '×';
      close.onclick = (e) => {
        e.stopPropagation();
        openTabs = openTabs.filter((x) => x.path !== t.path);
        if (activeTab === t.path) {
          activeTab = openTabs[openTabs.length - 1]?.path || null;
          if (activeTab) loadFile(activeTab);
        }
        renderTabs();
      };

      btn.onclick = () => loadFile(t.path);
      btn.appendChild(icon);
      btn.appendChild(name);
      btn.appendChild(close);
      tabs.appendChild(btn);
    }
  }

  function setStatus() {
    const ws = el('statusWorkspace');
    const f = el('statusFile');
    if (ws) ws.textContent = `Workspace: ${document.title || '-'}`;
    if (f) f.textContent = `File: ${currentPath || '-'}`;
  }

  async function expandNode(node) {
    if (!node.isDirectory) {
      return loadFile(node.path);
    }
    if (node.children) {
      node.isExpanded = !node.isExpanded;
      refreshVisibleNodes();
      return;
    }
    const res = await fetch(api('/workspace/tree/lazy?path=' + encodeURIComponent(node.path)));
    const json = await res.json();
    if (json.error) return alert(json.error);
    node.children = json.map((x) => ({ ...x, isExpanded: false, children: null }));
    node.isExpanded = true;
    refreshVisibleNodes();
  }

  function onTreeScroll(e) {
    scrollStart = Math.floor(e.target.scrollTop / TREE_ROW_HEIGHT);
    refreshVisibleNodes();
  }

  async function selectFile(path) {
    await fetch(api('/files/select'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
  }

  async function loadFile(path) {
    // Local virtual files opened via browser picker
    if (String(path).startsWith('local:')) {
      currentPath = path;
      const content = localFileCache.get(path) || '';
      if (editor) editor.setValue(content);
      lastSuggested = null;
      previewCode = '';
      hideDiff();
      const name = String(path).replace(/^local:/, '');
      if (!openTabs.some((t) => t.path === path)) {
        openTabs.push({ path, name });
      }
      activeTab = path;
      renderTabs();
      setStatus();
      return;
    }

    currentPath = path;
    await selectFile(path);
    if (fileCache.has(path)) {
      const cached = fileCache.get(path);
      editor.setValue(cached || '');
      lastSuggested = null;
      previewCode = '';
      hideDiff();
      return;
    }
    const res = await fetch(api('/files/read?path=' + encodeURIComponent(path)));
    const json = await res.json();
    if (json.error) return alert(json.error);
    editor.setValue(json.content || '');
    fileCache.set(path, json.content || '');
    lastSuggested = null;
    previewCode = '';
    hideDiff();

    const name = String(path).split('/').pop();
    if (!openTabs.some((t) => t.path === path)) {
      openTabs.push({ path, name });
    }
    activeTab = path;
    renderTabs();
    setStatus();
  }

  function hideDiff() {
    el('diffPanel').classList.add('hidden');
    el('diffLines').innerHTML = '';
  }

  function showDiff(lines) {
    el('diffPanel').classList.remove('hidden');
    el('diffLines').innerHTML = '';
    for (const part of lines) {
      const div = document.createElement('div');
      div.className =
        'mono px-2 py-1 border-b border-zinc-900 ' +
        (part.added ? 'bg-emerald-500/15' : part.removed ? 'bg-red-500/15' : 'bg-zinc-950');
      div.textContent = part.value || '';
      el('diffLines').appendChild(div);
    }
  }

  async function preview() {
    if (!currentPath) return alert('Hãy chọn một file trước');
    const instr = (el('instruction')?.value || '').toString();

    // Step 7 flow (SSE): /code/preview-edit streams text + patch, then done with full content
    lastSuggested = null;
    previewCode = '';
    hideDiff();

    const res = await fetch(api('/code/preview-edit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: instr, model: getSelectedModel() || null })
    });

    if (!res.body) return alert('Không có dữ liệu stream');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const p of parts) {
        const line = p.trim();
        if (!line.startsWith('data:')) continue;
        const raw = line.replace(/^data:\s*/, '');
        let data;
        try {
          data = JSON.parse(raw);
        } catch (e) {
          continue;
        }

        if (data.type === 'text') {
          previewCode += data.content || '';
        } else if (data.type === 'done') {
          lastSuggested = data.content || previewCode;
        } else if (data.type === 'patch') {
          // ignored in docs UI; we will use /code/diff
        } else if (data.type === 'error') {
          alert(data.error || 'preview error');
        }
      }
    }

    if (lastSuggested != null) {
      const diffRes = await fetch(api('/code/diff'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCode: lastSuggested })
      });
      const diffJson = await diffRes.json();
      if (diffJson.error) return alert(diffJson.error);
      showDiff(diffJson);
    }
  }

  async function apply() {
    if (!currentPath || lastSuggested == null) return alert('Chưa có nội dung đề xuất để áp dụng');
    const res = await fetch(api('/code/save-edit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: lastSuggested, backup: true })
    });
    const json = await res.json();
    if (json.error) return alert(json.error);
    alert('Đã áp dụng vào ' + json.path);
    if (window.autosaveManager) window.autosaveManager.clear();
    loadFile(currentPath);
  }

  function appendMessage(role, content) {
    const wrap = document.createElement('div');
    wrap.className =
      (role === 'user'
        ? 'border border-indigo-500/30 bg-indigo-500/10'
        : 'border border-cyan-500/30 bg-cyan-500/10') + ' rounded-md p-2 mb-2';
    const title = document.createElement('div');
    title.className = 'text-[11px] font-semibold text-zinc-300 mb-1';
    title.textContent = role;
    const body = document.createElement('div');
    body.className = 'mono';
    body.textContent = content;
    wrap.appendChild(title);
    wrap.appendChild(body);
    if (role === 'user') {
      const actions = document.createElement('div');
      actions.className = 'mt-2 flex items-center gap-2';
      const btnEdit = document.createElement('button');
      btnEdit.className =
        'rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2 py-1 text-[10px] text-zinc-200';
      btnEdit.textContent = 'Sửa';
      btnEdit.onclick = () => {
        const input = el('chatInput');
        if (!input) return;
        input.value = body.textContent || '';
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      };
      actions.appendChild(btnEdit);
      wrap.appendChild(actions);
    }
    el('chatMessages').appendChild(wrap);
    el('chatMessages').scrollTop = el('chatMessages').scrollHeight;
  }

  function createStreamingAssistantMessage() {
    const wrap = document.createElement('div');
    wrap.className = 'border border-cyan-500/30 bg-cyan-500/10 rounded-md p-2 mb-2';
    const title = document.createElement('div');
    title.className = 'text-[11px] font-semibold text-zinc-300 mb-1';
    title.textContent = 'assistant';
    const body = document.createElement('div');
    body.className = 'mono';
    body.textContent = '';
    wrap.appendChild(title);
    wrap.appendChild(body);
    el('chatMessages').appendChild(wrap);
    el('chatMessages').scrollTop = el('chatMessages').scrollHeight;
    return { wrap, body };
  }

  async function sendChat() {
    const text = (el('chatInput').value || '').trim();
    if (!text) return;
    el('chatInput').value = '';
    appendMessage('user', text);

    const res = await fetch(api('/agent/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, model: getSelectedModel() || null })
    });
    if (!res.body) return alert('No stream body');

    const streaming = createStreamingAssistantMessage();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistant = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const p of parts) {
        const block = p.trim();
        if (!block) continue;
        if (block.startsWith('event: done')) continue;
        const dataLine = block
          .split('\n')
          .map((x) => x.trim())
          .find((x) => x.startsWith('data:'));
        if (!dataLine) continue;
        const raw = dataLine.replace(/^data:\s*/, '');
        let data;
        try {
          data = JSON.parse(raw);
        } catch (e) {
          continue;
        }
        if (data.type === 'text') {
          assistant += data.content || '';
          streaming.body.textContent = assistant;
          el('chatMessages').scrollTop = el('chatMessages').scrollHeight;
        }
      }
    }
    // if nothing arrived, keep a visible hint
    if (!assistant.trim()) {
      streaming.body.textContent =
        'Không nhận được phản hồi. Hãy kiểm tra PUTER_AUTH_TOKEN hoặc xem log server.\n';
    }
  }

  async function clearChat() {
    await fetch(api('/chat/clear'), { method: 'POST' });
    el('chatMessages').innerHTML = '';
  }

  async function searchCode() {
    const keyword = (el('searchKeyword').value || '').trim();
    if (!keyword) return;
    if (searchCache.has(keyword)) {
      renderSearchResults(searchCache.get(keyword));
      return;
    }
    const res = await fetch(api('/code/search?keyword=' + encodeURIComponent(keyword)));
    const json = await res.json();
    if (json.error) return alert(json.error);
    searchCache.set(keyword, json);
    renderSearchResults(json);
  }

  function renderSearchResults(items) {
    el('searchResults').innerHTML = '';
    for (const item of items) {
      const box = document.createElement('div');
      box.className = 'rounded-md border border-zinc-800 bg-zinc-950 p-2';
      const p = document.createElement('div');
      p.className = 'text-xs font-semibold text-zinc-200';
      p.textContent = item.path;
      const pre = document.createElement('pre');
      pre.className = 'mono mt-1 text-zinc-200';
      pre.textContent = item.snippet;
      box.appendChild(p);
      box.appendChild(pre);
      el('searchResults').appendChild(box);
    }
  }

  function rejectDiff() {
    hideDiff();
    lastSuggested = null;
    previewCode = '';
  }

  window.require.config({
    paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs' }
  });
  window.require(['vs/editor/editor.main'], function () {
    if (window.monaco?.editor?.setTheme) {
      window.monaco.editor.setTheme('vs-dark');
    }
    editor = monaco.editor.create(document.getElementById('editor'), {
      value: '// Hãy chọn một file bên trái để mở',
      language: 'javascript',
      automaticLayout: true,
      theme: 'vs-dark'
    });

    editor.onDidChangeCursorPosition((e) => {
      const pos = el('statusPos');
      if (!pos) return;
      pos.textContent = `Dòng ${e.position.lineNumber}, Cột ${e.position.column}`;
    });

    // Step 12 - Inline actions (Monaco context menu)
    function getSelectedText() {
      const sel = editor.getSelection();
      if (!sel) return '';
      return editor.getModel().getValueInRange(sel);
    }

    async function runInline(action) {
      const selectedCode = getSelectedText();
      if (!selectedCode.trim()) return alert('Chưa chọn đoạn mã nào');
      const res = await fetch(api('/code/inline-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, selectedCode, model: getSelectedModel() || null })
      });
      if (!res.body) return alert('Không có dữ liệu stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let out = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const p of parts) {
          const line = p.trim();
          if (!line.startsWith('data:')) continue;
          const raw = line.replace(/^data:\s*/, '');
          if (raw === '[DONE]') continue;
          try {
            const data = JSON.parse(raw);
            out += data.content || '';
          } catch (e) {}
        }
      }
      // Replace selection for refactor/optimize/test; explain writes to chat
      if (action === 'explain') {
        appendMessage('assistant', out);
      } else {
        editor.executeEdits('inline-action', [
          { range: editor.getSelection(), text: out, forceMoveMarkers: true }
        ]);
      }
    }

    editor.addAction({
      id: 'inline-explain',
      label: 'AI: Giải thích đoạn chọn',
      contextMenuGroupId: 'navigation',
      run: () => runInline('explain')
    });
    editor.addAction({
      id: 'inline-refactor',
      label: 'AI: Refactor đoạn chọn',
      contextMenuGroupId: 'navigation',
      run: () => runInline('refactor')
    });
    editor.addAction({
      id: 'inline-optimize',
      label: 'AI: Tối ưu đoạn chọn',
      contextMenuGroupId: 'navigation',
      run: () => runInline('optimize')
    });
    editor.addAction({
      id: 'inline-test',
      label: 'AI: Tạo test cho đoạn chọn',
      contextMenuGroupId: 'navigation',
      run: () => runInline('test')
    });

    loadRootTree();
  });

  // Step 15 - Smart actions
  async function runPreset(presetKey) {
    if (el('smartOut')) el('smartOut').textContent = '';
    const res = await fetch(api('/actions/run'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetKey, model: getSelectedModel() || null })
    });
    if (!res.body) return alert('Không có dữ liệu stream');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const p of parts) {
        const line = p.trim();
        if (!line.startsWith('data:')) continue;
        const raw = line.replace(/^data:\s*/, '');
        if (raw === '[DONE]') continue;
        try {
          const data = JSON.parse(raw);
          if (el('smartOut')) el('smartOut').textContent += data.content || '';
        } catch (e) {}
      }
    }
  }

  // Step 16 - Autosave + recovery
  function startAutosave() {
    if (!window.autosaveManager) return;
    if (autosaveTimer) clearInterval(autosaveTimer);
    autosaveTimer = setInterval(() => {
      window.autosaveManager.save({
        currentCode: editor ? editor.getValue() : '',
        messages: el('chatMessages') ? el('chatMessages').innerText : '',
        currentFile: currentPath,
        terminalOutput: el('terminalOut') ? el('terminalOut').innerText : ''
      });
    }, 5000);
  }

  function restoreDraft() {
    if (!window.autosaveManager) return;
    const draft = window.autosaveManager.load();
    if (!draft) return;
    recoveredDraft = draft;
    el('recoveryBanner').classList.remove('hidden');
  }

  // Step 17 - Workspace profiles UI removed (keep backend workspace only)

  document.addEventListener('DOMContentLoaded', function () {
    loadModelsIntoSelect();
    el('btnPreview')?.addEventListener('click', preview);
    el('btnApply')?.addEventListener('click', apply);
    el('btnAccept').addEventListener('click', apply);
    el('btnReject').addEventListener('click', rejectDiff);
    el('btnSend').addEventListener('click', sendChat);
    el('btnClearChat').addEventListener('click', clearChat);
    el('btnSearch').addEventListener('click', searchCode);
    el('searchKeyword').addEventListener('keyup', (e) => {
      if (e.key === 'Enter') searchCode();
    });

    // Find/Replace (current file) - shown only in Search view
    async function findInFile() {
      if (!editor) return;
      const needle = (el('findText')?.value || '').toString();
      if (!needle) return;
      const model = editor.getModel();
      const matches = model.findMatches(needle, true, false, false, null, true);
      if (el('findStats')) el('findStats').textContent = `${matches.length} kết quả`;
      if (matches[0]) {
        editor.setSelection(matches[0].range);
        editor.revealRangeInCenter(matches[0].range);
      }
    }

    async function replaceAllInFile() {
      if (!editor) return;
      const needle = (el('findText')?.value || '').toString();
      const replacement = (el('replaceText')?.value || '').toString();
      if (!needle) return;
      const model = editor.getModel();
      const matches = model.findMatches(needle, true, false, false, null, true);
      if (matches.length === 0) {
        if (el('findStats')) el('findStats').textContent = `0 kết quả`;
        return;
      }
      // Apply from bottom to top to keep ranges valid
      const edits = matches
        .slice()
        .reverse()
        .map((m) => ({ range: m.range, text: replacement }));
      model.pushEditOperations([], edits, () => null);
      if (el('findStats')) el('findStats').textContent = `Đã thay ${matches.length}`;
    }

    el('btnFindInFile')?.addEventListener('click', findInFile);
    el('btnReplaceAllInFile')?.addEventListener('click', replaceAllInFile);
    el('findText')?.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') findInFile();
    });
    el('replaceText')?.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') replaceAllInFile();
    });
    el('chatInput').addEventListener('keyup', (e) => {
      if (e.key === 'Enter') sendChat();
    });

    // Top menu: Tệp (Open file/folder like VSCode)
    const btnMenuFile = el('btnMenuFile');
    const menuFile = el('menuFile');
    const miOpenFile = el('miOpenFile');
    const miOpenFolder = el('miOpenFolder');
    const miCloseMenu = el('miCloseMenu');
    const filePicker = el('filePicker');
    const folderPicker = el('folderPicker');

    function closeFileMenu() {
      menuFile?.classList.add('hidden');
    }
    function toggleFileMenu() {
      if (!menuFile) return;
      menuFile.classList.toggle('hidden');
    }

    btnMenuFile?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFileMenu();
    });
    miCloseMenu?.addEventListener('click', closeFileMenu);
    document.addEventListener('click', () => closeFileMenu());

    miOpenFile?.addEventListener('click', () => {
      closeFileMenu();
      filePicker?.click();
    });
    miOpenFolder?.addEventListener('click', () => {
      closeFileMenu();
      folderPicker?.click();
    });

    async function openLocalFile(file) {
      if (!file) return;
      const text = await file.text();
      const virtualPath = `local:${file.name}`;
      localFileCache.set(virtualPath, text);
      currentPath = virtualPath;
      if (editor) editor.setValue(text);
      if (el('statusFile')) el('statusFile').textContent = `File: ${virtualPath}`;
      // add a tab so it feels like VSCode
      if (!openTabs.some((t) => t.path === virtualPath)) {
        openTabs.push({ path: virtualPath, name: file.name });
      }
      activeTab = virtualPath;
      renderTabs();
    }

    filePicker?.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      await openLocalFile(f);
      e.target.value = '';
    });

    // Folder picker: show a quick chooser by reusing Search results area
    folderPicker?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // Switch to Explorer view so user sees file list area (tree not replace server tree)
      setSidebarView?.('explorer');

      const containerId = 'localFolderList';
      let box = document.getElementById(containerId);
      if (!box) {
        box = document.createElement('div');
        box.id = containerId;
        box.className = 'rounded-md border border-zinc-800 bg-zinc-950/30 p-2';
        const title = document.createElement('div');
        title.className = 'text-[11px] font-semibold text-zinc-400 mb-2';
        title.textContent = 'THƯ MỤC CỤC BỘ (đã chọn)';
        box.appendChild(title);
        const list = document.createElement('div');
        list.id = 'localFolderItems';
        list.className = 'space-y-1 max-h-48 overflow-auto';
        box.appendChild(list);

        // insert on top of explorer view
        const explorer = el('viewExplorer');
        explorer?.insertBefore(box, explorer.firstChild);
      }

      const list = document.getElementById('localFolderItems');
      if (list) list.innerHTML = '';

      for (const f of files.slice(0, 500)) {
        const rel = f.webkitRelativePath || f.name;
        const row = document.createElement('button');
        row.className =
          'w-full text-left rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs hover:bg-zinc-900';
        row.textContent = rel;
        row.onclick = async () => openLocalFile(f);
        list?.appendChild(row);
      }

      e.target.value = '';
    });

    // Step 10 - Git panel
    async function loadGitStatus() {
      const res = await fetch(api('/git/status'));
      const json = await res.json();
      el('gitOut').textContent = JSON.stringify(json, null, 2);
    }

    async function loadGitDiff() {
      const res = await fetch(api('/git/diff'));
      const json = await res.json();
      el('gitOut').textContent = json.diff || JSON.stringify(json, null, 2);
    }

    async function commitChanges() {
      const res = await fetch(api('/git/commit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'AI code update' })
      });
      const json = await res.json();
      el('gitOut').textContent = JSON.stringify(json, null, 2);
    }

    async function rollbackFile() {
      const file = (el('gitRollbackFile').value || '').trim();
      if (!file) return alert('Cần nhập đường dẫn file');
      const res = await fetch(api('/git/rollback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file })
      });
      const json = await res.json();
      el('gitOut').textContent = JSON.stringify(json, null, 2);
    }

    el('btnGitStatus').addEventListener('click', loadGitStatus);
    el('btnGitDiff').addEventListener('click', loadGitDiff);
    el('btnGitCommit').addEventListener('click', commitChanges);
    el('btnGitRollback').addEventListener('click', rollbackFile);

    // Version history
    async function loadHistory() {
      const res = await fetch(api('/history'));
      const json = await res.json();
      // Append to chatMessages (VSCode-like unified panel)
      const items = Array.isArray(json) ? json : json?.items || [];
      appendMessage('assistant', '--- LỊCH SỬ ---');
      appendMessage('assistant', JSON.stringify(items, null, 2));
    }
    el('btnHistory').addEventListener('click', loadHistory);

    // Bottom panel tabs: Terminal / Diff
    function setBottomTab(tab) {
      const terminalPanel = el('terminalPanel');
      const diffPanel = el('diffPanel');
      const tabTerminal = el('tabTerminal');
      const tabDiff = el('tabDiff');
      const isTerminal = tab === 'terminal';
      if (terminalPanel) terminalPanel.classList.toggle('hidden', !isTerminal);
      if (diffPanel) diffPanel.classList.toggle('hidden', isTerminal);
      if (tabTerminal) {
        tabTerminal.classList.toggle('bg-zinc-800', isTerminal);
        tabTerminal.classList.toggle('border-zinc-700', isTerminal);
        tabTerminal.classList.toggle('border-transparent', !isTerminal);
      }
      if (tabDiff) {
        tabDiff.classList.toggle('bg-zinc-800', !isTerminal);
        tabDiff.classList.toggle('border-zinc-700', !isTerminal);
        tabDiff.classList.toggle('border-transparent', isTerminal);
      }
    }
    el('tabTerminal')?.addEventListener('click', () => setBottomTab('terminal'));
    el('tabDiff')?.addEventListener('click', () => setBottomTab('diff'));
    setBottomTab('terminal');

    // Terminal (SSE streaming)
    function appendTerminal(text) {
      const out = el('terminalOut');
      if (!out) return;
      out.textContent += text;
      out.scrollTop = out.scrollHeight;
    }
    function clearTerminal() {
      if (el('terminalOut')) el('terminalOut').textContent = '';
    }
    async function stopTerminal() {
      try {
        terminalStreamAbort?.abort();
      } catch (e) {}
      terminalStreamAbort = null;
      await fetch(api('/terminal/stop'), { method: 'POST' }).catch(() => {});
    }
    async function runTerminal() {
      await stopTerminal();

      const typed = (el('terminalCmd')?.value || '').toString().trim();
      let command = '';
      let args = [];
      if (typed) {
        // basic split (supports "quoted strings")
        const tokens = typed.match(/"[^"]*"|'[^']*'|\S+/g) || [];
        const cleaned = tokens.map((t) => t.replace(/^['"]|['"]$/g, ''));
        command = cleaned[0] || '';
        args = cleaned.slice(1);
      } else {
        const preset = (el('terminalPreset')?.value || '').toString();
        const parts = preset.split('|').filter(Boolean);
        command = parts[0] || '';
        args = parts.slice(1);
      }
      if (!command) return alert('Bạn cần nhập lệnh để chạy');

      appendTerminal(`\n$ ${[command, ...args].join(' ')}\n`);

      const controller = new AbortController();
      terminalStreamAbort = controller;

      const res = await fetch(api('/terminal/run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, args }),
        signal: controller.signal
      });

      if (!res.body) return alert('Không có dữ liệu stream terminal');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const p of parts) {
          const line = p.trim();
          if (!line.startsWith('data:')) continue;
          const raw = line.replace(/^data:\s*/, '');
          try {
            const data = JSON.parse(raw);
            if (data?.content) appendTerminal(data.content);
          } catch (e) {}
        }
      }
    }
    el('btnTerminalRun')?.addEventListener('click', runTerminal);
    el('btnTerminalStop')?.addEventListener('click', stopTerminal);
    el('btnTerminalClear')?.addEventListener('click', clearTerminal);
    el('terminalCmd')?.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') runTerminal();
    });

    // terminal + autosave + profiles hooks
    el('tree').addEventListener('scroll', onTreeScroll);
    startAutosave();
    restoreDraft();
    // Workspace profiles UI removed

    // Smart presets buttons (optional; UI may hide/remove)
    el('btnPresetExplain')?.addEventListener('click', () => runPreset('explain_file'));
    el('btnPresetFix')?.addEventListener('click', () => runPreset('fix_bug'));
    el('btnPresetRefactor')?.addEventListener('click', () => runPreset('refactor_service'));
    el('btnPresetApi')?.addEventListener('click', () => runPreset('generate_api'));
    el('btnPresetTest')?.addEventListener('click', () => runPreset('generate_test'));

    // Activity bar toggles (VSCode-like views)
    const sidebarTitle = el('sidebarTitle');
    const viewExplorer = el('viewExplorer');
    const viewSearch = el('viewSearch');
    const viewScm = el('viewScm');
    const btnViewExplorer = el('btnViewExplorer');
    const btnViewSearch = el('btnViewSearch');
    const btnViewSource = el('btnViewSource');
    const tabSidebarWorkspace = el('tabSidebarWorkspace');
    const tabSidebarSearch = el('tabSidebarSearch');
    const tabSidebarScm = el('tabSidebarScm');

    function setSidebarView(view) {
      if (viewExplorer) viewExplorer.classList.toggle('hidden', view !== 'explorer');
      if (viewSearch) viewSearch.classList.toggle('hidden', view !== 'search');
      if (viewScm) viewScm.classList.toggle('hidden', view !== 'scm');
      if (sidebarTitle) {
        sidebarTitle.textContent = view === 'search' ? 'TÌM KIẾM' : view === 'scm' ? 'MÃ NGUỒN' : 'TRÌNH KHÁM PHÁ';
      }
      const isExplorer = view === 'explorer';
      const isSearch = view === 'search';
      const isScm = view === 'scm';
      if (tabSidebarWorkspace) {
        tabSidebarWorkspace.classList.toggle('bg-zinc-800', isExplorer);
        tabSidebarWorkspace.classList.toggle('border-zinc-700', isExplorer);
        tabSidebarWorkspace.classList.toggle('border-transparent', !isExplorer);
      }
      if (tabSidebarSearch) {
        tabSidebarSearch.classList.toggle('bg-zinc-800', isSearch);
        tabSidebarSearch.classList.toggle('border-zinc-700', isSearch);
        tabSidebarSearch.classList.toggle('border-transparent', !isSearch);
      }
      if (tabSidebarScm) {
        tabSidebarScm.classList.toggle('bg-zinc-800', isScm);
        tabSidebarScm.classList.toggle('border-zinc-700', isScm);
        tabSidebarScm.classList.toggle('border-transparent', !isScm);
      }
    }

    if (btnViewExplorer) btnViewExplorer.addEventListener('click', () => setSidebarView('explorer'));
    if (btnViewSearch) btnViewSearch.addEventListener('click', () => setSidebarView('search'));
    if (btnViewSource) btnViewSource.addEventListener('click', () => setSidebarView('scm'));
    if (tabSidebarWorkspace) tabSidebarWorkspace.addEventListener('click', () => setSidebarView('explorer'));
    if (tabSidebarSearch) tabSidebarSearch.addEventListener('click', () => setSidebarView('search'));
    if (tabSidebarScm) tabSidebarScm.addEventListener('click', () => setSidebarView('scm'));

    setSidebarView('explorer');

    // Split panes: sidebar width
    const sidebar = el('sidebar');
    const sidebarResizer = el('sidebarResizer');
    if (sidebar && sidebarResizer) {
      let dragging = false;
      sidebarResizer.addEventListener('mousedown', () => {
        dragging = true;
        document.body.style.cursor = 'col-resize';
      });
      window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const min = 220;
        const max = 520;
        const w = Math.max(min, Math.min(max, e.clientX - 48)); // minus activity bar width
        sidebar.style.width = w + 'px';
      });
      window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = '';
      });
    }

    // Split panes: right pane width (chat/history)
    const rightPane = el('rightPane');
    const rightResizer = el('rightResizer');
    if (rightPane && rightResizer) {
      let dragging = false;
      rightResizer.addEventListener('mousedown', () => {
        dragging = true;
        document.body.style.cursor = 'col-resize';
      });
      window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const min = 280;
        const max = 520;
        const desired = window.innerWidth - e.clientX;
        const w = Math.max(min, Math.min(max, desired));
        rightPane.style.width = w + 'px';
      });
      window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = '';
      });
    }

    // Split panes: bottom panel height
    const bottomPanel = el('bottomPanel');
    const panelResizer = el('panelResizer');
    if (bottomPanel && panelResizer) {
      let dragging = false;
      panelResizer.addEventListener('mousedown', () => {
        dragging = true;
        document.body.style.cursor = 'row-resize';
      });
      window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const min = 160;
        const max = Math.floor(window.innerHeight * 0.6);
        const desired = window.innerHeight - e.clientY - 6 - 24; // statusbar
        const h = Math.max(min, Math.min(max, desired));
        bottomPanel.style.height = h + 'px';
      });
      window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.cursor = '';
      });
    }

    // Minimize / restore: left sidebar
    function setLeftCollapsed(collapsed) {
      if (!sidebar || !sidebarResizer) return;
      if (collapsed) {
        prevLeftWidth = parseInt(sidebar.style.width || '', 10) || sidebar.getBoundingClientRect().width || 288;
        sidebar.classList.add('hidden');
        sidebarResizer.classList.add('hidden');
      } else {
        sidebar.classList.remove('hidden');
        sidebarResizer.classList.remove('hidden');
        sidebar.style.width = `${prevLeftWidth}px`;
      }
      leftCollapsed = collapsed;
    }
    el('btnMinSidebar')?.addEventListener('click', () => setLeftCollapsed(!leftCollapsed));

    // Minimize / restore: right pane
    function setRightCollapsed(collapsed) {
      if (!rightPane || !rightResizer) return;
      if (collapsed) {
        prevRightWidth = parseInt(rightPane.style.width || '', 10) || rightPane.getBoundingClientRect().width || 320;
        rightPane.classList.add('hidden');
        rightResizer.classList.add('hidden');
      } else {
        rightPane.classList.remove('hidden');
        rightResizer.classList.remove('hidden');
        rightPane.style.width = `${prevRightWidth}px`;
      }
      rightCollapsed = collapsed;
    }
    el('btnMinRight')?.addEventListener('click', () => setRightCollapsed(!rightCollapsed));

    // Minimize / restore: bottom panel
    function setBottomCollapsed(collapsed) {
      if (!bottomPanel || !panelResizer) return;
      if (collapsed) {
        prevBottomHeight =
          parseInt(bottomPanel.style.height || '', 10) || bottomPanel.getBoundingClientRect().height || 288;
        bottomPanel.classList.add('hidden');
        panelResizer.classList.add('hidden');
      } else {
        bottomPanel.classList.remove('hidden');
        panelResizer.classList.remove('hidden');
        bottomPanel.style.height = `${prevBottomHeight}px`;
      }
      bottomCollapsed = collapsed;
      if (editor && editor.layout) editor.layout();
    }
    el('btnMinBottom')?.addEventListener('click', () => setBottomCollapsed(!bottomCollapsed));
  });
})();

