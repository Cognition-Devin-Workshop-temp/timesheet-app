const express = require('express');
const {
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomState,
  randomNonce,
} = require('openid-client');
const jwt = require('jsonwebtoken');
const { getOidcConfig } = require('../config/oidc');
const { getDatabase } = require('../database/init');

const router = express.Router();

// GET /api/auth/oidc/login — redirect to OIDC provider
router.get('/login', async (req, res) => {
  try {
    const config = await getOidcConfig();

    const state = randomState();
    const nonce = randomNonce();

    req.session.oidcState = state;
    req.session.oidcNonce = nonce;

    const redirectUri =
      process.env.OIDC_REDIRECT_URI ||
      'http://localhost:3001/api/auth/oidc/callback';
    const scopes = process.env.OIDC_SCOPES || 'openid email profile';

    const authUrl = buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      nonce,
    });

    res.redirect(authUrl.href);
  } catch (error) {
    console.error('OIDC login error:', error);
    res
      .status(500)
      .json({ error: 'OIDC is not configured or failed to initialize' });
  }
});

// GET /api/auth/oidc/callback — handle redirect from OIDC provider
router.get('/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const config = await getOidcConfig();

    const currentUrl = new URL(
      `${req.protocol}://${req.get('host')}${req.originalUrl}`
    );

    const tokens = await authorizationCodeGrant(config, currentUrl, {
      expectedState: req.session.oidcState,
      expectedNonce: req.session.oidcNonce,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    const email = claims.email;

    if (!email) {
      return res.redirect(
        `${frontendUrl}/login?error=no_email_claim`
      );
    }

    // Upsert user in database
    const db = getDatabase();
    await new Promise((resolve, reject) => {
      db.get(
        'SELECT email FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) return reject(err);
          if (!row) {
            db.run('INSERT INTO users (email) VALUES (?)', [email], (insertErr) => {
              if (insertErr) return reject(insertErr);
              resolve();
            });
          } else {
            resolve();
          }
        }
      );
    });

    // Sign a JWT containing the email
    const jwtSecret =
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-this-in-production-min-32-chars';
    const token = jwt.sign({ email }, jwtSecret, { expiresIn: '24h' });

    // Clean up session OIDC state
    delete req.session.oidcState;
    delete req.session.oidcNonce;

    res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('OIDC callback error:', error);
    res.redirect(`${frontendUrl}/login?error=oidc_callback_failed`);
  }
});

module.exports = router;
