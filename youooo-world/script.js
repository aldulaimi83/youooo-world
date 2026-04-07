const API_BASE = "https://youooo-world-api.youooo.workers.dev";

const signalsContainer = document.getElementById("signalsContainer");
const detailsContainer = document.getElementById("detailsContainer");
const detailsStatus = document.getElementById("detailsStatus");
const trackedSignalsCount = document.getElementById("trackedSignalsCount");
const freshWindowsCount = document.getElementById("freshWindowsCount");
const bestTargetText = document.getElementById("bestTargetText");

let signals = [];
let activeCompany = null;
let map = null;
let mapMarkers = [];

// ── Map ───────────────────────────────────────────────────────────────────────

function initMap() {
  map = L.map("talentMap", { zoomControl: true, scrollWheelZoom: false }).setView([20, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);
}

function getMarkerColor(type) {
  if (type === "Layoffs") return "#ff6b6b";
  if (type === "Hiring Freeze") return "#ffb454";
  return "#36d399";
}

function buildMarkerIcon(type) {
  const color = getMarkerColor(type);
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};
      border:2px solid rgba(255,255,255,0.6);
      box-shadow:0 0 8px ${color};
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function renderMapMarkers() {
  mapMarkers.forEach((m) => m.remove());
  mapMarkers = [];

  signals.forEach((signal) => {
    if (!signal.coords) return;
    const { lat, lng } = signal.coords;
    const marker = L.marker([lat, lng], { icon: buildMarkerIcon(signal.type) })
      .addTo(map)
      .bindPopup(`
        <strong>${signal.company}</strong><br/>
        ${signal.type} · ${signal.urgency}<br/>
        <small>${signal.size}</small>
      `);
    marker.on("click", () => {
      activeCompany = signal.company;
      renderSignals();
      renderDetails(signal);
    });
    mapMarkers.push(marker);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTypeClass(type) {
  if (type === "Layoffs") return "pill-type-layoff";
  if (type === "Hiring Freeze") return "pill-type-freeze";
  return "pill-type-surge";
}

function getUrgencyClass(urgency) {
  if (urgency === "Fresh") return "pill-fresh";
  if (urgency === "Active") return "pill-active";
  return "pill-old";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateHeroMetrics() {
  trackedSignalsCount.textContent = String(signals.length);
  freshWindowsCount.textContent = String(
    signals.filter((item) => item.urgency === "Fresh").length
  );
  bestTargetText.textContent = signals[0]?.bestTarget || "—";
}

// ── Signal cards ──────────────────────────────────────────────────────────────

function renderSignals() {
  signalsContainer.innerHTML = "";

  signals.forEach((signal) => {
    const card = document.createElement("article");
    card.className = `signal-card${activeCompany === signal.company ? " active" : ""}`;
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open details for ${signal.company}`);

    card.innerHTML = `
      <div class="signal-top">
        <div>
          <h3 class="signal-company">${escapeHtml(signal.company)}</h3>
          <p class="signal-size">${escapeHtml(signal.size)}</p>
        </div>
      </div>

      <div class="signal-row">
        <span class="pill ${getTypeClass(signal.type)}">${escapeHtml(signal.type)}</span>
        <span class="pill ${getUrgencyClass(signal.urgency)}">${escapeHtml(signal.urgency)}</span>
      </div>

      <p class="signal-summary">${escapeHtml(signal.summary)}</p>
      <p class="signal-summary" style="margin-top:10px;">
        Source: ${escapeHtml(signal.sourceName)} • Updated: ${escapeHtml(signal.timestamp)}
      </p>
      <p class="signal-summary" style="margin-top:6px;">
        Confidence: ${escapeHtml(signal.confidence)}% • Competition: ${escapeHtml(signal.competition)}
      </p>
    `;

    card.addEventListener("click", () => {
      activeCompany = signal.company;
      renderSignals();
      renderDetails(signal);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activeCompany = signal.company;
        renderSignals();
        renderDetails(signal);
      }
    });

    signalsContainer.appendChild(card);
  });
}

// ── Details panel ─────────────────────────────────────────────────────────────

function renderRoleList(roles) {
  return Object.entries(roles || {})
    .map(([role, value]) => `<li><strong>${escapeHtml(role)}:</strong> ${escapeHtml(value)}</li>`)
    .join("");
}

function renderActionList(actions) {
  return (actions || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

async function copyOutreach(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Outreach copied");
  } catch {
    alert("Copy failed");
  }
}

function renderDetails(signal) {
  detailsStatus.textContent = `${signal.company} selected`;

  detailsContainer.className = "";
  detailsContainer.innerHTML = `
    <div class="details-card">
      <div class="details-hero">
        <div class="details-title">
          <h3>${escapeHtml(signal.company)}</h3>
          <div class="details-subtitle">
            ${escapeHtml(signal.type)} • ${escapeHtml(signal.urgency)} window • ${escapeHtml(signal.size)}
          </div>
        </div>
        <div class="score-box">
          <span class="score-label">Opportunity Score</span>
          <div class="score-value">${escapeHtml(signal.opportunityScore)}</div>
        </div>
      </div>

      <div class="details-grid">
        <div class="info-block">
          <h4>Role Breakdown</h4>
          <ul class="role-list">
            ${renderRoleList(signal.roles)}
          </ul>
        </div>

        <div class="info-block">
          <h4>Signal Meta</h4>
          <ul class="meta-list">
            <li><strong>Locations:</strong> ${escapeHtml((signal.locations || []).join(", "))}</li>
            <li><strong>Experience:</strong> ${escapeHtml((signal.experience || []).join(", "))}</li>
            <li><strong>Best target:</strong> ${escapeHtml(signal.bestTarget)}</li>
            <li><strong>Source:</strong> ${escapeHtml(signal.sourceName)}</li>
            <li><strong>Source updated:</strong> ${escapeHtml(signal.timestamp)}</li>
            <li><strong>Confidence:</strong> ${escapeHtml(signal.confidence)}%</li>
            <li><strong>Competition:</strong> ${escapeHtml(signal.competition)}</li>
            <li><strong>Window:</strong> ${escapeHtml(signal.window)}</li>
            <li><strong>Open roles:</strong> ${escapeHtml(signal.jobCount)}</li>
          </ul>
        </div>

        <div class="highlight-box">
          <h4>Why This Matters</h4>
          <p>${escapeHtml(signal.whyItMatters)}</p>
        </div>

        <div class="cta-box">
          <h4>Recruiter Action</h4>
          <ul class="action-list">
            ${renderActionList(signal.recruiterActions)}
          </ul>
          <div style="margin-top: 14px; display:flex; gap:10px; flex-wrap:wrap;">
            <button id="copyOutreachBtn" style="
              border: 0;
              border-radius: 12px;
              padding: 12px 14px;
              cursor: pointer;
              font-weight: 700;
            ">💼 Copy Outreach</button>
            <button id="aiOutreachBtn" class="ai-outreach-btn">✨ AI Outreach</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const copyBtn = document.getElementById("copyOutreachBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => copyOutreach(signal.outreach));
  }

  const aiBtn = document.getElementById("aiOutreachBtn");
  if (aiBtn) {
    aiBtn.addEventListener("click", () => openAiOutreach(signal));
  }
}

function renderEmptyState(message = "No signals available") {
  detailsStatus.textContent = "Waiting for data";
  signalsContainer.innerHTML = `<div class="empty-state"><h3>${escapeHtml(message)}</h3></div>`;
}

// ── AI Outreach Modal ─────────────────────────────────────────────────────────

const outreachModal = document.getElementById("outreachModal");
const outreachContent = document.getElementById("outreachContent");
const outreachActions = document.getElementById("outreachActions");
const closeOutreachModal = document.getElementById("closeOutreachModal");

closeOutreachModal.addEventListener("click", () => {
  outreachModal.hidden = true;
});

outreachModal.addEventListener("click", (e) => {
  if (e.target === outreachModal) outreachModal.hidden = true;
});

let generatedMessage = "";

async function openAiOutreach(signal) {
  generatedMessage = "";
  outreachActions.hidden = true;
  outreachContent.innerHTML = `
    <div class="outreach-loading">
      <div class="spinner"></div>
      <p>Generating personalized message…</p>
    </div>
  `;
  outreachModal.hidden = false;

  try {
    const resp = await fetch(`${API_BASE}/api/outreach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal }),
    });

    if (!resp.ok) throw new Error("API error");
    const data = await resp.json();
    generatedMessage = data.message || "";

    outreachContent.innerHTML = `<pre class="outreach-text">${escapeHtml(generatedMessage)}</pre>`;
    outreachActions.hidden = false;
  } catch {
    outreachContent.innerHTML = `<p class="outreach-error">Failed to generate message. Please try again.</p>`;
  }
}

document.getElementById("copyOutreachAI").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(generatedMessage);
    const btn = document.getElementById("copyOutreachAI");
    btn.textContent = "✅ Copied!";
    setTimeout(() => (btn.textContent = "📋 Copy Message"), 2000);
  } catch {
    alert("Copy failed");
  }
});

// ── Watchlist Modal ───────────────────────────────────────────────────────────

const watchlistModal = document.getElementById("watchlistModal");
const watchlistBtn = document.getElementById("watchlistBtn");
const closeWatchlistModal = document.getElementById("closeWatchlistModal");
const watchEmail = document.getElementById("watchEmail");
const watchCompany = document.getElementById("watchCompany");
const subscribeBtn = document.getElementById("subscribeBtn");
const unsubscribeBtn = document.getElementById("unsubscribeBtn");
const watchlistMsg = document.getElementById("watchlistMsg");

watchlistBtn.addEventListener("click", () => {
  watchlistMsg.hidden = true;
  watchlistModal.hidden = false;
});

closeWatchlistModal.addEventListener("click", () => {
  watchlistModal.hidden = true;
});

watchlistModal.addEventListener("click", (e) => {
  if (e.target === watchlistModal) watchlistModal.hidden = true;
});

function populateWatchlistCompanies() {
  watchCompany.innerHTML = `<option value="">— Select a company —</option>`;
  signals.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.company;
    opt.textContent = s.company;
    watchCompany.appendChild(opt);
  });
}

function showWatchlistMsg(text, isError = false) {
  watchlistMsg.textContent = text;
  watchlistMsg.className = `modal-message${isError ? " modal-message-error" : " modal-message-ok"}`;
  watchlistMsg.hidden = false;
}

subscribeBtn.addEventListener("click", async () => {
  const email = watchEmail.value.trim();
  const company = watchCompany.value;
  if (!email || !company) {
    showWatchlistMsg("Please enter your email and select a company.", true);
    return;
  }

  subscribeBtn.disabled = true;
  subscribeBtn.textContent = "Subscribing…";

  try {
    const resp = await fetch(`${API_BASE}/api/watchlist/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, company }),
    });
    const data = await resp.json();
    if (data.ok) {
      showWatchlistMsg(`✅ Subscribed! You'll get alerts for ${company}.`);
    } else {
      showWatchlistMsg(data.error || "Subscribe failed.", true);
    }
  } catch {
    showWatchlistMsg("Network error. Please try again.", true);
  } finally {
    subscribeBtn.disabled = false;
    subscribeBtn.textContent = "Subscribe";
  }
});

unsubscribeBtn.addEventListener("click", async () => {
  const email = watchEmail.value.trim();
  const company = watchCompany.value;
  if (!email || !company) {
    showWatchlistMsg("Please enter your email and select a company.", true);
    return;
  }

  unsubscribeBtn.disabled = true;
  unsubscribeBtn.textContent = "Removing…";

  try {
    const resp = await fetch(`${API_BASE}/api/watchlist/unsubscribe`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, company }),
    });
    const data = await resp.json();
    if (data.ok) {
      showWatchlistMsg(`Unsubscribed from ${company} alerts.`);
    } else {
      showWatchlistMsg(data.error || "Unsubscribe failed.", true);
    }
  } catch {
    showWatchlistMsg("Network error. Please try again.", true);
  } finally {
    unsubscribeBtn.disabled = false;
    unsubscribeBtn.textContent = "Unsubscribe";
  }
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function loadSignals() {
  try {
    const response = await fetch(`${API_BASE}/api/signals`);
    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    const payload = await response.json();
    signals = Array.isArray(payload.signals) ? payload.signals : [];

    if (!signals.length) {
      renderEmptyState("No live signals yet");
      updateHeroMetrics();
      return;
    }

    updateHeroMetrics();
    renderMapMarkers();
    populateWatchlistCompanies();
    renderSignals();

    activeCompany = signals[0].company;
    renderSignals();
    renderDetails(signals[0]);
  } catch (error) {
    console.error(error);
    renderEmptyState("Failed to load live data");
  }
}

initMap();
loadSignals();
