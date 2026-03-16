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
      "<h3>Youooo Event</h3><p>Example marker</p>"
    )
  )
  .addTo(map);
