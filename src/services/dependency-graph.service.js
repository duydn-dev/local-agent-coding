const path = require('path');

class DependencyGraphService {
  extractImports(content) {
    const regex = /import\s+.*?from\s+['\"](.*?)['\"]/g;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  resolveDependency(currentFile, importPath) {
    const baseDir = path.dirname(currentFile);
    return path.normalize(path.join(baseDir, importPath)).replace(/\\/g, '/');
  }

  build(currentFile, content) {
    const imports = this.extractImports(content || '');
    return imports
      .filter((p) => p.startsWith('.') || p.startsWith('/'))
      .map((p) => ({
        source: currentFile,
        target: this.resolveDependency(currentFile, p)
      }));
  }
}

module.exports = new DependencyGraphService();

