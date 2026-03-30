const simpleGit = require('simple-git');
const codeContext = require('./code-context.service');

class GitService {
  getClient() {
    return simpleGit(codeContext.workspaceRoot);
  }

  async status() {
    return await this.getClient().status();
  }

  async diff(filePath = null) {
    const git = this.getClient();
    if (filePath) return await git.diff([filePath]);
    return await git.diff();
  }

  async commit(message) {
    const git = this.getClient();
    await git.add('.');
    return await git.commit(message);
  }

  async checkoutFile(filePath) {
    const git = this.getClient();
    return await git.checkout([filePath]);
  }
}

module.exports = new GitService();

