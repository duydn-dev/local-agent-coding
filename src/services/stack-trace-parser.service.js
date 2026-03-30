class StackTraceParserService {
  extractLines(logs) {
    const patterns = [/at\s+(.*):(\d+):(\d+)/g, /(.*\.cs):(\d+)/g, /(.*\.js):(\d+):(\d+)/g];
    const matches = [];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(logs)) !== null) {
        matches.push(match[0]);
      }
    }

    return matches;
  }
}

module.exports = new StackTraceParserService();

