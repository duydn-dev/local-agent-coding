const express = require('express');
const workspace = require('../controllers/workspace.controller');

const router = express.Router();

router.post('/load', workspace.loadWorkspace);
router.get('/current', workspace.currentWorkspace);
router.get('/tree', workspace.workspaceTree);
router.get('/tree/lazy', workspace.workspaceTreeLazy);

module.exports = router;

