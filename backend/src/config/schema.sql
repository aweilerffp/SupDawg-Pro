-- SupDawg Pro Database Schema
-- Multi-workspace support for App Directory

-- Workspace installations table
-- Tracks each workspace that has installed the app
CREATE TABLE IF NOT EXISTS workspace_installations (
  id SERIAL PRIMARY KEY,
  team_id VARCHAR(255) UNIQUE NOT NULL,
  team_name VARCHAR(255),
  bot_token TEXT NOT NULL,
  bot_user_id VARCHAR(255),
  bot_access_token TEXT,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_installations_team_id ON workspace_installations(team_id);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspace_installations(id) ON DELETE CASCADE,
  slack_user_id VARCHAR(255) NOT NULL,
  slack_username VARCHAR(255),
  email VARCHAR(255),
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, slack_user_id)
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspace_installations(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'rotating' CHECK (question_type IN ('rating', 'what_went_well', 'what_didnt_go_well', 'rotating')),
  is_core BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  queue_position INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  what_went_well TEXT,
  what_didnt_go_well TEXT,
  completed_at TIMESTAMP,
  reminded_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, week_start_date)
);

-- Responses table
CREATE TABLE IF NOT EXISTS responses (
  id SERIAL PRIMARY KEY,
  check_in_id INTEGER REFERENCES check_ins(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  response_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workspace configuration table
CREATE TABLE IF NOT EXISTS workspace_config (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER UNIQUE REFERENCES workspace_installations(id) ON DELETE CASCADE,
  current_question_index INTEGER DEFAULT 0,
  check_in_day VARCHAR(20) DEFAULT 'thursday',
  check_in_time VARCHAR(10) DEFAULT '14:00',
  reminder_times JSON DEFAULT '["09:00", "16:00"]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_users_slack_user_id ON users(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_questions_workspace_id ON questions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_week_start_date ON check_ins(week_start_date);
CREATE INDEX IF NOT EXISTS idx_responses_check_in_id ON responses(check_in_id);
CREATE INDEX IF NOT EXISTS idx_questions_queue_position ON questions(queue_position);
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON questions(question_type);

-- Insert core questions
INSERT INTO questions (question_text, question_type, is_core, is_active, queue_position) VALUES
  ('How was your week on a scale of 1 to 5?', 'rating', true, true, NULL),
  ('What went well this week?', 'what_went_well', true, true, NULL),
  ('What didn''t go well this week?', 'what_didnt_go_well', true, true, NULL)
ON CONFLICT DO NOTHING;

-- Insert pre-loaded rotating questions
INSERT INTO questions (question_text, question_type, is_core, is_active, queue_position) VALUES
  ('What''s your biggest challenge right now, and how can I help?', 'rotating', false, true, 1),
  ('What do you find best helps you manage stress?', 'rotating', false, true, 2),
  ('What is your favorite part of your job? Why''s that?', 'rotating', false, true, 3),
  ('When do you feel most productive and motivated when working?', 'rotating', false, true, 4),
  ('Any ideas you have to improve your role or the company?', 'rotating', false, true, 5),
  ('Thinking back on this past week of work, what was one new thing you learned?', 'rotating', false, true, 6),
  ('What is the best way for someone to give you feedback?', 'rotating', false, true, 7),
  ('What do you think we can do better at as a company?', 'rotating', false, true, 8),
  ('How do you think your work impacts our team and company?', 'rotating', false, true, 9),
  ('What time of day do you do your best work?', 'rotating', false, true, 10),
  ('What personal or professional goal do you currently have set for yourself?', 'rotating', false, true, 11),
  ('Do you feel confident in your skill set? What would you like to work on?', 'rotating', false, true, 12),
  ('Do you have a good meeting rhythm?', 'rotating', false, true, 13),
  ('Do you feel like you are provided the necessary tools to excel at your job?', 'rotating', false, true, 14),
  ('Do you feel like you have ample opportunity to apply your personal strengths?', 'rotating', false, true, 15),
  ('Are there any projects or issues that you are worried about?', 'rotating', false, true, 16),
  ('What is something that always makes your day?', 'rotating', false, true, 17),
  ('What question(s) do you have about our company right now?', 'rotating', false, true, 18),
  ('What''s something you want to be able to do in 6 months that you can''t do now?', 'rotating', false, true, 19),
  ('Is there anything you are feeling awkward or unsure about raising?', 'rotating', false, true, 20),
  ('What can we do to make you more successful?', 'rotating', false, true, 21),
  ('Do you feel like what you are accountable for is clearly defined?', 'rotating', false, true, 22),
  ('Do you feel that your quarterly goals are clearly defined and SMART?', 'rotating', false, true, 23),
  ('Is there anything we can do to help support working remotely?', 'rotating', false, true, 24),
  ('How do you think we could get more of the right things done?', 'rotating', false, true, 25)
ON CONFLICT DO NOTHING;
