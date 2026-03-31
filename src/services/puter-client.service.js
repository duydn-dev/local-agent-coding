let cached = null;
let cachedToken = null;
let cachedPromise = null;
let runtimeToken = null;

function setRuntimeToken(token) {
  const t = (token || '').toString().trim();
  runtimeToken = t || null;
  // force re-init on next getPuter()
  cached = null;
  cachedToken = null;
}

function getAuthToken() {
  // Puter docs (Node.js) commonly use env key `puterAuthToken`
  return (
    runtimeToken ||
    process.env.PUTER_AUTH_TOKEN ||
    process.env.puterAuthToken ||
    process.env.PUTER_TOKEN ||
    process.env.PUTER_API_KEY ||
    null
  );
}

function loadNodeInit() {
  // SDK provides init.cjs for Node usage
  // eslint-disable-next-line global-require
  return require('@heyputer/puter.js/src/init.cjs');
}

function initPuter(authToken) {
  const { init } = loadNodeInit();
  return init(authToken);
}

async function getPuter() {
  // Single-flight: avoid opening multiple auth flows concurrently
  if (cachedPromise) return cachedPromise;
  cachedPromise = (async () => {
    let token = getAuthToken();

    // If no env token, try browser-based auth for local dev/CLI
    if (!token) {
      try {
        const { getAuthToken: getAuthTokenInteractive } = loadNodeInit();
        if (typeof getAuthTokenInteractive === 'function') {
          token = await getAuthTokenInteractive();
        }
      } catch (e) {
        // ignore; will return null below
      }
    }

    if (!token) {
      cached = null;
      cachedToken = null;
      return null;
    }

    // If token changes, re-init instead of returning stale instance
    if (cached && cachedToken === token) return cached;
    cached = initPuter(token);
    cachedToken = token;
    return cached;
  })();

  try {
    return await cachedPromise;
  } finally {
    cachedPromise = null;
  }
}

module.exports = { getPuter, setRuntimeToken };

