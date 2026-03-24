const signals = [
  {
    company: "Meta",
    type: "Layoffs",
    size: "2,000 employees",
    roles: {
      "Frontend": "35%",
      "ML": "25%",
      "Backend": "20%",
      "Other": "20%"
    },
    locations: ["California", "New York", "Remote"],
    experience: ["3-5 yrs", "5-8 yrs"],
    insight: "High availability of AR/VR talent. Low competition window (2–4 weeks)."
  },
  {
    company: "Google",
    type: "Hiring Freeze",
    size: "Partial freeze",
    roles: {
      "Cloud": "40%",
      "AI": "30%",
      "Infra": "30%"
    },
    locations: ["Global"],
    experience: ["5+ yrs"],
    insight: "Reduced hiring but talent still moving internally."
  },
  {
    company: "Tesla",
    type: "Hiring Surge",
    size: "1,500+ openings",
    roles: {
      "Manufacturing": "50%",
      "AI": "30%",
      "Firmware": "20%"
    },
    locations: ["Texas", "California"],
    experience: ["2-6 yrs"],
    insight: "Aggressive hiring in AI + factory automation."
  }
];

const container = document.getElementById("signalsContainer");
const details = document.getElementById("detailsContainer");

signals.forEach((s, index) => {
  const card = document.createElement("div");
  card.className = "card";

  let badgeClass = "hiring";
  if (s.type === "Layoffs") badgeClass = "layoff";
  if (s.type === "Hiring Freeze") badgeClass = "freeze";

  card.innerHTML = `
    <h3>${s.company}</h3>
    <div class="badge ${badgeClass}">${s.type}</div>
    <p>${s.size}</p>
  `;

  card.onclick = () => showDetails(index);

  container.appendChild(card);
});

function showDetails(index) {
  const s = signals[index];

  let rolesHTML = "";
  for (let role in s.roles) {
    rolesHTML += `<li>${role}: ${s.roles[role]}</li>`;
  }

  details.innerHTML = `
    <h3>${s.company}</h3>
    <p><strong>Signal:</strong> ${s.type}</p>
    <p><strong>Roles:</strong></p>
    <ul>${rolesHTML}</ul>

    <p><strong>Locations:</strong> ${s.locations.join(", ")}</p>
    <p><strong>Experience:</strong> ${s.experience.join(", ")}</p>

    <p><strong>Insight:</strong> ${s.insight}</p>
  `;
}
