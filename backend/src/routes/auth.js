const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Slack OAuth routes
router.get('/slack', (req, res) => {
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=chat:write,users:read,users:read.email,im:write,im:history&redirect_uri=${process.env.BASE_URL}/api/auth/slack/callback`;
  res.redirect(slackAuthUrl);
});

router.get('/slack/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.BASE_URL}/api/auth/slack/callback`
      })
    });

    const data = await response.json();

    if (data.ok) {
      // Store user info in session
      req.session.userId = data.authed_user.id;
      req.session.workspaceId = data.team.id;
      req.session.accessToken = data.access_token;

      // Redirect to frontend
      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=slack_auth_failed`);
    }
  } catch (error) {
    console.error('Slack OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
});

// Google OAuth routes (placeholder for future implementation)
router.get('/google', (req, res) => {
  res.status(501).json({ message: 'Google OAuth coming soon' });
});

// Check authentication status
router.get('/status', async (req, res) => {
  if (req.session && req.session.userId) {
    try {
      // Find user by Slack user ID
      const user = await User.findBySlackUserId(req.session.userId);

      if (user) {
        // Store database user ID in session for easier lookups
        req.session.user = {
          id: user.id,
          slack_user_id: user.slack_user_id
        };

        res.json({
          authenticated: true,
          userId: req.session.userId,
          workspaceId: req.session.workspaceId,
          user: {
            id: user.id,
            slack_user_id: user.slack_user_id,
            slack_username: user.slack_username,
            email: user.email,
            department: user.department,
            is_admin: user.is_admin,
            is_manager: user.is_manager,
            is_active: user.is_active,
            timezone: user.timezone
          }
        });
      } else {
        // User exists in session but not in database (shouldn't happen)
        res.json({ authenticated: false });
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.json({
        authenticated: true,
        userId: req.session.userId,
        workspaceId: req.session.workspaceId,
        error: 'Could not fetch user details'
      });
    }
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
