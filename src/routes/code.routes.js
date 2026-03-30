const express = require('express');
const code = require('../controllers/code.controller');

const router = express.Router();

router.get('/search', code.codeSearchHandler);
router.get('/context', code.codeContextHandler);
// alias: docs endpoint is /dependency/graph (not under /code)
router.post('/preview-edit', code.previewEdit);
router.post('/save-edit', code.saveEdit);
router.post('/diff', code.codeDiff);
router.post('/inline-action', code.inlineActionHandler);

// legacy kept
router.post('/preview', code.legacyPreview);
router.post('/apply', code.legacyApply);

module.exports = router;

