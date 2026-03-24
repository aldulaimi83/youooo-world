const signals = [
  {
    company: "Meta",
    type: "Layoffs",
    size: "2,000 employees",
    urgency: "Fresh",
    timestamp: "3 days ago",
    competition: "Low",
    confidence: 88,
    opportunityScore: 91,
    window: "2–4 weeks",
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
      "Short window where talent is available and not yet saturated by recruiter outreach.",
    recruiterActions: [
      "Target ML and frontend engineers first",
      "Focus on California and Remote candidates",
      "Prioritize 3–8 year experience"
    ],
    outreach:
      "Hi, I noticed your experience at Meta. We're working with teams hiring ML and frontend engineers right now. Would love to connect if you're open to new opportunities."
  },
  {
    company: "Google",
    type: "Hiring Freeze",
    size: "Partial freeze",
    urgency: "Active",
    timestamp: "1 week ago",
    competition: "Medium",
    confidence: 74,
    opportunityScore: 73,
    window: "3–6 weeks",
    summary: "Passive talent movement due to internal slowdowns.",
    roles: {
      "Cloud Engineers": "40%",
      "AI": "30%",
      "Infra": "30%"
    },
    locations: ["US", "EU", "Remote"],
    experience: ["5+ years"],
    whyItMatters:
      "Hiring freezes often trigger early talent movement before layoffs.",
    recruiterActions: [
      "Use soft outreach",
      "Target senior cloud talent",
      "Monitor over 2–6 weeks"
    ],
    outreach:
      "Hi, I wanted to reach out as we're seeing movement in cloud and infrastructure roles. Your background at Google is highly relevant—open to a quick chat?"
  },
  {
    company: "Tesla",
    type: "Hiring Surge",
    size: "1,500+ openings",
    urgency: "Fresh",
    timestamp: "2 days ago",
    competition: "Rising",
    confidence: 81,
    opportunityScore: 81,
    window: "Ongoing",
    summary: "High demand for manufacturing, robotics, and firmware.",
    roles: {
      "Manufacturing": "50%",
      "AI / Robotics": "30%",
      "Firmware": "20%"
    },
    locations: ["Texas", "California"],
    experience: ["2–6 years"],
    whyItMatters:
      "Demand spike means future talent shortage and higher competition.",
    recruiterActions: [
      "Source early before demand spikes",
      "Focus on firmware talent",
      "Watch Texas market closely"
    ],
    outreach:
      "Hi, we're seeing increased demand in robotics and firmware. Your Tesla experience stands out—would you be open to exploring new roles?"
  }
];

const signalsContainer = document.getElementById("signalsContainer");
const detailsContainer = document.getElementById("detailsContainer");
const detailsStatus = document.getElementById("detailsStatus");
const trackedSignalsCount = document.getElementById("trackedSignalsCount");
const freshWindowsCount = document.getElementById("freshWindowsCount");
const bestTargetText = document.getElementById("bestTargetText");

let activeCompany = null;

function updateHeroMetrics() {
  trackedSignalsCount.textContent = signals.length;
  freshWindowsCount.textContent = signals.filter(s => s.urgency === "Fresh").length;
  bestTargetText.textContent = signals[0].company;
}

function renderSignals() {
  signalsContainer.innerHTML = "";

  signals.forEach(signal => {
    const card = document.createElement("div");
    card.className = "signal-card";

    card.innerHTML = `
      <h3>${signal.company}</h3>
      <p>${signal.type} • ${signal.timestamp}</p>
      <p>${signal.size}</p>
      <p>⚡ ${signal.urgency} • Competition: ${signal.competition}</p>
      <p>${signal.summary}</p>
    `;

    card.onclick = () => renderDetails(signal);

    signalsContainer.appendChild(card);
  });
}

function renderDetails(signal) {
  detailsStatus.textContent = `${signal.company} selected`;

  const rolesHTML = Object.entries(signal.roles)
    .map(([k, v]) => `<li>${k}: ${v}</li>`)
    .join("");

  const actionsHTML = signal.recruiterActions
    .map(a => `<li>${a}</li>`)
    .join("");

  detailsContainer.innerHTML = `
    <h3>${signal.company}</h3>
    <p><strong>Signal:</strong> ${signal.type}</p>
    <p><strong>Time:</strong> ${signal.timestamp}</p>
    <p><strong>Opportunity Score:</strong> ${signal.opportunityScore}</p>
    <p><strong>Confidence:</strong> ${signal.confidence}%</p>
    <p><strong>Competition:</strong> ${signal.competition}</p>
    <p><strong>Window:</strong> ${signal.window}</p>

    <h4>Roles</h4>
    <ul>${rolesHTML}</ul>

    <h4>Why This Matters</h4>
    <p>${signal.whyItMatters}</p>

    <h4>Recruiter Actions</h4>
    <ul>${actionsHTML}</ul>

    <button onclick="copyOutreach('${signal.outreach.replace(/'/g, "\\'")}')">
      💼 Copy Outreach Message
    </button>
  `;
}

function copyOutreach(text) {
  navigator.clipboard.writeText(text);
  alert("Outreach copied");
}

updateHeroMetrics();
renderSignals();
