const codeSearch = require('./code-search.service');

class RelatedContextService {
  build(keyword) {
    const files = codeSearch.searchContent(keyword).slice(0, 3);
    return files.map((x) => `\nFile: ${x.path}\n${x.snippet}`).join('\n\n');
  }
}

module.exports = new RelatedContextService();

