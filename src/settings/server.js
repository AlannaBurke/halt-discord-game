/**
 * HALT Go Settings Dashboard — Express Server
 *
 * Provides:
 * - Discord OAuth2 login with role-based access control
 * - Card image upload/reset API
 * - Auto-regeneration of Discord-sized cards after upload
 */

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { CARD_INFO, CARD_TYPES } = require('../utils/constants');
const { regenerateCard } = require('./cardPipeline');

// Paths
const ASSETS_DIR = path.join(__dirname, '../../assets/cards');
const CUSTOM_DIR = path.join(__dirname, '../../assets/cards/custom');
const DISCORD_DIR = path.join(__dirname, '../../assets/cards/discord');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure directories exist
[CUSTOM_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer storage for card uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CUSTOM_DIR),
  filename: (req, file, cb) => {
    const cardId = req.params.cardId;
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${cardId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, GIF, WEBP) are allowed'));
    }
  },
});

/**
 * Create and configure the settings Express app
 * @param {Object} config - { clientId, clientSecret, redirectUri, adminRoleId, guildId, sessionSecret }
 * @returns {express.Application}
 */
function createSettingsApp(config) {
  const app = express();

  // Session middleware
  app.use(session({
    secret: config.sessionSecret || 'halt-go-settings-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }, // 1 hour
  }));

  // Serve static files (dashboard frontend)
  app.use('/static', express.static(PUBLIC_DIR));

  // Serve card images
  app.use('/cards/original', express.static(ASSETS_DIR));
  app.use('/cards/custom', express.static(CUSTOM_DIR));
  app.use('/cards/discord', express.static(DISCORD_DIR));

  // JSON body parser
  app.use(express.json());

  // ============================================================
  // Discord OAuth2 Routes
  // ============================================================

  // Login — redirect to Discord OAuth2
  app.get('/auth/login', (req, res) => {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'identify guilds.members.read',
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  });

  // OAuth2 callback
  app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/?error=no_code');

    try {
      // Exchange code for token
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
        }),
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        console.error('OAuth token error:', tokenData);
        return res.redirect('/?error=token_failed');
      }

      // Get user info
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const user = await userRes.json();

      // Check guild membership and role
      const memberRes = await fetch(
        `https://discord.com/api/users/@me/guilds/${config.guildId}/member`,
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );

      if (!memberRes.ok) {
        return res.redirect('/?error=not_in_guild');
      }

      const member = await memberRes.json();
      const hasRole = member.roles && member.roles.includes(config.adminRoleId);

      if (!hasRole) {
        return res.redirect('/?error=no_role');
      }

      // Store session
      req.session.user = {
        id: user.id,
        username: user.username,
        globalName: user.global_name || user.username,
        avatar: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : null,
      };
      req.session.authenticated = true;

      res.redirect('/');
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/?error=auth_failed');
    }
  });

  // Logout
  app.get('/auth/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });

  // Get current auth status
  app.get('/api/auth', (req, res) => {
    if (req.session.authenticated) {
      res.json({ authenticated: true, user: req.session.user });
    } else {
      res.json({ authenticated: false });
    }
  });

  // ============================================================
  // Auth Middleware
  // ============================================================
  function requireAuth(req, res, next) {
    if (req.session.authenticated) {
      return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
  }

  // ============================================================
  // Card API Routes
  // ============================================================

  // Get all cards with their current status
  app.get('/api/cards', requireAuth, (req, res) => {
    const cards = Object.entries(CARD_INFO).map(([id, info]) => {
      const customPath = getCustomImagePath(id);
      const hasCustom = customPath !== null;

      return {
        id,
        name: info.name,
        emoji: info.emoji,
        description: info.description,
        color: info.color,
        hasCustomImage: hasCustom,
        originalImage: `/cards/original/${info.image}`,
        customImage: hasCustom ? `/cards/custom/${path.basename(customPath)}` : null,
        discordImage: `/cards/discord/${id}.png`,
      };
    });

    res.json({ cards });
  });

  // Upload a custom image for a card
  app.post('/api/cards/:cardId/upload', requireAuth, upload.single('image'), async (req, res) => {
    const { cardId } = req.params;

    if (!CARD_INFO[cardId]) {
      return res.status(400).json({ error: 'Invalid card ID' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    try {
      // Regenerate the Discord-sized card with the new custom image
      await regenerateCard(cardId);

      // Clear the cardRenderer cache so the bot picks up the new image
      clearCardCache();

      res.json({
        success: true,
        message: `Custom image uploaded for ${CARD_INFO[cardId].name}`,
        customImage: `/cards/custom/${req.file.filename}`,
        discordImage: `/cards/discord/${cardId}.png?t=${Date.now()}`,
      });
    } catch (error) {
      console.error(`Error processing card upload for ${cardId}:`, error);
      res.status(500).json({ error: 'Failed to process uploaded image' });
    }
  });

  // Reset a card to default image
  app.post('/api/cards/:cardId/reset', requireAuth, async (req, res) => {
    const { cardId } = req.params;

    if (!CARD_INFO[cardId]) {
      return res.status(400).json({ error: 'Invalid card ID' });
    }

    try {
      // Remove custom image
      const customPath = getCustomImagePath(cardId);
      if (customPath) {
        fs.unlinkSync(customPath);
      }

      // Regenerate Discord card from original
      await regenerateCard(cardId);

      // Clear the cardRenderer cache
      clearCardCache();

      res.json({
        success: true,
        message: `${CARD_INFO[cardId].name} reset to default image`,
        discordImage: `/cards/discord/${cardId}.png?t=${Date.now()}`,
      });
    } catch (error) {
      console.error(`Error resetting card ${cardId}:`, error);
      res.status(500).json({ error: 'Failed to reset card' });
    }
  });

  // ============================================================
  // Serve the dashboard SPA
  // ============================================================

  // Read the dashboard HTML once at startup (avoids Express 5 sendFile issues)
  const DASHBOARD_HTML_PATH = path.resolve(PUBLIC_DIR, 'index.html');
  let dashboardHtml = '';
  try {
    dashboardHtml = fs.readFileSync(DASHBOARD_HTML_PATH, 'utf-8');
    console.log(`📄 Dashboard HTML loaded (${dashboardHtml.length} bytes)`);
  } catch (err) {
    console.error('Failed to load dashboard HTML:', err.message);
  }

  app.get('/', (req, res) => {
    if (!dashboardHtml) {
      return res.status(500).send('Dashboard HTML not found. Check server logs.');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(dashboardHtml);
  });

  // Error handler (required for Express 5 to prevent hanging responses)
  app.use((err, req, res, next) => {
    console.error('Settings server error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Find a custom image for a card (checking multiple extensions)
 */
function getCustomImagePath(cardId) {
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  for (const ext of extensions) {
    const p = path.join(CUSTOM_DIR, `${cardId}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Clear the cardRenderer image cache so new images are picked up
 */
function clearCardCache() {
  try {
    const renderer = require('../ui/cardRenderer');
    if (renderer._clearCache) {
      renderer._clearCache();
    }
  } catch (e) {
    // cardRenderer may not be loaded yet
  }
}

module.exports = { createSettingsApp, getCustomImagePath };
