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
    const activeOnly = req.query.activeOnly === 'false' ? false : true;
    const questions = await Question.findAll(activeOnly);
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
    // If trying to change question_type, validate it first
    if (req.body.question_type) {
      const validation = await Question.validateTypeChange(req.params.id, req.body.question_type);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }

      // Automatically update is_core flag when question_type changes
      const coreTypes = ['rating', 'what_went_well', 'what_didnt_go_well'];
      req.body.is_core = coreTypes.includes(req.body.question_type);
    }

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

// Change question type (convert between core and rotating)
router.patch('/:id/type', isAuthenticated, async (req, res) => {
  try {
    const { question_type } = req.body;
    const validTypes = ['rating', 'what_went_well', 'what_didnt_go_well', 'rotating'];

    if (!question_type || !validTypes.includes(question_type)) {
      return res.status(400).json({
        error: 'Invalid question_type. Must be one of: rating, what_went_well, what_didnt_go_well, rotating'
      });
    }

    // Validate the type change
    const validation = await Question.validateTypeChange(req.params.id, question_type);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }

    // Update question type and is_core flag
    const coreTypes = ['rating', 'what_went_well', 'what_didnt_go_well'];
    const updates = {
      question_type,
      is_core: coreTypes.includes(question_type),
      queue_position: question_type === 'rotating' ? null : null // Will be set by reorder if needed
    };

    const question = await Question.update(req.params.id, updates);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({
      message: 'Question type changed successfully',
      question
    });
  } catch (error) {
    console.error('Error changing question type:', error);
    res.status(500).json({ error: 'Failed to change question type' });
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
