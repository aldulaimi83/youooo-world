const appState = {
  currentSymbol: "NVDA",
  currentQuote: null,
  currentCandles: [],
  savedAlerts: JSON.parse(localStorage.getItem("youooo_v8_alerts") || "[]"),
  searchData: [
    { type: "symbol", label: "NVDA", meta: "NVIDIA" },
    { type: "symbol", label: "AMD", meta: "Advanced Micro Devices" },
    { type: "symbol", label: "AAPL", meta: "Apple" },
    { type: "symbol", label: "MSFT", meta: "Microsoft" },
    { type: "symbol", label: "GOOGL", meta: "Alphabet" },
    { type: "symbol", label: "TSLA", meta: "Tesla" },
    { type: "symbol", label: "AMZN", meta: "Amazon" },
    { type: "symbol", label: "META", meta: "Meta" },
    { type: "company", label: "NVIDIA", meta: "Semiconductors" },
    { type: "company", label: "AMD", meta: "Semiconductors" },
    { type: "company", label: "Tesla", meta: "EV / AI / Robotics" },
    { type: "company", label: "Cisco", meta: "Networking / Cloud" },
    { type: "company", label: "Zoox", meta: "Autonomous Vehicles" },
    { type: "country", label: "United States", meta: "North America" },
    { type: "country", label: "India", meta: "Asia" },
    { type: "country", label: "Germany", meta: "Europe" },
    { type: "country", label: "United Arab Emirates", meta: "Middle East" }
  ]
};

const API_BASE = "https://youooo-world-api.youooo.workers.dev";

const jobsData = [
  {
    company: "NVIDIA",
    region: "Global",
    industry: "AI / Semiconductors",
    note: "AI, validation, hardware, systems, software roles.",
    url: "https://www.nvidia.com/en-us/about-nvidia/careers/"
  },
  {
    company: "AMD",
    region: "Global",
    industry: "Semiconductors",
    note: "Validation, silicon design, firmware, product engineering.",
    url: "https://careers.amd.com/careers-home"
  },
  {
    company: "Tesla",
    region: "Global",
    industry: "EV / Energy / AI",
    note: "Manufacturing, service, validation, robotics, AI infrastructure.",
    url: "https://www.tesla.com/careers"
  },
  {
    company: "Microsoft",
    region: "Global",
    industry: "Cloud / AI",
    note: "Azure, AI, hardware systems, datacenter roles.",
    url: "https://jobs.careers.microsoft.com/global/en"
  },
  {
    company: "Amazon",
    region: "Global",
    industry: "Cloud / Commerce",
    note: "AWS, devices, operations, reliability, robotics.",
    url: "https://www.amazon.jobs/"
  },
  {
    company: "Google",
    region: "Global",
    industry: "Cloud / AI / Ads",
    note: "AI, reliability, software, infrastructure, hardware.",
    url: "https://www.google.com/about/careers/applications/jobs/results/"
  },
  {
    company: "Cisco",
    region: "Global",
    industry: "Networking / Cloud",
    note: "Hardware assurance, cloud, AI, validation, support.",
    url: "https://jobs.cisco.com/"
  },
  {
    company: "Zoox",
    region: "United States",
    industry: "Autonomous Vehicles",
    note: "Fleet support, autonomy operations, systems engineering.",
    url: "https://zoox.com/careers/"
  },
  {
    company: "Apple",
    region: "Global",
    industry: "Consumer Tech / Silicon",
    note: "Silicon validation, reliability, operations, systems.",
    url: "https://jobs.apple.com/en-us/search"
  },
  {
    company: "Intel",
    region: "Global",
    industry: "Semiconductors",
    note: "Platform validation, silicon, manufacturing, AI.",
    url: "https://jobs.intel.com/"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  bindTabs();
  bindTheme();
  bindSearch();
  bindMarkets();
  bindAlerts();
  renderJobs(jobsData);
  bindJobsFilter();
  renderSavedAlerts();
  loadTickers();
  loadSymbol("NVDA");

  const openJobsBtn = document.getElementById("openJobsBtn");
  if (openJobsBtn) {
    openJobsBtn.addEventListener("click", () => {
      activateTab("jobs");
      history.replaceState(null, "", "#jobs");
    });
  }
});

function activateTab(tab) {
  const links = document.querySelectorAll(".tab-link");
  const panels = document.querySelectorAll(".tab-panel");

  links.forEach((link) => {
    link.classList.toggle("active", link.dataset.tab === tab);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tab}Tab`);
  });
}

function bindTabs() {
  const links = document.querySelectorAll(".tab-link");

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      activateTab(tab);
      history.replaceState(null, "", `#${tab}`);
    });
  });

  const hash = window.location.hash.replace("#", "");
  const valid = ["home", "markets", "risk", "jobs", "alerts"];
  if (valid.includes(hash)) {
    activateTab(hash);
  } else {
    activateTab("home");
  }
}

function bindTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("youooo_theme");
  if (savedTheme === "light") {
    document.body.classList.add("light");
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");
    localStorage.setItem(
      "youooo_theme",
      document.body.classList.contains("light") ? "light" : "dark"
    );

    if (appState.currentCandles.length) {
      renderChart("marketChart", appState.currentCandles, appState.currentSymbol);
      const modal = document.getElementById("chartModal");
      if (modal && !modal.classList.contains("hidden")) {
        renderChart("marketChartExpanded", appState.currentCandles, appState.currentSymbol);
      }
    }
  });
}

function bindSearch() {
  const input = document.getElementById("globalSearch");
  const results = document.getElementById("searchResults");

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.classList.add("hidden");
      results.innerHTML = "";
      return;
    }

    const matches = appState.searchData
      .filter((item) => item.label.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q))
      .slice(0, 8);

    if (!matches.length) {
      results.innerHTML = `<div class="search-item">No results</div>`;
      results.classList.remove("hidden");
      return;
    }

    results.innerHTML = matches
      .map(
        (item) => `
          <div class="search-item" data-type="${escapeHtml(item.type)}" data-label="${escapeHtml(item.label)}">
            <strong>${escapeHtml(item.label)}</strong><br/>
            <small>${escapeHtml(item.type)} · ${escapeHtml(item.meta)}</small>
          </div>
        `
      )
      .join("");

    results.classList.remove("hidden");

    results.querySelectorAll(".search-item").forEach((node) => {
      node.addEventListener("click", () => {
        const label = node.dataset.label;
        const type = node.dataset.type;
        input.value = label;
        results.classList.add("hidden");

        if (type === "symbol") {
          activateTab("markets");
          history.replaceState(null, "", "#markets");
          document.getElementById("symbolInput").value = label.toUpperCase();
          loadSymbol(label.toUpperCase());
        } else {
          activateTab("jobs");
          history.replaceState(null, "", "#jobs");
          document.getElementById("jobsSearch").value = label;
          renderJobs(
            jobsData.filter((job) =>
              `${job.company} ${job.region} ${job.industry}`.toLowerCase().includes(label.toLowerCase())
            )
          );
        }
      });
    });
  });

  document.addEventListener("click", (e) => {
    if (!results.contains(e.target) && e.target !== input) {
      results.classList.add("hidden");
    }
  });

  const heroBtn = document.getElementById("heroLoadBtn");
  if (heroBtn) {
    heroBtn.addEventListener("click", () => {
      activateTab("markets");
      history.replaceState(null, "", "#markets");
      loadSymbol(appState.currentSymbol || "NVDA");
    });
  }
}

function bindMarkets() {
  const loadBtn = document.getElementById("loadSymbolBtn");
  const symbolInput = document.getElementById("symbolInput");
  const expandBtn = document.getElementById("expandChartBtn");
  const closeBtn = document.getElementById("closeModalBtn");
  const backdrop = document.getElementById("modalBackdrop");

  if (loadBtn) {
    loadBtn.addEventListener("click", () => {
      const symbol = (symbolInput?.value || "NVDA").trim().toUpperCase() || "NVDA";
      loadSymbol(symbol);
    });
  }

  if (symbolInput) {
    symbolInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        loadSymbol(e.target.value.trim().toUpperCase() || "NVDA");
      }
    });
  }

  if (expandBtn) expandBtn.addEventListener("click", openChartModal);
  if (closeBtn) closeBtn.addEventListener("click", closeChartModal);
  if (backdrop) backdrop.addEventListener("click", closeChartModal);
}

function bindJobsFilter() {
  const input = document.getElementById("jobsSearch");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      renderJobs(jobsData);
      return;
    }

    const filtered = jobsData.filter((job) =>
      `${job.company} ${job.region} ${job.industry} ${job.note}`.toLowerCase().includes(q)
    );
    renderJobs(filtered);
  });
}

function bindAlerts() {
  const localAlertForm = document.getElementById("localAlertForm");
  const enableNotificationsBtn = document.getElementById("enableNotificationsBtn");
  const runAlertCheckBtn = document.getElementById("runAlertCheckBtn");
  const emailAlertForm = document.getElementById("emailAlertForm");

  if (localAlertForm) {
    localAlertForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const symbol = document.getElementById("alertSymbol").value.trim().toUpperCase();
      const above = parseFloat(document.getElementById("alertAbove").value);

      if (!symbol || Number.isNaN(above)) {
        alert("Please enter a symbol and a valid trigger price.");
        return;
      }

      appState.savedAlerts.push({
        id: crypto.randomUUID(),
        symbol,
        above
      });

      persistAlerts();
      renderSavedAlerts();
      e.target.reset();
      document.getElementById("alertSymbol").value = symbol;
    });
  }

  if (enableNotificationsBtn) {
    enableNotificationsBtn.addEventListener("click", async () => {
      if (!("Notification" in window)) {
        alert("This browser does not support notifications.");
        return;
      }

      const permission = await Notification.requestPermission();
      alert(`Notification permission: ${permission}`);
    });
  }

  if (runAlertCheckBtn) {
    runAlertCheckBtn.addEventListener("click", async () => {
      await checkAlertsNow();
    });
  }

  if (emailAlertForm) {
    emailAlertForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("emailInput").value.trim();
      const symbol = document.getElementById("emailSymbol").value.trim().toUpperCase();
      const alertType = document.getElementById("emailAlertType").value;
      const status = document.getElementById("emailAlertStatus");

      status.textContent = "Saving...";
      status.className = "api-status muted";

      try {
        const res = await fetch(`${API_BASE}/api/alerts/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, symbol, alertType })
        });

        const data = await res.json();

        if (!res.ok || data.ok === false) {
          throw new Error(data.error || "Unable to save email alert signup.");
        }

        status.textContent = "Saved. Signup recorded successfully.";
        status.className = "api-status up";
        e.target.reset();
        document.getElementById("emailSymbol").value = symbol || "NVDA";
      } catch (err) {
        status.textContent = err.message;
        status.className = "api-status down";
      }
    });
  }
}

async function loadTickers() {
  const symbols = ["NVDA", "AMD", "AAPL"];
  const row = document.getElementById("tickerRow");
  if (!row) return;

  row.innerHTML = `<div class="muted">Loading watchlist...</div>`;

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const res = await fetch(`${API_BASE}/api/quote?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();

        if (!res.ok || data.ok === false) {
          throw new Error(data.error || `Failed: ${symbol}`);
        }

        return { symbol, data };
      })
    );

    row.innerHTML = results
      .map(({ symbol, data }) => {
        const changeClass = Number(data.dp) >= 0 ? "up" : "down";
        return `
          <div class="ticker-card">
            <h4>${escapeHtml(symbol)}</h4>
            <div><strong>${formatMoney(data.c)}</strong></div>
            <div class="${changeClass}">
              ${formatSigned(data.d)} (${formatSigned(data.dp)}%)
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    row.innerHTML = `<div class="down">Watchlist partially unavailable right now.</div>`;
  }
}

async function loadSymbol(symbol) {
  const status = document.getElementById("quoteStatus");
  const chartMessage = document.getElementById("chartMessage");

  if (status) status.textContent = "Loading...";
  if (chartMessage) chartMessage.textContent = "";

  appState.currentSymbol = symbol;

  let quote = null;
  let candles = null;
  let quoteError = null;
  let candlesError = null;

  try {
    const quoteRes = await fetch(`${API_BASE}/api/quote?symbol=${encodeURIComponent(symbol)}`);
    const quoteData = await quoteRes.json();

    if (!quoteRes.ok || quoteData.ok === false) {
      throw new Error(quoteData.error || "Quote failed");
    }

    quote = quoteData;
  } catch (err) {
    quoteError = err;
  }

  if (quote) {
    try {
      const candleRes = await fetch(`${API_BASE}/api/candles?symbol=${encodeURIComponent(symbol)}`);
      const candleData = await candleRes.json();

      if (!candleRes.ok || candleData.ok === false) {
        throw new Error(candleData.error || "Candles failed");
      }

      candles = candleData.points || [];
    } catch (err) {
      candlesError = err;
    }
  }

  if (quoteError) {
    console.error(quoteError);
    if (status) status.textContent = "Error";
    showChartUnavailable("Live quote is unavailable right now.");
    alert(`Unable to load ${symbol} quote. Check backend quote API.`);
    return;
  }

  appState.currentQuote = quote;
  appState.currentCandles = Array.isArray(candles) ? candles : [];

  renderQuote(symbol, quote);
  updateHero(symbol, quote);

  if (candles && candles.length > 1) {
    renderChart("marketChart", appState.currentCandles, symbol);
    updateRisk(symbol, quote, appState.currentCandles);
    clearChartUnavailable();
  } else {
    showChartUnavailable(
      candlesError ? "Chart data unavailable right now. Quote is still live." : "No chart data available."
    );
    renderEmptyChart("marketChart", `${symbol} chart unavailable`);
    renderRiskUnavailable(symbol, quote);
  }

  if (status) {
    status.textContent = candlesError ? "Quote Live / Chart Unavailable" : "Live";
  }
}

function renderQuote(symbol, quote) {
  const isUp = Number(quote.dp) >= 0;

  setText("quoteSymbol", symbol);
  setText("quotePrice", formatMoney(quote.c));
  setText("quoteChange", formatSigned(quote.d));
  setText("quotePercent", `${formatSigned(quote.dp)}%`);
  setText("quoteHigh", formatMoney(quote.h));
  setText("quoteLow", formatMoney(quote.l));
  setText("quoteOpen", formatMoney(quote.o));
  setText("quotePrevClose", formatMoney(quote.pc));

  setClass("quoteChange", isUp ? "up" : "down");
  setClass("quotePercent", isUp ? "up" : "down");
}

function updateHero(symbol, quote) {
  setText("heroSymbol", symbol);
  setText("heroPrice", formatMoney(quote.c));
  setText("heroChange", `${formatSigned(quote.d)} (${formatSigned(quote.dp)}%)`);
}

function renderChart(canvasId, data, symbol) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || canvas.width || 1200;
  const cssHeight = canvasId === "marketChartExpanded" ? 620 : 380;

  canvas.width = cssWidth * ratio;
  canvas.height = cssHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const styles = getComputedStyle(document.body);
  const lineColor = styles.getPropertyValue("--accent").trim() || "#5aa7ff";
  const lineColor2 = styles.getPropertyValue("--accent-2").trim() || "#8c5bff";
  const textColor = styles.getPropertyValue("--muted").trim() || "#93a1bd";
  const borderColor = styles.getPropertyValue("--line").trim() || "rgba(255,255,255,0.08)";
  const bgColor = styles.getPropertyValue("--panel-2").trim() || "#0f1522";

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  const padding = { top: 30, right: 18, bottom: 38, left: 60 };

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const y = padding.top + ((cssHeight - padding.top - padding.bottom) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(cssWidth - padding.right, y);
    ctx.stroke();
  }

  if (!data || data.length < 2) {
    renderEmptyChart(canvasId, "No chart data available");
    return;
  }

  const values = data.map((p) => Number(p.close));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const points = data.map((point, index) => {
    const x = padding.left + (index / (data.length - 1)) * (cssWidth - padding.left - padding.right);
    const y =
      cssHeight -
      padding.bottom -
      ((Number(point.close) - min) / range) * (cssHeight - padding.top - padding.bottom);
    return { x, y, ...point };
  });

  const gradient = ctx.createLinearGradient(0, padding.top, 0, cssHeight - padding.bottom);
  gradient.addColorStop(0, `${lineColor}55`);
  gradient.addColorStop(1, `${lineColor2}08`);

  ctx.beginPath();
  ctx.moveTo(points[0].x, cssHeight - padding.bottom);
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, cssHeight - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.lineWidth = 3;
  ctx.strokeStyle = lineColor;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = "12px sans-serif";
  ctx.fillText(`${symbol} price`, padding.left, 18);

  for (let i = 0; i <= 5; i += 1) {
    const value = max - (range * i) / 5;
    const y = padding.top + ((cssHeight - padding.top - padding.bottom) * i) / 5 + 4;
    ctx.fillText(formatMoney(value), 8, y);
  }

  const xTicks = 5;
  for (let i = 0; i <= xTicks; i += 1) {
    const idx = Math.floor((data.length - 1) * (i / xTicks));
    const p = points[idx];
    const label = data[idx].label || "";
    ctx.fillText(label, Math.max(p.x - 20, padding.left), cssHeight - 12);
  }
}

function renderEmptyChart(canvasId, message) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || canvas.width || 1200;
  const cssHeight = canvasId === "marketChartExpanded" ? 620 : 380;

  canvas.width = cssWidth * ratio;
  canvas.height = cssHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const styles = getComputedStyle(document.body);
  const textColor = styles.getPropertyValue("--muted").trim() || "#93a1bd";
  const bgColor = styles.getPropertyValue("--panel-2").trim() || "#0f1522";

  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  ctx.fillStyle = textColor;
  ctx.font = "16px sans-serif";
  ctx.fillText(message, 24, 42);
}

function openChartModal() {
  const modal = document.getElementById("chartModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  setText("modalChartTitle", `${appState.currentSymbol} Expanded Chart`);

  if (appState.currentCandles.length > 1) {
    renderChart("marketChartExpanded", appState.currentCandles, appState.currentSymbol);
  } else {
    renderEmptyChart("marketChartExpanded", `${appState.currentSymbol} chart unavailable`);
  }
}

function closeChartModal() {
  const modal = document.getElementById("chartModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function updateRisk(symbol, quote, candles) {
  if (!quote || !candles || candles.length < 3) {
    renderRiskUnavailable(symbol, quote);
    return;
  }

  const closes = candles.map((x) => Number(x.close));
  const returns = [];

  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1];
    const cur = closes[i];
    returns.push(((cur - prev) / prev) * 100);
  }

  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);

  const dailyMove = Math.abs(Number(quote.dp || 0));
  const momentum = Math.abs(avg);

  let score = Math.min(dailyMove * 7, 35) + Math.min(volatility * 18, 40) + Math.min(momentum * 12, 25);
  score = Math.max(1, Math.min(100, Math.round(score)));

  const label = score < 30 ? "Low Risk" : score < 60 ? "Moderate Risk" : "High Risk";

  let reason = `${symbol} shows ${dailyMove.toFixed(2)}% daily move and ${volatility.toFixed(2)}% rolling volatility.`;
  if (score >= 60) {
    reason += " Volatility is elevated and deserves close monitoring.";
  } else if (score >= 30) {
    reason += " Conditions are active but not extreme.";
  } else {
    reason += " Recent movement looks relatively stable.";
  }

  setText("riskScoreValue", score);
  setText("riskLabel", label);
  setText("riskReason", reason);
  setText("heroRisk", `${score}/100`);

  const ring = document.querySelector(".risk-ring");
  if (ring) {
    ring.style.background = `conic-gradient(var(--accent) ${score * 3.6}deg, rgba(255,255,255,0.08) ${score * 3.6}deg)`;
  }

  const dailyMoveBar = document.getElementById("dailyMoveBar");
  const volatilityBar = document.getElementById("volatilityBar");
  const momentumBar = document.getElementById("momentumBar");

  if (dailyMoveBar) dailyMoveBar.style.width = `${Math.min(dailyMove * 7, 35) * 2.5}%`;
  if (volatilityBar) volatilityBar.style.width = `${Math.min(volatility * 18, 40) * 2.5}%`;
  if (momentumBar) momentumBar.style.width = `${Math.min(momentum * 12, 25) * 4}%`;
}

function renderRiskUnavailable(symbol, quote) {
  const dailyMove = Math.abs(Number(quote?.dp || 0));
  const fallbackScore = Math.max(5, Math.min(100, Math.round(dailyMove * 8 + 10)));

  setText("riskScoreValue", fallbackScore);
  setText("riskLabel", "Estimated Risk");
  setText(
    "riskReason",
    `${symbol} live quote is available, but chart history is unavailable, so this is a lighter estimate based on daily move only.`
  );
  setText("heroRisk", `${fallbackScore}/100`);

  const ring = document.querySelector(".risk-ring");
  if (ring) {
    ring.style.background = `conic-gradient(var(--accent) ${fallbackScore * 3.6}deg, rgba(255,255,255,0.08) ${fallbackScore * 3.6}deg)`;
  }

  const dailyMoveBar = document.getElementById("dailyMoveBar");
  const volatilityBar = document.getElementById("volatilityBar");
  const momentumBar = document.getElementById("momentumBar");

  if (dailyMoveBar) dailyMoveBar.style.width = `${Math.min(dailyMove * 8, 80)}%`;
  if (volatilityBar) volatilityBar.style.width = "0%";
  if (momentumBar) momentumBar.style.width = "0%";
}

function renderJobs(list) {
  const grid = document.getElementById("jobsGrid");
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `<div class="muted">No matching jobs sources found.</div>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (job) => `
        <article class="job-card">
          <h3>${escapeHtml(job.company)}</h3>
          <div class="tags">
            <span class="tag">${escapeHtml(job.region)}</span>
            <span class="tag">${escapeHtml(job.industry)}</span>
          </div>
          <p>${escapeHtml(job.note)}</p>
          <a href="${escapeAttribute(job.url)}" target="_blank" rel="noopener noreferrer">
            Open Careers →
          </a>
        </article>
      `
    )
    .join("");
}

function renderSavedAlerts() {
  const wrap = document.getElementById("savedAlerts");
  if (!wrap) return;

  if (!appState.savedAlerts.length) {
    wrap.innerHTML = `<div class="muted">No browser alerts saved yet.</div>`;
    return;
  }

  wrap.innerHTML = appState.savedAlerts
    .map(
      (item) => `
        <div class="saved-alert-item">
          <strong>${escapeHtml(item.symbol)}</strong> → notify above ${formatMoney(item.above)}
          <div class="inline-actions" style="margin-top:10px;">
            <button class="btn btn-secondary remove-alert-btn" data-id="${escapeAttribute(item.id)}" type="button">
              Remove
            </button>
          </div>
        </div>
      `
    )
    .join("");

  wrap.querySelectorAll(".remove-alert-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      appState.savedAlerts = appState.savedAlerts.filter((x) => x.id !== btn.dataset.id);
      persistAlerts();
      renderSavedAlerts();
    });
  });
}

async function checkAlertsNow() {
  if (!appState.savedAlerts.length) {
    alert("No browser alerts saved.");
    return;
  }

  const results = [];

  for (const item of appState.savedAlerts) {
    try {
      const res = await fetch(`${API_BASE}/api/quote?symbol=${encodeURIComponent(item.symbol)}`);
      const quote = await res.json();

      if (!res.ok || quote.ok === false) continue;

      const hit = Number(quote.c) >= Number(item.above);
      results.push({ ...item, current: quote.c, hit });

      if (hit && Notification.permission === "granted") {
        new Notification(`Youooo Alert: ${item.symbol}`, {
          body: `${item.symbol} is now ${formatMoney(quote.c)} (target: ${formatMoney(item.above)})`
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  const hitCount = results.filter((r) => r.hit).length;
  alert(`Alert check finished. ${hitCount} trigger(s) hit.`);
}

function persistAlerts() {
  localStorage.setItem("youooo_v8_alerts", JSON.stringify(appState.savedAlerts));
}

function showChartUnavailable(message) {
  let el = document.getElementById("chartMessage");
  const chartShell = document.querySelector(".chart-card .card-header");

  if (!el && chartShell) {
    el = document.createElement("span");
    el.id = "chartMessage";
    el.className = "muted";
    chartShell.appendChild(el);
  }

  if (el) el.textContent = message;
}

function clearChartUnavailable() {
  const el = document.getElementById("chartMessage");
  if (el) el.textContent = "";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setClass(id, className) {
  const el = document.getElementById(id);
  if (el) el.className = className;
}

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(num);
}

function formatSigned(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "--";
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}