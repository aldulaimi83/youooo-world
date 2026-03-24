const GREENHOUSE_BOARDS = [
  // Example:
  // { company: "OpenAI", boardToken: "openai" },
  // { company: "Stripe", boardToken: "stripe" },
];

const LEVER_SITES = [
  // Example:
  // { company: "Netflix", site: "netflix" },
  // { company: "Miro", site: "miro" },
];

const MANUAL_LAYOFFS = [
  {
    company: "Meta",
    signal_type: "Layoffs",
    size_text: "Manual watchlist entry",
    urgency: "Fresh",
    competition: "Low",
    confidence: 68,
    opportunity_score: 78,
    window_text: "2–4 weeks",
    summary: "Manual placeholder until you add a verified layoffs/news pipeline.",
    roles_json: JSON.stringify({
      "Frontend Engineers": "High likelihood",
      "ML Engineers": "Medium likelihood",
      "Product / Other": "Medium likelihood"
    }),
    locations_json: JSON.stringify(["California", "New York", "Remote"]),
    experience_json: JSON.stringify(["3–8 years"]),
    why_it_matters:
      "Temporary manual entry. Replace with sourced layoffs/news ingestion later.",
    recruiter_actions_json: JSON.stringify([
      "Use only as a watchlist signal for now",
      "Do not present as verified layoff count",
      "Replace with sourced event data later"
    ]),
    best_target: "ML + Frontend",
    source_name: "manual",
    source_type: "manual",
    source_url: "",
    job_count: 0,
    source_timestamp: new Date().toISOString()
  }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "Content-Type, Authorization"
    }
  });
}

function normalizeText(value) {
  return (value || "").toString().trim();
}

function isoNow() {
  return new Date().toISOString();
}

function daysAgoText(dateString) {
  if (!dateString) return "unknown";
  const ms = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function inferUrgency(dateString) {
  if (!dateString) return "Active";
  const ms = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 7) return "Fresh";
  if (days <= 21) return "Active";
  return "Old";
}

function inferCompetition(jobCount) {
  if (jobCount >= 100) return "High";
  if (jobCount >= 30) return "Medium";
  return "Low";
}

function inferOpportunityScore(jobCount, sourceType) {
  let score = 50;
  if (sourceType === "greenhouse" || sourceType === "lever") score += 10;
  if (jobCount >= 100) score += 25;
  else if (jobCount >= 30) score += 18;
  else if (jobCount >= 10) score += 10;
  return Math.min(score, 95);
}

function inferSignalType(jobCount) {
  if (jobCount >= 100) return "Hiring Surge";
  if (jobCount >= 10) return "Hiring";
  return "Selective Hiring";
}

function inferBestTarget(rolesMap) {
  const keys = Object.keys(rolesMap);
  return keys.slice(0, 2).join(" + ") || "General Engineering";
}

function keywordCategory(title, text) {
  const hay = `${title} ${text}`.toLowerCase();

  if (/(machine learning|ml|ai engineer|applied scientist|research scientist|data scientist)/.test(hay)) return "ML / AI";
  if (/(firmware|embedded|bsp|rtos)/.test(hay)) return "Firmware";
  if (/(frontend|react|ui|ux|web)/.test(hay)) return "Frontend";
  if (/(backend|api|server|distributed|platform)/.test(hay)) return "Backend";
  if (/(cloud|infrastructure|devops|sre|site reliability|kubernetes)/.test(hay)) return "Cloud / Infra";
  if (/(validation|verification|silicon|post-silicon|hardware|electrical|systems)/.test(hay)) return "Hardware / Validation";
  if (/(robotics|autonomy|controls)/.test(hay)) return "Robotics / Autonomy";
  if (/(manufacturing|operations|quality)/.test(hay)) return "Manufacturing / Quality";

  return "Other";
}

function buildRoleMap(jobs) {
  const counts = new Map();

  for (const job of jobs) {
    const key = keywordCategory(job.title, job.description || "");
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const total = jobs.length || 1;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  const out = {};
  for (const [role, count] of sorted) {
    out[role] = `${Math.round((count / total) * 100)}%`;
  }
  return out;
}

function buildLocationList(jobs) {
  const counts = new Map();

  for (const job of jobs) {
    const loc = normalizeText(job.location) || "Unspecified";
    counts.set(loc, (counts.get(loc) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);
}

function buildRecruiterActions(company, rolesMap, locations) {
  const topRoles = Object.keys(rolesMap).slice(0, 2);
  const topLocs = locations.slice(0, 2);

  return [
    `Target ${topRoles.join(" and ") || "top candidates"} first`,
    `Focus outreach on ${topLocs.join(" and ") || "priority locations"}`,
    `Use this signal as a fresh-company watchlist for ${company}`
  ];
}

async function ensureSchema(env) {
  const schema = `
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
  `;
  await env.DB.exec(schema);
}

async function clearDynamicSignals(env) {
  await env.DB.prepare(
    `DELETE FROM signals WHERE source_type IN ('greenhouse', 'lever')`
  ).run();
}

async function upsertSignal(env, row) {
  const sql = `
    INSERT INTO signals (
      company, signal_type, size_text, urgency, competition, confidence,
      opportunity_score, window_text, summary, roles_json, locations_json,
      experience_json, why_it_matters, recruiter_actions_json, best_target,
      source_name, source_type, source_url, source_timestamp, refreshed_at, job_count
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(company, source_type) DO UPDATE SET
      signal_type = excluded.signal_type,
      size_text = excluded.size_text,
      urgency = excluded.urgency,
      competition = excluded.competition,
      confidence = excluded.confidence,
      opportunity_score = excluded.opportunity_score,
      window_text = excluded.window_text,
      summary = excluded.summary,
      roles_json = excluded.roles_json,
      locations_json = excluded.locations_json,
      experience_json = excluded.experience_json,
      why_it_matters = excluded.why_it_matters,
      recruiter_actions_json = excluded.recruiter_actions_json,
      best_target = excluded.best_target,
      source_name = excluded.source_name,
      source_url = excluded.source_url,
      source_timestamp = excluded.source_timestamp,
      refreshed_at = excluded.refreshed_at,
      job_count = excluded.job_count
  `;

  await env.DB.prepare(sql).bind(
    row.company,
    row.signal_type,
    row.size_text,
    row.urgency,
    row.competition,
    row.confidence,
    row.opportunity_score,
    row.window_text,
    row.summary,
    row.roles_json,
    row.locations_json,
    row.experience_json,
    row.why_it_matters,
    row.recruiter_actions_json,
    row.best_target,
    row.source_name,
    row.source_type,
    row.source_url,
    row.source_timestamp,
    isoNow(),
    row.job_count
  ).run();
}

async function fetchGreenhouseBoard(company, boardToken) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
  const response = await fetch(url, {
    headers: { "accept": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Greenhouse fetch failed for ${company}: ${response.status}`);
  }

  const payload = await response.json();
  const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];

  const normalizedJobs = jobs.map((job) => ({
    title: normalizeText(job.title),
    description: normalizeText(job.content),
    location: normalizeText(job.location?.name || job.offices?.[0]?.name),
    updated_at: job.updated_at || job.absolute_url || isoNow()
  }));

  const rolesMap = buildRoleMap(normalizedJobs);
  const locations = buildLocationList(normalizedJobs);

  return {
    company,
    signal_type: inferSignalType(normalizedJobs.length),
    size_text: `${normalizedJobs.length} open roles`,
    urgency: "Fresh",
    competition: inferCompetition(normalizedJobs.length),
    confidence: 92,
    opportunity_score: inferOpportunityScore(normalizedJobs.length, "greenhouse"),
    window_text: normalizedJobs.length >= 30 ? "Open now" : "Selective window",
    summary: `Live public jobs data from Greenhouse with ${normalizedJobs.length} current postings.`,
    roles_json: JSON.stringify(rolesMap),
    locations_json: JSON.stringify(locations),
    experience_json: JSON.stringify(["Mixed experience levels"]),
    why_it_matters:
      "This uses live public job-board data. Rising open-role counts usually mean stronger hiring demand and tighter recruiter competition.",
    recruiter_actions_json: JSON.stringify(
      buildRecruiterActions(company, rolesMap, locations)
    ),
    best_target: inferBestTarget(rolesMap),
    source_name: "Greenhouse",
    source_type: "greenhouse",
    source_url: url,
    source_timestamp: isoNow(),
    job_count: normalizedJobs.length
  };
}

async function fetchLeverSite(company, site) {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json&limit=200`;
  const response = await fetch(url, {
    headers: { "accept": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Lever fetch failed for ${company}: ${response.status}`);
  }

  const jobs = await response.json();
  const normalizedJobs = (Array.isArray(jobs) ? jobs : []).map((job) => ({
    title: normalizeText(job.text),
    description: normalizeText(job.descriptionPlain || job.description || ""),
    location: normalizeText(job.categories?.location || job.categories?.allLocations || ""),
    updated_at: job.createdAt ? new Date(job.createdAt).toISOString() : isoNow()
  }));

  const rolesMap = buildRoleMap(normalizedJobs);
  const locations = buildLocationList(normalizedJobs);

  return {
    company,
    signal_type: inferSignalType(normalizedJobs.length),
    size_text: `${normalizedJobs.length} open roles`,
    urgency: inferUrgency(normalizedJobs[0]?.updated_at || isoNow()),
    competition: inferCompetition(normalizedJobs.length),
    confidence: 90,
    opportunity_score: inferOpportunityScore(normalizedJobs.length, "lever"),
    window_text: normalizedJobs.length >= 30 ? "Open now" : "Selective window",
    summary: `Live public jobs data from Lever with ${normalizedJobs.length} current postings.`,
    roles_json: JSON.stringify(rolesMap),
    locations_json: JSON.stringify(locations),
    experience_json: JSON.stringify(["Mixed experience levels"]),
    why_it_matters:
      "This uses live public job-posting data. Larger active boards usually signal stronger hiring pressure and faster recruiter competition.",
    recruiter_actions_json: JSON.stringify(
      buildRecruiterActions(company, rolesMap, locations)
    ),
    best_target: inferBestTarget(rolesMap),
    source_name: "Lever",
    source_type: "lever",
    source_url: url,
    source_timestamp: isoNow(),
    job_count: normalizedJobs.length
  };
}

async function refreshAll(env) {
  await ensureSchema(env);
  await clearDynamicSignals(env);

  for (const row of MANUAL_LAYOFFS) {
    await upsertSignal(env, row);
  }

  for (const item of GREENHOUSE_BOARDS) {
    try {
      const row = await fetchGreenhouseBoard(item.company, item.boardToken);
      await upsertSignal(env, row);
    } catch (error) {
      console.error(error);
    }
  }

  for (const item of LEVER_SITES) {
    try {
      const row = await fetchLeverSite(item.company, item.site);
      await upsertSignal(env, row);
    } catch (error) {
      console.error(error);
    }
  }

  return { ok: true, refreshed_at: isoNow() };
}

async function getSignals(env) {
  await ensureSchema(env);

  const { results } = await env.DB.prepare(`
    SELECT *
    FROM signals
    ORDER BY opportunity_score DESC, job_count DESC, company ASC
  `).all();

  return (results || []).map((row) => ({
    company: row.company,
    type: row.signal_type,
    size: row.size_text,
    urgency: row.urgency,
    timestamp: daysAgoText(row.source_timestamp),
    competition: row.competition,
    confidence: row.confidence,
    opportunityScore: row.opportunity_score,
    window: row.window_text,
    summary: row.summary,
    roles: JSON.parse(row.roles_json || "{}"),
    locations: JSON.parse(row.locations_json || "[]"),
    experience: JSON.parse(row.experience_json || "[]"),
    whyItMatters: row.why_it_matters,
    recruiterActions: JSON.parse(row.recruiter_actions_json || "[]"),
    bestTarget: row.best_target,
    sourceName: row.source_name,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    sourceTimestamp: row.source_timestamp,
    refreshedAt: row.refreshed_at,
    jobCount: row.job_count,
    outreach: `Hi, I’m reaching out because we’re tracking fresh movement and hiring signals around ${row.company}. Your background looks relevant for current openings in ${row.best_target || "priority areas"}. Open to a quick conversation?`
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "Content-Type, Authorization"
        }
      });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "youooo-world-api", now: isoNow() });
    }

    if (url.pathname === "/api/refresh" && request.method === "POST") {
      if (env.REFRESH_TOKEN) {
        const token = url.searchParams.get("token");
        if (token !== env.REFRESH_TOKEN) {
          return json({ ok: false, error: "Unauthorized" }, 401);
        }
      }
      const result = await refreshAll(env);
      return json(result);
    }

    if (url.pathname === "/api/signals" && request.method === "GET") {
      let signals = await getSignals(env);

      if (signals.length === 0) {
        await refreshAll(env);
        signals = await getSignals(env);
      }

      return json({
        ok: true,
        count: signals.length,
        signals
      });
    }

    return json({ ok: false, error: "Not found" }, 404);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refreshAll(env));
  }
};
