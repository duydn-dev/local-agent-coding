const express = require('express');
const chat = require('../controllers/chat.controller');

const router = express.Router();

router.post('/clear', chat.clearChat);
router.post('/stream', chat.streamAgent);

module.exports = router;

