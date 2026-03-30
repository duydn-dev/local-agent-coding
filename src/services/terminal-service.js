const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

function createTerminalService(root) {
  const procs = new Map();

  function start(cmd, args = [], opts = {}) {
    const id = uuidv4();
    const p = spawn(cmd, args, Object.assign({ cwd: opts.cwd || undefined, shell: true }, opts.spawnOptions || {}));
    const buf = [];
    const listeners = new Set();

    const push = (type, data) => {
      const entry = { type, data: String(data), ts: Date.now() };
      buf.push(entry);
      for (const cb of listeners) cb(entry);
    };

    p.stdout.on('data', (d) => push('stdout', d.toString()));
    p.stderr.on('data', (d) => push('stderr', d.toString()));
    p.on('exit', (code, sig) => push('exit', { code, sig }));
    p.on('error', (err) => push('error', err.message || String(err)));

    procs.set(id, { id, proc: p, buf, listeners, cmd, args });
    return id;
  }

  function stop(id) {
    const rec = procs.get(id);
    if (!rec) throw new Error('no such process');
    try {
      rec.proc.kill('SIGTERM');
    } catch (e) {}
    return true;
  }

  function getBuffer(id) {
    const rec = procs.get(id);
    if (!rec) return [];
    return rec.buf.slice();
  }

  function subscribe(id, cb) {
    const rec = procs.get(id);
    if (!rec) throw new Error('no such process');
    rec.listeners.add(cb);
    return () => rec.listeners.delete(cb);
  }

  return { start, stop, getBuffer, subscribe };
}

module.exports = createTerminalService;
