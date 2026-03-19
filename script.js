const API_BASE = "https://youooo-world-api.youooo.workers.dev";

let map;
let earthquakeLayer;
let marketMarkersLayer;
let activeLayer = "earthquakes";
let cachedSignals = [];

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupLayerButtons();
  setupModal();
  initMap();
  await loadAllData();
  setInterval(loadAllData, 5 * 60 * 1000);
});

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });
}

function setupLayerButtons() {
  const buttons = document.querySelectorAll(".layer-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeLayer = btn.dataset.layer;
      toggleLayers();
    });
  });
}

function setupModal() {
  const closeBtn = document.getElementById("closeModalBtn");
  const backdrop = document.getElementById("modalBackdrop");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeSignalModal);
  }

  if (backdrop) {
    backdrop.addEventListener("click", closeSignalModal);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSignalModal();
    }
  });
}

function initMap() {
  map = L.map("map", {
    zoomControl: true,
    worldCopyJump: true
  }).setView([22, 10], 2.2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(map);

  earthquakeLayer = L.layerGroup().addTo(map);
  marketMarkersLayer = L.layerGroup();
}

function toggleLayers() {
  if (activeLayer === "earthquakes") {
    if (!map.hasLayer(earthquakeLayer)) map.addLayer(earthquakeLayer);
    if (map.hasLayer(marketMarkersLayer)) map.removeLayer(marketMarkersLayer);
  } else if (activeLayer === "markets") {
    if (!map.hasLayer(marketMarkersLayer)) map.addLayer(marketMarkersLayer);
    if (map.hasLayer(earthquakeLayer)) map.removeLayer(earthquakeLayer);
  } else {
    if (!map.hasLayer(earthquakeLayer)) map.addLayer(earthquakeLayer);
    if (map.hasLayer(marketMarkersLayer)) map.removeLayer(marketMarkersLayer);
  }
}

async function loadAllData() {
  setUpdatedTime();

  await Promise.allSettled([
    loadWatchlist(),
    loadMarketMovers(),
    loadEarthquakes(),
    loadMarketNews(),
    loadJobsFeed(),
    loadAIFeed(),
    loadSignalAlerts(),
    loadTopSignals()
  ]);
}

function setUpdatedTime() {
  const now = new Date();
  const el = document.getElementById("updatedAt");
  if (el) {
    el.textContent = `UPDATED: ${now.toLocaleString()}`;
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

async function loadWatchlist() {
  const container = document.getElementById("watchlistGrid");
  if (!container) return;

  container.innerHTML = `<div class="empty-state">Loading watchlist...</div>`;

  try {
    const payload = await fetchJson(apiUrl("/api/watchlist"));
    const quotes = payload.data || [];

    if (!quotes.length) {
      container.innerHTML = `<div class="empty-state">No watchlist data found.</div>`;
      return;
    }

    container.innerHTML = quotes.map((quote) => {
      const changeClass =
        Number(quote.percentChange) > 0 ? "positive" :
        Number(quote.percentChange) < 0 ? "negative" : "neutral";

      return `
        <div class="quote-card">
          <div class="symbol">${escapeHtml(quote.symbol)}</div>
          <div class="price">${formatPrice(quote.price)}</div>
          <div class="change ${changeClass}">
            ${formatSigned(quote.change)} (${formatSigned(quote.percentChange)}%)
          </div>
          <div class="item-meta">Prev close: ${formatPrice(quote.prevClose)}</div>
        </div>
      `;
    }).join("");

    renderMarketMarkers(quotes);
  } catch (error) {
    console.error("Watchlist error:", error);
    container.innerHTML = `<div class="empty-state">Failed to load watchlist.</div>`;
  }
}

async function loadMarketMovers() {
  const container = document.getElementById("marketMovers");
  if (!container) return;

  container.innerHTML = `<div class="empty-state">Loading movers...</div>`;

  try {
    const payload = await fetchJson(apiUrl("/api/movers"));
    const items = payload.data || [];

    if (!items.length) {
      container.innerHTML = `<div class="empty-state">No movers found.</div>`;
      return;
    }

    container.innerHTML = items.map((item) => {
      const cls =
        Number(item.percentChange) > 0 ? "positive" :
        Number(item.percentChange) < 0 ? "negative" : "neutral";

      return `
        <div class="list-item">
          <div class="item-title">${escapeHtml(item.symbol)} — ${formatPrice(item.price)}</div>
          <div class="item-meta ${cls}">
            ${formatSigned(item.change)} (${formatSigned(item.percentChange)}%)
          </div>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error("Movers error:", error);
    container.innerHTML = `<div class="empty-state">Failed to load movers.</div>`;
  }
}

async function loadMarketNews() {
  const container = document.getElementById("marketNews");
  if (!container) return;

  container.innerHTML = `<div class="empty-state">Loading market news...</div>`;

  try {
    const payload = await fetchJson(apiUrl("/api/news?category=general"));
    const items = payload.data || [];

    if (!items.length) {
      container.innerHTML = `<div class="empty-state">No market news found.</div>`;
      return;
    }

    container.innerHTML = items.slice(0, 8).map(renderNewsItem).join("");
  } catch (error) {
    console.error("Market news error:", error);
    container.innerHTML = `<div class="empty-state">Failed to load market news.</div>`;
  }
}

async function loadJobsFeed() {
  const container = document.getElementById("jobsFeed");
  if (!container) return;

  container.innerHTML = `<div class="empty-state">Loading jobs intelligence...</div>`;

  try {
    const payload = await fetchJson(apiUrl("/api/jobs"));
    const items = payload.data || [];

    if (!items.length) {
      container.innerHTML = `<div class="empty-state">No jobs signals found right now.</div>`;
      return;
    }

    container.innerHTML = items.map(renderNewsItem).join("");
  } catch (error) {
    console.error("Jobs feed error:", error);
    container.innerHTML = `<div class="empty-state">Failed to load jobs intelligence.</div>`;
  }
}

async function loadAIFeed() {
  const container = document.getElementById("aiFeed");
  if (!container) return;

  container.innerHTML = `<div class="empty-state">Loading AI alerts...</div>`;

  try {
    const payload = await fetchJson(apiUrl("/api/ai"));
    const items = payload.data || [];

    if (!items.length) {
      container.innerHTML = `<div class="empty-state">No AI alerts found right now.</div>`;
      return;
    }

    container.innerHTML = items.map(renderNewsItem).join("");
  } catch (error) {
    console.error("AI feed error:", error);
    container.innerHTML = `<div class="empty-state">Failed to load AI alerts.</div>`;
  }
}

async function loadSignalAlerts() {
  const container = document.getElementById("liveAlerts");
  if (!container) return;

  container.innerHTML = `<div class="empty-state">Loading alerts...</div>`;

  try {
    const payload = await fetchJson(apiUrl("/api/signals"));
    const items = payload.data || [];

    if (!items.length) {
      container.innerHTML = `<div class="empty-state">No alerts available right now.</div>`;
      return;
    }

    container.innerHTML = items.map((item) => {
      const emoji =
        item.type === "market" ? "📈" :
        item.type === "jobs" ? "💼" :
        item.type === "ai" ? "🤖" : "🌍";

      const title = escapeHtml(item.title || "Alert");
      const content = item.url
        ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${title}</a>`
        : title;

      return `<div class="alert-item">${emoji} ${content}</div>`;
    }).join("");
  } catch (error) {
    console.error("Signal alerts error:", error);
    container.innerHTML = `<div class="empty-state">Failed to load alerts.</div>`;
  }
}

async function loadTopSignals() {
  const container = document.getElementById("topSignalsList");
  if (!container) return;

  container.innerHTML = `<div class="empty-state">Loading top signals...</div>`;

  try {
    const payload = await fetchJson(apiUrl("/api/signals"));
    const items = (payload.data || []).slice(0, 8);
    cachedSignals = items;

    if (!items.length) {
      container.innerHTML = `<div class="empty-state">No top signals available.</div>`;
      return;
    }

    container.innerHTML = items.map((item, index) => {
      const score = computeSignalScore(item);
      const typeLabel = item.type === "market"
        ? "Market"
        : item.type === "jobs"
        ? "Jobs"
        : "AI";

      const title = escapeHtml(item.title || "Untitled signal");
      const summary = escapeHtml((item.summary || "").slice(0, 140));
      const time = formatTimestamp(item.timestamp);

      return `
        <div class="top-signal-item" data-index="${index}">
          <div class="signal-type ${escapeHtml(item.type || "market")}">${typeLabel}</div>

          <div class="top-signal-head">
            <div>
              <div class="top-signal-title">${title}</div>
              <div class="item-meta">${summary}</div>
            </div>
            <div class="top-signal-score">Score ${score}</div>
          </div>

          <div class="signal-footer">
            <div class="news-source">${time}</div>
            <a href="#" class="why-link" data-index="${index}">Why it matters</a>
          </div>
        </div>
      `;
    }).join("");

    attachTopSignalEvents();
  } catch (error) {
    console.error("Top signals error:", error);
    container.innerHTML = `<div class="empty-state">Failed to load top signals.</div>`;
  }
}

function attachTopSignalEvents() {
  document.querySelectorAll(".top-signal-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      const index = Number(event.currentTarget.dataset.index);
      openSignalModal(cachedSignals[index]);
    });
  });

  document.querySelectorAll(".why-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const index = Number(event.currentTarget.dataset.index);
      openSignalModal(cachedSignals[index]);
    });
  });
}

function openSignalModal(signal) {
  if (!signal) return;

  const modal = document.getElementById("signalModal");
  const title = document.getElementById("modalTitle");
  const meta = document.getElementById("modalMeta");
  const summary = document.getElementById("modalSummary");
  const impactList = document.getElementById("modalImpactList");
  const watchList = document.getElementById("modalWatchList");
  const confidence = document.getElementById("modalConfidence");
  const sourceLink = document.getElementById("modalSourceLink");

  if (!modal || !title || !meta || !summary || !impactList || !watchList || !confidence || !sourceLink) {
    return;
  }

  const score = computeSignalScore(signal);
  const confidenceLabel = score >= 85 ? "High" : score >= 70 ? "Medium" : "Watch";
  const insights = buildWhyItMatters(signal);

  title.textContent = signal.title || "Signal Details";
  meta.textContent = `${formatSignalType(signal.type)} • Score ${score}`;
  summary.textContent = signal.summary || "No summary available.";

  impactList.innerHTML = insights.impact.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  watchList.innerHTML = insights.watch.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  confidence.textContent = confidenceLabel;

  if (signal.url) {
    sourceLink.href = signal.url;
    sourceLink.style.display = "inline-flex";
  } else {
    sourceLink.href = "#";
    sourceLink.style.display = "none";
  }

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeSignalModal() {
  const modal = document.getElementById("signalModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function buildWhyItMatters(signal) {
  const text = `${signal.title || ""} ${signal.summary || ""}`.toLowerCase();

  if (signal.type === "market") {
    return {
      impact: [
        "Large market moves often signal sentiment changes or reaction to breaking news.",
        "Semiconductors, tech indexes, and momentum names may react together.",
        "Watch for follow-through into the next session."
      ],
      watch: pickWatchList(text, ["AMD", "NVDA", "QQQ", "SPY", "TSLA", "AAPL"])
    };
  }

  if (signal.type === "jobs") {
    return {
      impact: [
        "Workforce cuts can signal slowing growth, cost pressure, or margin defense.",
        "Layoff signals often affect tech sentiment and hiring confidence.",
        "Repeated restructuring headlines can matter more than one headline alone."
      ],
      watch: pickWatchList(text, ["AMZN", "GOOGL", "META", "MSFT", "INTC", "AMD"])
    };
  }

  return {
    impact: [
      "AI headlines can move semiconductors, cloud names, and infrastructure suppliers.",
      "Model launches and GPU demand usually benefit the broader AI trade.",
      "Chip, datacenter, and cloud spending often move together."
    ],
    watch: pickWatchList(text, ["NVDA", "AMD", "MSFT", "GOOGL", "META", "SMH"])
  };
}

function pickWatchList(text, defaults) {
  const matches = [];

  if (text.includes("nvidia")) matches.push("Watch NVDA for semiconductor momentum.");
  if (text.includes("amd")) matches.push("Watch AMD for AI/compute spillover.");
  if (text.includes("microsoft")) matches.push("Watch MSFT for cloud and AI integration.");
  if (text.includes("google")) matches.push("Watch GOOGL for AI platform response.");
  if (text.includes("amazon")) matches.push("Watch AMZN for cost control and hiring signals.");
  if (text.includes("meta")) matches.push("Watch META for AI capex and restructuring signals.");
  if (text.includes("oil")) matches.push("Watch energy names if geopolitical risk stays elevated.");

  if (!matches.length) {
    return defaults.slice(0, 3).map((item) => `Watch ${item} for related movement.`);
  }

  return matches.slice(0, 4);
}

function computeSignalScore(signal) {
  let score = 60;
  const title = `${signal.title || ""} ${signal.summary || ""}`.toLowerCase();

  if (signal.type === "market") score += 10;
  if (signal.type === "jobs") score += 12;
  if (signal.type === "ai") score += 14;

  const importantWords = [
    "nvidia", "amd", "openai", "microsoft", "google", "meta",
    "layoff", "restructuring", "ai", "chip", "demand", "surge"
  ];

  importantWords.forEach((word) => {
    if (title.includes(word)) score += 2;
  });

  let ageHours = 12;
  if (signal.timestamp) {
    const ts = normalizeTimestamp(signal.timestamp);
    if (ts !== null) {
      ageHours = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60));
    }
  }

  if (ageHours < 6) score += 8;
  else if (ageHours < 24) score += 4;

  return Math.min(99, Math.round(score));
}

async function loadEarthquakes() {
  try {
    const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
    const data = await res.json();

    earthquakeLayer.clearLayers();

    data.features.slice(0, 40).forEach((feature) => {
      const [lng, lat, depth] = feature.geometry.coordinates;
      const mag = feature.properties.mag ?? 0;
      const place = feature.properties.place || "Unknown location";

      L.circleMarker([lat, lng], {
        radius: Math.max(4, mag * 2),
        weight: 1,
        opacity: 0.9,
        fillOpacity: 0.5
      })
      .bindPopup(`
        <strong>${escapeHtml(place)}</strong><br>
        Magnitude: ${mag}<br>
        Depth: ${depth} km
      `)
      .addTo(earthquakeLayer);
    });
  } catch (error) {
    console.error("Earthquake layer failed:", error);
  }
}

function renderNewsItem(item) {
  const title = escapeHtml(item.title || "Untitled");
  const source = escapeHtml(item.source || "Unknown source");
  const summary = escapeHtml((item.summary || "").slice(0, 200));
  const url = item.url || "#";
  const time = formatTimestamp(item.timestamp);

  return `
    <div class="news-item">
      <div class="news-title">
        <a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>
      </div>
      <div class="news-source">${source} • ${time}</div>
      <div class="item-meta">${summary}</div>
    </div>
  `;
}

function renderMarketMarkers(quotes) {
  marketMarkersLayer.clearLayers();

  const positions = {
    SPY: [40.7128, -74.0060],
    QQQ: [40.7128, -74.0060],
    AMD: [30.2672, -97.7431],
    NVDA: [37.3875, -122.0575],
    TSLA: [30.2672, -97.7431],
    AAPL: [37.3349, -122.0090],
    MSFT: [47.6426, -122.1393],
    META: [37.4845, -122.1477],
    AMZN: [47.6062, -122.3321],
    GOOGL: [37.4220, -122.0841]
  };

  quotes.forEach((quote) => {
    const pos = positions[quote.symbol];
    if (!pos) return;

    const isPositive = Number(quote.percentChange) >= 0;
    const fillColor = isPositive ? "#6dff98" : "#ff6b7d";

    const marker = L.circleMarker(pos, {
      radius: 10,
      weight: 1,
      opacity: 0.95,
      fillOpacity: 0.75,
      color: fillColor,
      fillColor
    });

    marker.bindPopup(`
      <strong>${escapeHtml(quote.symbol)}</strong><br>
      Price: ${formatPrice(quote.price)}<br>
      ${formatSigned(quote.change)} (${formatSigned(quote.percentChange)}%)
    `);

    marker.addTo(marketMarkersLayer);
  });

  toggleLayers();
}

function normalizeTimestamp(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && value.trim() !== "") {
      return numeric;
    }

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatTimestamp(value) {
  const ts = normalizeTimestamp(value);
  if (ts === null) return "Unknown time";
  return new Date(ts).toLocaleString();
}

function formatSignalType(type) {
  if (type === "jobs") return "Jobs";
  if (type === "ai") return "AI";
  return "Market";
}

function formatPrice(value) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatSigned(value) {
  const num = Number(value);
  const rounded = Math.round(num * 100) / 100;
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}