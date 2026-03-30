const simpleGit = require('simple-git');

function createGitService(root) {
  const git = simpleGit(root);

  return {
    async status() {
      return await git.status();
    },
    async diff(filePath) {
      if (filePath) return await git.diff([filePath]);
      return await git.diff();
    },
    async commit(message, files = ['.']) {
      await git.add(files);
      return await git.commit(message);
    },
    async revertChanges(filePath) {
      if (!filePath) {
        return await git.checkout(['--', '.']);
      }
      return await git.checkout(['--', filePath]);
    }
  };
}

module.exports = createGitService;
