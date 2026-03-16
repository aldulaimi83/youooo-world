const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [14.8, 33],
  zoom: 2
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');

new maplibregl.Marker()
  .setLngLat([14.8, 33])
  .setPopup(
    new maplibregl.Popup().setHTML(
      "<h3>Youooo HQ</h3><p>Base marker</p>"
    )
  )
  .addTo(map);

async function loadEarthquakes() {
  try {
    const response = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
    );
    const data = await response.json();

    data.features.forEach((quake) => {
      const coords = quake.geometry.coordinates;
      const props = quake.properties;

      const el = document.createElement('div');
      el.style.width = '10px';
      el.style.height = '10px';
      el.style.background = 'red';
      el.style.borderRadius = '50%';
      el.style.border = '1px solid white';

      new maplibregl.Marker(el)
        .setLngLat([coords[0], coords[1]])
        .setPopup(
          new maplibregl.Popup().setHTML(`
            <h3>Earthquake</h3>
            <p><b>Place:</b> ${props.place || 'Unknown'}</p>
            <p><b>Magnitude:</b> ${props.mag ?? 'N/A'}</p>
            <p><b>Time:</b> ${new Date(props.time).toLocaleString()}</p>
          `)
        )
        .addTo(map);
    });
  } catch (error) {
    console.error('Failed to load earthquakes:', error);
  }
}

loadEarthquakes();
