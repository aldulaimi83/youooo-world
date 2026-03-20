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
});

function bindTabs() {
  const links = document.querySelectorAll(".tab-link");
  const panels = document.querySelectorAll(".tab-panel");

  function activate(tab) {
    links.forEach((link) => {
      link.classList.toggle("active", link.dataset.tab === tab);
    });
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `${tab}Tab`);
    });
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      activate(tab);
      history.replaceState(null, "", `#${tab}`);
    });
  });

  const hash = window.location.hash.replace("#", "");
  const valid = ["home", "markets", "risk", "jobs", "alerts"];
  if (valid.includes(hash)) {
    activate(hash);
  } else {
    activate("home");
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
      .filter((item) =>
        item.label.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q)
      )
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
          document.querySelector('[data-tab="markets"]').click();
          document.getElementById("symbolInput").value = label.toUpperCase();
          loadSymbol(label.toUpperCase());
        } else {
          document.querySelector('[data-tab="jobs"]').click();
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

  document.getElementById("heroLoadBtn").addEventListener("click", () => {
    document.querySelector('[data-tab="markets"]').click();
    loadSymbol(appState.currentSymbol || "NVDA");
  });
}

function bindMarkets() {
  document.getElementById("loadSymbolBtn").addEventListener("click", () => {
    const symbol = document.getElementById("symbolInput").value.trim().toUpperCase() || "NVDA";
    loadSymbol(symbol);
  });

  document.getElementById("symbolInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      loadSymbol(e.target.value.trim().toUpperCase() || "NVDA");
    }
  });

  document.getElementById("expandChartBtn").addEventListener("click", openChartModal);
  document.getElementById("closeModalBtn").addEventListener("click", closeChartModal);
  document.getElementById("modalBackdrop").addEventListener("click", closeChartModal);
}

function bindJobsFilter() {
  const input = document.getElementById("jobsSearch");
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
  document.getElementById("localAlertForm").addEventListener("submit", (e) => {
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

  document.getElementById("enableNotificationsBtn").addEventListener("click", async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    alert(`Notification permission: ${permission}`);
  });

  document.getElementById("runAlertCheckBtn").addEventListener("click", async () => {
    await checkAlertsNow();
  });

  document.getElementById("emailAlertForm").addEventListener("submit", async (e) => {
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

      if (!res.ok) {
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

async function loadTickers() {
  const symbols = ["NVDA", "AMD", "AAPL", "MSFT", "TSLA", "AMZN"];
  const row = document.getElementById("tickerRow");
  row.innerHTML = `<div class="muted">Loading watchlist...</div>`;

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const res = await fetch(`${API_BASE}/api/quote?symbol=${encodeURIComponent(symbol)}`);
        if (!res.ok) throw new Error(`Failed: ${symbol}`);
        const data = await res.json();
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
    row.innerHTML = `<div class="down">Could not load watchlist. Check backend API and CORS.</div>`;
  }
}

async function loadSymbol(symbol) {
  const status = document.getElementById("quoteStatus");
  status.textContent = "Loading...";
  appState.currentSymbol = symbol;

  try {
    const [quoteRes, candleRes] = await Promise.all([
      fetch(`${API_BASE}/api/quote?symbol=${encodeURIComponent(symbol)}`),
      fetch(`${API_BASE}/api/candles?symbol=${encodeURIComponent(symbol)}`)
    ]);

    const quote = await quoteRes.json();
    const candles = await candleRes.json();

    if (!quoteRes.ok) {
      throw new Error(quote.error || "Quote failed");
    }

    if (!candleRes.ok) {
      throw new Error(candles.error || "Candles failed");
    }

    appState.currentQuote = quote;
    appState.currentCandles = candles.points || [];

    renderQuote(symbol, quote);
    renderChart("marketChart", appState.currentCandles, symbol);
    updateHero(symbol, quote);
    updateRisk(symbol, quote, appState.currentCandles);

    status.textContent = "Live";
  } catch (err) {
    console.error(err);
    status.textContent = "Error";
    alert(`Unable to load ${symbol}. Check backend API, Worker secret, and CORS.`);
  }
}

function renderQuote(symbol, quote) {
  const isUp = Number(quote.dp) >= 0;

  document.getElementById("quoteSymbol").textContent = symbol;
  document.getElementById("quotePrice").textContent = formatMoney(quote.c);
  document.getElementById("quoteChange").textContent = formatSigned(quote.d);
  document.getElementById("quotePercent").textContent = `${formatSigned(quote.dp)}%`;
  document.getElementById("quoteHigh").textContent = formatMoney(quote.h);
  document.getElementById("quoteLow").textContent = formatMoney(quote.l);
  document.getElementById("quoteOpen").textContent = formatMoney(quote.o);
  document.getElementById("quotePrevClose").textContent = formatMoney(quote.pc);

  document.getElementById("quoteChange").className = isUp ? "up" : "down";
  document.getElementById("quotePercent").className = isUp ? "up" : "down";
}

function updateHero(symbol, quote) {
  document.getElementById("heroSymbol").textContent = symbol;
  document.getElementById("heroPrice").textContent = formatMoney(quote.c);
  document.getElementById("heroChange").textContent = `${formatSigned(quote.d)} (${formatSigned(quote.dp)}%)`;
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
    ctx.fillStyle = textColor;
    ctx.font = "16px sans-serif";
    ctx.fillText("No chart data available", padding.left, cssHeight / 2);
    return;
  }

  const values = data.map((p) => p.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const points = data.map((point, index) => {
    const x =
      padding.left +
      (index / (data.length - 1)) * (cssWidth - padding.left - padding.right);
    const y =
      cssHeight -
      padding.bottom -
      ((point.close - min) / range) * (cssHeight - padding.top - padding.bottom);
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
    ctx.fillText(data[idx].label, Math.max(p.x - 20, padding.left), cssHeight - 12);
  }
}

function openChartModal() {
  const modal = document.getElementById("chartModal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.getElementById("modalChartTitle").textContent = `${appState.currentSymbol} Expanded Chart`;
  renderChart("marketChartExpanded", appState.currentCandles, appState.currentSymbol);
}

function closeChartModal() {
  const modal = document.getElementById("chartModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function updateRisk(symbol, quote, candles) {
  if (!quote || !candles || candles.length < 3) return;

  const closes = candles.map((x) => x.close);
  const returns = [];

  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1];
    const cur = closes[i];
    returns.push(((cur - prev) / prev) * 100);
  }

  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);

  const dailyMove = Math.abs(Number(quote.dp || 0));
  const momentum = Math.abs(avg);

  let score =
    Math.min(dailyMove * 7, 35) +
    Math.min(volatility * 18, 40) +
    Math.min(momentum * 12, 25);

  score = Math.max(1, Math.min(100, Math.round(score)));

  const label =
    score < 30 ? "Low Risk" : score < 60 ? "Moderate Risk" : "High Risk";

  let reason = `${symbol} shows ${dailyMove.toFixed(2)}% daily move and ${volatility.toFixed(
    2
  )}% rolling volatility.`;

  if (score >= 60) {
    reason += " Volatility is elevated and deserves close monitoring.";
  } else if (score >= 30) {
    reason += " Conditions are active but not extreme.";
  } else {
    reason += " Recent movement looks relatively stable.";
  }

  document.getElementById("riskScoreValue").textContent = score;
  document.getElementById("riskLabel").textContent = label;
  document.getElementById("riskReason").textContent = reason;
  document.getElementById("heroRisk").textContent = `${score}/100`;

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