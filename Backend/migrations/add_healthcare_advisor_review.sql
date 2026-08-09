-- Healthcare Advisor review queue columns.
-- Applied automatically on app startup (ADD COLUMN IF NOT EXISTS).
-- Designating advisors is still a manual DB update for now:
--   UPDATE users SET role = 'healthcare_advisor' WHERE email = '...';
-- TODO: admin-only endpoint to assign this role (not self-service).

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
