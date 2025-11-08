const db = require('../config/database');

class CheckIn {
  static async create(userId, weekStartDate) {
    const query = `
      INSERT INTO check_ins (user_id, week_start_date)
      VALUES ($1, $2)
      ON CONFLICT (user_id, week_start_date) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await db.query(query, [userId, weekStartDate]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM check_ins WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByUserAndWeek(userId, weekStartDate) {
    const query = 'SELECT * FROM check_ins WHERE user_id = $1 AND week_start_date = $2';
    const result = await db.query(query, [userId, weekStartDate]);
    return result.rows[0];
  }

  static async updateResponses(checkInId, data) {
    const { rating, what_went_well, what_didnt_go_well } = data;
    const query = `
      UPDATE check_ins
      SET rating = $1, what_went_well = $2, what_didnt_go_well = $3,
          completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const result = await db.query(query, [rating, what_went_well, what_didnt_go_well, checkInId]);
    return result.rows[0];
  }

  static async incrementRemindedCount(checkInId) {
    const query = `
      UPDATE check_ins
      SET reminded_count = reminded_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [checkInId]);
    return result.rows[0];
  }

  static async getIncompleteForWeek(weekStartDate) {
    const query = `
      SELECT c.*, u.slack_user_id, u.slack_username, u.email, u.timezone
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      WHERE c.week_start_date = $1 AND c.completed_at IS NULL AND u.is_active = true
    `;
    const result = await db.query(query, [weekStartDate]);
    return result.rows;
  }

  static async getCompletionStatsForWeek(weekStartDate) {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_count,
        COUNT(*) as total_count,
        AVG(rating) FILTER (WHERE completed_at IS NOT NULL) as avg_rating
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      WHERE c.week_start_date = $1 AND u.is_active = true
    `;
    const result = await db.query(query, [weekStartDate]);
    return result.rows[0];
  }

  static async getCheckInsForManager(managerId, weekStartDate = null) {
    let query = `
      SELECT c.*, u.slack_username, u.email
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      WHERE u.manager_id = $1 AND u.is_active = true
    `;
    const params = [managerId];

    if (weekStartDate) {
      query += ` AND c.week_start_date = $2`;
      params.push(weekStartDate);
    }

    query += ` ORDER BY c.week_start_date DESC, u.slack_username`;

    const result = await db.query(query, params);
    return result.rows;
  }

  static async getAllCheckIns(filters = {}) {
    let query = `
      SELECT c.*, u.slack_username, u.email, u.manager_id
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      WHERE u.is_active = true
    `;
    const params = [];
    let paramCount = 1;

    if (filters.weekStartDate) {
      query += ` AND c.week_start_date = $${paramCount}`;
      params.push(filters.weekStartDate);
      paramCount++;
    }

    if (filters.userId) {
      query += ` AND c.user_id = $${paramCount}`;
      params.push(filters.userId);
      paramCount++;
    }

    if (filters.startDate && filters.endDate) {
      query += ` AND c.week_start_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(filters.startDate, filters.endDate);
      paramCount += 2;
    }

    query += ` ORDER BY c.week_start_date DESC, u.slack_username`;

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = CheckIn;
