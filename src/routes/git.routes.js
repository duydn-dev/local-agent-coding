const express = require('express');
const git = require('../controllers/git.controller');

const router = express.Router();

router.get('/status', git.status);
router.get('/diff', git.diff);
router.post('/commit', git.commit);
router.post('/rollback', git.rollback);

module.exports = router;

