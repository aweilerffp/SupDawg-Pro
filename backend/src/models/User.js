const db = require('../config/database');

class User {
  static async create(userData) {
    const { slack_user_id, slack_username, email, timezone, manager_id, is_admin } = userData;
    const query = `
      INSERT INTO users (slack_user_id, slack_username, email, timezone, manager_id, is_admin)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [slack_user_id, slack_username, email, timezone || 'America/New_York', manager_id, is_admin || false];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findBySlackUserId(slack_user_id) {
    const query = 'SELECT * FROM users WHERE slack_user_id = $1';
    const result = await db.query(query, [slack_user_id]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(activeOnly = true) {
    const query = activeOnly
      ? 'SELECT * FROM users WHERE is_active = true ORDER BY slack_username'
      : 'SELECT * FROM users ORDER BY slack_username';
    const result = await db.query(query);
    return result.rows;
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async getDirectReports(managerId) {
    const query = 'SELECT * FROM users WHERE manager_id = $1 AND is_active = true';
    const result = await db.query(query, [managerId]);
    return result.rows;
  }

  static async deactivate(id) {
    const query = 'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get all team members (direct and indirect reports) for a manager
   * Uses recursive CTE to traverse the org hierarchy
   */
  static async getAllTeamMembers(managerId, activeOnly = true) {
    const query = `
      WITH RECURSIVE team AS (
        -- Base case: direct reports
        SELECT id, slack_user_id, slack_username, email, timezone, manager_id,
               department, is_active, is_admin, is_manager, created_at, updated_at, 1 as depth
        FROM users
        WHERE manager_id = $1

        UNION ALL

        -- Recursive case: indirect reports
        SELECT u.id, u.slack_user_id, u.slack_username, u.email, u.timezone, u.manager_id,
               u.department, u.is_active, u.is_admin, u.is_manager, u.created_at, u.updated_at, t.depth + 1
        FROM users u
        INNER JOIN team t ON u.manager_id = t.id
      )
      SELECT DISTINCT * FROM team
      ${activeOnly ? 'WHERE is_active = true' : ''}
      ORDER BY depth, slack_username
    `;
    const result = await db.query(query, [managerId]);
    return result.rows;
  }

  /**
   * Check if a user can view another user's data
   * Admins can see everyone, managers can see their team members
   */
  static async canViewUser(viewerId, targetUserId) {
    // If viewer and target are the same, always allow
    if (viewerId === targetUserId) {
      return true;
    }

    // Get viewer info
    const viewer = await this.findById(viewerId);
    if (!viewer) {
      return false;
    }

    // Admins can see everyone
    if (viewer.is_admin) {
      return true;
    }

    // If viewer is a manager, check if target is in their team
    if (viewer.is_manager) {
      const teamMembers = await this.getAllTeamMembers(viewerId);
      return teamMembers.some(member => member.id === targetUserId);
    }

    // Regular users can't see others' data
    return false;
  }

  /**
   * Get all accessible users for a viewer (based on permissions)
   */
  static async getAccessibleUsers(viewerId) {
    const viewer = await this.findById(viewerId);
    if (!viewer) {
      return [];
    }

    // Admins can see everyone
    if (viewer.is_admin) {
      return await this.findAll(true);
    }

    // Managers can see their team
    if (viewer.is_manager) {
      const teamMembers = await this.getAllTeamMembers(viewerId);
      // Include the manager themselves
      const manager = await this.findById(viewerId);
      return [manager, ...teamMembers];
    }

    // Regular users can only see themselves
    return [viewer];
  }

  /**
   * Get tags for a user
   */
  static async getTags(userId) {
    const query = `
      SELECT t.id, t.name, t.color, t.created_at
      FROM tags t
      INNER JOIN user_tags ut ON t.id = ut.tag_id
      WHERE ut.user_id = $1
      ORDER BY t.name
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Add a tag to a user
   */
  static async addTag(userId, tagId) {
    const query = `
      INSERT INTO user_tags (user_id, tag_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, tag_id) DO NOTHING
      RETURNING *
    `;
    const result = await db.query(query, [userId, tagId]);
    return result.rows[0];
  }

  /**
   * Remove a tag from a user
   */
  static async removeTag(userId, tagId) {
    const query = 'DELETE FROM user_tags WHERE user_id = $1 AND tag_id = $2';
    await db.query(query, [userId, tagId]);
    return true;
  }

  /**
   * Get user with their manager and tags
   */
  static async findByIdWithDetails(id) {
    const query = `
      SELECT
        u.*,
        m.slack_username as manager_name,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN user_tags ut ON u.id = ut.user_id
      LEFT JOIN tags t ON ut.tag_id = t.id
      WHERE u.id = $1
      GROUP BY u.id, m.slack_username
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get organization hierarchy tree starting from a manager
   */
  static async getHierarchyTree(managerId = null) {
    const query = `
      WITH RECURSIVE org_tree AS (
        -- Base case: start with top-level (no manager) or specified manager
        SELECT
          id, slack_user_id, slack_username, email, department,
          manager_id, is_active, is_manager, is_admin,
          0 as depth,
          ARRAY[id] as path
        FROM users
        WHERE ${managerId ? 'id = $1' : 'manager_id IS NULL'}
        AND is_active = true

        UNION ALL

        -- Recursive case: get direct reports
        SELECT
          u.id, u.slack_user_id, u.slack_username, u.email, u.department,
          u.manager_id, u.is_active, u.is_manager, u.is_admin,
          ot.depth + 1,
          ot.path || u.id
        FROM users u
        INNER JOIN org_tree ot ON u.manager_id = ot.id
        WHERE u.is_active = true
      )
      SELECT * FROM org_tree
      ORDER BY path
    `;
    const params = managerId ? [managerId] : [];
    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = User;
