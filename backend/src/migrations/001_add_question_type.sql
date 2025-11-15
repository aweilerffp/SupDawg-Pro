-- Migration: Add question_type column to questions table
-- Purpose: Enable type-based question lookups instead of text matching
-- Date: 2025-11-15

-- Step 1: Add question_type column with default value
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'rotating'
CHECK (question_type IN ('rating', 'what_went_well', 'what_didnt_go_well', 'rotating'));

-- Step 2: Populate question_type based on existing question_text
UPDATE questions
SET question_type = CASE
  WHEN question_text ILIKE '%scale of 1 to 5%' THEN 'rating'
  WHEN question_text ILIKE '%went well%' AND question_text NOT ILIKE '%didn''t%' THEN 'what_went_well'
  WHEN question_text ILIKE '%didn''t go well%' OR question_text ILIKE '%didnt go well%' THEN 'what_didnt_go_well'
  ELSE 'rotating'
END
WHERE question_type = 'rotating'; -- Only update if not already set

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON questions(question_type);

-- Step 4: Verify migration
DO $$
DECLARE
  rating_count INTEGER;
  went_well_count INTEGER;
  didnt_go_well_count INTEGER;
  rotating_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rating_count FROM questions WHERE question_type = 'rating';
  SELECT COUNT(*) INTO went_well_count FROM questions WHERE question_type = 'what_went_well';
  SELECT COUNT(*) INTO didnt_go_well_count FROM questions WHERE question_type = 'what_didnt_go_well';
  SELECT COUNT(*) INTO rotating_count FROM questions WHERE question_type = 'rotating';

  RAISE NOTICE 'Migration completed successfully:';
  RAISE NOTICE '  - Rating questions: %', rating_count;
  RAISE NOTICE '  - What went well questions: %', went_well_count;
  RAISE NOTICE '  - What didnt go well questions: %', didnt_go_well_count;
  RAISE NOTICE '  - Rotating questions: %', rotating_count;

  IF rating_count = 0 OR went_well_count = 0 OR didnt_go_well_count = 0 THEN
    RAISE WARNING 'Expected at least one question of each core type. Please verify data.';
  END IF;
END $$;
