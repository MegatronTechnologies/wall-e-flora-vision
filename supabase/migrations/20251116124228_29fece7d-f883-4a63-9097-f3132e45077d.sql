-- Step 1: Update all existing "mixed" status detections to "diseased"
UPDATE detections 
SET status = 'diseased' 
WHERE status = 'mixed';

-- Step 2: Create new enum type without "mixed"
CREATE TYPE detection_status_new AS ENUM ('noObjects', 'healthy', 'diseased');

-- Step 3: Convert column to new type
ALTER TABLE detections 
  ALTER COLUMN status TYPE detection_status_new 
  USING status::text::detection_status_new;

-- Step 4: Drop old enum type
DROP TYPE detection_status;

-- Step 5: Rename new type to original name
ALTER TYPE detection_status_new RENAME TO detection_status;