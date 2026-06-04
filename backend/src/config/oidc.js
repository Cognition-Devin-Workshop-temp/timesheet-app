const { discovery } = require('openid-client');

let oidcConfig = null;

async function getOidcConfig() {
  if (oidcConfig) return oidcConfig;

  const issuerUrl = process.env.OIDC_ISSUER_URL;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;

  if (!issuerUrl || !clientId || !clientSecret) {
    throw new Error(
      'OIDC is not configured. Set OIDC_ISSUER_URL, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET environment variables.'
    );
  }

  oidcConfig = await discovery(new URL(issuerUrl), clientId, clientSecret);
  return oidcConfig;
}

module.exports = { getOidcConfig };
