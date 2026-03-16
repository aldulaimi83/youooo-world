const map = new maplibregl.Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  center: [14.8, 33],
  zoom: 2
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

new maplibregl.Marker({ color: "#00ff99" })
  .setLngLat([14.8, 33])
  .setPopup(
    new maplibregl.Popup().setHTML(`
      <h3 class="popup-title">YOUOOO HQ</h3>
      <div class="popup-row"><span class="popup-label">Type:</span> Command Node</div>
      <div class="popup-row"><span class="popup-label">Status:</span> Online</div>
      <div class="popup-row"><span class="popup-label">Region:</span> Global</div>
    `)
  )
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

      const el = document.createElement("div");
      el.className = "military-marker";

      new maplibregl.Marker({ element: el })
        .setLngLat([coords[0], coords[1]])
        .setPopup(
          new maplibregl.Popup().setHTML(`
            <h3 class="popup-title">SEISMIC EVENT</h3>
            <div class="popup-row"><span class="popup-label">Location:</span> ${props.place || "Unknown"}</div>
            <div class="popup-row"><span class="popup-label">Magnitude:</span> ${props.mag ?? "N/A"}</div>
            <div class="popup-row"><span class="popup-label">Time:</span> ${new Date(props.time).toLocaleString()}</div>
            <div class="popup-row"><span class="popup-label">Category:</span> Earthquake</div>
          `)
        )
        .addTo(map);
    });
  } catch (error) {
    console.error("Failed to load earthquakes:", error);
  }
}

loadEarthquakes();
