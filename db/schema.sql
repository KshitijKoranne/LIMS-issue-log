CREATE TABLE IF NOT EXISTS issue_sequence (
  id TEXT PRIMARY KEY CHECK (id = 'issue'),
  next_value INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO issue_sequence (id, next_value) VALUES ('issue', 1);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Open', 'Ongoing', 'Closed')),
  location TEXT NOT NULL CHECK (location IN ('Vadodara', 'Vapi', 'Both')),
  module_id TEXT REFERENCES modules(id) ON DELETE SET NULL,
  module_name_snapshot TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  ai_category TEXT,
  ai_subcategory TEXT,
  ai_summary TEXT,
  ai_confidence REAL,
  ai_processed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS issue_attachments (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  data_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_location ON issues(location);
CREATE INDEX IF NOT EXISTS idx_issues_module ON issues(module_id);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
CREATE INDEX IF NOT EXISTS idx_attachments_issue ON issue_attachments(issue_id);
