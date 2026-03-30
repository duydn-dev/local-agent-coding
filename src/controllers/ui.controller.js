function renderIndex(req, res) {
  res.render('index', { backendBase: '' });
}

module.exports = { renderIndex };

