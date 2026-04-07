// ─────────────────────────────────────────────
//  youooo-world-api  —  Cloudflare Worker
//  Features: Signals · AI Outreach · Watchlist Email Alerts · Map coords
// ─────────────────────────────────────────────

const GREENHOUSE_BOARDS = [
  { company: "Stripe", boardToken: "stripe" }
];

const LEVER_SITES = [];

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
    roles_json: JSON.stringify({ "Frontend Engineers": "High likelihood", "ML / AI": "Medium likelihood", "Product / Other": "Medium likelihood" }),
    locations_json: JSON.stringify(["California", "New York", "Remote"]),
    experience_json: JSON.stringify(["3–8 years"]),
    why_it_matters: "Temporary manual entry. Replace with sourced layoffs/news ingestion later.",
    recruiter_actions_json: JSON.stringify([
      "Use only as a watchlist signal for now",
      "Do not present as verified layoff count",
      "Replace with sourced event data later"
    ]),
    best_target: "ML / AI + Frontend",
    recruiter_brief: "Treat this as a watchlist signal for sourcing strategy only. Do not use it as a verified event count.",
    source_name: "manual",
    source_type: "manual",
    source_url: "",
    job_count: 0,
    source_timestamp: new Date().toISOString()
  }
];

// ── Company HQ coordinates for the world map ──
const COMPANY_COORDS = {
  "Meta":      { lat: 37.4845,  lng: -122.1477 },
  "Stripe":    { lat: 37.7749,  lng: -122.4194 },
  "Google":    { lat: 37.4220,  lng: -122.0840 },
  "Amazon":    { lat: 47.6062,  lng: -122.3321 },
  "Microsoft": { lat: 47.6398,  lng: -122.1282 },
  "Apple":     { lat: 37.3349,  lng: -122.0090 },
  "Netflix":   { lat: 37.2589,  lng: -121.9692 },
  "Salesforce":{ lat: 37.7946,  lng: -122.3999 },
  "Uber":      { lat: 37.7749,  lng: -122.4056 },
  "Airbnb":    { lat: 37.7680,  lng: -122.4025 },
  "Twitter":   { lat: 37.7767,  lng: -122.4155 },
  "LinkedIn":  { lat: 37.3893,  lng: -122.0542 },
  "OpenAI":    { lat: 37.7902,  lng: -122.3915 },
  "Anthropic": { lat: 37.7840,  lng: -122.3948 },
  "Lyft":      { lat: 37.7749,  lng: -122.3977 },
  "Snap":      { lat: 34.0195,  lng: -118.4912 },
  "Discord":   { lat: 37.7749,  lng: -122.4012 },
  "Shopify":   { lat: 45.4215,  lng:  -75.6919 },
  "Spotify":   { lat: 59.3293,  lng:   18.0686 },
  "SAP":       { lat: 49.2940,  lng:    8.6417 },
  "IBM":       { lat: 41.1065,  lng:  -74.1537 },
  "Oracle":    { lat: 37.5296,  lng: -122.2596 },
  "Cisco":     { lat: 37.4108,  lng: -121.9746 },
  "Intel":     { lat: 37.3875,  lng: -121.9636 },
  "NVIDIA":    { lat: 37.3637,  lng: -121.9698 },
  "AMD":       { lat: 37.3721,  lng: -121.9748 }
};

const CITY_COORDS = {
  "California":    { lat: 37.4000, lng: -120.5000 },
  "New York":      { lat: 40.7128, lng:  -74.0060 },
  "Seattle":       { lat: 47.6062, lng: -122.3321 },
  "Austin":        { lat: 30.2672, lng:  -97.7431 },
  "Boston":        { lat: 42.3601, lng:  -71.0589 },
  "Chicago":       { lat: 41.8781, lng:  -87.6298 },
  "Denver":        { lat: 39.7392, lng: -104.9903 },
  "Miami":         { lat: 25.7617, lng:  -80.1918 },
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  "Los Angeles":   { lat: 34.0522, lng: -118.2437 },
  "London":        { lat: 51.5074, lng:   -0.1278 },
  "Berlin":        { lat: 52.5200, lng:   13.4050 },
  "Toronto":       { lat: 43.6532, lng:  -79.3832 },
  "Vancouver":     { lat: 49.2827, lng: -123.1207 },
  "Singapore":     { lat:  1.3521, lng:  103.8198 },
  "Sydney":        { lat: -33.8688,lng:  151.2093 },
  "Dublin":        { lat: 53.3498, lng:   -6.2603 },
  "Amsterdam":     { lat: 52.3676, lng:    4.9041 },
  "Remote":        { lat: 20.0000, lng:    0.0000 }
};

// ── Utility helpers ───────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "Content-Type, Authorization"
    }
  });
}

function normalizeText(value) { return (value || "").toString().trim(); }
function isoNow() { return new Date().toISOString(); }

function parseDateSafe(dateString) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function daysAgoText(dateString) {
  const parsed = parseDateSafe(dateString);
  if (!parsed) return "unknown";
  const ms = Date.now() - parsed.getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function inferUrgency(dateString) {
  const parsed = parseDateSafe(dateString);
  if (!parsed) return "Active";
  const ms = Date.now() - parsed.getTime();
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

function inferSignalType(jobCount) {
  if (jobCount >= 100) return "Hiring Surge";
  if (jobCount >= 10) return "Hiring";
  return "Selective Hiring";
}

function inferBestTarget(rolesMap) {
  const keys = Object.keys(rolesMap || {});
  return keys.slice(0, 2).join(" + ") || "General Engineering";
}

function keywordCategory(title, text) {
  const t = `${title || ""}`.toLowerCase();
  const d = `${text || ""}`.toLowerCase();
  if (/(frontend|front-end|react|ui engineer|web engineer|ux engineer)/.test(t)) return "Frontend";
  if (/(backend|back-end|api|platform engineer|server|distributed systems)/.test(t)) return "Backend";
  if (/(machine learning|ml engineer|ai engineer|research scientist|data scientist|applied scientist)/.test(t)) return "ML / AI";
  if (/(firmware|embedded|bsp|rtos)/.test(t)) return "Firmware";
  if (/(cloud|infrastructure|infra|devops|sre|site reliability|kubernetes)/.test(t)) return "Cloud / Infra";
  if (/(hardware|validation|verification|silicon|post-silicon|electrical|systems engineer)/.test(t)) return "Hardware / Validation";
  if (/(robotics|autonomy|controls)/.test(t)) return "Robotics / Autonomy";
  if (/(manufacturing|operations|quality)/.test(t)) return "Manufacturing / Quality";
  if (/(machine learning|artificial intelligence|ai)/.test(d)) return "ML / AI";
  if (/(cloud|infrastructure|kubernetes|devops|sre)/.test(d)) return "Cloud / Infra";
  if (/(frontend|react|web)/.test(d)) return "Frontend";
  if (/(backend|api|server|platform)/.test(d)) return "Backend";
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
  for (const [role, count] of sorted) out[role] = `${Math.round((count / total) * 100)}%`;
  return out;
}

function buildLocationList(jobs) {
  const counts = new Map();
  for (const job of jobs) {
    const loc = normalizeText(job.location) || "Unspecified";
    counts.set(loc, (counts.get(loc) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name);
}

function buildRecruiterActions(company, rolesMap, locations) {
  const topRoles = Object.keys(rolesMap || {}).slice(0, 2);
  const topLocs = (locations || []).slice(0, 2);
  return [
    `Target ${topRoles.join(" and ") || "top candidates"} first`,
    `Focus outreach on ${topLocs.join(" and ") || "priority locations"}`,
    `Use this signal as a fresh-company watchlist for ${company}`
  ];
}

function inferTrend(previousCount, currentCount, signalType) {
  if (signalType === "Layoffs") return { direction: "watch", label: "Talent release watch", deltaPercent: 0 };
  if (previousCount == null || previousCount <= 0) {
    return { direction: "watch", label: currentCount > 0 ? "New live signal" : "Watch", deltaPercent: 0 };
  }
  const delta = currentCount - previousCount;
  const deltaPercent = Math.round((delta / previousCount) * 100);
  if (deltaPercent >= 10) return { direction: "up", label: `Up ${deltaPercent}%`, deltaPercent };
  if (deltaPercent <= -10) return { direction: "down", label: `Down ${Math.abs(deltaPercent)}%`, deltaPercent };
  return { direction: "flat", label: "Flat", deltaPercent };
}

function computeOpportunityScore({ jobCount, sourceType, confidence, urgency, competition, trendDirection, trendDeltaPercent, signalType }) {
  let score = 35;
  if (sourceType === "greenhouse" || sourceType === "lever") score += 10;
  score += Math.min(25, Math.floor((jobCount || 0) / 8));
  score += Math.round((confidence || 0) / 10);
  if (urgency === "Fresh") score += 8;
  else if (urgency === "Active") score += 4;
  if (competition === "Low") score += 8;
  else if (competition === "Medium") score += 4;
  if (trendDirection === "up") score += Math.min(10, Math.floor(Math.abs(trendDeltaPercent || 0) / 5));
  if (trendDirection === "down") score -= 4;
  if (signalType === "Layoffs") score += 6;
  return Math.max(1, Math.min(99, score));
}

function buildRecruiterBrief({ company, signalType, jobCount, locations, rolesMap, trend }) {
  const topRoles = Object.keys(rolesMap || {}).slice(0, 2).join(" + ") || "general roles";
  const topLocations = (locations || []).slice(0, 2).join(" and ") || "priority markets";
  if (signalType === "Layoffs") {
    return `${company} is on manual layoff watch. Use it as a sourcing watchlist for ${topRoles} talent in ${topLocations}, but do not treat it as verified event volume.`;
  }
  return `${company} currently shows ${jobCount} open roles with strongest concentration in ${topRoles}. Focus recruiter attention on ${topLocations}. Current trend: ${trend.label}.`;
}

// ── DB helpers ────────────────────────────────
async function ensureSchema(env) {
  await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='signals'").first();
  await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='signal_history'").first();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      company TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_notified_at TEXT,
      UNIQUE(email, company)
    )
  `).run();
}

async function clearDynamicSignals(env) {
  await env.DB.prepare("DELETE FROM signals WHERE source_type IN ('greenhouse', 'lever', 'manual')").run();
}

async function insertHistorySnapshot(env, company, sourceType, jobCount) {
  await env.DB.prepare(
    "INSERT INTO signal_history (company, source_type, job_count, captured_at) VALUES (?, ?, ?, ?)"
  ).bind(company, sourceType, jobCount, isoNow()).run();
}

async function getPreviousSnapshot(env, company, sourceType) {
  const row = await env.DB.prepare(`
    SELECT job_count, captured_at FROM signal_history
    WHERE company = ? AND source_type = ?
    ORDER BY captured_at DESC LIMIT 1 OFFSET 1
  `).bind(company, sourceType).first();
  return row || null;
}

async function upsertSignal(env, row) {
  const sql = `
    INSERT INTO signals (
      company, signal_type, size_text, urgency, competition, confidence,
      opportunity_score, window_text, summary, roles_json, locations_json,
      experience_json, why_it_matters, recruiter_actions_json, best_target,
      recruiter_brief, source_name, source_type, source_url, source_timestamp, refreshed_at, job_count
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(company, source_type) DO UPDATE SET
      signal_type=excluded.signal_type, size_text=excluded.size_text, urgency=excluded.urgency,
      competition=excluded.competition, confidence=excluded.confidence,
      opportunity_score=excluded.opportunity_score, window_text=excluded.window_text,
      summary=excluded.summary, roles_json=excluded.roles_json,
      locations_json=excluded.locations_json, experience_json=excluded.experience_json,
      why_it_matters=excluded.why_it_matters, recruiter_actions_json=excluded.recruiter_actions_json,
      best_target=excluded.best_target, recruiter_brief=excluded.recruiter_brief,
      source_name=excluded.source_name, source_url=excluded.source_url,
      source_timestamp=excluded.source_timestamp, refreshed_at=excluded.refreshed_at,
      job_count=excluded.job_count
  `;
  await env.DB.prepare(sql).bind(
    row.company, row.signal_type, row.size_text, row.urgency, row.competition, row.confidence,
    row.opportunity_score, row.window_text, row.summary, row.roles_json, row.locations_json,
    row.experience_json, row.why_it_matters, row.recruiter_actions_json, row.best_target,
    row.recruiter_brief, row.source_name, row.source_type, row.source_url,
    row.source_timestamp, isoNow(), row.job_count
  ).run();
}

// ── Data fetchers ─────────────────────────────
async function fetchGreenhouseBoard(company, boardToken) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Greenhouse fetch failed for ${company}: ${response.status}`);
  const payload = await response.json();
  const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
  const normalizedJobs = jobs.map(job => ({
    title: normalizeText(job.title),
    description: normalizeText(job.content),
    location: normalizeText(job.location?.name || job.offices?.[0]?.name),
    updated_at: job.updated_at || isoNow()
  }));
  const rolesMap = buildRoleMap(normalizedJobs);
  const locations = buildLocationList(normalizedJobs);
  return {
    company, signal_type: inferSignalType(normalizedJobs.length),
    size_text: `${normalizedJobs.length} open roles`, urgency: "Fresh",
    competition: inferCompetition(normalizedJobs.length), confidence: 92,
    window_text: normalizedJobs.length >= 30 ? "Open now" : "Selective window",
    summary: `Live public jobs data from Greenhouse with ${normalizedJobs.length} current postings.`,
    roles_json: JSON.stringify(rolesMap), locations_json: JSON.stringify(locations),
    experience_json: JSON.stringify(["Mixed experience levels"]),
    why_it_matters: "This uses live public job-board data. Rising open-role counts usually mean stronger hiring demand and tighter recruiter competition.",
    recruiter_actions_json: JSON.stringify(buildRecruiterActions(company, rolesMap, locations)),
    best_target: inferBestTarget(rolesMap), recruiter_brief: "",
    source_name: "Greenhouse", source_type: "greenhouse", source_url: url,
    source_timestamp: isoNow(), job_count: normalizedJobs.length, roles_map: rolesMap, locations
  };
}

async function fetchLeverSite(company, site) {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json&limit=200`;
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Lever fetch failed for ${company}: ${response.status}`);
  const jobs = await response.json();
  const normalizedJobs = (Array.isArray(jobs) ? jobs : []).map(job => ({
    title: normalizeText(job.text),
    description: normalizeText(job.descriptionPlain || job.description || ""),
    location: normalizeText(job.categories?.location || job.categories?.allLocations || ""),
    updated_at: job.createdAt ? new Date(job.createdAt).toISOString() : isoNow()
  }));
  const rolesMap = buildRoleMap(normalizedJobs);
  const locations = buildLocationList(normalizedJobs);
  return {
    company, signal_type: inferSignalType(normalizedJobs.length),
    size_text: `${normalizedJobs.length} open roles`,
    urgency: inferUrgency(normalizedJobs[0]?.updated_at || isoNow()),
    competition: inferCompetition(normalizedJobs.length), confidence: 90,
    window_text: normalizedJobs.length >= 30 ? "Open now" : "Selective window",
    summary: `Live public job-posting data from Lever with ${normalizedJobs.length} current postings.`,
    roles_json: JSON.stringify(rolesMap), locations_json: JSON.stringify(locations),
    experience_json: JSON.stringify(["Mixed experience levels"]),
    why_it_matters: "This uses live public job-posting data. Larger active boards usually signal stronger hiring pressure and faster recruiter competition.",
    recruiter_actions_json: JSON.stringify(buildRecruiterActions(company, rolesMap, locations)),
    best_target: inferBestTarget(rolesMap), recruiter_brief: "",
    source_name: "Lever", source_type: "lever", source_url: url,
    source_timestamp: isoNow(), job_count: normalizedJobs.length, roles_map: rolesMap, locations
  };
}

async function prepareScoredRow(env, row) {
  const previous = await getPreviousSnapshot(env, row.company, row.source_type);
  const trend = inferTrend(previous?.job_count ?? null, row.job_count, row.signal_type);
  row.opportunity_score = computeOpportunityScore({
    jobCount: row.job_count, sourceType: row.source_type, confidence: row.confidence,
    urgency: row.urgency, competition: row.competition,
    trendDirection: trend.direction, trendDeltaPercent: trend.deltaPercent, signalType: row.signal_type
  });
  row.recruiter_brief = buildRecruiterBrief({
    company: row.company, signalType: row.signal_type, jobCount: row.job_count,
    locations: row.locations || JSON.parse(row.locations_json || "[]"),
    rolesMap: row.roles_map || JSON.parse(row.roles_json || "{}"), trend
  });
  await insertHistorySnapshot(env, row.company, row.source_type, row.job_count);
  return row;
}

async function refreshAll(env) {
  await ensureSchema(env);
  await clearDynamicSignals(env);
  for (const baseRow of MANUAL_LAYOFFS) {
    const row = await prepareScoredRow(env, { ...baseRow, source_timestamp: isoNow() });
    await upsertSignal(env, row);
  }
  for (const item of GREENHOUSE_BOARDS) {
    try {
      const baseRow = await fetchGreenhouseBoard(item.company, item.boardToken);
      const row = await prepareScoredRow(env, baseRow);
      await upsertSignal(env, row);
    } catch (error) { console.error(`Greenhouse error for ${item.company}:`, error.message); }
  }
  for (const item of LEVER_SITES) {
    try {
      const baseRow = await fetchLeverSite(item.company, item.site);
      const row = await prepareScoredRow(env, baseRow);
      await upsertSignal(env, row);
    } catch (error) { console.error(`Lever error for ${item.company}:`, error.message); }
  }
  return { ok: true, refreshed_at: isoNow() };
}

function resolveCoords(company, locations) {
  if (COMPANY_COORDS[company]) return COMPANY_COORDS[company];
  for (const loc of (locations || [])) {
    const key = Object.keys(CITY_COORDS).find(k => loc.toLowerCase().includes(k.toLowerCase()));
    if (key) return CITY_COORDS[key];
  }
  return { lat: 37.7749, lng: -122.4194 }; // default: San Francisco
}

async function getSignals(env) {
  await ensureSchema(env);
  const { results } = await env.DB.prepare(
    "SELECT * FROM signals ORDER BY opportunity_score DESC, job_count DESC, company ASC"
  ).all();
  const output = [];
  for (const row of results || []) {
    const previous = await getPreviousSnapshot(env, row.company, row.source_type);
    const trend = inferTrend(previous?.job_count ?? null, row.job_count, row.signal_type);
    const locations = JSON.parse(row.locations_json || "[]");
    output.push({
      company: row.company, type: row.signal_type, size: row.size_text,
      urgency: row.urgency, timestamp: daysAgoText(row.source_timestamp),
      competition: row.competition, confidence: row.confidence,
      opportunityScore: row.opportunity_score, window: row.window_text,
      summary: row.summary, roles: JSON.parse(row.roles_json || "{}"),
      locations, experience: JSON.parse(row.experience_json || "[]"),
      whyItMatters: row.why_it_matters,
      recruiterActions: JSON.parse(row.recruiter_actions_json || "[]"),
      bestTarget: row.best_target, recruiterBrief: row.recruiter_brief || "",
      sourceName: row.source_name, sourceType: row.source_type,
      sourceUrl: row.source_url, sourceTimestamp: row.source_timestamp,
      refreshedAt: row.refreshed_at, jobCount: row.job_count,
      trendDirection: trend.direction, trendLabel: trend.label,
      trendDeltaPercent: trend.deltaPercent,
      coords: resolveCoords(row.company, locations),
      outreach: `Hi, I'm reaching out because we're tracking fresh movement and hiring signals around ${row.company}. Your background looks relevant for current openings in ${row.best_target || "priority areas"}. Open to a quick conversation?`
    });
  }
  return output;
}

// ── FEATURE 1: AI Outreach via Claude API ─────
async function generateOutreach(env, signal) {
  if (!env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not configured as a Worker secret" };
  }
  const roles = Object.keys(signal.roles || {}).slice(0, 3).join(", ") || signal.bestTarget || "engineering";
  const locs  = (signal.locations || []).slice(0, 2).join(" and ") || "key markets";

  const prompt = `You are a professional recruiter. Write a short personalized LinkedIn outreach message targeting talent from ${signal.company}.

Signal:
- Type: ${signal.type} (${signal.urgency} urgency)
- Top roles available: ${roles}
- Key locations: ${locs}
- Context: ${signal.recruiterBrief || signal.summary}

Rules:
- 3–4 sentences maximum
- Professional but warm, NOT salesy
- Mention the company + a specific role type
- End with a simple open question
- Do NOT include a greeting like "Hi [Name]" — start with the hook sentence

Return only the message text.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    return { ok: false, error: `Claude API error ${resp.status}: ${err}` };
  }
  const data = await resp.json();
  const message = data.content?.[0]?.text?.trim() || "";
  return { ok: true, message };
}

// ── FEATURE 3: Send watchlist emails via Resend
async function sendWatchlistEmails(env, freshSignals) {
  if (!env.RESEND_API_KEY || !freshSignals.length) return;
  await ensureSchema(env);

  const { results: entries } = await env.DB.prepare("SELECT email, company FROM watchlist").all();
  if (!entries?.length) return;

  const byEmail = new Map();
  for (const e of entries) {
    if (!byEmail.has(e.email)) byEmail.set(e.email, []);
    byEmail.get(e.email).push(e.company);
  }

  for (const [email, companies] of byEmail) {
    const matched = freshSignals.filter(s =>
      companies.some(c => c.toLowerCase() === s.company.toLowerCase())
    );
    if (!matched.length) continue;

    const signalHtml = matched.map(s => `
      <div style="margin:12px 0;padding:16px;background:#0c1220;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
        <strong style="color:#76a9ff;font-size:18px;">${s.company}</strong>
        <span style="margin-left:10px;color:#9aa7c7;font-size:13px;">${s.type} · ${s.urgency}</span>
        <p style="margin:8px 0 0;color:#dce6ff;font-size:14px;line-height:1.5;">${s.summary}</p>
        <p style="margin:6px 0 0;color:#9aa7c7;font-size:13px;">Top roles: ${Object.keys(s.roles||{}).slice(0,2).join(", ") || s.bestTarget}</p>
      </div>`).join("");

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Youooo Talent <alerts@youooo.world>",
        to: [email],
        subject: `🚀 ${matched.length} fresh signal${matched.length > 1 ? "s" : ""} on your watchlist`,
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="background:#070b14;color:#edf2ff;font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#76a9ff;font-size:28px;margin:0;">🚀 Youooo Talent</h1>
    <p style="color:#9aa7c7;margin:6px 0 0;font-size:14px;">Fresh talent signals for your watchlist</p>
  </div>
  <div style="background:#0c1220;border-radius:16px;padding:20px;border:1px solid rgba(255,255,255,0.08);">
    <h2 style="margin:0 0 16px;font-size:20px;">New signals on your watchlist 📡</h2>
    ${signalHtml}
  </div>
  <p style="text-align:center;margin-top:20px;color:#9aa7c7;font-size:12px;">
    You subscribed on Youooo Talent. Click Watch again in the app to unsubscribe.
  </p>
</body></html>`
      })
    });

    for (const s of matched) {
      await env.DB.prepare("UPDATE watchlist SET last_notified_at=? WHERE email=? AND company=?")
        .bind(isoNow(), email, s.company).run();
    }
  }
}

// ── Main request handler ──────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
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
        if (token !== env.REFRESH_TOKEN) return json({ ok: false, error: "Unauthorized" }, 401);
      }
      return json(await refreshAll(env));
    }

    if (url.pathname === "/api/signals" && request.method === "GET") {
      let signals = await getSignals(env);
      if (signals.length === 0) {
        await refreshAll(env);
        signals = await getSignals(env);
      }
      return json({ ok: true, count: signals.length, signals });
    }

    // ── FEATURE 1: AI Outreach ─────────────────
    if (url.pathname === "/api/outreach" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
      const result = await generateOutreach(env, body);
      return json(result, result.ok ? 200 : 500);
    }

    // ── FEATURE 3: Watchlist subscribe ────────
    if (url.pathname === "/api/watchlist/subscribe" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
      const { email, company } = body || {};
      if (!email || !company) return json({ ok: false, error: "email and company required" }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return json({ ok: false, error: "Invalid email address" }, 400);
      await ensureSchema(env);
      await env.DB.prepare(
        "INSERT OR IGNORE INTO watchlist (email, company, created_at) VALUES (?, ?, ?)"
      ).bind(email.toLowerCase().trim(), company.trim(), isoNow()).run();
      return json({ ok: true, message: `Now watching ${company}` });
    }

    // ── FEATURE 3: Watchlist unsubscribe ──────
    if (url.pathname === "/api/watchlist/unsubscribe" && request.method === "DELETE") {
      let body;
      try { body = await request.json(); }
      catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
      const { email, company } = body || {};
      if (!email || !company) return json({ ok: false, error: "email and company required" }, 400);
      await ensureSchema(env);
      await env.DB.prepare(
        "DELETE FROM watchlist WHERE email=? AND company=?"
      ).bind(email.toLowerCase().trim(), company.trim()).run();
      return json({ ok: true, message: `Unsubscribed from ${company}` });
    }

    // ── FEATURE 3: Check watchlist ────────────
    if (url.pathname === "/api/watchlist/check" && request.method === "GET") {
      const email   = url.searchParams.get("email");
      const company = url.searchParams.get("company");
      if (!email || !company) return json({ ok: false, error: "email and company required" }, 400);
      await ensureSchema(env);
      const row = await env.DB.prepare(
        "SELECT id FROM watchlist WHERE email=? AND company=?"
      ).bind(email.toLowerCase().trim(), company.trim()).first();
      return json({ ok: true, watching: !!row });
    }

    return json({ ok: false, error: "Not found" }, 404);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      await refreshAll(env);
      const signals = await getSignals(env);
      const fresh = signals.filter(s => s.urgency === "Fresh");
      await sendWatchlistEmails(env, fresh);
    })());
  }
};
