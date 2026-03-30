class AutosaveManager {
  constructor() {
    this.key = 'mini_cursor_draft';
  }

  save(data) {
    localStorage.setItem(
      this.key,
      JSON.stringify({
        ...data,
        savedAt: new Date().toISOString()
      })
    );
  }

  load() {
    const raw = localStorage.getItem(this.key);
    return raw ? JSON.parse(raw) : null;
  }

  clear() {
    localStorage.removeItem(this.key);
  }
}

window.autosaveManager = new AutosaveManager();

