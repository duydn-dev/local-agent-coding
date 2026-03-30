const express = require('express');
const debug = require('../controllers/debug.controller');

const router = express.Router();

router.get('/analyze', debug.analyze);

module.exports = router;

