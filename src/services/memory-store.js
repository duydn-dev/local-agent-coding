const fs = require('fs').promises;
const path = require('path');

function createMemoryStore(root, opts = {}) {
  const dir = path.join(root, opts.dir || '.agent_data');
  const file = path.join(dir, 'memory.json');

  async function ensureDir() {
    await fs.mkdir(dir, { recursive: true });
  }

  async function load() {
    try {
      await ensureDir();
      const raw = await fs.readFile(file, 'utf8');
      return JSON.parse(raw || '[]');
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  async function save(arr) {
    await ensureDir();
    await fs.writeFile(file, JSON.stringify(arr, null, 2), 'utf8');
  }

  return {
    async loadMemory() {
      return await load();
    },
    async addMemory(item, limit = 100) {
      const arr = await load();
      arr.push(item);
      while (arr.length > limit) arr.shift();
      await save(arr);
      return arr;
    },
    async clearMemory() {
      await save([]);
      return [];
    }
  };
}

module.exports = createMemoryStore;
