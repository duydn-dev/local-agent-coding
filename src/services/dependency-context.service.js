const fs = require('fs');
const path = require('path');
const codeContext = require('./code-context.service');
const graphService = require('./dependency-graph.service');

class DependencyContextService {
  load() {
    const ctx = codeContext.getCurrentContext();
    if (!ctx.currentFile || !ctx.content) {
      return '';
    }

    const graph = graphService.build(ctx.currentFile, ctx.content);
    const root = codeContext.workspaceRoot;
    const results = [];

    for (const edge of graph.slice(0, 3)) {
      const candidates = [
        path.join(root, edge.target + '.js'),
        path.join(root, edge.target + '.ts'),
        path.join(root, edge.target, 'index.js'),
        path.join(root, edge.target, 'index.ts')
      ];

      const fullPath = candidates.find((p) => fs.existsSync(p));
      if (!fullPath) continue;

      const content = fs
        .readFileSync(fullPath, 'utf8')
        .split('\n')
        .slice(0, 50)
        .join('\n');

      results.push(`\nDependency File: ${edge.target}\n${content}`);
    }

    return results.join('\n\n');
  }
}

module.exports = new DependencyContextService();

