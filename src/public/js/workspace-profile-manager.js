class WorkspaceProfileManager {
  constructor() {
    this.key = 'workspace_profiles';
  }

  getAll() {
    return JSON.parse(localStorage.getItem(this.key) || '[]');
  }

  saveAll(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
  }

  add(profile) {
    const items = this.getAll();
    items.push(profile);
    this.saveAll(items);
  }

  setLastActive(id) {
    const items = this.getAll().map((x) => ({
      ...x,
      isLastActive: x.id === id
    }));
    this.saveAll(items);
  }
}

window.workspaceProfileManager = new WorkspaceProfileManager();

