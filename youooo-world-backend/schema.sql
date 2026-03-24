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
  source_name TEXT,
  source_type TEXT,
  source_url TEXT,
  source_timestamp TEXT,
  refreshed_at TEXT,
  job_count INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_company_source
ON signals(company, source_type);
