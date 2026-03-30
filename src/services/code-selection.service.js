class CodeSelectionService {
  constructor() {
    this.currentFile = null;
  }

  setCurrentFile(relPath) {
    this.currentFile = String(relPath || '');
  }

  getCurrentFile() {
    return this.currentFile;
  }
}

module.exports = new CodeSelectionService();
