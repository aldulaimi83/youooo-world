// Create the map
const map = new maplibregl.Map({
  container: "map",
  style: "https://demotiles.maplibre.org/style.json", // reliable public style
  center: [-98, 39], // USA
  zoom: 3
});

// Navigation controls
map.addControl(new maplibregl.NavigationControl(), "top-right");

// HQ marker (Austin Texas)
const hqPopup = new maplibregl.Popup().setHTML(`
<h3>YOUOOO HQ</h3>
<p>Command Node</p>
<p>Status: Online</p>
<p>Austin, Texas</p>
`);

new maplibregl.Marker({ color: "#00ff99" })
  .setLngLat([-97.7431, 30.2672])
  .setPopup(hqPopup)
  .addTo(map);

// Load earthquake feed
async function loadEarthquakes() {
  try {

    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    );

    const data = await res.json();

    data.features.forEach(q => {

      const lon = q.geometry.coordinates[0];
      const lat = q.geometry.coordinates[1];

      const mag = q.properties.mag;
      const place = q.properties.place;

      const el = document.createElement("div");
      el.className = "military-marker";

      const popup = new maplibregl.Popup().setHTML(`
      <h3>SEISMIC EVENT</h3>
      <p>${place}</p>
      <p>Magnitude: ${mag}</p>
      `);

      new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .setPopup(popup)
        .addTo(map);

    });

  } catch (err) {
    console.log("Feed error:", err);
  }
}

loadEarthquakes();
