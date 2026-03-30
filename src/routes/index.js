const uiRoutes = require('./ui.routes');
const workspaceRoutes = require('./workspace.routes');
const filesRoutes = require('./files.routes');
const codeRoutes = require('./code.routes');
const gitRoutes = require('./git.routes');
const terminalRoutes = require('./terminal.routes');
const actionsRoutes = require('./actions.routes');
const debugRoutes = require('./debug.routes');
const memoryRoutes = require('./memory.routes');
const chatRoutes = require('./chat.routes');
const chat = require('../controllers/chat.controller');
const historyRoutes = require('./history.routes');
const dependencyRoutes = require('./dependency.routes');
const aiRoutes = require('./ai.routes');

function mountRoutes(app) {
  app.use('/', uiRoutes);
  app.use('/workspace', workspaceRoutes);
  app.use('/files', filesRoutes);
  app.use('/code', codeRoutes); // /code/search, /code/context, /code/preview-edit, ...
  app.use('/dependency', dependencyRoutes);
  app.use('/git', gitRoutes);
  app.use('/terminal', terminalRoutes);
  app.use('/actions', actionsRoutes);
  app.use('/debug', debugRoutes);
  app.use('/memory', memoryRoutes);
  app.use('/ai', aiRoutes);

  // keep existing top-level endpoints used by frontend/docs
  app.use('/chat', chatRoutes); // /chat/clear
  app.post('/agent/stream', chat.streamAgent);
  app.use('/history', historyRoutes);
}

module.exports = { mountRoutes };

