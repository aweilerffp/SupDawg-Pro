const express = require('express');
const router = express.Router();
const db = require('../config/database');
const User = require('../models/User');
const { requireAuth, canManageTags, canEditUser } = require('../middleware/permissions');

/**
 * GET /api/tags
 * Get all available tags
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const query = 'SELECT * FROM tags ORDER BY name';
    const result = await db.query(query);
    res.json({ tags: result.rows });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

/**
 * POST /api/tags
 * Create a new tag (admin only)
 */
router.post('/', canManageTags, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const query = `
      INSERT INTO tags (name, color)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await db.query(query, [name, color || '#3B82F6']);

    res.status(201).json({ tag: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {  // Unique violation
      return res.status(400).json({ error: 'Tag name already exists' });
    }
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

/**
 * PUT /api/tags/:id
 * Update a tag (admin only)
 */
router.put('/:id', canManageTags, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (color !== undefined) {
      updates.push(`color = $${paramCount}`);
      values.push(color);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE tags
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ tag: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {  // Unique violation
      return res.status(400).json({ error: 'Tag name already exists' });
    }
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag (admin only)
 */
router.delete('/:id', canManageTags, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete tag (cascade will handle user_tags)
    const query = 'DELETE FROM tags WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

/**
 * GET /api/tags/user/:userId
 * Get tags for a specific user
 */
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const tags = await User.getTags(parseInt(userId));
    res.json({ tags });
  } catch (error) {
    console.error('Error fetching user tags:', error);
    res.status(500).json({ error: 'Failed to fetch user tags' });
  }
});

/**
 * POST /api/tags/user/:userId
 * Add a tag to a user
 */
router.post('/user/:userId', canEditUser, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { tagId } = req.body;

    if (!tagId) {
      return res.status(400).json({ error: 'Tag ID is required' });
    }

    // Verify tag exists
    const tagQuery = 'SELECT * FROM tags WHERE id = $1';
    const tagResult = await db.query(tagQuery, [tagId]);

    if (tagResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    await User.addTag(userId, tagId);

    // Get updated tags list
    const tags = await User.getTags(userId);

    res.json({ tags });
  } catch (error) {
    console.error('Error adding tag to user:', error);
    res.status(500).json({ error: 'Failed to add tag to user' });
  }
});

/**
 * DELETE /api/tags/user/:userId/:tagId
 * Remove a tag from a user
 */
router.delete('/user/:userId/:tagId', canEditUser, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const tagId = parseInt(req.params.tagId);

    await User.removeTag(userId, tagId);

    // Get updated tags list
    const tags = await User.getTags(userId);

    res.json({ tags });
  } catch (error) {
    console.error('Error removing tag from user:', error);
    res.status(500).json({ error: 'Failed to remove tag from user' });
  }
});

/**
 * GET /api/tags/departments
 * Get list of all departments from users
 */
router.get('/departments/list', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT department
      FROM users
      WHERE department IS NOT NULL AND is_active = true
      ORDER BY department
    `;
    const result = await db.query(query);
    const departments = result.rows.map(row => row.department);
    res.json({ departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

module.exports = router;
