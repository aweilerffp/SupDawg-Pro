-- SupDawg Database Migration v2
-- Adds department, tags, and manager role support

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT false;

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Default blue color
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_tags junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, tag_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_is_manager ON users(is_manager);
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tag_id ON user_tags(tag_id);

-- Set existing users with direct reports as managers
UPDATE users
SET is_manager = true
WHERE id IN (
  SELECT DISTINCT manager_id
  FROM users
  WHERE manager_id IS NOT NULL
);

-- Insert some default departments (optional - can be customized)
-- These are common departments, can be modified as needed
INSERT INTO tags (name, color) VALUES
  ('Engineering', '#10B981'),
  ('Product', '#8B5CF6'),
  ('Design', '#F59E0B'),
  ('Sales', '#EF4444'),
  ('Marketing', '#06B6D4'),
  ('Operations', '#6366F1'),
  ('Customer Success', '#EC4899'),
  ('Finance', '#14B8A6')
ON CONFLICT (name) DO NOTHING;

-- Function to automatically update is_manager flag when manager_id changes
CREATE OR REPLACE FUNCTION update_manager_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If a user is assigned as manager, mark them as is_manager
  IF NEW.manager_id IS NOT NULL THEN
    UPDATE users SET is_manager = true WHERE id = NEW.manager_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update manager status
DROP TRIGGER IF EXISTS trigger_update_manager_status ON users;
CREATE TRIGGER trigger_update_manager_status
AFTER INSERT OR UPDATE OF manager_id ON users
FOR EACH ROW
EXECUTE FUNCTION update_manager_status();

-- Migration complete
