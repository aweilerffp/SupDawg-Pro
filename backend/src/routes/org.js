const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CheckIn = require('../models/CheckIn');
const { requireAuth, filterAccessibleUsers } = require('../middleware/permissions');

/**
 * GET /api/org/hierarchy
 * Get organization hierarchy tree with stats
 */
router.get('/hierarchy', requireAuth, filterAccessibleUsers, async (req, res) => {
  try {
    const { managerId } = req.query;
    const viewerId = req.user.id;

    // If manager ID specified, verify viewer can see that manager's team
    if (managerId) {
      const targetManagerId = parseInt(managerId);
      if (!req.accessibleUserIds.includes(targetManagerId)) {
        return res.status(403).json({ error: 'You do not have permission to view this team' });
      }
    }

    // Get hierarchy tree
    const hierarchyNodes = await User.getHierarchyTree(managerId ? parseInt(managerId) : null);

    // Filter to only accessible users
    const filteredNodes = hierarchyNodes.filter(node =>
      req.accessibleUserIds.includes(node.id)
    );

    // Get current week for stats
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartDate = weekStart.toISOString().split('T')[0];

    // Get stats for each node
    const nodesWithStats = await Promise.all(filteredNodes.map(async (node) => {
      // Get team members (direct and indirect reports)
      const teamMembers = await User.getAllTeamMembers(node.id);
      const teamMemberIds = teamMembers.map(m => m.id);

      // Get stats for this manager's team
      const stats = teamMemberIds.length > 0
        ? await CheckIn.getCompletionStatsForUsers(teamMemberIds, weekStartDate)
        : { completed_count: 0, total_count: 0, avg_rating: null };

      return {
        ...node,
        team_size: teamMemberIds.length,
        completed_count: parseInt(stats.completed_count) || 0,
        total_count: parseInt(stats.total_count) || 0,
        completion_rate: stats.total_count > 0
          ? ((stats.completed_count / stats.total_count) * 100).toFixed(1)
          : '0',
        avg_rating: stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : null
      };
    }));

    // Build tree structure
    const buildTree = (nodes, parentId = null, depth = 0) => {
      return nodes
        .filter(node => {
          if (parentId === null) {
            return node.manager_id === null || !nodes.some(n => n.id === node.manager_id);
          }
          return node.manager_id === parentId;
        })
        .map(node => ({
          ...node,
          depth,
          children: buildTree(nodes, node.id, depth + 1)
        }));
    };

    const tree = buildTree(nodesWithStats);

    res.json({ tree, weekStartDate });
  } catch (error) {
    console.error('Error fetching org hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch organization hierarchy' });
  }
});

/**
 * GET /api/org/node/:managerId
 * Get stats for a specific manager's team (direct and indirect reports)
 */
router.get('/node/:managerId', requireAuth, filterAccessibleUsers, async (req, res) => {
  try {
    const managerId = parseInt(req.params.managerId);

    // Verify viewer can see this manager
    if (!req.accessibleUserIds.includes(managerId)) {
      return res.status(403).json({ error: 'You do not have permission to view this team' });
    }

    const manager = await User.findById(managerId);
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    // Get all team members (direct and indirect)
    const teamMembers = await User.getAllTeamMembers(managerId);
    const directReports = await User.getDirectReports(managerId);

    // Get current week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartDate = weekStart.toISOString().split('T')[0];

    // Get stats
    const teamMemberIds = teamMembers.map(m => m.id);
    const stats = teamMemberIds.length > 0
      ? await CheckIn.getCompletionStatsForUsers(teamMemberIds, weekStartDate)
      : { completed_count: 0, total_count: 0, avg_rating: null };

    res.json({
      manager: {
        id: manager.id,
        slack_username: manager.slack_username,
        email: manager.email,
        department: manager.department
      },
      team_size: teamMembers.length,
      direct_reports_count: directReports.length,
      stats: {
        completed_count: parseInt(stats.completed_count) || 0,
        total_count: parseInt(stats.total_count) || 0,
        completion_rate: stats.total_count > 0
          ? ((stats.completed_count / stats.total_count) * 100).toFixed(1)
          : '0',
        avg_rating: stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : null
      },
      team_members: teamMembers,
      weekStartDate
    });
  } catch (error) {
    console.error('Error fetching team node:', error);
    res.status(500).json({ error: 'Failed to fetch team data' });
  }
});

/**
 * GET /api/org/stats/by-manager
 * Get stats grouped by manager
 */
router.get('/stats/by-manager', requireAuth, filterAccessibleUsers, async (req, res) => {
  try {
    const { weekStartDate } = req.query;

    // Use current week if not specified
    let targetDate = weekStartDate;
    if (!targetDate) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);
      targetDate = weekStart.toISOString().split('T')[0];
    }

    // Get stats grouped by manager
    const stats = await CheckIn.getStatsGroupedByManager(targetDate);

    // Filter to only managers the viewer can see
    const filteredStats = stats.filter(stat =>
      req.accessibleUserIds.includes(stat.manager_id)
    );

    res.json({ stats: filteredStats, weekStartDate: targetDate });
  } catch (error) {
    console.error('Error fetching stats by manager:', error);
    res.status(500).json({ error: 'Failed to fetch manager stats' });
  }
});

/**
 * GET /api/org/stats/by-department
 * Get stats grouped by department
 */
router.get('/stats/by-department', requireAuth, async (req, res) => {
  try {
    const { weekStartDate } = req.query;

    // Use current week if not specified
    let targetDate = weekStartDate;
    if (!targetDate) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(now.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);
      targetDate = weekStart.toISOString().split('T')[0];
    }

    // Get stats grouped by department
    const stats = await CheckIn.getStatsGroupedByDepartment(targetDate);

    res.json({ stats, weekStartDate: targetDate });
  } catch (error) {
    console.error('Error fetching stats by department:', error);
    res.status(500).json({ error: 'Failed to fetch department stats' });
  }
});

module.exports = router;
