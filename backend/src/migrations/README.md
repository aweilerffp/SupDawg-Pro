# SupDawg Database Migrations

This directory contains database migration scripts for the SupDawg application.

## Running Migrations

### Method 1: Using the Migration Runner (Recommended)

```bash
cd /root/SupDawg/backend/src/migrations
node run-migration.js 001_add_question_type.sql
```

The migration runner will:
- Connect to the database using environment variables or defaults
- Execute the migration SQL
- Display success/error messages
- Verify the migration completed correctly

### Method 2: Using psql Directly

```bash
psql -U supdawg_user -d supdawg -f 001_add_question_type.sql
```

### Method 3: Using the Database Credentials

```bash
PGPASSWORD=supdawg_pass_2025 psql -h localhost -U supdawg_user -d supdawg -f 001_add_question_type.sql
```

## Available Migrations

### 001_add_question_type.sql
- **Purpose**: Add `question_type` column to support type-based question lookups
- **Date**: 2025-11-15
- **Changes**:
  - Adds `question_type` VARCHAR(50) column with CHECK constraint
  - Populates values based on existing question text:
    - 'rating' for "scale of 1 to 5" questions
    - 'what_went_well' for "went well" questions
    - 'what_didnt_go_well' for "didn't go well" questions
    - 'rotating' for all other questions
  - Creates index on `question_type` for performance
  - Includes verification step to confirm migration success

## Database Configuration

The migration runner uses these environment variables (with defaults):

- `DB_HOST` (default: localhost)
- `DB_PORT` (default: 5432)
- `DB_NAME` (default: supdawg)
- `DB_USER` (default: supdawg_user)
- `DB_PASSWORD` (default: supdawg_pass_2025)

## Migration Best Practices

1. **Backup First**: Always backup your database before running migrations
2. **Test First**: Run migrations on a dev/staging environment first
3. **Review SQL**: Review the SQL file before executing
4. **Check Results**: Verify the migration completed successfully
5. **Update Schema**: After running migrations, update schema.sql to reflect the changes

## Rollback

If you need to rollback the question_type migration:

```sql
ALTER TABLE questions DROP COLUMN IF EXISTS question_type;
DROP INDEX IF EXISTS idx_questions_question_type;
```

Note: This will remove the column and all type information.
