const express = require('express');
const router = express.Router();
const CheckIn = require('../models/CheckIn');
const Response = require('../models/Response');

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Get all check-ins with optional filters
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { weekStartDate, userId, startDate, endDate } = req.query;
    const filters = {};

    if (weekStartDate) filters.weekStartDate = weekStartDate;
    if (userId) filters.userId = userId;
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    const checkIns = await CheckIn.getAllCheckIns(filters);
    res.json(checkIns);
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    res.status(500).json({ error: 'Failed to fetch check-ins' });
  }
});

// Get check-in by ID with responses
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const checkIn = await CheckIn.findById(req.params.id);
    if (!checkIn) {
      return res.status(404).json({ error: 'Check-in not found' });
    }

    const responses = await Response.findByCheckInId(req.params.id);
    res.json({ ...checkIn, responses });
  } catch (error) {
    console.error('Error fetching check-in:', error);
    res.status(500).json({ error: 'Failed to fetch check-in' });
  }
});

// Get incomplete check-ins for a specific week
router.get('/week/:weekStartDate/incomplete', isAuthenticated, async (req, res) => {
  try {
    const incomplete = await CheckIn.getIncompleteForWeek(req.params.weekStartDate);
    res.json(incomplete);
  } catch (error) {
    console.error('Error fetching incomplete check-ins:', error);
    res.status(500).json({ error: 'Failed to fetch incomplete check-ins' });
  }
});

// Get completion stats for a week
router.get('/week/:weekStartDate/stats', isAuthenticated, async (req, res) => {
  try {
    const stats = await CheckIn.getCompletionStatsForWeek(req.params.weekStartDate);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get check-ins for a manager's direct reports
router.get('/manager/:managerId', isAuthenticated, async (req, res) => {
  try {
    const { weekStartDate } = req.query;
    const checkIns = await CheckIn.getCheckInsForManager(req.params.managerId, weekStartDate);
    res.json(checkIns);
  } catch (error) {
    console.error('Error fetching manager check-ins:', error);
    res.status(500).json({ error: 'Failed to fetch check-ins' });
  }
});

module.exports = router;
