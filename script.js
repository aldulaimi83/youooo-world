const API_BASE = "https://youooo-world-api.youooo.workers.dev/api";

const state = {
  signals: [],
  news: [],
  jobs: [],
  ai: [],
  movers: [],
  watchlist: [],
  activeFilter: "all"
};

document.addEventListener("DOMContentLoaded", () => {
  setUpdatedTime();
  initTabs();
  initFilters();
  initModal();
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

function initModal() {
  const modal = document.getElementById("signalModal");
  const closeBtn = document.getElementById("closeModalBtn");
  const backdrop = document.getElementById("modalBackdrop");

  const closeModal = () => {
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

async function loadAllData() {
  await Promise.allSettled([
    loadSignals(),
    loadMarketNews(),
    loadJobs(),
    loadAI(),
    loadMovers(),
    loadWatchlist()
  ]);

  renderHeroStats();
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
  renderDailyBrief();
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
  const companies = buildCompanyRiskScores();
  const highRisk = companies.filter((c) => c.score >= 70).length;
  const hiring = buildHiringShiftData().length;
  const aiCount = state.ai.length || fallbackAI().length;
  const riskCount = [...state.news, ...state.ai].filter(containsRiskKeywords).length || 4;

  setText("statHighRisk", String(highRisk));
  setText("statHiring", String(hiring));
  setText("statAI", String(aiCount));
  setText("statRisk", String(riskCount));
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
}

function renderCompanyRiskBoard() {
  const container = document.getElementById("companyRiskBoard");
  if (!container) return;

  const companies = buildCompanyRiskScores();
  container.innerHTML = companies.map((item) => `
    <div class="risk-row">
      <div>
        <strong>${escapeHtml(item.company)}</strong>
        <div class="row-meta">${escapeHtml(item.status)}</div>
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

  const cards = buildCompanyCards();
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
          <div class="metric-label">Hiring Trend</div>
          <div class="metric-value">${escapeHtml(item.hiringTrend)}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Signal Type</div>
          <div class="metric-value">${escapeHtml(item.signalType)}</div>
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
    confidence: deriveConfidence(scoreArticle(item, "jobs"))
  }));

  const derivedMarkets = state.news.slice(0, 4).map((item, idx) => ({
    ...item,
    id: `market-${idx}`,
    category: "market",
    score: scoreArticle(item, "market"),
    impactPoints: buildImpactPoints(item),
    watchPoints: buildWatchPoints(item),
    confidence: deriveConfidence(scoreArticle(item, "market"))
  }));

  const derivedAI = state.ai.slice(0, 4).map((item, idx) => ({
    ...item,
    id: `ai-${idx}`,
    category: "ai",
    score: scoreArticle(item, "ai"),
    impactPoints: buildImpactPoints(item),
    watchPoints: buildWatchPoints(item),
    confidence: deriveConfidence(scoreArticle(item, "ai"))
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
      confidence: deriveConfidence(scoreArticle(item, "risk"))
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
  const base = buildCompanyRiskScores();
  return base.map((item) => {
    const riskLabel = item.score >= 75 ? "High Risk" : item.score >= 50 ? "Watch" : "Healthier";
    const hiringTrend = item.score >= 75 ? "Weak" : item.score >= 50 ? "Mixed" : "Better";
    const signalType = item.score >= 75 ? "Layoffs / pressure" : item.score >= 50 ? "Restructuring" : "AI / stability";
    const summary =
      item.score >= 75
        ? `${item.company} looks more exposed to layoffs, cost pressure, or hiring caution.`
        : item.score >= 50
          ? `${item.company} shows mixed signals and deserves monitoring.`
          : `${item.company} looks better positioned relative to pressured peers.`;

    return {
      company: item.company,
      riskScore: item.score,
      riskLabel,
      hiringTrend,
      signalType,
      summary
    };
  });
}

function buildSectorHeatmapData() {
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

  return [
    {
      title: `Highest pressure today: ${highest.company}`,
      summary: `${highest.company} currently shows the strongest negative pressure in the board with a risk score of ${highest.score}.`
    },
    {
      title: `Healthier relative name: ${healthiest.company}`,
      summary: `${healthiest.company} looks better positioned versus peers in the current feed.`
    },
    ...signals.map((item) => ({
      title: item.title,
      summary: `${formatCategory(item.category)} • Score ${item.score}`
    }))
  ].slice(0, 5);
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
    confidence: item.confidence || deriveConfidence(Number(item.score) || 70)
  };
}

function normalizeNews(item, defaultCategory) {
  return {
    id: item.id || createId(item.title),
    title: item.title || "Untitled article",
    summary: item.summary || item.description || item.snippet || "No summary available.",
    category: item.category || defaultCategory,
    url: item.url || item.link || "#",
    publishedAt: item.publishedAt || item.date || new Date().toISOString()
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
      publishedAt: new Date().toISOString()
    },
    {
      id: "fallback-signal-2",
      title: "Iran-related disruption risk keeps energy markets on edge",
      summary: "Commodity-sensitive sectors remain focused on geopolitical escalation.",
      category: "risk",
      score: 82,
      url: "#",
      publishedAt: new Date().toISOString()
    },
    {
      id: "fallback-signal-3",
      title: "AI infrastructure buildout continues to support semiconductor demand",
      summary: "Accelerator demand remains central to the AI capex story.",
      category: "ai",
      score: 84,
      url: "#",
      publishedAt: new Date().toISOString()
    }
  ];
}

function fallbackNews() {
  return [
    {
      title: "Oil and market volatility remain sensitive to conflict headlines",
      summary: "Global risk narratives continue to shape short-term market reactions.",
      url: "#",
      publishedAt: new Date().toISOString()
    }
  ];
}

function fallbackJobs() {
  return [
    {
      title: "Crypto.com lays off 12% of workforce",
      summary: "The company says the move reflects a changing operating environment.",
      url: "#",
      publishedAt: new Date().toISOString()
    },
    {
      title: "Tech restructuring extends into another quarter",
      summary: "Hiring caution remains in selected sectors despite strength in AI.",
      url: "#",
      publishedAt: new Date().toISOString()
    }
  ];
}

function fallbackAI() {
  return [
    {
      title: "NVIDIA and hyperscaler demand keep AI infrastructure story strong",
      summary: "GPU and cloud demand remain central to AI expansion.",
      url: "#",
      publishedAt: new Date().toISOString()
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
      publishedAt: new Date().toISOString()
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