require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
let _server = null;

const workspaceService = require('./services/workspace.service');
const codeContext = require('./services/code-context.service');
const { mountRoutes } = require('./routes');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Views (EJS) + static assets
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  app.use('/public', express.static(path.join(__dirname, 'public')));

  // Workspace root can be updated (Step 1).
  const initialRoot = process.env.WORKSPACE_ROOT || process.cwd();
  workspaceService.setWorkspaceRoot(initialRoot);
  codeContext.setWorkspace(initialRoot);

  mountRoutes(app);

  return app;
}

function start() {
  if (_server) {
    return _server;
  }
  const PORT = process.env.PORT || 5173;
  const app = createApp();
  _server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (workspace root: ${workspaceService.getWorkspaceRoot()})`);
  });

  _server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Another process is already running.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });

  return _server;
}

module.exports = { createApp, start };

if (require.main === module) {
  start();
}
