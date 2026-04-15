-- Music Practice Tracker V2 — init script for fresh databases

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    email           VARCHAR(255)  UNIQUE,
    google_id       VARCHAR(255)  UNIQUE NOT NULL,
    profile_picture TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS practice_sessions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
    instrument VARCHAR(100) NOT NULL,
    duration   INTEGER      NOT NULL,
    date       DATE         DEFAULT CURRENT_DATE,
    notes      TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coaching_history (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response_text TEXT    NOT NULL,
    session_count INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON practice_sessions(date);
CREATE INDEX IF NOT EXISTS idx_coaching_history_user_id ON coaching_history(user_id);
