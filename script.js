const BACKEND_BASE = "https://youooo-world-backend.youooo.workers.dev";
const FINNHUB_API_KEY = "d6s99q9r01qj447aq9h0d6s99q9r01qj447aq9hg";
const REFRESH_MS = 60000;

const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
      }
    },
    layers: [
      {
        id: "carto-dark",
        type: "raster",
        source: "carto"
      }
    ]
  },
  center: [-20, 25],
  zoom: 2
});

map.addControl(new maplibregl.NavigationControl(), "bottom-right");

const earthquakeMarkers = [];
const aircraftMarkers = [];
const conflictMarkers = [];
const wildfireMarkers = [];

function clearMarkers(markerArray) {
  markerArray.forEach((m) => m.remove());
  markerArray.length = 0;
}

function updateStamp() {
  const value = new Date().toLocaleString();
  const el = document.getElementById("last-update-box");
  if (el) el.textContent = `UPDATED: ${value}`;
}

function setCount(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function makePopup(title, rows) {
  const htmlRows = rows
    .map(
      (r) =>
        `<div class="popup-row"><span class="popup-label">${r.label}:</span> ${r.value}</div>`
    )
    .join("");

  return new maplibregl.Popup({ offset: 12 }).setHTML(`
    <h3 class="popup-title">${title}</h3>
    ${htmlRows}
  `);
}

function createCustomMarker(className) {
  const el = document.createElement("div");
  el.className = className;
  return el;
}

new maplibregl.Marker({ element: createCustomMarker("youooo-marker") })
  .setLngLat([-97.7431, 30.2672])
  .setPopup(
    makePopup("YOUOOO HQ", [
      { label: "Type", value: "Command Node" },
      { label: "Status", value: "Online" },
      { label: "Region", value: "Austin, Texas, USA" }
    ])
  )
  .addTo(map);

async function loadEarthquakes() {
  clearMarkers(earthquakeMarkers);

  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    );
    const data = await res.json();
    const features = Array.isArray(data.features) ? data.features : [];

    features.forEach((q) => {
      const coords = q.geometry?.coordinates || [];
      const lon = coords[0];
      const lat = coords[1];
      const mag = q.properties?.mag ?? "N/A";
      const place = q.properties?.place ?? "Unknown";
      const time = q.properties?.time
        ? new Date(q.properties.time).toLocaleString()
        : "Unknown";

      if (typeof lon !== "number" || typeof lat !== "number") return;

      const marker = new maplibregl.Marker({
        element: createCustomMarker("military-marker")
      })
        .setLngLat([lon, lat])
        .setPopup(
          makePopup("SEISMIC EVENT", [
            { label: "Location", value: place },
            { label: "Magnitude", value: mag },
            { label: "Time", value: time },
            { label: "Source", value: "USGS" }
          ])
        )
        .addTo(map);

      earthquakeMarkers.push(marker);
    });

    setCount("eq-count", earthquakeMarkers.length);
  } catch (err) {
    console.error("Earthquake feed error:", err);
    setCount("eq-count", 0);
  }
}

function getMapBBox() {
  const b = map.getBounds();
  return {
    west: b.getWest(),
    south: b.getSouth(),
    east: b.getEast(),
    north: b.getNorth()
  };
}

async function loadAircraft() {
  clearMarkers(aircraftMarkers);

  try {
    const bbox = getMapBBox();
    const qs = new URLSearchParams({
      west: String(bbox.west),
      south: String(bbox.south),
      east: String(bbox.east),
      north: String(bbox.north)
    });

    const res = await fetch(`${BACKEND_BASE}/api/aircraft?${qs.toString()}`);
    const data = await res.json();
    const states = Array.isArray(data.states) ? data.states : [];

    states.forEach((item) => {
      const lon = item.longitude;
      const lat = item.latitude;
      if (typeof lon !== "number" || typeof lat !== "number") return;

      const marker = new maplibregl.Marker({
        element: createCustomMarker("aircraft-marker")
      })
        .setLngLat([lon, lat])
        .setPopup(
          makePopup("AIRCRAFT", [
            { label: "Callsign", value: item.callsign || "Unknown" },
            { label: "ICAO24", value: item.icao24 || "Unknown" },
            { label: "Country", value: item.origin_country || "Unknown" },
            { label: "Altitude", value: item.baro_altitude ?? "N/A" },
            { label: "Velocity", value: item.velocity ?? "N/A" },
            { label: "Track", value: item.true_track ?? "N/A" }
          ])
        )
        .addTo(map);

      aircraftMarkers.push(marker);
    });

    setCount("aircraft-count", aircraftMarkers.length);
  } catch (err) {
    console.error("Aircraft feed error:", err);
    setCount("aircraft-count", 0);
  }
}

async function loadMarketTape() {
  const symbols = ["SPY", "QQQ", "GLD", "USO", "AMD", "NVDA"];
  const output = [];

  for (const symbol of symbols) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`
      );
      const data = await res.json();

      if (typeof data.c === "number" && typeof data.pc === "number" && data.c !== 0) {
        const current = data.c;
        const previous = data.pc;
        const change = current - previous;
        const pct = previous ? (change / previous) * 100 : 0;
        const arrow = change >= 0 ? "▲" : "▼";
        output.push(`${symbol} ${current.toFixed(2)} ${arrow} ${pct.toFixed(2)}%`);
      } else {
        output.push(`${symbol} N/A`);
      }
    } catch (err) {
      output.push(`${symbol} ERR`);
    }
  }

  const el = document.getElementById("market-data");
  if (el) el.textContent = output.join("   |   ");
}

async function refreshVisibleFeeds() {
  const jobs = [loadMarketTape()];

  if (document.getElementById("toggle-earthquakes")?.checked) {
    jobs.push(loadEarthquakes());
  } else {
    clearMarkers(earthquakeMarkers);
    setCount("eq-count", 0);
  }

  if (document.getElementById("toggle-aircraft")?.checked) {
    jobs.push(loadAircraft());
  } else {
    clearMarkers(aircraftMarkers);
    setCount("aircraft-count", 0);
  }

  await Promise.allSettled(jobs);
  updateStamp();
}

function setupCollapse(buttonId, panelId) {
  const button = document.getElementById(buttonId);
  const panel = document.getElementById(panelId);
  if (!button || !panel) return;

  button.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
  });
}

function clampPanelInsideViewport(panel) {
  const rect = panel.getBoundingClientRect();
  let left = rect.left;
  let top = rect.top;

  if (left < 8) left = 8;
  if (top < 8) top = 8;
  if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
  if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.right = "auto";
}

function makeDraggable(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const header = panel.querySelector(".panel-top");
  if (!header) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

  header.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button") || e.target.closest("a") || e.target.closest("input")) {
      return;
    }

    isDragging = true;
    const rect = panel.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    startX = e.clientX;
    startY = e.clientY;

    panel.style.left = `${originLeft}px`;
    panel.style.top = `${originTop}px`;
    panel.style.right = "auto";
  });

  window.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = `${originLeft + dx}px`;
    panel.style.top = `${originTop + dy}px`;
  });

  window.addEventListener("pointerup", () => {
    if (!isDragging) return;
    isDragging = false;
    clampPanelInsideViewport(panel);
  });
}

function setupListeners() {
  document.getElementById("toggle-earthquakes")?.addEventListener("change", refreshVisibleFeeds);
  document.getElementById("toggle-aircraft")?.addEventListener("change", refreshVisibleFeeds);
  document.getElementById("refresh-all-btn")?.addEventListener("click", refreshVisibleFeeds);

  map.on("moveend", async () => {
    if (document.getElementById("toggle-aircraft")?.checked) {
      await loadAircraft();
      updateStamp();
    }
  });

  window.addEventListener("resize", () => {
    ["topbar", "sidebar", "alerts-panel"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) clampPanelInsideViewport(el);
    });
  });
}

setupCollapse("collapse-topbar-btn", "topbar");
setupCollapse("collapse-sidebar-btn", "sidebar");
setupCollapse("collapse-alerts-btn", "alerts-panel");

makeDraggable("topbar");
makeDraggable("sidebar");
makeDraggable("alerts-panel");

setupListeners();
refreshVisibleFeeds();
setInterval(refreshVisibleFeeds, REFRESH_MS);