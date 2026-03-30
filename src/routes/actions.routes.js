const express = require('express');
const actions = require('../controllers/actions.controller');

const router = express.Router();

router.get('/presets', actions.presets);
router.post('/run', actions.run);

module.exports = router;

