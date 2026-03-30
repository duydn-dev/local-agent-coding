const express = require('express');
const ai = require('../controllers/ai.controller');

const router = express.Router();

router.get('/models', ai.listModels);

module.exports = router;

