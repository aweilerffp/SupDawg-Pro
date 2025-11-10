const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/permissions');
const { app: slackApp } = require('../services/slackBot');
const User = require('../models/User');

/**
 * Get all users from Slack workspace
 * Returns list of workspace members with their details
 */
router.get('/workspace-users', requireAdmin, async (req, res) => {
  try {
    console.log('Fetching workspace users from Slack...');

    // Fetch all users from Slack using users.list API
    // This uses cursor-based pagination
    let allUsers = [];
    let cursor = undefined;

    do {
      const result = await slackApp.client.users.list({
        limit: 200,
        cursor: cursor
      });

      if (!result.ok) {
        throw new Error('Failed to fetch users from Slack');
      }

      // Filter out bots and deleted users
      const realUsers = result.members.filter(member =>
        !member.is_bot &&
        !member.deleted &&
        member.id !== 'USLACKBOT'
      );

      allUsers = allUsers.concat(realUsers);
      cursor = result.response_metadata?.next_cursor;

    } while (cursor);

    console.log(`Found ${allUsers.length} users in Slack workspace`);

    // Get all existing users from our database
    const existingUsers = await User.findAll(false); // Get all users, including inactive
    const existingSlackIds = new Set(existingUsers.map(u => u.slack_user_id));

    // Format users for frontend
    const formattedUsers = allUsers.map(member => ({
      slack_user_id: member.id,
      slack_username: member.name,
      real_name: member.real_name || member.name,
      email: member.profile?.email || null,
      display_name: member.profile?.display_name || member.name,
      avatar: member.profile?.image_72 || member.profile?.image_48,
      title: member.profile?.title || null,
      is_admin: member.is_admin || false,
      is_owner: member.is_owner || false,
      timezone: member.tz || 'America/New_York',
      already_added: existingSlackIds.has(member.id)
    }));

    // Sort: not added first, then alphabetically by real name
    formattedUsers.sort((a, b) => {
      if (a.already_added === b.already_added) {
        return (a.real_name || a.slack_username).localeCompare(b.real_name || b.slack_username);
      }
      return a.already_added ? 1 : -1;
    });

    res.json({
      users: formattedUsers,
      total: formattedUsers.length,
      already_added_count: formattedUsers.filter(u => u.already_added).length
    });

  } catch (error) {
    console.error('Error fetching workspace users:', error);
    res.status(500).json({
      error: 'Failed to fetch workspace users',
      details: error.message
    });
  }
});

module.exports = router;
