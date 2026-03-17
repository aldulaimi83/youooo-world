export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      if (url.pathname === "/api/aircraft") {
        return await handleAircraft(url);
      }

      if (url.pathname === "/api/conflicts") {
        return await handleConflicts(url, env);
      }

      if (url.pathname === "/api/fires") {
        return await handleFires(url, env);
      }

      if (url.pathname === "/api/health") {
        return jsonResponse({
          ok: true,
          service: "youooo-world-backend",
          time: new Date().toISOString()
        });
      }

      return jsonResponse(
        {
          ok: false,
          error: "Not found"
        },
        404
      );
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: error.message || "Unknown server error"
        },
        500
      );
    }
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

async function handleAircraft(url) {
  const west = clampCoord(url.searchParams.get("west"), -180, 180, -180);
  const south = clampCoord(url.searchParams.get("south"), -90, 90, -90);
  const east = clampCoord(url.searchParams.get("east"), -180, 180, 180);
  const north = clampCoord(url.searchParams.get("north"), -90, 90, 90);

  const openskyUrl =
    `https://opensky-network.org/api/states/all` +
    `?lamin=${south}&lomin=${west}&lamax=${north}&lomax=${east}`;

  const res = await fetch(openskyUrl, {
    headers: {
      "User-Agent": "youooo-world/1.0"
    }
  });

  if (!res.ok) {
    throw new Error(`OpenSky request failed with status ${res.status}`);
  }

  const data = await res.json();
  const states = Array.isArray(data.states) ? data.states : [];

  const normalized = states
    .map((s) => ({
      icao24: s[0],
      callsign: s[1] ? String(s[1]).trim() : "",
      origin_country: s[2],
      longitude: s[5],
      latitude: s[6],
      baro_altitude: s[7],
      on_ground: s[8],
      velocity: s[9],
      true_track: s[10],
      vertical_rate: s[11]
    }))
    .filter((s) => Number.isFinite(s.longitude) && Number.isFinite(s.latitude))
    .slice(0, 600);

  return jsonResponse({
    ok: true,
    source: "opensky",
    count: normalized.length,
    states: normalized
  });
}

async function handleConflicts(url, env) {
  if (!env.ACLED_TOKEN) {
    return jsonResponse(
      {
        ok: false,
        error: "Missing ACLED_TOKEN secret in Cloudflare Worker"
      },
      500
    );
  }

  const region = url.searchParams.get("region") || "ukraine";
  const config = getConflictRegionConfig(region);

  const today = new Date();
  const from = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const fromStr = toDateString(from);
  const toStr = toDateString(today);

  const apiUrl = new URL("https://acleddata.com/api/acled/read");
  apiUrl.searchParams.set("limit", "500");
  apiUrl.searchParams.set("event_date", `${fromStr}|${toStr}`);
  apiUrl.searchParams.set("event_date_where", "BETWEEN");
  apiUrl.searchParams.set("_format", "json");
  apiUrl.searchParams.set("country", config.countries.join("|"));

  const res = await fetch(apiUrl.toString(), {
    headers: {
      Authorization: `Bearer ${env.ACLED_TOKEN}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ACLED request failed ${res.status}: ${text.slice(0, 200)}`);
  }

  const payload = await res.json();
  const data = Array.isArray(payload.data) ? payload.data : [];

  const events = data
    .map((e) => ({
      country: e.country,
      admin1: e.admin1,
      location: e.location,
      latitude: e.latitude,
      longitude: e.longitude,
      event_type: e.event_type,
      sub_event_type: e.sub_event_type,
      event_date: e.event_date,
      fatalities: e.fatalities
    }))
    .filter((e) => Number.isFinite(Number(e.latitude)) && Number.isFinite(Number(e.longitude)))
    .slice(0, 400);

  return jsonResponse({
    ok: true,
    source: "acled",
    region,
    count: events.length,
    events
  });
}

function getConflictRegionConfig(region) {
  const regions = {
    ukraine: {
      countries: ["Ukraine", "Russia", "Belarus"]
    },
    "middle-east": {
      countries: [
        "Israel",
        "Palestine",
        "Lebanon",
        "Syria",
        "Iraq",
        "Iran",
        "Yemen",
        "Jordan"
      ]
    },
    africa: {
      countries: [
        "Sudan",
        "South Sudan",
        "Somalia",
        "Ethiopia",
        "Democratic Republic of Congo",
        "Nigeria",
        "Mali",
        "Niger",
        "Mozambique"
      ]
    }
  };

  return regions[region] || regions.ukraine;
}

async function handleFires(url, env) {
  if (!env.FIRMS_MAP_KEY) {
    return jsonResponse(
      {
        ok: false,
        error: "Missing FIRMS_MAP_KEY secret in Cloudflare Worker"
      },
      500
    );
  }

  const bbox = sanitizeBbox(url.searchParams.get("bbox") || "world");
  const source = "VIIRS_SNPP_NRT";
  const dayRange = "1";

  const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${env.FIRMS_MAP_KEY}/${source}/${bbox}/${dayRange}`;

  const res = await fetch(firmsUrl, {
    headers: {
      "User-Agent": "youooo-world/1.0"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FIRMS request failed ${res.status}: ${text.slice(0, 200)}`);
  }

  const csvText = await res.text();
  const rows = parseCsv(csvText);

  const fires = rows
    .map((row) => ({
      latitude: row.latitude,
      longitude: row.longitude,
      bright_ti4: row.bright_ti4,
      brightness: row.brightness,
      confidence: row.confidence,
      acq_date: row.acq_date,
      acq_time: row.acq_time
    }))
    .filter((f) => Number.isFinite(Number(f.latitude)) && Number.isFinite(Number(f.longitude)))
    .slice(0, 800);

  return jsonResponse({
    ok: true,
    source: "firms",
    count: fires.length,
    fires
  });
}

function clampCoord(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeBbox(value) {
  if (value === "world") return "world";

  const parts = String(value).split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return "world";
  }

  const west = Math.max(-180, Math.min(180, parts[0]));
  const south = Math.max(-90, Math.min(90, parts[1]));
  const east = Math.max(-180, Math.min(180, parts[2]));
  const north = Math.max(-90, Math.min(90, parts[3]));

  return `${west},${south},${east},${north}`;
}

function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, index) => {
      row[h] = values[index] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
}