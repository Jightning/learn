-- Existing databases only. Run once before deploying protocol 2. Legacy
-- ciphertext remains readable; reload old clients. Fresh databases use tools/schema.sql.
ALTER TABLE prefs ADD COLUMN rev TEXT NOT NULL DEFAULT '';
