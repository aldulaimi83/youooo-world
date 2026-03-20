const API_BASE = "https://youooo-world-api.youooo.workers.dev/api";

const state = {
  signals: [],
  news: [],
  jobs: [],
  ai: [],
  movers: [],
  watchlist: [],
  activeFilter: "all",
  mode: "jobseeker",
  companySearch: "",
  selectedTicker: "NVDA",
  selectedMarketSymbol: "NASDAQ:NVDA"
};

document.addEventListener("DOMContentLoaded", () => {
  setUpdatedTime();
  initTabs();
  initFilters();
  initModal();
  initModes();
  initSearch();
  initPremium();
  initTickerExplorer();
  loadAllData();
});

function setUpdatedTime() {
  const el = document.getElementById("updatedAt");
  if (!el) return;
  const now = new Date();
  el.textContent = `UPDATED: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
}

function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const tabs = document.querySelectorAll(".tab-content");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      tabs.forEach((tab) => tab.classList.remove("active"));

      button.classList.add("active");
      const target = document.getElementById(button.dataset.tab);
      if (target) target.classList.add("active");
    });
  });

  const hash = window.location.hash.replace("#", "");
  if (hash) {
    const targetBtn = [...buttons].find((btn) => btn.dataset.tab === hash);
    const targetTab = document.getElementById(hash);
    if (targetBtn && targetTab) {
      buttons.forEach((b) => b.classList.remove("active"));
      tabs.forEach((tab) => tab.classList.remove("active"));
      targetBtn.classList.add("active");
      targetTab.classList.add("active");
    }
  }
}

function initFilters() {
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      state.activeFilter = button.dataset.filter;
      renderSignals();
    });
  });
}

function initModes() {
  const buttons = document.querySelectorAll(".mode-btn[data-mode]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      state.mode = button.dataset.mode;
      renderAll();
    });
  });
}

function initSearch() {
  const input = document.getElementById("companySearch");
  if (!input) return;

  input.addEventListener("input", (event) => {
    state.companySearch = event.target.value.trim().toLowerCase();
    renderCompanyCards();
  });
}

function initPremium() {
  const openButtons = [document.getElementById("alertsBtn"), document.getElementById("premiumCtaBtn")].filter(Boolean);
  const modal = document.getElementById("premiumModal");
  const closeBtn = document.getElementById("closePremiumBtn");
  const backdrop = document.getElementById("premiumBackdrop");

  const open = () => {
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  };

  const close = () => {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  };

  openButtons.forEach((btn) => btn.addEventListener("click", open));
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
}

function initModal() {
  const modal = document.getElementById("signalModal");
  const closeBtn = document.getElementById("closeModalBtn");
  const backdrop = document.getElementById("modalBackdrop");

  const closeModal = () => {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  };

  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  window.__openSignalModal = openSignalModal;
}

function openSignalModal(signal) {
  const modal = document.getElementById("signalModal");
  if (!modal) return;

  document.getElementById("modalTitle").textContent = signal.title || "Signal Details";
  document.getElementById("modalMeta").textContent =
    `${formatCategory(signal.category)} • Score ${signal.score || 70} • ${formatDate(signal.publishedAt || signal.date)}`;

  document.getElementById("modalSummary").textContent =
    signal.summary || "No summary available.";

  const impactList = document.getElementById("modalImpactList");
  const watchList = document.getElementById("modalWatchList");
  const confidence = document.getElementById("modalConfidence");
  const sourceLink = document.getElementById("modalSourceLink");

  impactList.innerHTML = "";
  watchList.innerHTML = "";

  (signal.impactPoints || buildImpactPoints(signal)).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    impactList.appendChild(li);
  });

  (signal.watchPoints || buildWatchPoints(signal)).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    watchList.appendChild(li);
  });

  confidence.textContent = signal.confidence || deriveConfidence(signal.score || 70);
  sourceLink.href = signal.url || "#";

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function initTickerExplorer() {
  const input = document.getElementById("tickerInput");
  const loadBtn = document.getElementById("loadTickerBtn");
  const quickBtns = document.querySelectorAll(".quick-ticker-btn");

  loadBtn?.addEventListener("click", () => {
    const raw = input?.value || state.selectedTicker;
    applyTicker(raw);
  });

  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applyTicker(input.value);
    }
  });

  quickBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const symbol = btn.dataset.symbol || "NVDA";
      if (input) input.value = symbol;
      applyTicker(symbol);
    });
  });

  renderTickerWidget(state.selectedMarketSymbol);
  updateTickerSummary();
}

function applyTicker(rawTicker) {
  const normalized = normalizeMarketSymbol(rawTicker);
  const bare = extractBareTicker(normalized);

  state.selectedTicker = bare;
  state.selectedMarketSymbol = normalized;

  const input = document.getElementById("tickerInput");
  if (input) input.value = bare;

  renderTickerWidget(normalized);
  updateTickerSummary();
  renderTickerIntelligence();
}

function normalizeMarketSymbol(rawTicker) {
  const raw = String(rawTicker || "").trim().toUpperCase();
  if (!raw) return "NASDAQ:NVDA";
  if (raw.includes(":")) return raw;

  const known = {
    NVDA: "NASDAQ:NVDA",
    AMD: "NASDAQ:AMD",
    MSFT: "NASDAQ:MSFT",
    TSLA: "NASDAQ:TSLA",
    GOOGL: "NASDAQ:GOOGL",
    GOOG: "NASDAQ:GOOG",
    AMZN: "NASDAQ:AMZN",
    META: "NASDAQ:META",
    AAPL: "NASDAQ:AAPL",
    INTC: "NASDAQ:INTC",
    QQQ: "NASDAQ:QQQ",
    SPY: "AMEX:SPY",
    COIN: "NASDAQ:COIN",
    UBER: "NYSE:UBER"
  };

  return known[raw] || `NASDAQ:${raw}`;
}

function extractBareTicker(symbol) {
  return String(symbol || "NVDA").split(":").pop();
}

function renderTickerWidget(symbol) {
  const container = document.getElementById("tvChartWidget");
  if (!container) return;

  container.innerHTML = "";

  if (typeof TradingView === "undefined") {
    container.innerHTML = `<div class="empty-state">Chart library is still loading...</div>`;
    return;
  }

  new TradingView.widget({
    autosize: true,
    symbol,
    interval: "D",
    timezone: "America/Chicago",
    theme: "dark",
    style: "1",
    locale: "en",
    hide_top_toolbar: false,
    hide_legend: false,
    withdateranges: true,
    allow_symbol_change: false,
    save_image: false,
    studies: ["MACD@tv-basicstudies", "RSI@tv-basicstudies"],
    container_id: "tvChartWidget"
  });
}

function updateTickerSummary() {
  const container = document.getElementById("stockSummaryBar");
  if (!container) return;

  const ticker = state.selectedTicker || "NVDA";
  const watch = findTickerWatchlistItem(ticker);
  const mover = findTickerMoverItem(ticker);

  const watchText = watch
    ? `${formatMoney(watch.price)} · ${formatPercent(watch.changePercent)}`
    : "Not in current watchlist";

  const modeLens = state.mode === "trader" ? "Trader" : "Job Seeker";
  const narrative = buildTickerNarrative(ticker, mover, watch);

  container.innerHTML = `
    <div class="stock-mini-card">
      <div class="stock-mini-label">Selected</div>
      <div class="stock-mini-value">${escapeHtml(ticker)}</div>
    </div>
    <div class="stock-mini-card">
      <div class="stock-mini-label">Watchlist</div>
      <div class="stock-mini-value ${watch ? classForChange(watch.changePercent) : ""}">
        ${escapeHtml(watchText)}
      </div>
    </div>
    <div class="stock-mini-card">
      <div class="stock-mini-label">Mode Lens</div>
      <div class="stock-mini-value">${escapeHtml(modeLens)}</div>
    </div>
    <div class="stock-mini-card">
      <div class="stock-mini-label">Narrative</div>
      <div class="stock-mini-value">${escapeHtml(narrative)}</div>
    </div>
  `;
}

function renderTickerIntelligence() {
  const titleEl = document.getElementById("tickerIntelTitle");
  const modeEl = document.getElementById("tickerIntelMode");
  const whyEl = document.getElementById("tickerWhyMatters");
  const actionEl = document.getElementById("tickerActionBox");
  if (!titleEl || !modeEl || !whyEl || !actionEl) return;

  const ticker = state.selectedTicker || "NVDA";
  const intel = buildTickerIntelligence(ticker);
  const action = buildTickerAction(ticker);

  titleEl.textContent = `Why ${ticker} matters today`;
  modeEl.textContent = state.mode === "trader" ? "Trader" : "Job Seeker";

  whyEl.innerHTML = intel.points.map((item) => `
    <div class="intel-item">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="intel-note">${escapeHtml(item.note)}</div>
    </div>
  `).join("");

  actionEl.innerHTML = `
    <div class="action-item">
      <div class="action-top">
        <strong>${escapeHtml(action.title)}</strong>
        <span class="action-tag ${action.className}">${escapeHtml(action.label)}</span>
      </div>
      <div class="action-copy">${escapeHtml(action.copy)}</div>
    </div>
  `;
}

function findTickerWatchlistItem(ticker) {
  return state.watchlist.find(
    (item) => String(item.symbol || "").toUpperCase() === String(ticker || "").toUpperCase()
  );
}

function findTickerMoverItem(ticker) {
  return state.movers.find(
    (item) => String(item.symbol || "").toUpperCase() === String(ticker || "").toUpperCase()
  );
}

function buildTickerNarrative(ticker, mover, watch) {
  const t = String(ticker || "").toUpperCase();

  if (["NVDA", "AMD", "INTC", "TSM", "TSMC"].includes(t)) {
    return state.mode === "trader" ? "AI / semis trade" : "AI / semiconductor jobs";
  }

  if (["MSFT", "GOOGL", "GOOG", "META", "AMZN"].includes(t)) {
    return state.mode === "trader" ? "Mega-cap AI narrative" : "Big Tech hiring lens";
  }

  if (["TSLA"].includes(t)) {
    return state.mode === "trader" ? "EV / momentum risk" : "Auto / engineering lens";
  }

  if (["COIN"].includes(t)) {
    return state.mode === "trader" ? "Crypto beta trade" : "Fintech / crypto jobs";
  }

  if (mover) {
    if (Number(mover.changePercent) > 0) return "Positive momentum";
    if (Number(mover.changePercent) < 0) return "Negative pressure";
  }

  if (watch) return "Radar tracking";
  return "Custom ticker";
}

async function loadAllData() {
  await Promise.allSettled([
    loadSignals(),
    loadMarketNews(),
    loadJobs(),
    loadAI(),
    loadMovers(),
    loadWatchlist()
  ]);

  renderAll();
}

function renderAll() {
  renderHeroStats();
  renderDailyBrief();
  renderTopOpportunities();
  renderLiveAlerts();
  renderSignals();
  renderCompanyRiskBoard();
  renderHiringShift();
  renderSectorHeatmap();
  renderLayoffTimeline();
  renderCompanyCards();
  renderWatchlist();
  renderMovers();
  renderImpactEngine();
  renderMarketNews();
  renderAISignalsBoard();
  renderChipWarTracker();
  renderAIFeed();
  renderRegionalRiskBoard();
  renderConflictImpact();
  renderRiskFeed();
  renderJobsFeed();
  updateTickerSummary();
  renderTickerIntelligence();
}

async function fetchJson(url) {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

async function loadSignals() {
  try {
    const data = await fetchJson(`${API_BASE}/signals`);
    state.signals = normalizeArray(data).map((item) => normalizeSignal(item, "market"));
  } catch (error) {
    console.error("Signals load error:", error);
    state.signals = fallbackSignals();
  }
}

async function loadMarketNews() {
  try {
    const data = await fetchJson(`${API_BASE}/news?category=general`);
    state.news = normalizeArray(data).map((item) => normalizeNews(item, "market"));
  } catch (error) {
    console.error("News load error:", error);
    state.news = fallbackNews();
  }
}

async function loadJobs() {
  try {
    const data = await fetchJson(`${API_BASE}/jobs`);
    state.jobs = normalizeArray(data).map((item) => normalizeNews(item, "jobs"));
  } catch (error) {
    console.error("Jobs load error:", error);
    state.jobs = fallbackJobs();
  }
}

async function loadAI() {
  try {
    const data = await fetchJson(`${API_BASE}/ai`);
    state.ai = normalizeArray(data).map((item) => normalizeNews(item, "ai"));
  } catch (error) {
    console.error("AI load error:", error);
    state.ai = fallbackAI();
  }
}

async function loadMovers() {
  try {
    const data = await fetchJson(`${API_BASE}/movers`);
    state.movers = normalizeArray(data).map(normalizeMover);
  } catch (error) {
    console.error("Movers load error:", error);
    state.movers = fallbackMovers();
  }
}

async function loadWatchlist() {
  try {
    const data = await fetchJson(`${API_BASE}/watchlist`);
    state.watchlist = normalizeArray(data).map(normalizeWatchItem);
  } catch (error) {
    console.error("Watchlist load error:", error);
    state.watchlist = fallbackWatchlist();
  }
}

function renderHeroStats() {
  const board = buildCompanyRiskScores();
  const highRisk = board.filter((c) => c.score >= 70).length;
  const healthier = board.filter((c) => c.score < 50).length;
  const aiCount = state.ai.length || fallbackAI().length;
  const riskCount = [...state.news, ...state.ai].filter(containsRiskKeywords).length || 4;

  setText("statHighRisk", String(highRisk));
  setText("statHealthier", String(healthier));
  setText("statAI", String(aiCount));
  setText("statRisk", String(riskCount));
}

function renderDailyBrief() {
  const container = document.getElementById("dailyBrief");
  if (!container) return;

  const brief = buildDailyBrief();
  container.innerHTML = brief.map((item) => `
    <div class="brief-item">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="feed-summary">${escapeHtml(item.summary)}</div>
    </div>
  `).join("");
}

function renderTopOpportunities() {
  const container = document.getElementById("topOpportunities");
  if (!container) return;

  const items = buildTopOpportunities();
  container.innerHTML = items.map((item) => `
    <div class="opportunity-item">
      <div class="opportunity-top">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="opportunity-tag ${item.className}">${escapeHtml(item.label)}</span>
      </div>
      <div class="feed-summary">${escapeHtml(item.summary)}</div>
    </div>
  `).join("");
}

function renderLiveAlerts() {
  const container = document.getElementById("liveAlerts");
  if (!container) return;

  const alerts = buildCombinedSignals().slice(0, 6);

  container.innerHTML = alerts.map((item) => `
    <div class="alert-item">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="row-meta">
        <span>${formatCategory(item.category)}</span>
        <span>Score ${item.score}</span>
      </div>
    </div>
  `).join("");
}

function renderSignals() {
  const container = document.getElementById("topSignalsList");
  if (!container) return;

  const signals = buildCombinedSignals();
  const filtered = state.activeFilter === "all"
    ? signals
    : signals.filter((item) => item.category === state.activeFilter);

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state">No signals available.</div>`;
    return;
  }

  container.innerHTML = filtered.slice(0, 10).map((signal) => `
    <article class="signal-card">
      <div class="signal-topline">
        <span class="signal-type">${formatCategory(signal.category)}</span>
        <span class="signal-score">Score ${signal.score}</span>
      </div>
      <h3 class="signal-title">${escapeHtml(signal.title)}</h3>
      <div class="signal-summary">${escapeHtml(signal.summary || "No summary available.")}</div>
      <div class="signal-footer">
        <span>${formatDate(signal.publishedAt || signal.date)}</span>
        <a class="why-link" href="#" data-signal-id="${escapeHtml(signal.id)}">Why it matters</a>
      </div>
      <div class="signal-actions">
        <button class="signal-drive-btn" data-drive-symbol="${escapeHtml(signal.relatedSymbol || suggestSymbolForSignal(signal))}">
          Open in chart
        </button>
      </div>
    </article>
  `).join("");

  container.querySelectorAll(".why-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const signalId = event.currentTarget.dataset.signalId;
      const signal = signals.find((item) => item.id === signalId);
      if (signal) openSignalModal(signal);
    });
  });

  container.querySelectorAll(".signal-drive-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const symbol = event.currentTarget.dataset.driveSymbol || "NVDA";
      applyTicker(symbol);
      document.getElementById("tickerInput")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

function renderCompanyRiskBoard() {
  const container = document.getElementById("companyRiskBoard");
  if (!container) return;

  const companies = buildCompanyRiskScores();
  container.innerHTML = companies.map((item) => `
    <div class="risk-row">
      <div>
        <strong>${escapeHtml(item.company)}</strong>
        <div class="row-meta">${escapeHtml(modeStatusText(item))}</div>
      </div>
      <span class="risk-score-badge ${riskClass(item.score)}">Risk ${item.score}</span>
    </div>
  `).join("");
}

function renderHiringShift() {
  const container = document.getElementById("hiringShift");
  if (!container) return;

  const shifts = buildHiringShiftData();
  container.innerHTML = shifts.map((item) => `
    <div class="shift-item">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="feed-summary">${escapeHtml(item.summary)}</div>
    </div>
  `).join("");
}

function renderSectorHeatmap() {
  const container = document.getElementById("sectorHeatmap");
  if (!container) return;

  const sectors = buildSectorHeatmapData();
  container.innerHTML = sectors.map((item) => `
    <div class="heat-item">
      <strong>${escapeHtml(item.sector)}</strong>
      <div class="heat-note">${escapeHtml(item.note)}</div>
      <span class="heat-level ${item.className}">${escapeHtml(item.label)}</span>
    </div>
  `).join("");
}

function renderLayoffTimeline() {
  const container = document.getElementById("layoffTimeline");
  if (!container) return;

  const timeline = buildLayoffTimeline();
  container.innerHTML = timeline.map((item) => `
    <div class="timeline-item">
      <div class="timeline-date">${escapeHtml(item.date)}</div>
      <strong>${escapeHtml(item.title)}</strong>
      <div class="feed-summary">${escapeHtml(item.summary)}</div>
    </div>
  `).join("");
}

function renderCompanyCards() {
  const container = document.getElementById("companyCards");
  if (!container) return;

  let cards = buildCompanyCards();

  if (state.companySearch) {
    cards = cards.filter((item) =>
      item.company.toLowerCase().includes(state.companySearch)
    );
  }

  if (!cards.length) {
    container.innerHTML = `<div class="empty-state">No companies match your search.</div>`;
    return;
  }

  container.innerHTML = cards.map((item) => `
    <div class="company-card">
      <div class="company-top">
        <div class="company-name">${escapeHtml(item.company)}</div>
        <span class="company-tag ${riskClass(item.riskScore)}">${escapeHtml(item.riskLabel)}</span>
      </div>
      <div class="feed-summary">${escapeHtml(item.summary)}</div>
      <div class="company-metrics">
        <div class="metric-box">
          <div class="metric-label">Risk Score</div>
          <div class="metric-value">${item.riskScore}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">${state.mode === "jobseeker" ? "Hiring Trend" : "Market Bias"}</div>
          <div class="metric-value">${escapeHtml(item.midMetric)}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">${state.mode === "jobseeker" ? "Signal Type" : "Trade Lens"}</div>
          <div class="metric-value">${escapeHtml(item.endMetric)}</div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderWatchlist() {
  const container = document.getElementById("watchlistGrid");
  if (!container) return;

  if (!state.watchlist.length) {
    container.innerHTML = `<div class="empty-state">No watchlist data available.</div>`;
    return;
  }

  container.innerHTML = state.watchlist.slice(0, 8).map((item) => `
    <div class="watch-item">
      <div class="watch-symbol">${escapeHtml(item.symbol)}</div>
      <div class="watch-price">${formatMoney(item.price)}</div>
      <div class="watch-change ${classForChange(item.changePercent)}">${formatPercent(item.changePercent)}</div>
    </div>
  `).join("");
}

function renderMovers() {
  const container = document.getElementById("marketMovers");
  if (!container) return;

  if (!state.movers.length) {
    container.innerHTML = `<div class="empty-state">No movers data available.</div>`;
    return;
  }

  container.innerHTML = state.movers.slice(0, 8).map((item) => `
    <div class="mover-row">
      <div>
        <strong>${escapeHtml(item.symbol)}</strong>
        <div class="row-meta">${escapeHtml(item.name || "Market mover")}</div>
      </div>
      <span class="mover-badge ${classForChange(item.changePercent)}">${formatPercent(item.changePercent)}</span>
    </div>
  `).join("");
}

function renderImpactEngine() {
  const container = document.getElementById("impactEngine");
  if (!container) return;

  const chains = buildImpactChains();
  container.innerHTML = chains.map((item) => `
    <div class="impact-item">
      <div class="impact-chain">${escapeHtml(item.chain)}</div>
      <div class="impact-note">${escapeHtml(item.note)}</div>
    </div>
  `).join("");
}

function renderMarketNews() {
  renderFeed("marketNews", state.news);
}

function renderAISignalsBoard() {
  const container = document.getElementById("aiSignalsBoard");
  if (!container) return;

  const items = buildAISignalSummary();
  container.innerHTML = items.map((item) => `
    <div class="summary-item">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="summary-note">${escapeHtml(item.note)}</div>
    </div>
  `).join("");
}

function renderChipWarTracker() {
  const container = document.getElementById("chipWarTracker");
  if (!container) return;

  const items = buildChipWarItems();
  container.innerHTML = items.map((item) => `
    <div class="tracker-item">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="feed-summary">${escapeHtml(item.summary)}</div>
    </div>
  `).join("");
}

function renderAIFeed() {
  renderFeed("aiFeed", state.ai);
}

function renderRegionalRiskBoard() {
  const container = document.getElementById("regionalRiskBoard");
  if (!container) return;

  const items = buildRegionalRiskData();
  container.innerHTML = items.map((item) => `
    <div class="region-row">
      <div>
        <strong>${escapeHtml(item.region)}</strong>
        <div class="row-meta">${escapeHtml(item.note)}</div>
      </div>
      <span class="region-badge ${item.className}">${escapeHtml(item.level)}</span>
    </div>
  `).join("");
}

function renderConflictImpact() {
  const container = document.getElementById("conflictImpact");
  if (!container) return;

  const items = buildConflictImpactData();
  container.innerHTML = items.map((item) => `
    <div class="impact-item">
      <div class="impact-chain">${escapeHtml(item.chain)}</div>
      <div class="impact-note">${escapeHtml(item.note)}</div>
    </div>
  `).join("");
}

function renderRiskFeed() {
  const source = state.news
    .filter(containsRiskKeywords)
    .concat(state.ai.filter(containsRiskKeywords))
    .slice(0, 8);

  renderFeed("riskFeed", source.length ? source : fallbackRiskFeed());
}

function renderJobsFeed() {
  renderFeed("jobsFeed", state.jobs);
}

function renderFeed(targetId, items) {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `<div class="empty-state">No feed items available.</div>`;
    return;
  }

  container.innerHTML = items.slice(0, 8).map((item) => `
    <article class="feed-item">
      <h3 class="feed-title">${escapeHtml(item.title)}</h3>
      <div class="feed-summary">${escapeHtml(item.summary || "No summary available.")}</div>
      <div class="feed-meta">
        <span>${formatDate(item.publishedAt || item.date)}</span>
        <a class="why-link" href="${item.url || "#"}" target="_blank" rel="noopener noreferrer">Open source</a>
      </div>
    </article>
  `).join("");
}

function buildCombinedSignals() {
  const derivedJobs = state.jobs.slice(0, 4).map((item, idx) => ({
    ...item,
    id: `jobs-${idx}`,
    category: "jobs",
    score: scoreArticle(item, "jobs"),
    impactPoints: buildImpactPoints(item),
    watchPoints: buildWatchPoints(item),
    confidence: deriveConfidence(scoreArticle(item, "jobs")),
    relatedSymbol: suggestSymbolForSignal(item, "jobs")
  }));

  const derivedMarkets = state.news.slice(0, 4).map((item, idx) => ({
    ...item,
    id: `market-${idx}`,
    category: "market",
    score: scoreArticle(item, "market"),
    impactPoints: buildImpactPoints(item),
    watchPoints: buildWatchPoints(item),
    confidence: deriveConfidence(scoreArticle(item, "market")),
    relatedSymbol: suggestSymbolForSignal(item, "market")
  }));

  const derivedAI = state.ai.slice(0, 4).map((item, idx) => ({
    ...item,
    id: `ai-${idx}`,
    category: "ai",
    score: scoreArticle(item, "ai"),
    impactPoints: buildImpactPoints(item),
    watchPoints: buildWatchPoints(item),
    confidence: deriveConfidence(scoreArticle(item, "ai")),
    relatedSymbol: suggestSymbolForSignal(item, "ai")
  }));

  const derivedRisk = [...state.news, ...state.ai]
    .filter(containsRiskKeywords)
    .slice(0, 4)
    .map((item, idx) => ({
      ...item,
      id: `risk-${idx}`,
      category: "risk",
      score: scoreArticle(item, "risk"),
      impactPoints: buildImpactPoints(item),
      watchPoints: buildWatchPoints(item),
      confidence: deriveConfidence(scoreArticle(item, "risk")),
      relatedSymbol: suggestSymbolForSignal(item, "risk")
    }));

  return [...state.signals, ...derivedJobs, ...derivedMarkets, ...derivedAI, ...derivedRisk]
    .filter(uniqueBy("title"))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

function buildCompanyRiskScores() {
  const companies = ["Intel", "Tesla", "Crypto.com", "Amazon", "Meta", "Google", "Microsoft", "AMD", "NVIDIA", "TSMC"];

  return companies.map((company) => {
    const related = [...state.jobs, ...state.news, ...state.ai]
      .filter((item) => includesWord(item.title, company) || includesWord(item.summary, company))
      .map((item) => `${item.title} ${item.summary}`)
      .join(" ")
      .toLowerCase();

    let score = 34;
    let status = "Stable / limited negative pressure";

    if (related.includes("layoff") || related.includes("job cut")) {
      score += 28;
      status = "Layoff pressure detected";
    }
    if (related.includes("restructuring") || related.includes("freeze")) {
      score += 15;
      status = "Restructuring / hiring caution";
    }
    if (related.includes("ai") || related.includes("demand") || related.includes("growth")) {
      score -= 10;
      status = status === "Layoff pressure detected" ? status : "Growth offsets risk";
    }
    if (company === "NVIDIA" || company === "AMD" || company === "TSMC") {
      score -= 8;
      if (!related.includes("layoff")) status = "AI / chip demand support";
    }
    if (company === "Intel" || company === "Tesla" || company === "Crypto.com") {
      score += 12;
    }

    score = Math.max(18, Math.min(92, score));
    return { company, score, status };
  }).sort((a, b) => b.score - a.score).slice(0, 8);
}

function buildCompanyCards() {
  return buildCompanyRiskScores().map((item) => {
    const riskLabel = item.score >= 75 ? "High Risk" : item.score >= 50 ? "Watch" : "Healthier";

    let summary;
    let midMetric;
    let endMetric;

    if (state.mode === "jobseeker") {
      midMetric = item.score >= 75 ? "Weak" : item.score >= 50 ? "Mixed" : "Better";
      endMetric = item.score >= 75 ? "Layoffs / pressure" : item.score >= 50 ? "Restructuring" : "AI / stability";
      summary =
        item.score >= 75
          ? `${item.company} looks more exposed to layoffs, hiring caution, or restructuring.`
          : item.score >= 50
            ? `${item.company} shows mixed signals and deserves monitoring for job seekers.`
            : `${item.company} looks relatively healthier and more attractive for job seekers.`;
    } else {
      midMetric = item.score >= 75 ? "Bearish" : item.score >= 50 ? "Mixed" : "Constructive";
      endMetric = item.score >= 75 ? "Pressure story" : item.score >= 50 ? "Watch setup" : "Stronger narrative";
      summary =
        item.score >= 75
          ? `${item.company} carries a weaker narrative with more pressure than peers.`
          : item.score >= 50
            ? `${item.company} has a mixed narrative that could swing with new headlines.`
            : `${item.company} looks relatively stronger in the current narrative set.`;
    }

    return {
      company: item.company,
      riskScore: item.score,
      riskLabel,
      midMetric,
      endMetric,
      summary
    };
  });
}

function buildSectorHeatmapData() {
  if (state.mode === "trader") {
    return [
      { sector: "AI Infrastructure", note: "Strong compute and capex narrative support.", label: "Bullish", className: "level-positive" },
      { sector: "Semiconductors", note: "Demand is strong, but export-policy sensitivity remains.", label: "Mixed", className: "level-mixed" },
      { sector: "Energy", note: "Geopolitical pressure can drive upside volatility.", label: "Watch Up", className: "level-medium" },
      { sector: "Consumer Tech", note: "Depends more on sentiment and rates.", label: "Mixed", className: "level-mixed" },
      { sector: "Fintech", note: "Efficiency narratives still pressure confidence.", label: "Weak", className: "level-high" },
      { sector: "Cloud Platforms", note: "AI demand remains supportive.", label: "Constructive", className: "level-low" }
    ];
  }

  return [
    { sector: "AI Infrastructure", note: "GPU and cloud buildout remain supportive.", label: "Hiring", className: "level-positive" },
    { sector: "Semiconductors", note: "Strong demand but policy and supply-chain sensitivity remain.", label: "Mixed", className: "level-mixed" },
    { sector: "Fintech", note: "Efficiency focus and restructuring keep pressure elevated.", label: "Layoffs Risk", className: "level-high" },
    { sector: "Cloud Platforms", note: "Selective hiring continues around AI workloads.", label: "Selective Growth", className: "level-low" },
    { sector: "EV / Mobility", note: "Margin pressure and regulatory stories increase volatility.", label: "Watch Closely", className: "level-medium" },
    { sector: "Consumer Tech", note: "Mixed signals with selective cost optimization.", label: "Mixed", className: "level-mixed" }
  ];
}

function buildLayoffTimeline() {
  const items = state.jobs.length ? state.jobs : fallbackJobs();
  return items.slice(0, 6).map((item) => ({
    date: formatDate(item.publishedAt || item.date),
    title: item.title,
    summary: item.summary || "No summary available."
  }));
}

function buildHiringShiftData() {
  if (state.mode === "trader") {
    return [
      {
        title: "Layoffs at weaker tech names → talent and attention shift to stronger operators",
        summary: "Narrative leadership often migrates to companies with better AI or infrastructure positioning."
      },
      {
        title: "Semiconductor demand strength → supports AI-linked winners",
        summary: "Names tied to accelerators, foundries, and cloud capex can benefit from stronger demand stories."
      },
      {
        title: "Geopolitical pressure → favors selective sectors",
        summary: "Energy, defense-adjacent, and resilient infrastructure themes can strengthen under pressure."
      },
      {
        title: "Mixed macro → rotation matters more than broad optimism",
        summary: "A sharper product should explain which theme looks stronger, not just list headlines."
      }
    ];
  }

  return [
    {
      title: "Semiconductor layoffs → talent may shift to NVIDIA, AMD, TSMC ecosystem",
      summary: "Technical workers often move toward firms with stronger AI or infrastructure demand."
    },
    {
      title: "Fintech cuts → talent may shift to cloud, data, and enterprise software",
      summary: "Platform and backend skills remain transferable across enterprise software companies."
    },
    {
      title: "Automotive pressure → talent may shift to embedded systems and validation",
      summary: "Hardware and validation engineers can move into AI, robotics, or semiconductor roles."
    },
    {
      title: "Big Tech restructuring → talent may shift to startups and AI labs",
      summary: "Smaller companies can benefit from a deeper and stronger talent pool."
    }
  ];
}

function buildImpactChains() {
  const candidates = [...state.news, ...state.ai, ...state.jobs].slice(0, 12);
  const chains = [];

  candidates.forEach((item) => {
    const text = `${item.title} ${item.summary}`.toLowerCase();

    if (text.includes("iran") || text.includes("israel") || text.includes("middle east")) {
      chains.push({
        chain: "Middle East escalation → oil risk ↑ → energy volatility ↑",
        note: "Conflict headlines often raise commodity sensitivity and transport risk."
      });
    }
    if (text.includes("tariff") || text.includes("china") || text.includes("restriction")) {
      chains.push({
        chain: "Policy pressure → supply chain uncertainty ↑ → semis pressure",
        note: "Trade restrictions can affect chip manufacturing, exports, and pricing."
      });
    }
    if (text.includes("nvidia") || text.includes("gpu") || text.includes("ai")) {
      chains.push({
        chain: "AI demand ↑ → GPU demand ↑ → cloud capex ↑",
        note: "AI buildout headlines reinforce compute and infrastructure spending."
      });
    }
    if (text.includes("layoff") || text.includes("job cut") || text.includes("restructuring")) {
      chains.push({
        chain: "Layoffs ↑ → sentiment weakens → hiring shifts to stronger operators",
        note: "Workforce reductions can signal cost pressure while redistributing talent."
      });
    }
  });

  const fallback = [
    {
      chain: "War risk ↑ → oil ↑ → airline / transport pressure",
      note: "Macro shocks often hit fuel-sensitive sectors first."
    },
    {
      chain: "AI buildout ↑ → semis ↑ → cloud infra spending ↑",
      note: "AI acceleration supports chip and hyperscaler narratives."
    },
    {
      chain: "Layoffs ↑ → labor supply ↑ → hiring migrates to healthier firms",
      note: "Job market dislocation creates new recruiting opportunities."
    }
  ];

  return dedupeByValue(chains, "chain").slice(0, 6).concat(dedupeByValue(fallback, "chain")).slice(0, 6);
}

function buildAISignalSummary() {
  const aiCount = state.ai.length || 6;
  return [
    { title: "AI Buildout Momentum", note: `${aiCount} recent AI items tracked across infrastructure, launches, and platform competition.` },
    { title: "GPU Demand Narrative", note: "Cloud compute and model training continue to support accelerator demand." },
    { title: "Capex Expansion Risk", note: "AI growth is strong, but heavy infrastructure spending can still pressure margins." },
    { title: "Cloud Competition", note: "Microsoft, Google, Meta, and others are competing on AI deployment and scale." }
  ];
}

function buildChipWarItems() {
  return [
    { title: "US-China restrictions remain a key semiconductor overhang", summary: "Export limits and policy changes can affect chip supply chains and sentiment." },
    { title: "Taiwan concentration stays strategically important", summary: "Any disruption to advanced manufacturing capacity could impact semiconductors broadly." },
    { title: "AI demand offsets some macro weakness", summary: "Accelerator demand can support parts of the chip sector even when electronics demand is mixed." },
    { title: "Semis remain tied to global politics", summary: "Policy, trade, and regional security stories can move the chip narrative quickly." }
  ];
}

function buildRegionalRiskData() {
  return [
    { region: "Middle East", note: "Conflict escalation can impact oil, shipping, and global sentiment.", level: "High Risk", className: "level-high" },
    { region: "East Asia", note: "Semiconductor concentration and geopolitical competition keep strategic risk elevated.", level: "Medium Risk", className: "level-medium" },
    { region: "Europe", note: "Moderate risk tied to energy, war spillovers, and industrial weakness.", level: "Medium Risk", className: "level-medium" },
    { region: "North America", note: "Operationally stable, but exposed to policy shifts and market repricing.", level: "Lower Risk", className: "level-low" }
  ];
}

function buildConflictImpactData() {
  return [
    { chain: "Middle East conflict ↑ → oil ↑ → airlines / transport pressure", note: "Fuel-sensitive sectors often react quickly to oil shock headlines." },
    { chain: "Ukraine pressure ↑ → commodities volatility ↑ → inflation watch", note: "Food, energy, and transport channels can all transmit risk." },
    { chain: "China restrictions ↑ → semiconductor uncertainty ↑ → hardware repricing", note: "Trade and export shifts can affect semis and hyperscaler narratives." },
    { chain: "Regional instability ↑ → safe-haven flows ↑ → risk appetite weakens", note: "Macro uncertainty can compress speculative positioning across growth assets." }
  ];
}

function buildDailyBrief() {
  const companies = buildCompanyRiskScores();
  const highest = companies[0];
  const healthiest = companies[companies.length - 1];
  const signals = buildCombinedSignals().slice(0, 3);

  const modeIntro = state.mode === "jobseeker"
    ? {
        title: "Mode: Job Seeker",
        summary: "Use this view to spot healthier companies, watch layoffs, and follow where talent may move next."
      }
    : {
        title: "Mode: Trader",
        summary: "Use this view to connect company pressure, AI demand, and geopolitical risk to market narratives."
      };

  return [
    modeIntro,
    {
      title: `Highest pressure today: ${highest.company}`,
      summary: `${highest.company} currently shows the strongest negative pressure with a risk score of ${highest.score}.`
    },
    {
      title: `Healthier relative name: ${healthiest.company}`,
      summary: `${healthiest.company} looks better positioned versus peers in the current board.`
    },
    ...signals.map((item) => ({
      title: item.title,
      summary: `${formatCategory(item.category)} • Score ${item.score}`
    }))
  ].slice(0, 5);
}

function buildTopOpportunities() {
  if (state.mode === "trader") {
    return [
      {
        title: "NVIDIA",
        summary: "AI infrastructure demand remains one of the strongest narratives in the market.",
        label: "Bullish",
        className: "level-positive"
      },
      {
        title: "AMD",
        summary: "Second-derivative AI / semiconductor beneficiary with narrative upside.",
        label: "Constructive",
        className: "level-low"
      },
      {
        title: "Energy names",
        summary: "Geopolitical risk can create upside volatility when oil sensitivity rises.",
        label: "Watch",
        className: "level-medium"
      }
    ];
  }

  return [
    {
      title: "NVIDIA",
      summary: "Strong AI demand and infrastructure momentum make it a healthier narrative for job seekers.",
      label: "Hiring Lens",
      className: "level-positive"
    },
    {
      title: "AMD",
      summary: "AI and semiconductor strength support better relative positioning.",
      label: "Healthier",
      className: "level-low"
    },
    {
      title: "Microsoft",
      summary: "Large platform plus AI momentum makes it a strong company to track.",
      label: "Stable",
      className: "level-mixed"
    }
  ];
}

function buildTickerIntelligence(ticker) {
  const t = String(ticker || "").toUpperCase();
  const points = [];

  if (["NVDA", "AMD"].includes(t)) {
    points.push({
      title: `${t} is tied directly to AI infrastructure demand`,
      note: "GPU, accelerator, and cloud capex narratives are central to why this ticker matters."
    });
    points.push({
      title: "Semiconductor sentiment remains important",
      note: "Policy headlines, export restrictions, and foundry concentration can move this theme quickly."
    });
    points.push({
      title: state.mode === "trader" ? "Momentum matters here" : "Job-market relevance is high here",
      note: state.mode === "trader"
        ? "This is one of the strongest narrative-driven names in the current market."
        : "AI / hardware demand can support stronger hiring and healthier company positioning."
    });
  } else if (["MSFT", "GOOGL", "GOOG", "META", "AMZN"].includes(t)) {
    points.push({
      title: `${t} sits inside the mega-cap AI race`,
      note: "Cloud, inference, AI products, and capex all affect this ticker’s narrative."
    });
    points.push({
      title: "Hiring and platform strength matter",
      note: "For job seekers, healthier platforms often offer stronger opportunity than pressured peers."
    });
    points.push({
      title: state.mode === "trader" ? "Narrative quality is key" : "Company stability is key",
      note: state.mode === "trader"
        ? "The market often rewards the strongest AI deployment story among large platforms."
        : "Big Tech platform stability can matter more than one headline."
    });
  } else if (t === "TSLA") {
    points.push({
      title: "Tesla mixes growth with volatility",
      note: "Auto demand, regulatory scrutiny, and sentiment shifts can all change the setup fast."
    });
    points.push({
      title: "This is a headline-sensitive ticker",
      note: "Good for tracking narrative swings, but it can be unstable."
    });
    points.push({
      title: state.mode === "trader" ? "Expect momentum behavior" : "Engineering lens is more relevant",
      note: state.mode === "trader"
        ? "Momentum and sentiment often dominate near-term behavior."
        : "Useful for people tracking autonomy, validation, and automotive engineering signals."
    });
  } else if (t === "COIN") {
    points.push({
      title: "COIN maps well to crypto workforce and sentiment stories",
      note: "Layoffs or crypto demand changes can make this relevant quickly."
    });
    points.push({
      title: "This is a high-beta narrative ticker",
      note: "It moves more on sentiment than on steady defensiveness."
    });
    points.push({
      title: state.mode === "trader" ? "Volatility is the point" : "Hiring pressure matters here",
      note: state.mode === "trader"
        ? "Useful when you want a sentiment-sensitive chart."
        : "Useful when tracking crypto/fintech workforce pressure."
    });
  } else {
    points.push({
      title: `${t} is being tracked as a custom ticker`,
      note: "Use the chart plus related market signals to decide whether this belongs in your focus list."
    });
    points.push({
      title: "Context matters more than the chart alone",
      note: "The product is stronger when price action is tied to jobs, AI, or geopolitical narratives."
    });
    points.push({
      title: state.mode === "trader" ? "Look for momentum + narrative" : "Look for company health + stability",
      note: state.mode === "trader"
        ? "A chart becomes more useful when the narrative is clear."
        : "A company becomes more useful when the opportunity looks healthier."
    });
  }

  return { points };
}

function buildTickerAction(ticker) {
  const t = String(ticker || "").toUpperCase();

  if (state.mode === "trader") {
    if (["NVDA", "AMD", "MSFT"].includes(t)) {
      return {
        title: "Constructive setup",
        label: "Opportunity",
        className: "level-positive",
        copy: "Strong AI-linked narrative. Best used as a watch / opportunity ticker while momentum and AI demand remain supportive."
      };
    }
    if (["TSLA", "COIN"].includes(t)) {
      return {
        title: "Volatility watch",
        label: "Watch",
        className: "level-medium",
        copy: "This ticker can move hard on narrative swings. Better treated as a high-volatility watchlist name."
      };
    }
    return {
      title: "Context first",
      label: "Monitor",
      className: "level-mixed",
      copy: "Use this chart with related signals before treating it as a stronger trade setup."
    };
  }

  if (["NVDA", "AMD", "MSFT", "GOOGL", "AMZN"].includes(t)) {
    return {
      title: "Healthier company lens",
      label: "Apply / Track",
      className: "level-positive",
      copy: "This looks better as a healthier company to track for roles, stability, and longer-term opportunity."
    };
  }
  if (["TSLA", "INTC", "COIN"].includes(t)) {
    return {
      title: "Pressure or mixed lens",
      label: "Watch Risk",
      className: "level-medium",
      copy: "Useful to monitor, but the narrative looks more mixed and may need more caution for job seekers."
    };
  }
  return {
    title: "Research deeper",
    label: "Monitor",
    className: "level-mixed",
    copy: "Not enough direct narrative support yet. Use company intelligence and related signals before prioritizing it."
  };
}

function suggestSymbolForSignal(signal, fallbackCategory = "") {
  const text = `${signal.title} ${signal.summary}`.toLowerCase();

  if (text.includes("nvidia") || text.includes("gpu")) return "NVDA";
  if (text.includes("amd")) return "AMD";
  if (text.includes("microsoft")) return "MSFT";
  if (text.includes("google") || text.includes("alphabet")) return "GOOGL";
  if (text.includes("amazon")) return "AMZN";
  if (text.includes("meta")) return "META";
  if (text.includes("tesla")) return "TSLA";
  if (text.includes("intel")) return "INTC";
  if (text.includes("crypto.com") || text.includes("crypto")) return "COIN";
  if (text.includes("oil") || text.includes("middle east") || text.includes("iran") || text.includes("israel")) return "XOM";

  if (fallbackCategory === "ai") return "NVDA";
  if (fallbackCategory === "jobs") return "MSFT";
  if (fallbackCategory === "risk") return "XOM";
  return "NVDA";
}

function buildImpactPoints(signal) {
  const text = `${signal.title} ${signal.summary}`.toLowerCase();
  const points = [];

  if (text.includes("layoff") || text.includes("job cut") || text.includes("restructuring")) {
    points.push("Can signal cost pressure or slowing growth.");
    points.push("May increase talent availability for competitors.");
  }

  if (text.includes("ai") || text.includes("gpu") || text.includes("nvidia") || text.includes("amd")) {
    points.push("Supports AI infrastructure and semiconductor spending narratives.");
    points.push("Can strengthen cloud capex and accelerator demand expectations.");
  }

  if (text.includes("iran") || text.includes("israel") || text.includes("oil") || text.includes("war")) {
    points.push("Raises commodity and shipping sensitivity.");
    points.push("Can pressure market sentiment and fuel-sensitive sectors.");
  }

  if (!points.length) {
    points.push("May influence investor sentiment and sector leadership.");
    points.push("Could affect near-term market narrative if confirmed by follow-up headlines.");
  }

  return points.slice(0, 3);
}

function buildWatchPoints(signal) {
  const defaults = {
    jobs: [
      "Watch for follow-up layoffs or hiring freezes.",
      "Monitor whether competitors begin hiring from the same talent pool."
    ],
    ai: [
      "Watch hyperscaler capex and GPU demand follow-through.",
      "Monitor whether the story affects AMD, NVIDIA, or cloud platforms."
    ],
    risk: [
      "Watch oil, shipping, and macro volatility response.",
      "Monitor whether regional tension spills into broader markets."
    ],
    market: [
      "Watch sector rotation and follow-up headlines.",
      "Monitor price reaction and confirmation from additional sources."
    ]
  };

  return defaults[signal.category || "market"] || defaults.market;
}

function deriveConfidence(score) {
  if (score >= 84) return "High";
  if (score >= 68) return "Medium";
  return "Watch";
}

function scoreArticle(item, category) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  let score = 56;

  if (category === "jobs") score += 8;
  if (category === "ai") score += 10;
  if (category === "risk") score += 12;

  const strongWords = ["layoff", "job cut", "war", "oil", "nvidia", "amd", "ai", "restriction", "restructuring", "probe"];
  strongWords.forEach((word) => {
    if (text.includes(word)) score += 6;
  });

  return Math.max(50, Math.min(94, score));
}

function modeStatusText(item) {
  if (state.mode === "trader") {
    if (item.score >= 75) return "Pressure narrative / weaker setup";
    if (item.score >= 50) return "Mixed setup / watch";
    return "Stronger narrative support";
  }
  return item.status;
}

function normalizeSignal(item, defaultCategory) {
  return {
    id: item.id || createId(item.title),
    title: item.title || "Untitled signal",
    summary: item.summary || item.description || "No summary available.",
    category: item.category || defaultCategory,
    score: Number(item.score) || scoreArticle(item, defaultCategory),
    url: item.url || item.link || "#",
    publishedAt: item.publishedAt || item.date || new Date().toISOString(),
    impactPoints: item.impactPoints || [],
    watchPoints: item.watchPoints || [],
    confidence: item.confidence || deriveConfidence(Number(item.score) || 70),
    relatedSymbol: item.relatedSymbol || suggestSymbolForSignal(item, defaultCategory)
  };
}

function normalizeNews(item, defaultCategory) {
  return {
    id: item.id || createId(item.title),
    title: item.title || "Untitled article",
    summary: item.summary || item.description || item.snippet || "No summary available.",
    category: item.category || defaultCategory,
    url: item.url || item.link || "#",
    publishedAt: item.publishedAt || item.date || new Date().toISOString(),
    relatedSymbol: item.relatedSymbol || suggestSymbolForSignal(item, defaultCategory)
  };
}

function normalizeMover(item) {
  return {
    symbol: item.symbol || item.ticker || "N/A",
    name: item.name || item.company || "Market mover",
    changePercent: parseFloat(item.changePercent ?? item.percent ?? item.change ?? 0)
  };
}

function normalizeWatchItem(item) {
  return {
    symbol: item.symbol || item.ticker || "N/A",
    price: parseFloat(item.price ?? item.current ?? item.last ?? 0),
    changePercent: parseFloat(item.changePercent ?? item.percent ?? item.change ?? 0)
  };
}

function fallbackSignals() {
  return [
    {
      id: "fallback-signal-1",
      title: "Crypto.com lays off 12% of workforce in latest company move",
      summary: "Workforce reduction adds to hiring pressure across selected tech segments.",
      category: "jobs",
      score: 80,
      url: "#",
      publishedAt: new Date().toISOString(),
      relatedSymbol: "COIN"
    },
    {
      id: "fallback-signal-2",
      title: "Iran-related disruption risk keeps energy markets on edge",
      summary: "Commodity-sensitive sectors remain focused on geopolitical escalation.",
      category: "risk",
      score: 82,
      url: "#",
      publishedAt: new Date().toISOString(),
      relatedSymbol: "XOM"
    },
    {
      id: "fallback-signal-3",
      title: "AI infrastructure buildout continues to support semiconductor demand",
      summary: "Accelerator demand remains central to the AI capex story.",
      category: "ai",
      score: 84,
      url: "#",
      publishedAt: new Date().toISOString(),
      relatedSymbol: "NVDA"
    }
  ];
}

function fallbackNews() {
  return [
    {
      title: "Oil and market volatility remain sensitive to conflict headlines",
      summary: "Global risk narratives continue to shape short-term market reactions.",
      url: "#",
      publishedAt: new Date().toISOString(),
      relatedSymbol: "XOM"
    }
  ];
}

function fallbackJobs() {
  return [
    {
      title: "Crypto.com lays off 12% of workforce",
      summary: "The company says the move reflects a changing operating environment.",
      url: "#",
      publishedAt: new Date().toISOString(),
      relatedSymbol: "COIN"
    },
    {
      title: "Tech restructuring extends into another quarter",
      summary: "Hiring caution remains in selected sectors despite strength in AI.",
      url: "#",
      publishedAt: new Date().toISOString(),
      relatedSymbol: "MSFT"
    }
  ];
}

function fallbackAI() {
  return [
    {
      title: "NVIDIA and hyperscaler demand keep AI infrastructure story strong",
      summary: "GPU and cloud demand remain central to AI expansion.",
      url: "#",
      publishedAt: new Date().toISOString(),
      relatedSymbol: "NVDA"
    }
  ];
}

function fallbackMovers() {
  return [
    { symbol: "NVDA", name: "NVIDIA", changePercent: 2.5 },
    { symbol: "AMD", name: "AMD", changePercent: 1.8 },
    { symbol: "TSLA", name: "Tesla", changePercent: -2.1 },
    { symbol: "META", name: "Meta", changePercent: 0.9 }
  ];
}

function fallbackWatchlist() {
  return [
    { symbol: "NVDA", price: 905.21, changePercent: 2.5 },
    { symbol: "AMD", price: 184.66, changePercent: 1.8 },
    { symbol: "MSFT", price: 421.14, changePercent: 0.6 },
    { symbol: "GOOGL", price: 157.32, changePercent: -0.5 }
  ];
}

function fallbackRiskFeed() {
  return [
    {
      title: "Regional instability keeps commodities and transport markets alert",
      summary: "Investors continue tracking spillover effects into oil and logistics.",
      url: "#",
      publishedAt: new Date().toISOString(),
      relatedSymbol: "XOM"
    }
  ];
}

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.articles)) return data.articles;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function formatCategory(category) {
  const map = {
    market: "Markets",
    jobs: "Jobs",
    ai: "AI",
    risk: "Risk"
  };
  return map[category] || "Signal";
}

function formatDate(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function formatPercent(value) {
  const num = Number(value) || 0;
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

function formatMoney(value) {
  const num = Number(value) || 0;
  return `$${num.toFixed(2)}`;
}

function classForChange(value) {
  const num = Number(value) || 0;
  if (num > 0) return "pos";
  if (num < 0) return "neg";
  return "neu";
}

function riskClass(score) {
  if (score >= 75) return "level-high";
  if (score >= 50) return "level-medium";
  return "level-low";
}

function includesWord(text, word) {
  return String(text || "").toLowerCase().includes(String(word || "").toLowerCase());
}

function containsRiskKeywords(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  return ["iran", "israel", "war", "oil", "ukraine", "conflict", "tension", "restriction"].some((key) => text.includes(key));
}

function createId(text) {
  return String(text || "id")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueBy(key) {
  const seen = new Set();
  return (item) => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  };
}

function dedupeByValue(items, key) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item[key])) return false;
    seen.add(item[key]);
    return true;
  });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}