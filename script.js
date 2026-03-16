const map = new maplibregl.Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
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
    const response = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    );

    const data = await response.json();

    data.features.forEach((quake) => {
      const coords = quake.geometry.coordinates;
      const props = quake.properties;

      const lon = coords[0];
      const lat = coords[1];
      const magnitude = props.mag ?? "N/A";
      const location = props.place ?? "Unknown location";
      const time = new Date(props.time).toLocaleString();

      const el = document.createElement("div");
      el.className = "military-marker";

      const popup = new maplibregl.Popup().setHTML(`
        <h3 class="popup-title">SEISMIC EVENT</h3>
        <div class="popup-row"><span class="popup-label">Location:</span> ${location}</div>
        <div class="popup-row"><span class="popup-label">Magnitude:</span> ${magnitude}</div>
        <div class="popup-row"><span class="popup-label">Time:</span> ${time}</div>
        <div class="popup-row"><span class="popup-label">Category:</span> Earthquake</div>
      `);

      new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .setPopup(popup)
        .addTo(map);
    });
  } catch (error) {
    console.error("Earthquake feed failed:", error);
  }
}

loadEarthquakes();
