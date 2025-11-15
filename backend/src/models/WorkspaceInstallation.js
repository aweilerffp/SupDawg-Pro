const db = require('../config/database');

class WorkspaceInstallation {
  /**
   * Create a new workspace installation
   */
  static async create(installationData) {
    const { team_id, team_name, bot_token, bot_user_id, bot_access_token } = installationData;
    const query = `
      INSERT INTO workspace_installations (team_id, team_name, bot_token, bot_user_id, bot_access_token)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (team_id)
      DO UPDATE SET
        team_name = EXCLUDED.team_name,
        bot_token = EXCLUDED.bot_token,
        bot_user_id = EXCLUDED.bot_user_id,
        bot_access_token = EXCLUDED.bot_access_token,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const values = [team_id, team_name, bot_token, bot_user_id, bot_access_token];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find installation by team_id
   */
  static async findByTeamId(team_id) {
    const query = 'SELECT * FROM workspace_installations WHERE team_id = $1';
    const result = await db.query(query, [team_id]);
    return result.rows[0];
  }

  /**
   * Find installation by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM workspace_installations WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get all installations
   */
  static async findAll() {
    const query = 'SELECT * FROM workspace_installations ORDER BY installed_at DESC';
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Update installation
   */
  static async update(team_id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(team_id);

    const query = `
      UPDATE workspace_installations
      SET ${fields.join(', ')}
      WHERE team_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete installation (when app is uninstalled)
   */
  static async delete(team_id) {
    const query = 'DELETE FROM workspace_installations WHERE team_id = $1 RETURNING *';
    const result = await db.query(query, [team_id]);
    return result.rows[0];
  }

  /**
   * Get bot token for a workspace
   */
  static async getBotToken(team_id) {
    const query = 'SELECT bot_token FROM workspace_installations WHERE team_id = $1';
    const result = await db.query(query, [team_id]);
    return result.rows[0]?.bot_token;
  }
}

module.exports = WorkspaceInstallation;
