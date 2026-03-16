const map = new maplibregl.Map({
  container: "map",
  style: "https://api.maptiler.com/maps/satellite/style.json?key=Get_Your_Own_Key",
  center: [20, 20],
  zoom: 2
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

function createMarker(lon, lat, title) {

  const el = document.createElement("div");
  el.className = "military-marker";

  new maplibregl.Marker(el)
    .setLngLat([lon, lat])
    .setPopup(
      new maplibregl.Popup().setHTML(`
        <h3>${title}</h3>
        <p>Live global event detected</p>
      `)
    )
    .addTo(map);
}

async function loadEarthquakes() {

  const response = await fetch(
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
  );

  const data = await response.json();

  data.features.forEach((quake) => {

    const lon = quake.geometry.coordinates[0];
    const lat = quake.geometry.coordinates[1];
    const mag = quake.properties.mag;
    const place = quake.properties.place;

    createMarker(lon, lat, `Earthquake M${mag} - ${place}`);

  });
}

loadEarthquakes();
