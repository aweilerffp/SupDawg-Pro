const express = require('express');
const router = express.Router();
const WorkspaceConfig = require('../models/WorkspaceConfig');

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Get workspace configuration
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Get workspace ID from environment or use default
    const workspaceId = process.env.SLACK_WORKSPACE_ID || 'default';

    let config = await WorkspaceConfig.findByWorkspaceId(workspaceId);

    // If no config exists, create default one
    if (!config) {
      config = await WorkspaceConfig.create({
        slack_workspace_id: workspaceId,
        check_in_day: 'thursday',
        check_in_time: '14:00',
        reminder_times: ['09:00', '16:00']
      });
    }

    // Parse reminder_times if it's a string
    if (typeof config.reminder_times === 'string') {
      config.reminder_times = JSON.parse(config.reminder_times);
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Update workspace configuration
router.put('/', isAuthenticated, async (req, res) => {
  try {
    const { check_in_day, check_in_time, reminder_times } = req.body;
    const workspaceId = process.env.SLACK_WORKSPACE_ID || 'default';

    // Validate check_in_day
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (check_in_day && !validDays.includes(check_in_day.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid check_in_day. Must be a day of the week.' });
    }

    // Validate check_in_time (HH:MM format)
    if (check_in_time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(check_in_time)) {
      return res.status(400).json({ error: 'Invalid check_in_time. Must be in HH:MM format.' });
    }

    // Validate reminder_times
    if (reminder_times) {
      if (!Array.isArray(reminder_times)) {
        return res.status(400).json({ error: 'reminder_times must be an array' });
      }
      for (const time of reminder_times) {
        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
          return res.status(400).json({ error: `Invalid time format: ${time}. Must be in HH:MM format.` });
        }
      }
    }

    const updates = {};
    if (check_in_day) updates.check_in_day = check_in_day.toLowerCase();
    if (check_in_time) updates.check_in_time = check_in_time;
    if (reminder_times) updates.reminder_times = reminder_times;

    const config = await WorkspaceConfig.update(workspaceId, updates);

    // Parse reminder_times if it's a string
    if (typeof config.reminder_times === 'string') {
      config.reminder_times = JSON.parse(config.reminder_times);
    }

    res.json({
      message: 'Configuration updated successfully',
      config
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

module.exports = router;
