const express = require('express');
const router = express.Router();
const { sendCheckIn } = require('../services/slackBot');

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Trigger a test check-in for a specific user
router.post('/trigger-checkin', isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await sendCheckIn(userId, 'default');

    if (result.alreadyCompleted) {
      return res.json({ message: 'User already completed check-in for this week' });
    }

    res.json({ message: 'Check-in sent successfully', checkInId: result.checkInId });
  } catch (error) {
    console.error('Error triggering check-in:', error);
    res.status(500).json({ error: 'Failed to send check-in', details: error.message });
  }
});

module.exports = router;
