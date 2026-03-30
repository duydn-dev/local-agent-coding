const { diffLines } = require('diff');

class DiffService {
  compare(oldCode, newCode) {
    return diffLines(oldCode, newCode).map((part) => ({
      added: !!part.added,
      removed: !!part.removed,
      value: part.value
    }));
  }
}

module.exports = new DiffService();

