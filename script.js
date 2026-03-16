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
  center: [-98, 39],
  zoom: 3
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const earthquakeMarkers = [];
const aircraftMarkers = [];
const satelliteMarkers = [];
const shipMarkers = [];
const conflictMarkers = [];
const wildfireMarkers = [];

function clearMarkers(markerArray) {
  markerArray.forEach((m) => m.remove());
  markerArray.length = 0;
}

function makePopup(title, rows) {
  const htmlRows = rows
    .map(
      (r) =>
        `<div class="popup-row"><span class="popup-label">${r.label}:</span> ${r.value}</div>`
    )
    .join("");

  return new maplibregl.Popup().setHTML(`
    <h3 class="popup-title">${title}</h3>
    ${htmlRows}
  `);
}

new maplibregl.Marker({ color: "#00ff99" })
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

    data.features.forEach((q) => {
      const lon = q.geometry.coordinates[0];
      const lat = q.geometry.coordinates[1];
      const mag = q.properties.mag ?? "N/A";
      const place = q.properties.place ?? "Unknown";
      const time = new Date(q.properties.time).toLocaleString();

      const el = document.createElement("div");
      el.className = "military-marker";

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .setPopup(
          makePopup("SEISMIC EVENT", [
            { label: "Location", value: place },
            { label: "Magnitude", value: mag },
            { label: "Time", value: time },
            { label: "Category", value: "Earthquake" }
          ])
        )
        .addTo(map);

      earthquakeMarkers.push(marker);
    });
  } catch (err) {
    console.error("Earthquake feed error:", err);
  }
}

function addPlaceholderMarkers(markerArray, points, title, category, color) {
  clearMarkers(markerArray);

  points.forEach((p) => {
    const el = document.createElement("div");
    el.className = "military-marker";
    el.style.background = color;
    el.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([p.lon, p.lat])
      .setPopup(
        makePopup(title, [
          { label: "Name", value: p.name },
          { label: "Category", value: category },
          { label: "Status", value: "Demo placeholder" }
        ])
      )
      .addTo(map);

    markerArray.push(marker);
  });
}

function loadAircraftDemo() {
  addPlaceholderMarkers(
    aircraftMarkers,
    [
      { lon: -97, lat: 32, name: "Flight Track Alpha" },
      { lon: -80, lat: 35, name: "Flight Track Bravo" },
      { lon: -118, lat: 34, name: "Flight Track Charlie" }
    ],
    "AIRCRAFT",
    "Aircraft",
    "#00b7ff"
  );
}

function loadSatellitesDemo() {
  addPlaceholderMarkers(
    satelliteMarkers,
    [
      { lon: -40, lat: 10, name: "Orbital Pass 1" },
      { lon: 20, lat: -5, name: "Orbital Pass 2" }
    ],
    "SATELLITE",
    "Satellite",
    "#ffd400"
  );
}

function loadShipsDemo() {
  addPlaceholderMarkers(
    shipMarkers,
    [
      { lon: -75, lat: 25, name: "Vessel Corridor Atlantic" },
      { lon: 55, lat: 25, name: "Vessel Corridor Gulf" }
    ],
    "VESSEL",
    "Ship",
    "#00ffff"
  );
}

function loadConflictsDemo() {
  addPlaceholderMarkers(
    conflictMarkers,
    [
      { lon: 36, lat: 33, name: "Conflict Zone Levant" },
      { lon: 31, lat: 49, name: "Conflict Zone East Europe" }
    ],
    "CONFLICT ZONE",
    "Conflict",
    "#ff7b00"
  );
}

function loadWildfiresDemo() {
  addPlaceholderMarkers(
    wildfireMarkers,
    [
      { lon: -121, lat: 38, name: "Wildfire Alert West" },
      { lon: 147, lat: -37, name: "Wildfire Alert South" }
    ],
    "WILDFIRE",
    "Wildfire",
    "#ff3b00"
  );
}

const earthquakesToggle = document.getElementById("toggle-earthquakes");
const aircraftToggle = document.getElementById("toggle-aircraft");
const satellitesToggle = document.getElementById("toggle-satellites");
const shipsToggle = document.getElementById("toggle-ships");
const conflictsToggle = document.getElementById("toggle-conflicts");
const wildfiresToggle = document.getElementById("toggle-wildfires");

earthquakesToggle.addEventListener("change", (e) => {
  if (e.target.checked) loadEarthquakes();
  else clearMarkers(earthquakeMarkers);
});

aircraftToggle.addEventListener("change", (e) => {
  if (e.target.checked) loadAircraftDemo();
  else clearMarkers(aircraftMarkers);
});

satellitesToggle.addEventListener("change", (e) => {
  if (e.target.checked) loadSatellitesDemo();
  else clearMarkers(satelliteMarkers);
});

shipsToggle.addEventListener("change", (e) => {
  if (e.target.checked) loadShipsDemo();
  else clearMarkers(shipMarkers);
});

conflictsToggle.addEventListener("change", (e) => {
  if (e.target.checked) loadConflictsDemo();
  else clearMarkers(conflictMarkers);
});

wildfiresToggle.addEventListener("change", (e) => {
  if (e.target.checked) loadWildfiresDemo();
  else clearMarkers(wildfireMarkers);
});

loadEarthquakes();
