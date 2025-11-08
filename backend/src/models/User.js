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
}

module.exports = User;
