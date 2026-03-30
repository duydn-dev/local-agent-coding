const { spawn } = require('child_process');
const codeContext = require('./code-context.service');

class TerminalService {
  constructor() {
    this.currentProcess = null;
    this.logs = [];
  }

  run(command, args = [], onChunk) {
    this.stop();
    this.logs = [];

    this.currentProcess = spawn(command, args, {
      cwd: codeContext.workspaceRoot,
      shell: true
    });

    this.currentProcess.stdout.on('data', (data) => {
      const text = data.toString();
      this.logs.push(text);
      onChunk({ type: 'stdout', content: text });
    });

    this.currentProcess.stderr.on('data', (data) => {
      const text = data.toString();
      this.logs.push(text);
      onChunk({ type: 'stderr', content: text });
    });

    this.currentProcess.on('close', (code) => {
      onChunk({
        type: 'exit',
        content: `Process exited with code ${code}`
      });
      this.currentProcess = null;
    });
  }

  stop() {
    if (this.currentProcess) {
      try {
        this.currentProcess.kill();
      } catch (e) {}
      this.currentProcess = null;
    }
  }

  getLogs() {
    return this.logs.slice(-200);
  }
}

module.exports = new TerminalService();

