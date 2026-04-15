-- Music Practice Tracker V2 — full schema
-- For existing databases run migrations/001_google_oauth.sql instead.

CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100)  NOT NULL,
  email           VARCHAR(255)  UNIQUE,
  google_id       VARCHAR(255)  UNIQUE NOT NULL,
  profile_picture TEXT,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE practice_sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  instrument VARCHAR(100) NOT NULL,
  duration   INTEGER      NOT NULL, -- minutes
  notes      TEXT,
  date       DATE         DEFAULT CURRENT_DATE,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coaching_history (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response_text TEXT    NOT NULL,
  session_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_coaching_history_user_id  ON coaching_history(user_id);
