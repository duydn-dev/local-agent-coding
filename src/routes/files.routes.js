const express = require('express');
const files = require('../controllers/files.controller');

const router = express.Router();

router.get('/read', files.readFile);
router.post('/write', files.writeFile);
router.post('/select', files.selectFile);

module.exports = router;

