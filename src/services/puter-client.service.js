let cached = null;

function getAuthToken() {
  return process.env.PUTER_AUTH_TOKEN || process.env.PUTER_TOKEN || process.env.PUTER_API_KEY || null;
}

function initPuter(authToken) {
  // SDK provides init.cjs for Node usage
  // eslint-disable-next-line global-require
  const { init } = require('@heyputer/puter.js/src/init.cjs');
  return init(authToken);
}

function getPuter() {
  if (cached) return cached;
  const token = getAuthToken();
  if (!token) return null;
  cached = initPuter(token);
  return cached;
}

module.exports = { getPuter };

