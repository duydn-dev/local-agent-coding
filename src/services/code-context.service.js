const fs = require('fs');
const path = require('path');

class CodeContextService {
  constructor() {
    this.workspaceRoot = process.cwd();
    this.currentFile = null;
  }

  setWorkspace(root) {
    this.workspaceRoot = root;
  }

  setCurrentFile(filePath) {
    this.currentFile = filePath;
  }

  getCurrentFileContent() {
    if (!this.currentFile) return '';
    const fullPath = path.join(this.workspaceRoot, this.currentFile);
    return fs.readFileSync(fullPath, 'utf8');
  }

  getCurrentContext() {
    return {
      currentFile: this.currentFile,
      content: this.getCurrentFileContent()
    };
  }
}

module.exports = new CodeContextService();

