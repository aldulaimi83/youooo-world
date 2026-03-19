const API_BASE = "https://youooo-world-api.youooo.workers.dev/api";

const state = {
  signals: [],
  news: [],
  jobs: [],
  ai: [],
  movers: [],
  watchlist: [],
  activeFilter: "all",
  map: null,
  markersLayer: null
};

document.addEventListener("DOMContentLoaded", () => {
  setUpdatedTime();
  initTabs();
  initFilters();
  initModal();
  initMap();
  initLayerButtons();
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
      const tabId = button.dataset.tab;
      const target = document.getElementById(tabId);
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

  [closeBtn, backdrop].forEach((el) => {
    if (el) {
      el.addEventListener("click", closeModal);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  window.__openSignalModal = openSignalModal;
}

function openSignalModal(signal) {
  const modal = document.getElementById("signalModal");
  if (!modal) return;

  document.getElementById("modalTitle").textContent = signal.title || "Signal Details";
  document.getElementById("modalMeta").textContent =
    `${formatCategory(signal.category)} • Score ${signal.score || 70} • ${formatDate(signal.publishedAt || signal.date)}`;

  document.getElementById("modalSummary").textContent = signal.summary || "No summary available.";

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

  renderSignals();
  renderLiveAlerts();
  renderMarketNews();
  renderJobsFeed();
  renderAIFeed();
  renderRiskFeed();
  renderMovers();
  renderWatchlist();

  renderImpactEngine();
  renderCompanyRiskBoard();
  renderSectorHeatmap();
  renderLayoffTimeline();
  renderHiringShift();
  renderAISignalsBoard();
  renderChipWarTracker();
  renderRegionalRiskBoard();
  renderConflictImpact();

  renderMapMarkersForLayer("earthquakes");
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

function renderSignals() {
  const container = document.getElementById("topSignalsList");
  if (!container) return;

  const baseSignals = buildCombinedSignals();
  const filtered = state.activeFilter === "all"
    ? baseSignals
    : baseSignals.filter((item) => item.category === state.activeFilter);

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state">No signals available.</div>`;
    return;
  }

  container.innerHTML = filtered.slice(0, 8).map((signal) => `
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
      const signal = baseSignals.find((item) => item.id === signalId);
      if (signal) openSignalModal(signal);
    });
  });
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

function renderMarketNews() {
  renderFeed("marketNews", state.news);
}

function renderJobsFeed() {
  renderFeed("jobsFeed", state.jobs);
}

function renderAIFeed() {
  renderFeed("aiFeed", state.ai);
}

function renderRiskFeed() {
  const riskSource = state.news
    .filter((item) => containsRiskKeywords(item))
    .concat(state.ai.filter((item) => containsRiskKeywords(item)))
    .slice(0, 8);

  renderFeed("riskFeed", riskSource.length ? riskSource : fallbackRiskFeed());
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

function buildCombinedSignals() {
  const derivedMarketSignals = state.news.slice(0, 3).map((item, idx) => ({
    ...item,
    id: `market-news-${idx}`,
    category: "market",
    score: scoreArticle(item, "market"),
    impactPoints: buildImpactPoints(item),
    watchPoints: buildWatchPoints(item),
    confidence: deriveConfidence(scoreArticle(item, "market"))
  }));

  const derivedJobSignals = state.jobs.slice(0, 3).map((item, idx) => ({
    ...item,
    id: `jobs-news-${idx}`,
    category: "jobs",
    score: scoreArticle(item, "jobs"),
    impactPoints: buildImpactPoints(item),
    watchPoints: buildWatchPoints(item),
    confidence: deriveConfidence(scoreArticle(item, "jobs"))
  }));

  const derivedAISignals = state.ai.slice(0, 3).map((item, idx) => ({
    ...item,
    id: `ai-news-${idx}`,
    category: "ai",
    score: scoreArticle(item, "ai"),
    impactPoints: buildImpactPoints(item),
    watchPoints: buildWatchPoints(item),
    confidence: deriveConfidence(scoreArticle(item, "ai"))
  }));

  const riskSignals = [...state.news, ...state.ai]
    .filter((item) => containsRiskKeywords(item))
    .slice(0, 3)
    .map((item, idx) => ({
      ...item,
      id: `risk-news-${idx}`,
      category: "risk",
      score: scoreArticle(item, "risk"),
      impactPoints: buildImpactPoints(item),
      watchPoints: buildWatchPoints(item),
      confidence: deriveConfidence(scoreArticle(item, "risk"))
    }));

  return [...state.signals, ...derivedJobSignals, ...derivedAISignals, ...derivedMarketSignals, ...riskSignals]
    .filter(uniqueBy("title"))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
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
        chain: "Policy pressure → supply chain uncertainty ↑ → semis multiple pressure",
        note: "Trade restrictions can affect chip manufacturing, exports, and pricing."
      });
    }

    if (text.includes("nvidia") || text.includes("gpu") || text.includes("ai")) {
      chains.push({
        chain: "AI demand ↑ → GPU demand ↑ → cloud capex ↑",
        note: "AI buildout headlines tend to reinforce compute and infrastructure spending."
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

function buildCompanyRiskScores() {
  const companies = [
    "Google", "Microsoft", "Meta", "Amazon", "Intel", "AMD", "NVIDIA", "Tesla", "PayPal", "Crypto.com"
  ];

  return companies.map((company) => {
    const relatedText = [...state.jobs, ...state.news, ...state.ai]
      .filter((item) => includesWord(item.title, company) || includesWord(item.summary, company))
      .map((item) => `${item.title} ${item.summary}`)
      .join(" ")
      .toLowerCase();

    let score = 34;
    let status = "Stable / limited negative pressure";

    if (relatedText.includes("layoff") || relatedText.includes("job cut")) {
      score += 28;
      status = "Layoff pressure detected";
    }
    if (relatedText.includes("restructuring") || relatedText.includes("freeze")) {
      score += 15;
      status = "Restructuring / hiring caution";
    }
    if (relatedText.includes("ai") || relatedText.includes("demand") || relatedText.includes("growth")) {
      score -= 10;
      status = status === "Layoff pressure detected" ? status : "Growth offsets risk";
    }
    if (company === "NVIDIA" || company === "AMD") {
      score -= 8;
      if (!relatedText.includes("layoff")) status = "AI / semiconductor strength";
    }
    if (company === "Intel" || company === "Tesla" || company === "Crypto.com") {
      score += 12;
    }

    score = Math.max(18, Math.min(92, score));

    return { company, score, status };
  }).sort((a, b) => b.score - a.score).slice(0, 8);
}

function buildSectorHeatmapData() {
  return [
    {
      sector: "AI Infrastructure",
      note: "GPU and cloud buildout remain supportive.",
      label: "Hiring",
      className: "level-positive"
    },
    {
      sector: "Semiconductors",
      note: "Strong demand but policy and supply-chain sensitivity remain.",
      label: "Mixed",
      className: "level-mixed"
    },
    {
      sector: "Fintech",
      note: "Efficiency focus and restructuring keep pressure elevated.",
      label: "Layoffs Risk",
      className: "level-high"
    },
    {
      sector: "Cloud Platforms",
      note: "Selective hiring continues around AI workloads.",
      label: "Selective Growth",
      className: "level-low"
    },
    {
      sector: "EV / Mobility",
      note: "Margin pressure and regulatory stories increase volatility.",
      label: "Watch Closely",
      className: "level-medium"
    },
    {
      sector: "Consumer Tech",
      note: "Mixed signals with selective cost optimization.",
      label: "Mixed",
      className: "level-mixed"
    }
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
      summary: "Highly specialized engineers often move toward firms with stronger AI or infrastructure demand."
    },
    {
      title: "Fintech cuts → talent may shift to cloud, data, and enterprise software",
      summary: "Workers displaced from fintech often fit platform, compliance, or backend product teams."
    },
    {
      title: "Automotive pressure → talent may shift to autonomy, validation, and embedded systems",
      summary: "Hardware, reliability, and systems talent can move into AI/robotics and semiconductor validation roles."
    },
    {
      title: "Big Tech restructuring → talent may shift into startups and AI labs",
      summary: "Employer brand remains strong, but smaller firms may benefit from a deeper talent pool."
    }
  ];
}

function buildAISignalSummary() {
  const aiCount = state.ai.length || 6;
  return [
    {
      title: "AI Buildout Momentum",
      note: `${aiCount} recent AI-related items tracked across infrastructure, launches, and platform competition.`
    },
    {
      title: "GPU Demand Narrative",
      note: "Cloud compute and model training headlines continue to support demand for accelerators."
    },
    {
      title: "Capex Expansion Risk",
      note: "AI growth remains positive, but heavy infrastructure spending can pressure margins."
    },
    {
      title: "Cloud Competition",
      note: "Microsoft, Google, Meta, and others are competing on AI deployment, distribution, and inference scale."
    }
  ];
}

function buildChipWarItems() {
  return [
    {
      title: "US-China restrictions remain a key semiconductor overhang",
      summary: "Export limits and policy changes can affect chip supply chains, customer mix, and sentiment."
    },
    {
      title: "Taiwan / foundry concentration stays strategically important",
      summary: "Any disruption to advanced manufacturing capacity could impact semiconductors broadly."
    },
    {
      title: "AI demand offsets some macro weakness",
      summary: "Accelerator demand can support parts of the chip sector even when broader electronics demand is mixed."
    },
    {
      title: "Semis remain tied to global politics",
      summary: "Policy, trade, and regional security stories can move the entire chip narrative quickly."
    }
  ];
}

function buildRegionalRiskData() {
  return [
    {
      region: "Middle East",
      note: "Conflict escalation can impact oil, shipping, and global sentiment.",
      level: "High Risk",
      className: "level-high"
    },
    {
      region: "East Asia",
      note: "Semiconductor concentration and geopolitical competition keep strategic risk elevated.",
      level: "Medium Risk",
      className: "level-medium"
    },
    {
      region: "Europe",
      note: "Moderate risk tied to energy, war spillovers, and industrial weakness.",
      level: "Medium Risk",
      className: "level-medium"
    },
    {
      region: "North America",
      note: "Operationally stable, but exposed to policy shifts and market repricing.",
      level: "Lower Risk",
      className: "level-low"
    }
  ];
}

function buildConflictImpactData() {
  return [
    {
      chain: "Middle East conflict ↑ → oil ↑ → airlines / transport pressure",
      note: "Fuel-sensitive sectors often react quickly to oil shock headlines."
    },
    {
      chain: "Ukraine pressure ↑ → commodities volatility ↑ → inflation watch",
      note: "Food, energy, and transport channels can all transmit risk."
    },
    {
      chain: "China restrictions ↑ → semiconductor uncertainty ↑ → hardware repricing",
      note: "Trade and export shifts can affect semis and hyperscaler narratives."
    },
    {
      chain: "Regional instability ↑ → safe-haven flows ↑ → risk appetite weakens",
      note: "Macro uncertainty can compress speculative positioning across growth assets."
    }
  ];
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
  const category = signal.category || "market";

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

  return defaults[category] || defaults.market;
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

function initMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  state.map = L.map("map", {
    zoomControl: true,
    worldCopyJump: true
  }).setView([22, 10], 2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap &copy; CARTO"
  }).addTo(state.map);

  state.markersLayer = L.layerGroup().addTo(state.map);
}

function initLayerButtons() {
  const buttons = document.querySelectorAll(".layer-btn");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      renderMapMarkersForLayer(button.dataset.layer);
    });
  });
}

function renderMapMarkersForLayer(layer) {
  if (!state.map || !state.markersLayer) return;

  state.markersLayer.clearLayers();

  const points = getMapPoints(layer);
  points.forEach((point) => {
    const marker = L.circleMarker([point.lat, point.lng], {
      radius: point.radius || 6,
      weight: 1,
      color: point.color,
      fillColor: point.color,
      fillOpacity: 0.65
    });

    marker.bindPopup(`
      <strong>${escapeHtml(point.title)}</strong><br/>
      <span>${escapeHtml(point.note)}</span>
    `);

    marker.addTo(state.markersLayer);
  });
}

function getMapPoints(layer) {
  const colorMap = {
    earthquakes: "#4d98ff",
    markets: "#2ee6c9",
    jobs: "#ff5e7e",
    ai: "#ffbf47",
    risk: "#b983ff"
  };

  const base = colorMap[layer] || "#4d98ff";

  const pointsByLayer = {
    earthquakes: [
      { lat: 61.2, lng: -149.9, title: "Alaska Event Cluster", note: "Seismic activity zone", color: base },
      { lat: 35.6, lng: 140.1, title: "Japan Activity", note: "Pacific ring pressure", color: base },
      { lat: 19.4, lng: -155.3, title: "Hawaii Seismic", note: "Volcanic system watch", color: base }
    ],
    markets: [
      { lat: 40.7, lng: -74.0, title: "New York Markets", note: "Equity and macro reaction", color: base },
      { lat: 51.5, lng: -0.1, title: "London Markets", note: "Global capital flows", color: base },
      { lat: 35.7, lng: 139.7, title: "Tokyo Markets", note: "Asia market pricing", color: base }
    ],
    jobs: [
      { lat: 37.4, lng: -122.1, title: "Silicon Valley", note: "Big Tech workforce shifts", color: base },
      { lat: 47.6, lng: -122.3, title: "Seattle", note: "Cloud / retail tech hiring", color: base },
      { lat: 30.2, lng: -97.7, title: "Austin", note: "Semiconductor and AI jobs", color: base }
    ],
    ai: [
      { lat: 37.7, lng: -122.4, title: "AI Startup Cluster", note: "Model and infra buildout", color: base },
      { lat: 47.6, lng: -122.3, title: "Cloud AI Expansion", note: "Hyperscaler activity", color: base },
      { lat: 25.0, lng: 121.5, title: "Foundry / Hardware Link", note: "Semiconductor dependency", color: base }
    ],
    risk: [
      { lat: 32.0, lng: 53.0, title: "Iran Region", note: "Energy and geopolitical sensitivity", color: base },
      { lat: 31.5, lng: 34.8, title: "Israel Region", note: "Conflict and regional escalation risk", color: base },
      { lat: 49.0, lng: 31.0, title: "Ukraine Region", note: "War and commodity impact", color: base }
    ]
  };

  return pointsByLayer[layer] || pointsByLayer.earthquakes;
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

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}