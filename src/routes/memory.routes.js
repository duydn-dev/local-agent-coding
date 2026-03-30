const express = require('express');
const memory = require('../controllers/memory.controller');

const router = express.Router();

router.get('/', memory.getMemory);
router.post('/', memory.addMemory);
router.delete('/', memory.clearMemory);

module.exports = router;

