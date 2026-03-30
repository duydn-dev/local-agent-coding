class VersionHistoryService {
  constructor() {
    this.snapshots = [];
  }

  save(filePath, oldContent, newContent) {
    this.snapshots.push({
      id: Date.now(),
      filePath,
      oldContent,
      newContent,
      createdAt: new Date()
    });
  }

  list() {
    return this.snapshots;
  }

  get(id) {
    return this.snapshots.find((x) => x.id == id);
  }
}

module.exports = new VersionHistoryService();

