const versionHistory = require('../services/version-history.service');

function list(req, res) {
  res.json(versionHistory.list());
}

module.exports = { list };

