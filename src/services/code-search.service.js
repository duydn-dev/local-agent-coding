const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const codeContext = require('./code-context.service');

class CodeSearchService {
  searchFiles(keyword) {
    const root = codeContext.workspaceRoot;
    const files = globSync('**/*.{js,ts,vue,json,cs,ejs,css,html,md}', {
      cwd: root,
      ignore: ['node_modules/**', '.git/**', '.agent_data/**']
    });

    return files.filter((file) => file.toLowerCase().includes(String(keyword || '').toLowerCase()));
  }

  searchContent(keyword) {
    const root = codeContext.workspaceRoot;
    const files = globSync('**/*.{js,ts,vue,json,cs,ejs,css,html,md}', {
      cwd: root,
      ignore: ['node_modules/**', '.git/**', '.agent_data/**']
    });

    const results = [];
    const needle = String(keyword || '').toLowerCase();
    if (!needle) return results;

    for (const file of files) {
      const fullPath = path.join(root, file);
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch (e) {
        continue;
      }

      if (content.toLowerCase().includes(needle)) {
        results.push({
          path: file.replace(/\\/g, '/'),
          snippet: content.split('\n').slice(0, 30).join('\n')
        });
      }
    }

    return results;
  }
}

module.exports = new CodeSearchService();
