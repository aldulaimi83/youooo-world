const API_BASE = "https://youooo-world-api.youooo.workers.dev";

const symbolInput = document.getElementById("symbolInput");
const searchBtn = document.getElementById("searchBtn");
const suggestions = document.getElementById("suggestions");
const quoteCard = document.getElementById("quoteCard");
const tickerTrack = document.getElementById("tickerTrack");
const chartTitle = document.getElementById("chartTitle");
const expandChartBtn = document.getElementById("expandChartBtn");
const chartModal = document.getElementById("chartModal");
const modalOverlay = document.getElementById("modalOverlay");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalChartTitle = document.getElementById("modalChartTitle");

let currentSymbol = "AAPL";
let currentExchange = "NASDAQ";
let searchDebounce = null;

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString();
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: num < 1 ? 4 : 2,
    maximumFractionDigits: num < 1 ? 4 : 2
  });
}

function percentClass(value) {
  return Number(value) >= 0 ? "up" : "down";
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return await res.json();
}

function getTradingViewSymbol(symbol, exchange) {
  const upper = (symbol || "").toUpperCase().trim();
  const ex = (exchange || "").toUpperCase().trim();

  if (upper.includes("/")) {
    const clean = upper.replace("/", "");
    return `BINANCE:${clean}`;
  }

  if (upper === "BTCUSD" || upper === "BTC/USD") return "BINANCE:BTCUSDT";
  if (upper === "ETHUSD" || upper === "ETH/USD") return "BINANCE:ETHUSDT";
  if (upper === "SOLUSD" || upper === "SOL/USD") return "BINANCE:SOLUSDT";

  const exchangeMap = {
    NASDAQ: "NASDAQ",
    NYSE: "NYSE",
    AMEX: "AMEX",
    TSX: "TSX",
    LSE: "LSE"
  };

  const tvExchange = exchangeMap[ex] || "NASDAQ";
  return `${tvExchange}:${upper}`;
}

function loadTradingViewChart(containerId, symbol, exchange = "NASDAQ", interval = "60") {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = "";

  const tvSymbol = getTradingViewSymbol(symbol, exchange);

  new TradingView.widget({
    autosize: true,
    symbol: tvSymbol,
    interval,
    timezone: "America/Chicago",
    theme: "dark",
    style: "1",
    locale: "en",
    enable_publishing: false,
    allow_symbol_change: true,
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: true,
    container_id: containerId
  });
}

function renderQuoteCard(data, companyName = "") {
  const price = data.close ?? data.price ?? data.last ?? null;
  const change = data.change ?? 0;
  const percentChange = data.percent_change ?? data.percent ?? 0;
  const open = data.open ?? null;
  const high = data.high ?? null;
  const low = data.low ?? null;
  const prevClose = data.previous_close ?? null;
  const volume = data.volume ?? null;

  quoteCard.innerHTML = `
    <div class="quote-symbol">${data.symbol || currentSymbol}</div>
    <div class="quote-name">${companyName || "Market Instrument"}</div>
    <div class="quote-price">$${formatPrice(price)}</div>
    <div class="quote-change ${percentClass(change)}">
      ${Number(change) >= 0 ? "+" : ""}${formatPrice(change)}
      (${Number(percentChange) >= 0 ? "+" : ""}${formatPrice(percentChange)}%)
    </div>

    <div class="quote-grid">
      <div class="metric">
        <div class="metric-label">Open</div>
        <div class="metric-value">$${formatPrice(open)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Previous Close</div>
        <div class="metric-value">$${formatPrice(prevClose)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Day High</div>
        <div class="metric-value">$${formatPrice(high)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Day Low</div>
        <div class="metric-value">$${formatPrice(low)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Volume</div>
        <div class="metric-value">${formatNumber(volume)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Exchange</div>
        <div class="metric-value">${currentExchange || "—"}</div>
      </div>
    </div>
  `;
}

async function loadQuote(symbol, companyName = "", exchange = "NASDAQ") {
  quoteCard.innerHTML = `<div class="loading">Loading quote...</div>`;
  chartTitle.textContent = `${symbol} • ${exchange}`;
  modalChartTitle.textContent = `${symbol} • Expanded TradingView Chart`;

  try {
    const data = await fetchJson(`${API_BASE}/quote?symbol=${encodeURIComponent(symbol)}`);
    currentSymbol = symbol;
    currentExchange = exchange || "NASDAQ";

    renderQuoteCard(data, companyName);
    loadTradingViewChart("tvChart", currentSymbol, currentExchange, "60");

    if (!chartModal.classList.contains("hidden")) {
      loadTradingViewChart("tvChartModal", currentSymbol, currentExchange, "60");
    }
  } catch (error) {
    quoteCard.innerHTML = `<div class="error">Failed to load quote for ${symbol}.</div>`;
    console.error(error);
  }
}

function renderSuggestions(items) {
  if (!items || !items.length) {
    suggestions.innerHTML = "";
    return;
  }

  suggestions.innerHTML = items.slice(0, 8).map(item => {
    const symbol = item.symbol || "";
    const name = item.instrument_name || item.name || "";
    const exchange = item.exchange || "NASDAQ";
    const country = item.country || "";
    const type = item.instrument_type || item.type || "";

    return `
      <div
        class="suggestion-item"
        data-symbol="${symbol}"
        data-name="${(name || "").replace(/"/g, "&quot;")}"
        data-exchange="${exchange}"
      >
        <div class="suggestion-main">${symbol} • ${name}</div>
        <div class="suggestion-sub">${exchange} ${country ? "• " + country : ""} ${type ? "• " + type : ""}</div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".suggestion-item").forEach(item => {
    item.addEventListener("click", () => {
      const symbol = item.dataset.symbol;
      const name = item.dataset.name;
      const exchange = item.dataset.exchange || "NASDAQ";
      symbolInput.value = symbol;
      suggestions.innerHTML = "";
      loadQuote(symbol, name, exchange);
    });
  });
}

async function searchSymbols(query) {
  if (!query || query.trim().length < 1) {
    suggestions.innerHTML = "";
    return;
  }

  try {
    const data = await fetchJson(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    renderSuggestions(data.data || data.results || []);
  } catch (error) {
    suggestions.innerHTML = "";
    console.error(error);
  }
}

async function loadTickerBar() {
  const watch = ["AAPL", "AMD", "NVDA", "TSLA", "MSFT", "SPY"];
  const parts = [];

  for (const symbol of watch) {
    try {
      const q = await fetchJson(`${API_BASE}/quote?symbol=${encodeURIComponent(symbol)}`);
      const pct = Number(q.percent_change || 0);
      const sign = pct >= 0 ? "+" : "";
      parts.push(`${symbol}: $${formatPrice(q.close)} (${sign}${formatPrice(pct)}%)`);
    } catch (e) {
      parts.push(`${symbol}: unavailable`);
    }
  }

  tickerTrack.innerHTML = `<span>${parts.join(" • ")} • BTC/USD available • ETH/USD available</span>`;
}

function runManualSearch() {
  const value = symbolInput.value.trim();
  if (!value) return;
  loadQuote(value.toUpperCase(), value.toUpperCase(), "NASDAQ");
  searchSymbols(value);
}

symbolInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  const value = symbolInput.value.trim();

  searchDebounce = setTimeout(() => {
    if (value.length >= 1) {
      searchSymbols(value);
    } else {
      suggestions.innerHTML = "";
    }
  }, 300);
});

symbolInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    runManualSearch();
  }
});

searchBtn.addEventListener("click", runManualSearch);

document.querySelectorAll(".quick-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const symbol = btn.dataset.symbol;
    symbolInput.value = symbol;
    suggestions.innerHTML = "";
    loadQuote(symbol, symbol, symbol.includes("/") ? "CRYPTO" : "NASDAQ");
  });
});

expandChartBtn.addEventListener("click", () => {
  chartModal.classList.remove("hidden");
  modalChartTitle.textContent = `${currentSymbol} • Expanded TradingView Chart`;
  setTimeout(() => {
    loadTradingViewChart("tvChartModal", currentSymbol, currentExchange, "60");
  }, 50);
});

closeModalBtn.addEventListener("click", () => {
  chartModal.classList.add("hidden");
  document.getElementById("tvChartModal").innerHTML = "";
});

modalOverlay.addEventListener("click", () => {
  chartModal.classList.add("hidden");
  document.getElementById("tvChartModal").innerHTML = "";
});

window.addEventListener("load", async () => {
  await loadTickerBar();
  await loadQuote("AAPL", "Apple Inc.", "NASDAQ");
});