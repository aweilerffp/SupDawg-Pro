const db = require('../config/database');

class Question {
  static async create(questionData) {
    const { question_text, is_core, queue_position } = questionData;
    const query = `
      INSERT INTO questions (question_text, is_core, queue_position)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [question_text, is_core || false, queue_position]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM questions WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(activeOnly = true) {
    const query = activeOnly
      ? 'SELECT * FROM questions WHERE is_active = true ORDER BY is_core DESC, queue_position'
      : 'SELECT * FROM questions ORDER BY is_core DESC, queue_position';
    const result = await db.query(query);
    return result.rows;
  }

  static async getCoreQuestions() {
    const query = 'SELECT * FROM questions WHERE is_core = true AND is_active = true ORDER BY id';
    const result = await db.query(query);
    return result.rows;
  }

  static async getRotatingQuestions() {
    const query = 'SELECT * FROM questions WHERE is_core = false AND is_active = true ORDER BY queue_position';
    const result = await db.query(query);
    return result.rows;
  }

  static async getCurrentRotatingQuestion(currentIndex) {
    const query = `
      SELECT * FROM questions
      WHERE is_core = false AND is_active = true
      ORDER BY queue_position
      LIMIT 1 OFFSET $1
    `;
    const result = await db.query(query, [currentIndex]);
    return result.rows[0];
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
      UPDATE questions
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async reorderQueue(questionIds) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < questionIds.length; i++) {
        await client.query(
          'UPDATE questions SET queue_position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [i, questionIds[i]]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM questions WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Question;
