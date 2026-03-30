const express = require('express');
const terminal = require('../controllers/terminal.controller');

const router = express.Router();

router.post('/run', terminal.run);
router.post('/stop', terminal.stop);
router.get('/logs', terminal.logs);

module.exports = router;

