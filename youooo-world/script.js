const API_BASE = "https://youooo-world-api.youooo.workers.dev";

const signalsContainer = document.getElementById("signalsContainer");
const detailsContainer = document.getElementById("detailsContainer");
const detailsStatus = document.getElementById("detailsStatus");
const trackedSignalsCount = document.getElementById("trackedSignalsCount");
const freshWindowsCount = document.getElementById("freshWindowsCount");
const bestTargetText = document.getElementById("bestTargetText");

let signals = [];
let activeCompany = null;

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
          <div style="margin-top: 14px;">
            <button id="copyOutreachBtn" style="
              border: 0;
              border-radius: 12px;
              padding: 12px 14px;
              cursor: pointer;
              font-weight: 700;
            ">💼 Copy Outreach Message</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const btn = document.getElementById("copyOutreachBtn");
  if (btn) {
    btn.addEventListener("click", () => copyOutreach(signal.outreach));
  }
}

function renderEmptyState(message = "No signals available") {
  detailsStatus.textContent = "Waiting for data";
  signalsContainer.innerHTML = `<div class="empty-state"><h3>${escapeHtml(message)}</h3></div>`;
}

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
    renderSignals();

    activeCompany = signals[0].company;
    renderSignals();
    renderDetails(signals[0]);
  } catch (error) {
    console.error(error);
    renderEmptyState("Failed to load live data");
  }
}

loadSignals();
