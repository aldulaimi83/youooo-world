const BACKEND_BASE = "https://REPLACE-WITH-YOUR-WORKER.your-subdomain.workers.dev";
const FINNHUB_API_KEY = "d6s9ng9r01qj447art3gd6s9ng9r01qj447art40";

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
  document.getElementById("last-update-box").textContent = `UPDATED: ${value}`;
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

function bboxToString(bbox) {
  return `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
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

function selectedConflictRegions() {
  const regions = [];
  if (document.getElementById("region-ukraine").checked) regions.push("ukraine");
  if (document.getElementById("region-middle-east").checked) regions.push("middle-east");
  if (document.getElementById("region-africa").checked) regions.push("africa");
  return regions;
}

async function loadConflicts() {
  clearMarkers(conflictMarkers);

  try {
    const regions = selectedConflictRegions();
    const requests = regions.map((region) =>
      fetch(`${BACKEND_BASE}/api/conflicts?region=${encodeURIComponent(region)}`).then((r) => r.json())
    );

    const results = await Promise.all(requests);
    const events = results.flatMap((x) => (Array.isArray(x.events) ? x.events : []));

    events.forEach((event) => {
      const lon = Number(event.longitude);
      const lat = Number(event.latitude);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

      const marker = new maplibregl.Marker({
        element: createCustomMarker("conflict-marker")
      })
        .setLngLat([lon, lat])
        .setPopup(
          makePopup("CONFLICT EVENT", [
            { label: "Country", value: event.country || "Unknown" },
            { label: "Admin1", value: event.admin1 || "Unknown" },
            { label: "Location", value: event.location || "Unknown" },
            { label: "Type", value: event.event_type || "Unknown" },
            { label: "Sub-type", value: event.sub_event_type || "Unknown" },
            { label: "Date", value: event.event_date || "Unknown" },
            { label: "Fatalities", value: event.fatalities ?? "N/A" },
            { label: "Source", value: "ACLED" }
          ])
        )
        .addTo(map);

      conflictMarkers.push(marker);
    });

    setCount("conflict-count", conflictMarkers.length);
  } catch (err) {
    console.error("Conflict feed error:", err);
    setCount("conflict-count", 0);
  }
}

async function loadWildfires() {
  clearMarkers(wildfireMarkers);

  try {
    const bbox = getMapBBox();
    const qs = new URLSearchParams({
      bbox: bboxToString(bbox)
    });

    const res = await fetch(`${BACKEND_BASE}/api/fires?${qs.toString()}`);
    const data = await res.json();

    const fires = Array.isArray(data.fires) ? data.fires : [];

    fires.forEach((fire) => {
      const lon = Number(fire.longitude);
      const lat = Number(fire.latitude);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

      const marker = new maplibregl.Marker({
        element: createCustomMarker("fire-marker")
      })
        .setLngLat([lon, lat])
        .setPopup(
          makePopup("WILDFIRE / HOTSPOT", [
            { label: "Latitude", value: lat },
            { label: "Longitude", value: lon },
            { label: "Brightness", value: fire.bright_ti4 || fire.brightness || "N/A" },
            { label: "Confidence", value: fire.confidence || "N/A" },
            { label: "Date", value: fire.acq_date || "Unknown" },
            { label: "Time", value: fire.acq_time || "Unknown" },
            { label: "Source", value: "NASA FIRMS" }
          ])
        )
        .addTo(map);

      wildfireMarkers.push(marker);
    });

    setCount("fire-count", wildfireMarkers.length);
  } catch (err) {
    console.error("Wildfire feed error:", err);
    setCount("fire-count", 0);
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

  document.getElementById("market-data").textContent = output.join("   |   ");
}

async function refreshVisibleFeeds() {
  const jobs = [loadMarketTape(), loadEarthquakes()];

  if (document.getElementById("toggle-aircraft").checked) jobs.push(loadAircraft());
  else {
    clearMarkers(aircraftMarkers);
    setCount("aircraft-count", 0);
  }

  if (document.getElementById("toggle-conflicts").checked) jobs.push(loadConflicts());
  else {
    clearMarkers(conflictMarkers);
    setCount("conflict-count", 0);
  }

  if (document.getElementById("toggle-wildfires").checked) jobs.push(loadWildfires());
  else {
    clearMarkers(wildfireMarkers);
    setCount("fire-count", 0);
  }

  if (!document.getElementById("toggle-earthquakes").checked) {
    clearMarkers(earthquakeMarkers);
    setCount("eq-count", 0);
  }

  await Promise.allSettled(jobs);
  updateStamp();
}

function setupCollapse(buttonId, panelId) {
  const button = document.getElementById(buttonId);
  const panel = document.getElementById(panelId);

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
  const header = panel.querySelector(".panel-top");

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
    panel.setPointerCapture?.(e.pointerId);

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
  document.getElementById("toggle-earthquakes").addEventListener("change", refreshVisibleFeeds);
  document.getElementById("toggle-aircraft").addEventListener("change", refreshVisibleFeeds);
  document.getElementById("toggle-conflicts").addEventListener("change", refreshVisibleFeeds);
  document.getElementById("toggle-wildfires").addEventListener("change", refreshVisibleFeeds);

  document.getElementById("region-ukraine").addEventListener("change", refreshVisibleFeeds);
  document.getElementById("region-middle-east").addEventListener("change", refreshVisibleFeeds);
  document.getElementById("region-africa").addEventListener("change", refreshVisibleFeeds);

  document.getElementById("refresh-all-btn").addEventListener("click", refreshVisibleFeeds);

  document.getElementById("toggle-ships").addEventListener("change", () => {
    document.getElementById("ships-count").textContent = "next";
    alert("Ships are the next backend feed to add.");
  });

  document.getElementById("toggle-satellites").addEventListener("change", () => {
    document.getElementById("sat-count").textContent = "next";
    alert("Satellites are the next backend feed to add.");
  });

  document.getElementById("toggle-missiles").addEventListener("change", () => {
    document.getElementById("missile-count").textContent = "next";
    alert("Missile alerts need a separate verified source and backend.");
  });

  map.on("moveend", async () => {
    const jobs = [];
    if (document.getElementById("toggle-aircraft").checked) jobs.push(loadAircraft());
    if (document.getElementById("toggle-wildfires").checked) jobs.push(loadWildfires());
    await Promise.allSettled(jobs);
    updateStamp();
  });

  window.addEventListener("resize", () => {
    ["topbar", "sidebar", "alerts-panel"].forEach((id) => {
      clampPanelInsideViewport(document.getElementById(id));
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
