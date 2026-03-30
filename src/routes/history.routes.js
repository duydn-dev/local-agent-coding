const express = require('express');
const history = require('../controllers/history.controller');

const router = express.Router();

router.get('/', history.list);

module.exports = router;

