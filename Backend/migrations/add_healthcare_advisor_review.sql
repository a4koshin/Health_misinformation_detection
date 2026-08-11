-- Healthcare Advisor review queue columns.
-- Applied automatically on app startup (ADD COLUMN IF NOT EXISTS).
-- Assign healthcare_advisor via the admin Users page, not self-service.

ALTER TABLE predictions
    ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE predictions
    ADD COLUMN IF NOT EXISTS review_status VARCHAR(20);

ALTER TABLE predictions
    ADD COLUMN IF NOT EXISTS advisor_id INTEGER REFERENCES users(id);

ALTER TABLE predictions
    ADD COLUMN IF NOT EXISTS advisor_note TEXT;

ALTER TABLE predictions
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS advisor_since TIMESTAMP;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP;
