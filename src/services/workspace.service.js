const fs = require('fs').promises;
const path = require('path');

class WorkspaceService {
  constructor() {
    this.workspaceRoot = process.cwd();
  }

  setWorkspaceRoot(rootPath) {
    this.workspaceRoot = rootPath;
  }

  getWorkspaceRoot() {
    return this.workspaceRoot;
  }

  async loadWorkspace(rootPath) {
    const full = path.resolve(rootPath);
    const stat = await fs.stat(full);
    if (!stat.isDirectory()) throw new Error('rootPath must be a directory');
    this.workspaceRoot = full;
    return this.getCurrentWorkspace();
  }

  getCurrentWorkspace() {
    const rootPath = this.workspaceRoot;
    return {
      rootPath,
      projectName: path.basename(rootPath)
    };
  }
}

module.exports = new WorkspaceService();
