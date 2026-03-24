const signals = [
  {
    company: "Meta",
    type: "Layoffs",
    size: "2,000 employees",
    urgency: "Fresh",
    opportunityScore: 91,
    summary: "Strong short-term access to AR/VR, frontend, and ML talent.",
    roles: {
      "Frontend Engineers": "35%",
      "ML Engineers": "25%",
      "Backend Engineers": "20%",
      "Product / Other": "20%"
    },
    locations: ["California", "New York", "Remote"],
    experience: ["3–5 years", "5–8 years"],
    whyItMatters:
      "This is a short competition window. Recruiters targeting applied AI, frontend product teams, and immersive-tech talent should move immediately.",
    recruiterActions: [
      "Target ML and frontend engineers first",
      "Focus outreach on California and Remote candidates",
      "Prioritize 3–8 year candidates for fastest placement"
    ],
    bestTarget: "ML + Frontend"
  },
  {
    company: "Google",
    type: "Hiring Freeze",
    size: "Partial freeze",
    urgency: "Active",
    opportunityScore: 73,
    summary: "Hiring slowdown creates outbound talent flow without full separation events.",
    roles: {
      "Cloud Engineers": "40%",
      "AI / Applied ML": "30%",
      "Infrastructure": "30%"
    },
    locations: ["United States", "Europe", "Remote"],
    experience: ["5+ years"],
    whyItMatters:
      "Hiring freezes often create passive candidate movement before the rest of the market notices. Good source for senior cloud and infra talent.",
    recruiterActions: [
      "Use soft outbound, not layoff-style messaging",
      "Target senior cloud and infra profiles",
      "Watch for movement over the next 2–6 weeks"
    ],
    bestTarget: "Cloud + Infra"
  },
  {
    company: "Tesla",
    type: "Hiring Surge",
    size: "1,500+ openings",
    urgency: "Fresh",
    opportunityScore: 81,
    summary: "Aggressive growth points to high demand in automation, AI, and firmware.",
    roles: {
      "Manufacturing Engineering": "50%",
      "AI / Robotics": "30%",
      "Firmware": "20%"
    },
    locations: ["Texas", "California"],
    experience: ["2–6 years"],
    whyItMatters:
      "This is useful in the opposite direction: recruiters can map where demand is rising and which skill clusters are becoming harder to hire.",
    recruiterActions: [
      "Expect rising competition for firmware and robotics talent",
      "Source earlier in Texas before demand widens",
      "Position candidates before compensation pressure increases"
    ],
    bestTarget: "Firmware + Robotics"
  }
];

const signalsContainer = document.getElementById("signalsContainer");
const detailsContainer = document.getElementById("detailsContainer");
const detailsStatus = document.getElementById("detailsStatus");
const trackedSignalsCount = document.getElementById("trackedSignalsCount");
const freshWindowsCount = document.getElementById("freshWindowsCount");
const bestTargetText = document.getElementById("bestTargetText");

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
          <h3 class="signal-company">${signal.company}</h3>
          <p class="signal-size">${signal.size}</p>
        </div>
      </div>

      <div class="signal-row">
        <span class="pill ${getTypeClass(signal.type)}">${signal.type}</span>
        <span class="pill ${getUrgencyClass(signal.urgency)}">${signal.urgency}</span>
      </div>

      <p class="signal-summary">${signal.summary}</p>
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
  return Object.entries(roles)
    .map(([role, value]) => `<li><strong>${role}:</strong> ${value}</li>`)
    .join("");
}

function renderDetails(signal) {
  detailsStatus.textContent = `${signal.company} selected`;

  detailsContainer.className = "";
  detailsContainer.innerHTML = `
    <div class="details-card">
      <div class="details-hero">
        <div class="details-title">
          <h3>${signal.company}</h3>
          <div class="details-subtitle">${signal.type} • ${signal.urgency} window • ${signal.size}</div>
        </div>
        <div class="score-box">
          <span class="score-label">Opportunity Score</span>
          <div class="score-value">${signal.opportunityScore}</div>
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
          <h4>Talent Profile</h4>
          <ul class="meta-list">
            <li><strong>Locations:</strong> ${signal.locations.join(", ")}</li>
            <li><strong>Experience:</strong> ${signal.experience.join(", ")}</li>
            <li><strong>Best target:</strong> ${signal.bestTarget}</li>
          </ul>
        </div>

        <div class="highlight-box">
          <h4>Why This Matters</h4>
          <p>${signal.whyItMatters}</p>
        </div>

        <div class="cta-box">
          <h4>Recruiter Action</h4>
          <ul class="action-list">
            ${signal.recruiterActions.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </div>
      </div>
    </div>
  `;
}

updateHeroMetrics();
renderSignals();
