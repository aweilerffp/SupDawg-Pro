const express = require('express');
const router = express.Router();
const CheckIn = require('../models/CheckIn');
const User = require('../models/User');
const db = require('../config/database');
const { requireAuth, filterAccessibleUsers } = require('../middleware/permissions');

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Get current week overview with permission filtering
router.get('/overview', requireAuth, filterAccessibleUsers, async (req, res) => {
  try {
    const { weekStartDate, managerId, department, tagIds } = req.query;
    if (!weekStartDate) {
      return res.status(400).json({ error: 'weekStartDate is required' });
    }

    // Start with accessible user IDs
    let targetUserIds = req.accessibleUserIds;

    // Apply manager filter if specified
    if (managerId) {
      const teamMembers = await User.getAllTeamMembers(parseInt(managerId));
      const teamMemberIds = teamMembers.map(m => m.id);
      // Intersect with accessible users
      targetUserIds = targetUserIds.filter(id => teamMemberIds.includes(id));
    }

    // Apply department filter if specified
    if (department) {
      const deptQuery = 'SELECT id FROM users WHERE department = $1 AND is_active = true';
      const deptResult = await db.query(deptQuery, [department]);
      const deptUserIds = deptResult.rows.map(r => r.id);
      // Intersect with current target users
      targetUserIds = targetUserIds.filter(id => deptUserIds.includes(id));
    }

    // Apply tag filter if specified
    if (tagIds) {
      const tagIdArray = Array.isArray(tagIds) ? tagIds : [tagIds];
      const tagQuery = `
        SELECT DISTINCT user_id FROM user_tags
        WHERE tag_id = ANY($1::int[])
      `;
      const tagResult = await db.query(tagQuery, [tagIdArray]);
      const tagUserIds = tagResult.rows.map(r => r.user_id);
      // Intersect with current target users
      targetUserIds = targetUserIds.filter(id => tagUserIds.includes(id));
    }

    // Get stats for filtered users
    const stats = targetUserIds.length > 0
      ? await CheckIn.getCompletionStatsForUsers(targetUserIds, weekStartDate)
      : { completed_count: 0, total_count: 0, avg_rating: null };

    const incomplete = targetUserIds.length > 0
      ? await CheckIn.getIncompleteForUsers(targetUserIds, weekStartDate)
      : [];

    res.json({
      completedCount: parseInt(stats.completed_count) || 0,
      totalCount: parseInt(stats.total_count) || 0,
      averageRating: parseFloat(stats.avg_rating) || null,
      incompleteUsers: incomplete,
      filteredUserCount: targetUserIds.length
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// Get responses with optional anonymization and permission filtering
router.get('/responses', requireAuth, filterAccessibleUsers, async (req, res) => {
  try {
    const { weekStartDate, anonymous, managerId, department, tagIds } = req.query;

    // Start with accessible user IDs
    let targetUserIds = req.accessibleUserIds;

    // Apply manager filter if specified
    if (managerId) {
      const teamMembers = await User.getAllTeamMembers(parseInt(managerId));
      const teamMemberIds = teamMembers.map(m => m.id);
      targetUserIds = targetUserIds.filter(id => teamMemberIds.includes(id));
    }

    // Apply department filter if specified
    if (department) {
      const deptQuery = 'SELECT id FROM users WHERE department = $1 AND is_active = true';
      const deptResult = await db.query(deptQuery, [department]);
      const deptUserIds = deptResult.rows.map(r => r.id);
      targetUserIds = targetUserIds.filter(id => deptUserIds.includes(id));
    }

    // Apply tag filter if specified
    if (tagIds) {
      const tagIdArray = Array.isArray(tagIds) ? tagIds : [tagIds];
      const tagQuery = `
        SELECT DISTINCT user_id FROM user_tags
        WHERE tag_id = ANY($1::int[])
      `;
      const tagResult = await db.query(tagQuery, [tagIdArray]);
      const tagUserIds = tagResult.rows.map(r => r.user_id);
      targetUserIds = targetUserIds.filter(id => tagUserIds.includes(id));
    }

    if (targetUserIds.length === 0) {
      return res.json([]);
    }

    // Build query with user ID filtering
    let query = `
      SELECT
        c.id, c.week_start_date, c.rating, c.what_went_well, c.what_didnt_go_well, c.completed_at,
        u.id as user_id, u.slack_username, u.email, u.manager_id, u.department,
        r.question_id, r.response_text, q.question_text
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN responses r ON c.id = r.check_in_id
      LEFT JOIN questions q ON r.question_id = q.id
      WHERE c.completed_at IS NOT NULL AND u.is_active = true
        AND u.id = ANY($1::int[])
    `;
    const params = [targetUserIds];
    let paramCount = 2;

    if (weekStartDate) {
      query += ` AND c.week_start_date = $${paramCount}`;
      params.push(weekStartDate);
      paramCount++;
    }

    query += ` ORDER BY c.week_start_date DESC, u.slack_username, q.is_core DESC`;

    const result = await db.query(query, params);

    // Group responses by check-in
    const checkIns = {};
    result.rows.forEach(row => {
      if (!checkIns[row.id]) {
        checkIns[row.id] = {
          id: row.id,
          weekStartDate: row.week_start_date,
          rating: row.rating,
          whatWentWell: row.what_went_well,
          whatDidntGoWell: row.what_didnt_go_well,
          completedAt: row.completed_at,
          user: anonymous === 'true' ? null : {
            id: row.user_id,
            username: row.slack_username,
            email: row.email,
            department: row.department
          },
          responses: []
        };
      }

      if (row.question_id) {
        checkIns[row.id].responses.push({
          questionId: row.question_id,
          questionText: row.question_text,
          responseText: row.response_text
        });
      }
    });

    // Convert to array and anonymize if requested
    let checkInsArray = Object.values(checkIns);

    if (anonymous === 'true') {
      checkInsArray = checkInsArray.map((checkIn, index) => ({
        ...checkIn,
        anonymousId: `Employee #${index + 1}`
      }));
    }

    res.json(checkInsArray);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// Get trends over time with permission filtering
router.get('/trends', requireAuth, filterAccessibleUsers, async (req, res) => {
  try {
    const { startDate, endDate, managerId, department, tagIds } = req.query;

    // Start with accessible user IDs
    let targetUserIds = req.accessibleUserIds;

    // Apply manager filter if specified
    if (managerId) {
      const teamMembers = await User.getAllTeamMembers(parseInt(managerId));
      const teamMemberIds = teamMembers.map(m => m.id);
      targetUserIds = targetUserIds.filter(id => teamMemberIds.includes(id));
    }

    // Apply department filter if specified
    if (department) {
      const deptQuery = 'SELECT id FROM users WHERE department = $1 AND is_active = true';
      const deptResult = await db.query(deptQuery, [department]);
      const deptUserIds = deptResult.rows.map(r => r.id);
      targetUserIds = targetUserIds.filter(id => deptUserIds.includes(id));
    }

    // Apply tag filter if specified
    if (tagIds) {
      const tagIdArray = Array.isArray(tagIds) ? tagIds : [tagIds];
      const tagQuery = `
        SELECT DISTINCT user_id FROM user_tags
        WHERE tag_id = ANY($1::int[])
      `;
      const tagResult = await db.query(tagQuery, [tagIdArray]);
      const tagUserIds = tagResult.rows.map(r => r.user_id);
      targetUserIds = targetUserIds.filter(id => tagUserIds.includes(id));
    }

    if (targetUserIds.length === 0) {
      return res.json([]);
    }

    let query = `
      SELECT
        c.week_start_date,
        COUNT(*) FILTER (WHERE c.completed_at IS NOT NULL) as completed_count,
        COUNT(*) as total_count,
        AVG(c.rating) FILTER (WHERE c.completed_at IS NOT NULL) as avg_rating
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      WHERE u.is_active = true AND c.user_id = ANY($1::int[])
    `;
    const params = [targetUserIds];
    let paramCount = 2;

    if (startDate && endDate) {
      query += ` AND c.week_start_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(startDate, endDate);
      paramCount += 2;
    }

    query += ` GROUP BY c.week_start_date ORDER BY c.week_start_date DESC`;

    const result = await db.query(query, params);

    const trends = result.rows.map(row => ({
      weekStartDate: row.week_start_date,
      completedCount: parseInt(row.completed_count) || 0,
      totalCount: parseInt(row.total_count) || 0,
      completionRate: row.total_count > 0
        ? Math.round((row.completed_count / row.total_count) * 100)
        : 0,
      averageRating: parseFloat(row.avg_rating) || null
    }));

    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Export data to CSV
router.get('/export', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT
        c.week_start_date, c.rating, c.what_went_well, c.what_didnt_go_well, c.completed_at,
        u.slack_username, u.email,
        r.response_text, q.question_text
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN responses r ON c.id = r.check_in_id
      LEFT JOIN questions q ON r.question_id = q.id
      WHERE c.completed_at IS NOT NULL AND u.is_active = true
    `;
    const params = [];

    if (startDate && endDate) {
      query += ` AND c.week_start_date BETWEEN $1 AND $2`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY c.week_start_date DESC, u.slack_username`;

    const result = await db.query(query, params);

    // Convert to CSV
    const headers = ['Week Start Date', 'Username', 'Email', 'Rating', 'What Went Well', 'What Didn\'t Go Well', 'Question', 'Response', 'Completed At'];
    const csv = [
      headers.join(','),
      ...result.rows.map(row => [
        row.week_start_date,
        row.slack_username,
        row.email,
        row.rating,
        `"${(row.what_went_well || '').replace(/"/g, '""')}"`,
        `"${(row.what_didnt_go_well || '').replace(/"/g, '""')}"`,
        `"${(row.question_text || '').replace(/"/g, '""')}"`,
        `"${(row.response_text || '').replace(/"/g, '""')}"`,
        row.completed_at
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=supdawg-export-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router;
