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

  /**
   * Get completion stats for a specific set of users
   */
  static async getCompletionStatsForUsers(userIds, weekStartDate) {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_count,
        COUNT(*) as total_count,
        AVG(rating) FILTER (WHERE completed_at IS NOT NULL) as avg_rating
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      WHERE c.week_start_date = $1
        AND c.user_id = ANY($2::int[])
        AND u.is_active = true
    `;
    const result = await db.query(query, [weekStartDate, userIds]);
    return result.rows[0];
  }

  /**
   * Get trends for a single user over time
   */
  static async getTrendsForUser(userId, startDate, endDate) {
    const query = `
      SELECT
        week_start_date,
        rating,
        CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END as completed
      FROM check_ins
      WHERE user_id = $1
        AND week_start_date BETWEEN $2 AND $3
      ORDER BY week_start_date ASC
    `;
    const result = await db.query(query, [userId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get trends for multiple users (aggregated)
   */
  static async getTrendsForUsers(userIds, startDate, endDate) {
    const query = `
      SELECT
        week_start_date,
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_count,
        COUNT(*) as total_count,
        AVG(rating) FILTER (WHERE completed_at IS NOT NULL) as avg_rating
      FROM check_ins c
      WHERE c.user_id = ANY($1::int[])
        AND c.week_start_date BETWEEN $2 AND $3
      GROUP BY week_start_date
      ORDER BY week_start_date ASC
    `;
    const result = await db.query(query, [userIds, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get stats grouped by department
   */
  static async getStatsGroupedByDepartment(weekStartDate) {
    const query = `
      SELECT
        u.department,
        COUNT(*) FILTER (WHERE c.completed_at IS NOT NULL) as completed_count,
        COUNT(*) as total_count,
        AVG(c.rating) FILTER (WHERE c.completed_at IS NOT NULL) as avg_rating,
        COUNT(DISTINCT u.id) as user_count
      FROM users u
      LEFT JOIN check_ins c ON u.id = c.user_id AND c.week_start_date = $1
      WHERE u.is_active = true AND u.department IS NOT NULL
      GROUP BY u.department
      ORDER BY u.department
    `;
    const result = await db.query(query, [weekStartDate]);
    return result.rows;
  }

  /**
   * Get stats grouped by manager
   */
  static async getStatsGroupedByManager(weekStartDate) {
    const query = `
      SELECT
        m.id as manager_id,
        m.slack_username as manager_name,
        COUNT(*) FILTER (WHERE c.completed_at IS NOT NULL) as completed_count,
        COUNT(*) as total_count,
        AVG(c.rating) FILTER (WHERE c.completed_at IS NOT NULL) as avg_rating,
        COUNT(DISTINCT u.id) as team_size
      FROM users u
      JOIN users m ON u.manager_id = m.id
      LEFT JOIN check_ins c ON u.id = c.user_id AND c.week_start_date = $1
      WHERE u.is_active = true
      GROUP BY m.id, m.slack_username
      ORDER BY m.slack_username
    `;
    const result = await db.query(query, [weekStartDate]);
    return result.rows;
  }

  /**
   * Get incomplete users for a specific set of users (for filtered view)
   */
  static async getIncompleteForUsers(userIds, weekStartDate) {
    const query = `
      SELECT c.*, u.slack_user_id, u.slack_username, u.email, u.timezone, u.department
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      WHERE c.week_start_date = $1
        AND c.completed_at IS NULL
        AND c.user_id = ANY($2::int[])
        AND u.is_active = true
      ORDER BY u.slack_username
    `;
    const result = await db.query(query, [weekStartDate, userIds]);
    return result.rows;
  }

  /**
   * Get all responses with user details (for detailed views)
   */
  static async getResponsesWithDetails(filters = {}) {
    let query = `
      SELECT
        c.*,
        u.id as user_id,
        u.slack_username,
        u.email,
        u.department,
        u.manager_id,
        COALESCE(
          json_agg(
            json_build_object(
              'question_id', r.question_id,
              'question_text', q.question_text,
              'response_text', r.response_text
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) as rotating_responses
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN responses r ON c.id = r.check_in_id
      LEFT JOIN questions q ON r.question_id = q.id
      WHERE u.is_active = true AND c.completed_at IS NOT NULL
    `;
    const params = [];
    let paramCount = 1;

    if (filters.weekStartDate) {
      query += ` AND c.week_start_date = $${paramCount}`;
      params.push(filters.weekStartDate);
      paramCount++;
    }

    if (filters.userIds && filters.userIds.length > 0) {
      query += ` AND c.user_id = ANY($${paramCount}::int[])`;
      params.push(filters.userIds);
      paramCount++;
    }

    if (filters.department) {
      query += ` AND u.department = $${paramCount}`;
      params.push(filters.department);
      paramCount++;
    }

    query += `
      GROUP BY c.id, u.id
      ORDER BY c.week_start_date DESC, c.completed_at DESC
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get summary stats for a single user (for employee detail page)
   */
  static async getUserSummary(userId) {
    const query = `
      SELECT
        COUNT(*) as total_checkins,
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_checkins,
        AVG(rating) FILTER (WHERE completed_at IS NOT NULL) as avg_rating,
        MIN(week_start_date) as first_checkin_date,
        MAX(week_start_date) as last_checkin_date
      FROM check_ins
      WHERE user_id = $1
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = CheckIn;
