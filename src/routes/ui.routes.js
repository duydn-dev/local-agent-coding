const express = require('express');
const ui = require('../controllers/ui.controller');

const router = express.Router();

router.get('/', ui.renderIndex);

module.exports = router;

