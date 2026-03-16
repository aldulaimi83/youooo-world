const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {
      darkmatter: {
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
        id: "darkmatter-layer",
        type: "raster",
        source: "darkmatter"
      }
    ]
  },
  center: [-98, 39],
  zoom: 3
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const hqPopup = new maplibregl.Popup().setHTML(`
  <h3 class="popup-title">YOUOOO HQ</h3>
  <div class="popup-row"><span class="popup-label">Type:</span> Command Node</div>
  <div class="popup-row"><span class="popup-label">Status:</span> Online</div>
  <div class="popup-row"><span class="popup-label">Region:</span> Austin, Texas, USA</div>
`);

new maplibregl.Marker({ color: "#00ff99" })
  .setLngLat([-97.7431, 30.2672])
  .setPopup(hqPopup)
  .addTo(map);

async function loadEarthquakes() {
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

      const popup = new maplibregl.Popup().setHTML(`
        <h3 class="popup-title">SEISMIC EVENT</h3>
        <div class="popup-row"><span class="popup-label">Location:</span> ${place}</div>
        <div class="popup-row"><span class="popup-label">Magnitude:</span> ${mag}</div>
        <div class="popup-row"><span class="popup-label">Time:</span> ${time}</div>
        <div class="popup-row"><span class="popup-label">Category:</span> Earthquake</div>
      `);

      new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .setPopup(popup)
        .addTo(map);
    });
  } catch (err) {
    console.error("Earthquake feed error:", err);
  }
}

loadEarthquakes();
