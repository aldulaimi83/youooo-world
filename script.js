const API_BASE = "https://youooo-world-api.youooo.workers.dev";

let map;
let earthquakeLayer;
let marketMarkersLayer;
let activeLayer = "earthquakes";

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupLayerButtons();
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
    loadSignalAlerts()
  ]);
}

function setUpdatedTime() {
  const now = new Date();
  document.getElementById("updatedAt").textContent = `UPDATED: ${now.toLocaleString()}`;
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
        quote.percentChange > 0 ? "positive" :
        quote.percentChange < 0 ? "negative" : "neutral";

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
    console.error(error);
    container.innerHTML = `<div class="empty-state">Failed to load watchlist.</div>`;
  }
}

async function loadMarketMovers() {
  const container = document.getElementById("marketMovers");
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
        item.percentChange > 0 ? "positive" :
        item.percentChange < 0 ? "negative" : "neutral";

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
    console.error(error);
    container.innerHTML = `<div class="empty-state">Failed to load movers.</div>`;
  }
}

async function loadMarketNews() {
  const container = document.getElementById("marketNews");
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
    console.error(error);
    container.innerHTML = `<div class="empty-state">Failed to load market news.</div>`;
  }
}

async function loadJobsFeed() {
  const container = document.getElementById("jobsFeed");
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
    console.error(error);
    container.innerHTML = `<div class="empty-state">Failed to load jobs intelligence.</div>`;
  }
}

async function loadAIFeed() {
  const container = document.getElementById("aiFeed");
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
    console.error(error);
    container.innerHTML = `<div class="empty-state">Failed to load AI alerts.</div>`;
  }
}

async function loadSignalAlerts() {
  const container = document.getElementById("liveAlerts");
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
    console.error(error);
    container.innerHTML = `<div class="empty-state">Failed to load alerts.</div>`;
  }
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
  const time = item.timestamp ? new Date(item.timestamp).toLocaleString() : "Unknown time";

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

    const cls =
      quote.percentChange > 0 ? "positive" :
      quote.percentChange < 0 ? "negative" : "neutral";

    const marker = L.circleMarker(pos, {
      radius: 10,
      weight: 1,
      opacity: 0.9,
      fillOpacity: 0.65
    });

    marker.bindPopup(`
      <strong>${escapeHtml(quote.symbol)}</strong><br>
      Price: ${formatPrice(quote.price)}<br>
      <span class="${cls}">
        ${formatSigned(quote.change)} (${formatSigned(quote.percentChange)}%)
      </span>
    `);

    marker.addTo(marketMarkersLayer);
  });

  toggleLayers();
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