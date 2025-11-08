const db = require('../config/database');

class Response {
  static async create(checkInId, questionId, responseText) {
    const query = `
      INSERT INTO responses (check_in_id, question_id, response_text)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [checkInId, questionId, responseText]);
    return result.rows[0];
  }

  static async findByCheckInId(checkInId) {
    const query = `
      SELECT r.*, q.question_text, q.is_core
      FROM responses r
      JOIN questions q ON r.question_id = q.id
      WHERE r.check_in_id = $1
      ORDER BY q.is_core DESC, q.queue_position
    `;
    const result = await db.query(query, [checkInId]);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM responses WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Response;
