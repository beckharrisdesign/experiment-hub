/**
 * Shared Notion authentication for the hub app and experiment prototypes.
 *
 * Two paths, in order:
 *
 *   1. NOTION_TOKEN in the environment — an internal integration token. This is
 *      the path that works on Vercel and on a local machine.
 *   2. The Replit connector — an OAuth connection managed by Replit. Only works
 *      inside a Replit container, where REPLIT_CONNECTORS_HOSTNAME and a repl
 *      identity are present.
 *
 * Plain ESM JavaScript on purpose: the hub is TypeScript (tsconfig sets
 * allowJs) but experiment prototypes are plain Node with no build step, and
 * both need this. Keep it dependency-free.
 */

let connectionSettings;

/** True when the Replit connector path is usable in this environment. */
export function hasReplitConnector() {
  return Boolean(
    process.env.REPLIT_CONNECTORS_HOSTNAME &&
      (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL)
  );
}

/**
 * True when either auth path is available.
 *
 * Synchronous, so callers can gate a feature without attempting a fetch — the
 * hub uses this to decide whether Notion is a usable data source at all before
 * falling through to Supabase or the JSON snapshot.
 */
export function hasNotionAuth() {
  return Boolean(process.env.NOTION_TOKEN) || hasReplitConnector();
}

async function getConnectorToken() {
  if (
    connectionSettings?.settings?.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  if (!hostname) {
    throw new Error('REPLIT_CONNECTORS_HOSTNAME not configured');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=notion',
    {
      headers: {
        Accept: 'application/json',
        X_REPLIT_TOKEN: xReplitToken
      }
    }
  )
    .then(res => res.json())
    .then(data => data.items?.[0]);

  if (!connectionSettings) {
    throw new Error('Notion not connected. Please set up the Notion integration first.');
  }

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('Notion access token not found. Please reconnect the Notion integration.');
  }

  return accessToken;
}

/**
 * Resolve a Notion access token, preferring a direct token over the connector.
 *
 * @returns {Promise<string>}
 */
export async function resolveNotionToken() {
  if (process.env.NOTION_TOKEN) {
    return process.env.NOTION_TOKEN;
  }

  if (!hasReplitConnector()) {
    throw new Error(
      'No Notion credentials. Set NOTION_TOKEN, or run inside Replit where the ' +
        'Notion connector is configured. The connector token cannot be used outside Replit.'
    );
  }

  return getConnectorToken();
}

/**
 * Build an authenticated Notion client. Requires @notionhq/client in the
 * consuming package.
 *
 * @param {{ Client: new (options: { auth: string }) => unknown }} clientModule
 * @returns {Promise<unknown>}
 */
export async function createNotionClient(clientModule) {
  const token = await resolveNotionToken();
  return new clientModule.Client({ auth: token });
}

/** Reset the cached connector response. Intended for tests. */
export function clearNotionAuthCache() {
  connectionSettings = undefined;
}
