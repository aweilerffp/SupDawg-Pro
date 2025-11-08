const express = require('express');
const router = express.Router();
const Question = require('../models/Question');

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Get all questions
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const questions = await Question.findAll();
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get core questions
router.get('/core', isAuthenticated, async (req, res) => {
  try {
    const questions = await Question.getCoreQuestions();
    res.json(questions);
  } catch (error) {
    console.error('Error fetching core questions:', error);
    res.status(500).json({ error: 'Failed to fetch core questions' });
  }
});

// Get rotating questions
router.get('/rotating', isAuthenticated, async (req, res) => {
  try {
    const questions = await Question.getRotatingQuestions();
    res.json(questions);
  } catch (error) {
    console.error('Error fetching rotating questions:', error);
    res.status(500).json({ error: 'Failed to fetch rotating questions' });
  }
});

// Create new question
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const question = await Question.create(req.body);
    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Update question
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const question = await Question.update(req.params.id, req.body);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Reorder question queue
router.post('/reorder', isAuthenticated, async (req, res) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ error: 'questionIds must be an array' });
    }
    await Question.reorderQueue(questionIds);
    res.json({ message: 'Questions reordered successfully' });
  } catch (error) {
    console.error('Error reordering questions:', error);
    res.status(500).json({ error: 'Failed to reorder questions' });
  }
});

// Delete question
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const question = await Question.delete(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

module.exports = router;
