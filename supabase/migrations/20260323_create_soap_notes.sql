-- Migration: Create soap_notes table with primary key
CREATE TABLE IF NOT EXISTS soap_notes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    session_date DATE NOT NULL,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Add foreign key if you have a clients table
-- ALTER TABLE soap_notes ADD CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
