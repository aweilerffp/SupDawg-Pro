-- SupDawg Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  slack_user_id VARCHAR(255) UNIQUE NOT NULL,
  slack_username VARCHAR(255),
  email VARCHAR(255),
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
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
  slack_workspace_id VARCHAR(255) UNIQUE NOT NULL,
  current_question_index INTEGER DEFAULT 0,
  check_in_day VARCHAR(20) DEFAULT 'thursday',
  check_in_time VARCHAR(10) DEFAULT '14:00',
  reminder_times JSON DEFAULT '["09:00", "16:00"]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_slack_user_id ON users(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_week_start_date ON check_ins(week_start_date);
CREATE INDEX IF NOT EXISTS idx_responses_check_in_id ON responses(check_in_id);
CREATE INDEX IF NOT EXISTS idx_questions_queue_position ON questions(queue_position);

-- Insert core questions
INSERT INTO questions (question_text, is_core, is_active, queue_position) VALUES
  ('How was your week on a scale of 1 to 5?', true, true, NULL),
  ('What went well this week?', true, true, NULL),
  ('What didn''t go well this week?', true, true, NULL)
ON CONFLICT DO NOTHING;

-- Insert pre-loaded rotating questions
INSERT INTO questions (question_text, is_core, is_active, queue_position) VALUES
  ('What''s your biggest challenge right now, and how can I help?', false, true, 1),
  ('What do you find best helps you manage stress?', false, true, 2),
  ('What is your favorite part of your job? Why''s that?', false, true, 3),
  ('When do you feel most productive and motivated when working?', false, true, 4),
  ('Any ideas you have to improve your role or the company?', false, true, 5),
  ('Thinking back on this past week of work, what was one new thing you learned?', false, true, 6),
  ('What is the best way for someone to give you feedback?', false, true, 7),
  ('What do you think we can do better at as a company?', false, true, 8),
  ('How do you think your work impacts our team and company?', false, true, 9),
  ('What time of day do you do your best work?', false, true, 10),
  ('What personal or professional goal do you currently have set for yourself?', false, true, 11),
  ('Do you feel confident in your skill set? What would you like to work on?', false, true, 12),
  ('Do you have a good meeting rhythm?', false, true, 13),
  ('Do you feel like you are provided the necessary tools to excel at your job?', false, true, 14),
  ('Do you feel like you have ample opportunity to apply your personal strengths?', false, true, 15),
  ('Are there any projects or issues that you are worried about?', false, true, 16),
  ('What is something that always makes your day?', false, true, 17),
  ('What question(s) do you have about our company right now?', false, true, 18),
  ('What''s something you want to be able to do in 6 months that you can''t do now?', false, true, 19),
  ('Is there anything you are feeling awkward or unsure about raising?', false, true, 20),
  ('What can we do to make you more successful?', false, true, 21),
  ('Do you feel like what you are accountable for is clearly defined?', false, true, 22),
  ('Do you feel that your quarterly goals are clearly defined and SMART?', false, true, 23),
  ('Is there anything we can do to help support working remotely?', false, true, 24),
  ('How do you think we could get more of the right things done?', false, true, 25)
ON CONFLICT DO NOTHING;
