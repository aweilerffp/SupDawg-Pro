const db = require('../config/database');

class WorkspaceConfig {
  static async create(workspaceData) {
    const { slack_workspace_id, check_in_day, check_in_time, reminder_times } = workspaceData;
    const query = `
      INSERT INTO workspace_config (slack_workspace_id, check_in_day, check_in_time, reminder_times)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slack_workspace_id) DO UPDATE
      SET check_in_day = $2, check_in_time = $3, reminder_times = $4, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await db.query(query, [
      slack_workspace_id,
      check_in_day || 'thursday',
      check_in_time || '14:00',
      JSON.stringify(reminder_times || ['09:00', '16:00'])
    ]);
    return result.rows[0];
  }

  static async findByWorkspaceId(slack_workspace_id) {
    const query = 'SELECT * FROM workspace_config WHERE slack_workspace_id = $1';
    const result = await db.query(query, [slack_workspace_id]);
    return result.rows[0];
  }

  static async updateQuestionIndex(slack_workspace_id, newIndex) {
    const query = `
      UPDATE workspace_config
      SET current_question_index = $1, updated_at = CURRENT_TIMESTAMP
      WHERE slack_workspace_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [newIndex, slack_workspace_id]);
    return result.rows[0];
  }

  static async getCurrentQuestionIndex(slack_workspace_id) {
    const config = await this.findByWorkspaceId(slack_workspace_id);
    return config ? config.current_question_index : 0;
  }

  static async incrementQuestionIndex(slack_workspace_id) {
    const query = `
      UPDATE workspace_config
      SET current_question_index = current_question_index + 1, updated_at = CURRENT_TIMESTAMP
      WHERE slack_workspace_id = $1
      RETURNING *
    `;
    const result = await db.query(query, [slack_workspace_id]);
    return result.rows[0];
  }

  static async update(slack_workspace_id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (key === 'reminder_times') {
        fields.push(`${key} = $${paramCount}`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
      }
      paramCount++;
    });

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(slack_workspace_id);

    const query = `
      UPDATE workspace_config
      SET ${fields.join(', ')}
      WHERE slack_workspace_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = WorkspaceConfig;
