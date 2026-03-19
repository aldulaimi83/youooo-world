
const FINNHUB_API_KEY = "d6sv32pr01qoqoirkkfgd6sv32pr01qoqoirkkg0";

const WATCHLIST = ["SPY", "QQQ", "AMD", "NVDA", "TSLA", "BTCUSD"];
const MOVERS = ["AMD", "NVDA", "TSLA", "AAPL", "MSFT", "META", "AMZN", "GOOGL"];
const JOBS_QUERY =
  "layoffs OR hiring freeze OR job cuts OR workforce OR restructuring Amazon OR Google OR Meta OR Microsoft OR Intel OR AMD";
const AI_QUERY =
  "OpenAI OR NVIDIA OR AMD OR Google AI OR Microsoft AI OR Meta AI OR AI chips OR AI regulation";

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
    loadAIFeed()
  ]);

  buildLiveAlerts();
}

function setUpdatedTime() {
  const now = new Date();
  document.getElementById("updatedAt").textContent =
    `UPDATED: ${now.toLocaleString()}`;
}

async function loadWatchlist() {
  const container = document.getElementById("watchlistGrid");
  container.innerHTML = `<div class="empty-state">Loading watchlist...</div>`;

  try {
    const quotes = await Promise.all(WATCHLIST.map((symbol) => fetchQuote(symbol)));
    container.innerHTML = quotes
      .map((quote) => {
        if (!quote) {
          return `
            <div class="quote-card">
              <div class="symbol">N/A</div>
              <div class="item-meta">Failed to load</div>
            </div>
          `;
        }

        const changeClass =
          quote.percentChange > 0 ? "positive" :
          quote.percentChange < 0 ? "negative" : "neutral";

        return `
          <div class="quote-card">
            <div class="symbol">${quote.symbol}</div>
            <div class="price">${quote.price}</div>
            <div class="change ${changeClass}">
              ${formatSigned(quote.change)} (${formatSigned(quote.percentChange)}%)
            </div>
            <div class="item-meta">Prev close: ${quote.prevClose}</div>
          </div>
        `;
      })
      .join("");

    renderMarketMarkers(quotes.filter(Boolean));
  } catch (error) {
    console.error("Watchlist load failed:", error);
    container.innerHTML = `<div class="empty-state">Failed to load watchlist.</div>`;
  }
}

async function loadMarketMovers() {
  const container = document.getElementById("marketMovers");
  container.innerHTML = `<div class="empty-state">Loading movers...</div>`;

  try {
    const quotes = await Promise.all(MOVERS.map((symbol) => fetchQuote(symbol)));
    const valid = quotes.filter(Boolean).sort((a, b) => b.percentChange - a.percentChange);
    const top = [...valid.slice(0, 4), ...valid.slice(-2)].slice(0, 6);

    container.innerHTML = top.map((item) => {
      const cls = item.percentChange > 0 ? "positive" : item.percentChange < 0 ? "negative" : "neutral";
      return `
        <div class="list-item">
          <div class="item-title">${item.symbol} — ${item.price}</div>
          <div class="item-meta ${cls}">
            ${formatSigned(item.change)} (${formatSigned(item.percentChange)}%)
          </div>
        </div>
      `;
    }).join("");
  } catch (error) {
    console.error("Movers load failed:", error);
    container.innerHTML = `<div class="empty-state">Failed to load movers.</div>`;
  }
}

async function loadEarthquakes() {
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    );
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
          <strong>${place}</strong><br>
          Magnitude: ${mag}<br>
          Depth: ${depth} km
        `)
        .addTo(earthquakeLayer);
    });
  } catch (error) {
    console.error("Earthquake layer failed:", error);
  }
}

async function loadMarketNews() {
  const container = document.getElementById("marketNews");
  container.innerHTML = `<div class="empty-state">Loading market news...</div>`;

  try {
    const news = await fetchFinnhubNews("general");
    const filtered = news.slice(0, 8);

    container.innerHTML = filtered.map(renderNewsItem).join("");
  } catch (error) {
    console.error("Market news failed:", error);
    container.innerHTML = `<div class="empty-state">Failed to load market news.</div>`;
  }
}

async function loadJobsFeed() {
  const container = document.getElementById("jobsFeed");
  container.innerHTML = `<div class="empty-state">Loading jobs intelligence...</div>`;

  try {
    const news = await fetchFinnhubNews("general");
    const filtered = news
      .filter((item) => {
        const text = `${item.headline || ""} ${item.summary || ""}`.toLowerCase();
        return [
          "layoff",
          "job cut",
          "workforce",
          "restructuring",
          "hiring",
          "headcount",
          "reduction",
          "freeze"
        ].some((term) => text.includes(term));
      })
      .slice(0, 8);

    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state">No strong jobs signals found right now.</div>`;
      return;
    }

    container.innerHTML = filtered.map(renderNewsItem).join("");
  } catch (error) {
    console.error("Jobs feed failed:", error);
    container.innerHTML = `<div class="empty-state">Failed to load jobs intelligence.</div>`;
  }
}

async function loadAIFeed() {
  const container = document.getElementById("aiFeed");
  container.innerHTML = `<div class="empty-state">Loading AI alerts...</div>`;

  try {
    const news = await fetchFinnhubNews("general");
    const filtered = news
      .filter((item) => {
        const text = `${item.headline || ""} ${item.summary || ""}`.toLowerCase();
        return [
          "openai",
          "nvidia",
          "amd",
          "microsoft",
          "google",
          "meta",
          "ai",
          "artificial intelligence",
          "chip",
          "inference",
          "training"
        ].some((term) => text.includes(term));
      })
      .slice(0, 8);

    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state">No AI alerts found right now.</div>`;
      return;
    }

    container.innerHTML = filtered.map(renderNewsItem).join("");
  } catch (error) {
    console.error("AI feed failed:", error);
    container.innerHTML = `<div class="empty-state">Failed to load AI alerts.</div>`;
  }
}

function buildLiveAlerts() {
  const alerts = [];

  document.querySelectorAll("#marketMovers .list-item").forEach((item, idx) => {
    if (idx < 3) {
      alerts.push(`📈 ${item.querySelector(".item-title")?.textContent || "Market move detected"}`);
    }
  });

  document.querySelectorAll("#jobsFeed .news-item").forEach((item, idx) => {
    if (idx < 2) {
      alerts.push(`💼 ${item.querySelector(".news-title")?.textContent || "Jobs signal detected"}`);
    }
  });

  document.querySelectorAll("#aiFeed .news-item").forEach((item, idx) => {
    if (idx < 2) {
      alerts.push(`🤖 ${item.querySelector(".news-title")?.textContent || "AI signal detected"}`);
    }
  });

  const container = document.getElementById("liveAlerts");

  if (!alerts.length) {
    container.innerHTML = `<div class="empty-state">No alerts available right now.</div>`;
    return;
  }

  container.innerHTML = alerts.slice(0, 8).map((text) => `
    <div class="alert-item">${escapeHtml(text)}</div>
  `).join("");
}

async function fetchQuote(symbol) {
  try {
    let url;
    if (symbol === "BTCUSD") {
      url = `https://finnhub.io/api/v1/quote?symbol=BINANCE:BTCUSDT&token=${FINNHUB_API_KEY}`;
    } else {
      url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (!data || typeof data.c !== "number") return null;

    return {
      symbol,
      price: formatPrice(data.c),
      change: round2(data.d || 0),
      percentChange: round2(data.dp || 0),
      prevClose: formatPrice(data.pc || 0)
    };
  } catch (error) {
    console.error(`Quote failed for ${symbol}:`, error);
    return null;
  }
}

async function fetchFinnhubNews(category = "general") {
  const res = await fetch(
    `https://finnhub.io/api/v1/news?category=${encodeURIComponent(category)}&token=${FINNHUB_API_KEY}`
  );
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function renderNewsItem(item) {
  const title = escapeHtml(item.headline || "Untitled");
  const source = escapeHtml(item.source || "Unknown source");
  const summary = escapeHtml((item.summary || "").slice(0, 180));
  const url = item.url || "#";
  const time = item.datetime
    ? new Date(item.datetime * 1000).toLocaleString()
    : "Unknown time";

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
    BTCUSD: [25.7617, -80.1918]
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
      <strong>${quote.symbol}</strong><br>
      Price: ${quote.price}<br>
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

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function formatSigned(value) {
  const num = Number(value);
  return num > 0 ? `+${num}` : `${num}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}