const express = require('express');
const code = require('../controllers/code.controller');

const router = express.Router();

router.get('/graph', code.dependencyGraph);

module.exports = router;

