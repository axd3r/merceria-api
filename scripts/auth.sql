CREATE TABLE IF NOT EXISTS auth_users (
 id uuid PRIMARY KEY,
 email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
 name varchar(100) NOT NULL,
 role varchar(10) NOT NULL CHECK (role IN ('ADMIN','STAFF')),
 password_hash text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS auth_sessions (
 token_hash char(64) PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS auth_limits (key char(64) PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS auth_limits_expiry_idx ON auth_limits(expires_at);
