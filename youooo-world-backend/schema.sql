CREATE TABLE IF NOT EXISTS signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  size_text TEXT,
  urgency TEXT,
  competition TEXT,
  confidence INTEGER,
  opportunity_score INTEGER,
  window_text TEXT,
  summary TEXT,
  roles_json TEXT,
  locations_json TEXT,
  experience_json TEXT,
  why_it_matters TEXT,
  recruiter_actions_json TEXT,
  best_target TEXT,
  recruiter_brief TEXT,
  source_name TEXT,
  source_type TEXT,
  source_url TEXT,
  source_timestamp TEXT,
  refreshed_at TEXT,
  job_count INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_company_source
ON signals(company, source_type);

CREATE TABLE IF NOT EXISTS signal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  source_type TEXT NOT NULL,
  job_count INTEGER NOT NULL,
  captured_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signal_history_company_source_time
ON signal_history(company, source_type, captured_at DESC);