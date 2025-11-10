const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CheckIn = require('../models/CheckIn');
const { requireAuth, canViewUser, filterAccessibleUsers } = require('../middleware/permissions');

// Middleware to check authentication (legacy - keeping for backwards compatibility)
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Get all users
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const user = await User.update(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get direct reports for a manager
router.get('/:id/direct-reports', isAuthenticated, async (req, res) => {
  try {
    const reports = await User.getDirectReports(req.params.id);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching direct reports:', error);
    res.status(500).json({ error: 'Failed to fetch direct reports' });
  }
});

// Deactivate user
router.post('/:id/deactivate', isAuthenticated, async (req, res) => {
  try {
    const user = await User.deactivate(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

/**
 * GET /users/:id/details
 * Get user with manager info and tags
 */
router.get('/:id/details', canViewUser, async (req, res) => {
  try {
    const userId = req.targetUserId;
    const user = await User.findByIdWithDetails(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

/**
 * GET /users/:id/team
 * Get all team members (direct and indirect reports) for a manager
 */
router.get('/:id/team', canViewUser, async (req, res) => {
  try {
    const managerId = req.targetUserId;
    const manager = await User.findById(managerId);

    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    const teamMembers = await User.getAllTeamMembers(managerId);
    const directReports = await User.getDirectReports(managerId);

    res.json({
      manager: {
        id: manager.id,
        slack_username: manager.slack_username,
        email: manager.email,
        department: manager.department
      },
      team_size: teamMembers.length,
      direct_reports_count: directReports.length,
      team_members: teamMembers,
      direct_reports: directReports
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

/**
 * GET /users/:id/stats
 * Get individual user stats and trends
 */
router.get('/:id/stats', canViewUser, async (req, res) => {
  try {
    const userId = req.targetUserId;
    const { startDate, endDate } = req.query;

    const user = await User.findByIdWithDetails(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get summary stats
    const summary = await CheckIn.getUserSummary(userId);

    // Calculate date range for trends (default: last 12 weeks)
    let trendsStartDate = startDate;
    let trendsEndDate = endDate;

    if (!trendsStartDate || !trendsEndDate) {
      const now = new Date();
      trendsEndDate = now.toISOString().split('T')[0];

      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - (12 * 7));
      trendsStartDate = twelveWeeksAgo.toISOString().split('T')[0];
    }

    // Get trends data
    const trends = await CheckIn.getTrendsForUser(userId, trendsStartDate, trendsEndDate);

    // Get all check-ins with responses
    const checkIns = await CheckIn.getResponsesWithDetails({
      userIds: [userId]
    });

    res.json({
      user: {
        id: user.id,
        slack_username: user.slack_username,
        email: user.email,
        department: user.department,
        manager_name: user.manager_name,
        tags: user.tags
      },
      summary: {
        total_checkins: parseInt(summary.total_checkins) || 0,
        completed_checkins: parseInt(summary.completed_checkins) || 0,
        completion_rate: summary.total_checkins > 0
          ? ((summary.completed_checkins / summary.total_checkins) * 100).toFixed(1)
          : '0',
        avg_rating: summary.avg_rating ? parseFloat(summary.avg_rating).toFixed(1) : null,
        first_checkin_date: summary.first_checkin_date,
        last_checkin_date: summary.last_checkin_date
      },
      trends: trends.map(t => ({
        week_start_date: t.week_start_date,
        rating: t.rating,
        completed: t.completed === 1
      })),
      recent_checkins: checkIns.slice(0, 10),  // Last 10 check-ins
      date_range: {
        start: trendsStartDate,
        end: trendsEndDate
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

/**
 * GET /users/:id/responses
 * Get all responses for a user (for detailed view)
 */
router.get('/:id/responses', canViewUser, async (req, res) => {
  try {
    const userId = req.targetUserId;
    const { limit, offset } = req.query;

    const checkIns = await CheckIn.getResponsesWithDetails({
      userIds: [userId]
    });

    // Apply pagination if specified
    const startIdx = offset ? parseInt(offset) : 0;
    const endIdx = limit ? startIdx + parseInt(limit) : checkIns.length;
    const paginatedCheckIns = checkIns.slice(startIdx, endIdx);

    res.json({
      responses: paginatedCheckIns,
      total: checkIns.length,
      limit: limit ? parseInt(limit) : checkIns.length,
      offset: startIdx
    });
  } catch (error) {
    console.error('Error fetching user responses:', error);
    res.status(500).json({ error: 'Failed to fetch user responses' });
  }
});

/**
 * GET /users/accessible
 * Get all users accessible to the current viewer (based on permissions)
 */
router.get('/accessible/list', filterAccessibleUsers, async (req, res) => {
  try {
    const accessibleUsers = await User.getAccessibleUsers(req.user.id);
    res.json({ users: accessibleUsers });
  } catch (error) {
    console.error('Error fetching accessible users:', error);
    res.status(500).json({ error: 'Failed to fetch accessible users' });
  }
});

module.exports = router;
