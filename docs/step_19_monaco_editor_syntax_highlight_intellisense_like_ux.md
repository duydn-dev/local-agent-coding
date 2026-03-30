# Step 19 - Monaco Editor + Syntax Highlight + IntelliSense-like UX

Mục tiêu của step này là hoàn thiện **trải nghiệm editor giống IDE thật** như entity["software","Visual Studio Code"] và entity["software","Cursor"].

Đây là bước gần như **finish mini IDE AI clone**.

Sau step này, flow sẽ là:

```text
Open file
→ Monaco Editor render
→ syntax highlight
→ auto format
→ quick suggestions
→ inline AI actions
```

---

# 1) Mục tiêu

Sau step này, app phải có khả năng:

- [ ] syntax highlight
- [ ] line numbers
- [ ] minimap
- [ ] auto suggestions
- [ ] bracket matching
- [ ] code folding
- [ ] format document
- [ ] inline decorations / diff markers

---

# 2) Cài package

Nếu frontend dùng Vue thuần CDN thì nên dùng CDN loader.

## CDN

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/loader.min.js"></script>
```

Nếu dùng bundler:

```bash
npm install monaco-editor
```

---

# 3) Tạo editor container

Trong `chat.ejs` thêm:

```html
<div class="rounded-2xl border bg-white shadow overflow-hidden">
    <div id="monaco-editor" class="h-[600px] w-full"></div>
</div>
```

---

# 4) Init Monaco

Trong script Vue:

```javascript
editorInstance: null,
currentLanguage: 'javascript'
```

Trong `mounted()`:

```javascript
this.initMonaco();
```

---

## method init

```javascript
initMonaco() {
    require.config({
        paths: {
            vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs'
        }
    });

    require(['vs/editor/editor.main'], () => {
        this.editorInstance = monaco.editor.create(
            document.getElementById('monaco-editor'),
            {
                value: this.currentCode || '',
                language: this.currentLanguage,
                theme: 'vs',
                automaticLayout: true,
                minimap: {
                    enabled: true
                },
                fontSize: 14,
                roundedSelection: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on'
            }
        );

        this.editorInstance.onDidChangeModelContent(() => {
            this.currentCode = this.editorInstance.getValue();
        });
    });
}
```

---

# 5) Auto detect language

```javascript
detectLanguage(fileName) {
    if (fileName.endsWith('.js')) return 'javascript';
    if (fileName.endsWith('.ts')) return 'typescript';
    if (fileName.endsWith('.vue')) return 'html';
    if (fileName.endsWith('.cs')) return 'csharp';
    if (fileName.endsWith('.json')) return 'json';

    return 'plaintext';
}
```

Khi open file:

```javascript
this.currentLanguage = this.detectLanguage(path);
this.editorInstance.getModel().setLanguage(this.currentLanguage);
this.editorInstance.setValue(fileContent);
```

---

# 6) Format document

Thêm button UI:

```html
<button @click="formatDocument">
    Format Code
</button>
```

```javascript
formatDocument() {
    this.editorInstance.getAction(
        'editor.action.formatDocument'
    ).run();
}
```

---

# 7) AI diff decorations

Hiển thị marker giống Cursor.

```javascript
showDiffMarkers(lines) {
    const decorations = lines.map(line => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
            isWholeLine: true,
            linesDecorationsClassName: 'diff-added-marker'
        }
    }));

    this.editorInstance.deltaDecorations([], decorations);
}
```

---

# 8) Inline selection action với Monaco

```javascript
runSelectionAction() {
    const selection = this.editorInstance.getSelection();

    const selectedText = this.editorInstance
        .getModel()
        .getValueInRange(selection);

    this.selectionContext.text = selectedText;

    this.showActionMenu = true;
}
```

---

# 9) Quick suggestion UX

```javascript
suggestOnTriggerCharacters: true,
quickSuggestions: true,
parameterHints: {
    enabled: true
}
```

Thêm vào config:

```javascript
monaco.editor.create(..., {
    quickSuggestions: true,
    suggestOnTriggerCharacters: true,
    parameterHints: {
        enabled: true
    }
})
```

---

# 10) Keyboard shortcuts

```javascript
this.editorInstance.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
    () => this.saveEdit()
);

this.editorInstance.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
    () => this.runPreset('refactor_service')
);
```

Rất giống IDE.

---

# 11) Best practice

Khuyến nghị bật:

```text
line numbers
minimap
folding
format on save
ctrl+s
ctrl+k
```

---

# 12) Test case

```text
1. mở auth.service.js
2. syntax highlight đúng
3. ctrl+s save
4. ctrl+k refactor
5. AI patch diff marker
```

---

# 13) Definition of Done

- [ ] Monaco render tốt
- [ ] syntax highlight đúng
- [ ] format hoạt động
- [ ] shortcut hoạt động
- [ ] inline AI action dùng được

---

# 14) Final progress

🎉 Chúc mừng, bạn đã hoàn thành khoảng:

```text
98–99% mini Cursor clone MVP+
```

Ở mức này app đã rất mạnh và hoàn toàn có thể dùng thực tế cho coding workflow.

---

# 15) Optional next steps (production polish)

```text
Step 20 - Authentication + Multi User Sessions
Step 21 - Cloud Sync + GitHub Integration
Step 22 - AI Agent Tool Calling + Auto Refactor Workflow
```

Các step này là optional để lên production / SaaS.

