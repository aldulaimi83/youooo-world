const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap Contributors"
      }
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm"
      }
    ]
  },
  center: [-97.7431, 30.2672],
  zoom: 3
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const hqPopup = new maplibregl.Popup().setHTML(`
  <h3>YOUOOO HQ</h3>
  <p>Command Node</p>
  <p>Status: Online</p>
  <p>Austin, Texas, USA</p>
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
    console.error("Earthquake feed error:", err);
  }
}

loadEarthquakes();
