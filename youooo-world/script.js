// ═══════════════════════════════════════════════════════════
// YOUOOO INTEL — Global Operations Center
// 100% free data sources, zero API keys required
// ═══════════════════════════════════════════════════════════

// ── Free data sources ──
const USGS    = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const EONET   = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100';
const ISS     = 'https://api.wheretheiss.at/v1/satellites/25544';
const KP_IDX  = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const SOL_WND = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';
const GECKO   = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,cardano,dogecoin,binancecoin&vs_currencies=usd&include_24hr_change=true';
const R2J     = 'https://api.rss2json.com/v1/api.json?rss_url=';
const PROXY   = 'https://api.allorigins.win/raw?url=';

const RSS = {
  world:    'https://feeds.bbci.co.uk/news/world/rss.xml',
  tech:     'https://feeds.bbci.co.uk/news/technology/rss.xml',
  business: 'https://feeds.bbci.co.uk/news/business/rss.xml',
  science:  'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'
};

const CRYPTOS = [
  { id: 'bitcoin',      sym: 'BTC',  name: 'Bitcoin'  },
  { id: 'ethereum',     sym: 'ETH',  name: 'Ethereum' },
  { id: 'binancecoin',  sym: 'BNB',  name: 'BNB'      },
  { id: 'solana',       sym: 'SOL',  name: 'Solana'   },
  { id: 'ripple',       sym: 'XRP',  name: 'XRP'      },
  { id: 'cardano',      sym: 'ADA',  name: 'Cardano'  },
  { id: 'dogecoin',     sym: 'DOGE', name: 'Dogecoin' }
];

// ── App state ──
const S = {
  quakes:    [],
  events:    [],
  crypto:    {},
  iss:       null,
  kp:        null,
  solarWind: null,
  news:      {}
};

// ── Map ──
let map;
const lyr = {};
let activeLayers = new Set(['earthquakes']);
let newsTab = 'world';

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  startClocks();
  setupLayerButtons();
  setupNewsTabButtons();
  initMap();
  loadAll();
  setInterval(loadAll, 5 * 60 * 1000);
  setInterval(tickISS, 10 * 1000);
});

// ═══════════════════════════════════════════════════════════
// CLOCKS — update every second, 5 timezones
// ═══════════════════════════════════════════════════════════
function startClocks() {
  function tick() {
    const now = new Date();
    const fmt = (tz) => now.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
    document.getElementById('tz-utc').textContent = fmt('UTC');
    document.getElementById('tz-nyc').textContent = fmt('America/New_York');
    document.getElementById('tz-lon').textContent = fmt('Europe/London');
    document.getElementById('tz-dxb').textContent = fmt('Asia/Dubai');
    document.getElementById('tz-tyo').textContent = fmt('Asia/Tokyo');
  }
  tick();
  setInterval(tick, 1000);
}

// ═══════════════════════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════════════════════
function initMap() {
  map = L.map('map', {
    zoomControl: false,
    worldCopyJump: true,
    attributionControl: false
  }).setView([22, 12], 2.3);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);

  L.control.attribution({ position: 'bottomright', prefix: '© OpenStreetMap © CARTO' }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  ['earthquakes', 'fires', 'volcanoes', 'storms', 'iss'].forEach(k => {
    lyr[k] = L.layerGroup();
  });
  lyr.earthquakes.addTo(map);
}

function syncLayers() {
  ['earthquakes', 'fires', 'volcanoes', 'storms', 'iss'].forEach(k => {
    if (activeLayers.has(k)) { if (!map.hasLayer(lyr[k])) map.addLayer(lyr[k]); }
    else                     { if (map.hasLayer(lyr[k]))  map.removeLayer(lyr[k]); }
  });
}

// ═══════════════════════════════════════════════════════════
// MASTER LOAD
// ═══════════════════════════════════════════════════════════
async function loadAll() {
  setSync();
  await Promise.allSettled([
    loadQuakes(),
    loadEONET(),
    loadCrypto(),
    loadISS(),
    loadSpaceWeather(),
    loadNews('world'),
    loadNews('tech'),
    loadNews('business'),
    loadNews('science')
  ]);
  buildThreatMatrix();
  buildTicker();
}

function setSync() {
  document.getElementById('lastSync').textContent =
    'SYNC: ' + new Date().toLocaleTimeString('en-GB', { hour12: false });
}

// ═══════════════════════════════════════════════════════════
// EARTHQUAKES — USGS (free, CORS OK)
// ═══════════════════════════════════════════════════════════
async function loadQuakes() {
  try {
    const data = await fetchJSON(USGS);
    S.quakes = (data.features || []).filter(f => f.properties.mag > 0);

    lyr.earthquakes.clearLayers();

    // Inject pulse keyframe once
    injectCSS('eq-pulse', `
      @keyframes eq-pulse {
        0%  { transform:scale(1);   opacity:0.85; }
        70% { transform:scale(2.8); opacity:0; }
        100%{ transform:scale(1);   opacity:0; }
      }
    `);

    S.quakes.slice(0, 100).forEach(f => {
      const [lng, lat, depth] = f.geometry.coordinates;
      const mag   = f.properties.mag ?? 0;
      const place = f.properties.place || 'Unknown';
      const time  = ago(f.properties.time);

      const col  = magColor(mag);
      const r    = Math.max(4, Math.min(22, mag * 3.2));

      const icon = L.divIcon({
        className: '',
        iconSize: [r * 3, r * 3],
        iconAnchor: [r * 1.5, r * 1.5],
        html: `
          <div style="position:relative;width:${r*3}px;height:${r*3}px;display:flex;align-items:center;justify-content:center;">
            <div style="
              position:absolute;width:${r*3}px;height:${r*3}px;
              border-radius:50%;border:1.5px solid ${col};
              animation:eq-pulse ${2.5 - Math.min(1, mag/10)}s ease-out infinite;
              opacity:0.6;
            "></div>
            <div style="
              width:${r}px;height:${r}px;border-radius:50%;
              background:${col};opacity:0.85;
              box-shadow:0 0 ${r*1.5}px ${col}88;
            "></div>
          </div>`
      });

      L.marker([lat, lng], { icon })
        .bindPopup(mp(
          '◉ SEISMIC EVENT',
          `<b>${place}</b>`,
          `Magnitude: <b style="color:${col}">${mag}</b>`,
          `Depth: ${depth} km`,
          `${time}`
        )).addTo(lyr.earthquakes);
    });

    // Seismic list
    const top = [...S.quakes].sort((a, b) => b.properties.mag - a.properties.mag).slice(0, 7);
    document.getElementById('quakeCountBadge').textContent = S.quakes.length;
    document.getElementById('seismicList').innerHTML = top.map(f => {
      const mag   = f.properties.mag;
      const place = f.properties.place || 'Unknown';
      const time  = ago(f.properties.time);
      const cls   = mag >= 6 ? 'q-mag-crit' : mag >= 5 ? 'q-mag-high' : mag >= 4 ? 'q-mag-mod' : 'q-mag-low';
      return `
        <div class="quake-item">
          <div class="q-mag ${cls}">M${mag}</div>
          <div class="q-info">
            <div class="q-place">${esc(shortPlace(place))}</div>
            <div class="q-time">${time}</div>
          </div>
        </div>`;
    }).join('') || none('No recent seismic data');

  } catch (e) { console.error('Quakes:', e); }
}

// ═══════════════════════════════════════════════════════════
// NASA EONET — natural events (free, CORS OK)
// ═══════════════════════════════════════════════════════════
async function loadEONET() {
  try {
    const data = await fetchJSON(EONET);
    S.events = data.events || [];

    lyr.fires.clearLayers();
    lyr.volcanoes.clearLayers();
    lyr.storms.clearLayers();

    let fires = 0;

    S.events.forEach(ev => {
      const cat  = (ev.categories?.[0]?.title || '').toLowerCase();
      const geom = ev.geometries?.[0];
      if (!geom || geom.type !== 'Point') return;

      const [lng, lat] = geom.coordinates;
      const date = geom.date ? ago(new Date(geom.date).getTime()) : 'Active';

      if (cat.includes('wildfire') || cat.includes('fire')) {
        fires++;
        const icon = divMkr('🔥', 22, 'filter:drop-shadow(0 0 6px #ff7700)');
        L.marker([lat, lng], { icon })
          .bindPopup(mp('🔥 WILDFIRE', `<b>${ev.title}</b>`, date))
          .addTo(lyr.fires);

      } else if (cat.includes('volcano')) {
        const icon = divMkr('🌋', 22, 'filter:drop-shadow(0 0 6px #ff4422)');
        L.marker([lat, lng], { icon })
          .bindPopup(mp('🌋 VOLCANIC ACTIVITY', `<b>${ev.title}</b>`, date))
          .addTo(lyr.volcanoes);

      } else if (cat.includes('storm') || cat.includes('cyclone') ||
                 cat.includes('hurricane') || cat.includes('typhoon')) {
        const icon = divMkr('🌀', 26, 'filter:drop-shadow(0 0 8px #aa55ff); animation:spin 8s linear infinite');
        injectCSS('spin-kf', '@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}');
        L.marker([lat, lng], { icon })
          .bindPopup(mp('🌀 TROPICAL SYSTEM', `<b>${ev.title}</b>`, date))
          .addTo(lyr.storms);
      }
    });

    document.getElementById('eventsCountBadge').textContent = S.events.length;
    document.getElementById('eventsList').innerHTML = S.events.slice(0, 20).map(ev => {
      const cat  = ev.categories?.[0]?.title || 'Event';
      const date = ev.geometries?.[0]?.date ? ago(new Date(ev.geometries[0].date).getTime()) : 'Active';
      return `
        <div class="ev-item">
          <div class="ev-icon">${catIcon(cat)}</div>
          <div class="ev-body">
            <div class="ev-title">${esc(ev.title)}</div>
            <div class="ev-meta">${esc(cat)} · ${date}</div>
          </div>
        </div>`;
    }).join('') || none('No active events from NASA');

  } catch (e) { console.error('EONET:', e); }
}

// ═══════════════════════════════════════════════════════════
// CRYPTO — CoinGecko (free, no key, CORS OK)
// ═══════════════════════════════════════════════════════════
async function loadCrypto() {
  try {
    S.crypto = await fetchJSON(GECKO);
    document.getElementById('assetList').innerHTML = CRYPTOS.map(({ id, sym, name }) => {
      const c   = S.crypto[id];
      if (!c) return '';
      const px  = c.usd;
      const chg = c.usd_24h_change ?? 0;
      const cls = chg > 0.5 ? 'up' : chg < -0.5 ? 'down' : 'flat';
      const arr = chg > 0.5 ? '▲' : chg < -0.5 ? '▼' : '─';
      return `
        <div class="asset-row" title="${name}">
          <div class="asset-sym">${sym}</div>
          <div class="asset-price">$${fmtPrice(px)}</div>
          <div class="asset-chg ${cls}">${arr} ${Math.abs(chg).toFixed(2)}%</div>
        </div>`;
    }).join('');
  } catch (e) {
    console.error('Crypto:', e);
    document.getElementById('assetList').innerHTML = none('Market data unavailable');
  }
}

// ═══════════════════════════════════════════════════════════
// ISS — wheretheiss.at (free, CORS OK), refresh every 10 s
// ═══════════════════════════════════════════════════════════
async function loadISS() {
  try {
    S.iss = await fetchJSON(ISS);
    renderISS(S.iss);
    renderISSMap(S.iss);
  } catch (e) { console.error('ISS:', e); }
}

async function tickISS() {
  if (!activeLayers.has('iss') && !document.getElementById('orbitalPanel').offsetParent) return;
  await loadISS();
}

function renderISS(d) {
  const lat  = parseFloat(d.latitude);
  const lng  = parseFloat(d.longitude);
  const alt  = parseFloat(d.altitude).toFixed(1);
  const vel  = parseInt(d.velocity).toLocaleString();
  const latS = lat >= 0 ? `${lat.toFixed(3)}°N` : `${Math.abs(lat).toFixed(3)}°S`;
  const lngS = lng >= 0 ? `${lng.toFixed(3)}°E` : `${Math.abs(lng).toFixed(3)}°W`;

  document.getElementById('orbitalInfo').innerHTML = `
    <div class="orbital-grid">
      <div class="o-cell"><span class="o-label">LATITUDE</span><span class="o-val">${latS}</span></div>
      <div class="o-cell"><span class="o-label">LONGITUDE</span><span class="o-val">${lngS}</span></div>
      <div class="o-cell"><span class="o-label">ALTITUDE</span><span class="o-val">${alt} km</span></div>
      <div class="o-cell"><span class="o-label">VELOCITY</span><span class="o-val">${vel}<small style="font-size:.6rem"> km/h</small></span></div>
    </div>
    <div class="o-over">ISS OVERHEAD: <span>${regionFromCoords(lat, lng)}</span></div>`;

  // Footer
  document.getElementById('issBar').innerHTML =
    `🛸 <strong>ISS</strong> ${latS} ${lngS} — ${alt} km alt — ${vel} km/h`;
}

function renderISSMap(d) {
  lyr.iss.clearLayers();
  const lat = parseFloat(d.latitude);
  const lng = parseFloat(d.longitude);
  const icon = L.divIcon({
    html: '<div class="iss-marker">🛸</div>',
    iconSize: [28, 28], iconAnchor: [14, 14], className: ''
  });
  L.marker([lat, lng], { icon })
    .bindPopup(mp(
      '🛸 ISS — LIVE',
      `Lat ${lat.toFixed(3)}° | Lng ${lng.toFixed(3)}°`,
      `Altitude: <b>${parseFloat(d.altitude).toFixed(1)} km</b>`,
      `Velocity: <b>${parseInt(d.velocity).toLocaleString()} km/h</b>`,
      `Over: ${regionFromCoords(lat, lng)}`
    )).addTo(lyr.iss);
}

// ═══════════════════════════════════════════════════════════
// SPACE WEATHER — NOAA SWPC (free, CORS OK)
// ═══════════════════════════════════════════════════════════
async function loadSpaceWeather() {
  try {
    const [kpData, swData] = await Promise.allSettled([
      fetchJSON(KP_IDX),
      fetchJSON(SOL_WND)
    ]);

    if (kpData.status === 'fulfilled') {
      const last = kpData.value[kpData.value.length - 1];
      S.kp = parseFloat(last?.kp_index) || 0;
    }

    if (swData.status === 'fulfilled') {
      const row = swData.value[swData.value.length - 1];
      if (row?.length >= 3) {
        S.solarWind = { density: parseFloat(row[1]), speed: parseFloat(row[2]) };
      }
    }

    const kp   = S.kp ?? 0;
    const sw   = S.solarWind;
    const sev  = kp >= 7 ? '⚠ SEVERE STORM'
               : kp >= 5 ? '⚡ GEOMAGNETIC STORM'
               : kp >= 3 ? '🌠 ACTIVE'
               : '✓ QUIET';

    document.getElementById('swBar').innerHTML =
      `☀ SPACE WEATHER — Kp: <strong>${kp.toFixed(1)}</strong> ${sev}` +
      (sw ? ` · Wind: <strong>${Math.round(sw.speed)} km/s</strong> · Density: <strong>${sw.density.toFixed(1)} p/cm³</strong>` : '');

  } catch (e) { console.error('Space weather:', e); }
}

// ═══════════════════════════════════════════════════════════
// NEWS — BBC RSS via rss2json (free, no key)
// ═══════════════════════════════════════════════════════════
async function loadNews(feed) {
  try {
    const url  = `${R2J}${encodeURIComponent(RSS[feed])}`;
    const data = await fetchJSON(url);
    if (data.status !== 'ok') throw new Error('RSS failed');
    S.news[feed] = data.items || [];
    if (feed === newsTab) renderNews();
  } catch (e) {
    console.error(`News(${feed}):`, e);
    if (feed === newsTab) document.getElementById('intelList').innerHTML = none('Feed temporarily unavailable');
  }
}

function renderNews() {
  const items = S.news[newsTab] || [];
  if (!items.length) {
    document.getElementById('intelList').innerHTML = none('Loading…');
    return;
  }
  document.getElementById('intelList').innerHTML = items.slice(0, 12).map(item => {
    const title = esc(item.title || 'Untitled');
    const desc  = esc((item.description || '').replace(/<[^>]*>/g, '').slice(0, 120));
    const url   = item.link || '#';
    const date  = item.pubDate
      ? new Date(item.pubDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';
    return `
      <div class="intel-item">
        <div class="intel-meta">
          <span class="intel-source">BBC ${newsTab.toUpperCase()}</span>
          <span class="intel-time">${date}</span>
        </div>
        <div class="intel-title"><a href="${url}" target="_blank" rel="noopener">${title}</a></div>
        ${desc ? `<div class="intel-desc">${desc}…</div>` : ''}
      </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// THREAT MATRIX — computed from live data
// ═══════════════════════════════════════════════════════════
function buildThreatMatrix() {
  const maxMag  = Math.max(0, ...S.quakes.map(f => f.properties.mag || 0));
  const fireCount  = S.events.filter(e => (e.categories?.[0]?.title || '').toLowerCase().includes('fire')).length;
  const stormCount = S.events.filter(e => {
    const c = (e.categories?.[0]?.title || '').toLowerCase();
    return c.includes('storm') || c.includes('cyclone') || c.includes('hurricane') || c.includes('typhoon');
  }).length;
  const volcCount  = S.events.filter(e => (e.categories?.[0]?.title || '').toLowerCase().includes('volcano')).length;
  const kp = S.kp ?? 0;

  const rows = [
    {
      icon: '🔴', name: 'SEISMIC',
      ...threatLevel(
        maxMag >= 7   ? 1 :
        maxMag >= 6   ? 0.78 :
        maxMag >= 5   ? 0.52 :
        maxMag >= 4   ? 0.28 : 0.12
      )
    },
    {
      icon: '🔥', name: 'WILDFIRE',
      ...threatLevel(
        fireCount >= 30 ? 1 :
        fireCount >= 15 ? 0.75 :
        fireCount >= 5  ? 0.45 :
        fireCount >= 1  ? 0.25 : 0.05
      )
    },
    {
      icon: '🌀', name: 'TROPICAL',
      ...threatLevel(
        stormCount >= 5 ? 1 :
        stormCount >= 3 ? 0.72 :
        stormCount >= 1 ? 0.42 : 0.05
      )
    },
    {
      icon: '🌋', name: 'VOLCANIC',
      ...threatLevel(
        volcCount >= 10 ? 0.9 :
        volcCount >= 5  ? 0.6 :
        volcCount >= 1  ? 0.35 : 0.05
      )
    },
    {
      icon: '☀', name: 'SPACE WX',
      ...threatLevel(
        kp >= 7 ? 1 :
        kp >= 5 ? 0.7 :
        kp >= 3 ? 0.4 : 0.1
      )
    }
  ];

  document.getElementById('threatMatrix').innerHTML = rows.map(r => `
    <div class="threat-row">
      <span class="threat-ico">${r.icon}</span>
      <span class="threat-name">${r.name}</span>
      <div class="threat-bar-wrap">
        <div class="threat-bar-fill" style="width:${Math.round(r.pct * 100)}%;background:${r.color}"></div>
      </div>
      <span class="threat-lv ${r.cls}">${r.label}</span>
    </div>`).join('');
}

function threatLevel(pct) {
  if (pct >= 0.85) return { pct, label: 'CRITICAL', cls: 'lv-critical', color: 'var(--glow-red)' };
  if (pct >= 0.6)  return { pct, label: 'HIGH',     cls: 'lv-high',     color: 'var(--glow-orng)' };
  if (pct >= 0.35) return { pct, label: 'MODERATE', cls: 'lv-moderate', color: 'var(--glow-yell)' };
  return              { pct, label: 'LOW',      cls: 'lv-low',      color: 'var(--glow-green)' };
}

// ═══════════════════════════════════════════════════════════
// TICKER
// ═══════════════════════════════════════════════════════════
function buildTicker() {
  const parts = [];

  S.quakes.filter(f => f.properties.mag >= 5).slice(0, 4).forEach(f =>
    parts.push(`⬤ M${f.properties.mag} ${f.properties.place}`));

  S.events.slice(0, 5).forEach(e =>
    parts.push(`${catIcon(e.categories?.[0]?.title || '')} ${e.title}`));

  if (S.crypto.bitcoin) {
    const b = S.crypto.bitcoin, ch = (b.usd_24h_change || 0);
    parts.push(`₿ BTC $${fmtPrice(b.usd)} (${ch > 0 ? '+' : ''}${ch.toFixed(1)}%)`);
  }
  if (S.crypto.ethereum) {
    const e = S.crypto.ethereum, ch = (e.usd_24h_change || 0);
    parts.push(`Ξ ETH $${fmtPrice(e.usd)} (${ch > 0 ? '+' : ''}${ch.toFixed(1)}%)`);
  }
  if (S.kp != null) parts.push(`☀ Kp INDEX: ${S.kp.toFixed(1)}`);
  if (S.solarWind)  parts.push(`SOLAR WIND: ${Math.round(S.solarWind.speed)} km/s`);

  const text = parts.join('     ◈     ');
  document.getElementById('tickerInner').textContent = text + '     ◈     ' + text;
}

// ═══════════════════════════════════════════════════════════
// UI SETUP
// ═══════════════════════════════════════════════════════════
function setupLayerButtons() {
  document.querySelectorAll('.lbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.layer;
      if (activeLayers.has(k)) {
        activeLayers.delete(k);
        btn.classList.remove('active');
      } else {
        activeLayers.add(k);
        btn.classList.add('active');
      }
      syncLayers();
    });
  });
}

function setupNewsTabButtons() {
  document.querySelectorAll('.itab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.itab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      newsTab = btn.dataset.feed;
      if (S.news[newsTab]?.length) renderNews();
      else loadNews(newsTab);
    });
  });
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function mp(title, ...lines) {
  return `<div class="mp">
    <div class="mp-title">${title}</div>
    ${lines.map(l => `<div class="mp-row">${l}</div>`).join('')}
  </div>`;
}

function divMkr(emoji, size, style = '') {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;${style}">${emoji}</div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: ''
  });
}

function magColor(mag) {
  if (mag >= 7) return '#ff0022';
  if (mag >= 6) return '#ff3344';
  if (mag >= 5) return '#ff7700';
  if (mag >= 4) return '#ffd700';
  if (mag >= 2) return '#57ffd6';
  return '#2255aa';
}

function catIcon(cat) {
  const c = cat.toLowerCase();
  if (c.includes('wildfire') || c.includes('fire'))                                        return '🔥';
  if (c.includes('volcano'))                                                               return '🌋';
  if (c.includes('storm') || c.includes('cyclone') || c.includes('hurricane') || c.includes('typhoon')) return '🌀';
  if (c.includes('flood'))                                                                 return '🌊';
  if (c.includes('earthquake'))                                                            return '🔴';
  if (c.includes('drought'))                                                               return '☀';
  if (c.includes('snow') || c.includes('ice') || c.includes('blizzard'))                  return '❄';
  if (c.includes('landslide') || c.includes('avalanche'))                                  return '⛰';
  if (c.includes('tsunami'))                                                               return '🌊';
  return '⚠';
}

function fmtPrice(n) {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1)    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function shortPlace(place) {
  // Remove "km N/S/E/W of" prefix
  return place.replace(/^\d+\s*km\s+\w+\s+of\s+/i, '');
}

function ago(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function regionFromCoords(lat, lng) {
  // Very rough region inference from lat/lng
  if (lat > 60)                         return 'Arctic Region';
  if (lat < -60)                        return 'Antarctic Region';
  if (lng > 100 && lng < 180 && lat > 0)  return 'East Asia / Pacific';
  if (lng > 60 && lng < 100 && lat > 0)   return 'South / Central Asia';
  if (lng > 25 && lng < 60 && lat > 15)   return 'Middle East';
  if (lng > -20 && lng < 55 && lat > 0)   return 'Africa / Europe';
  if (lng > -80 && lng < -35)             return 'South America';
  if (lng > -140 && lng < -50 && lat > 15) return 'North America';
  if (lng < -140 || lng > 160)            return 'Pacific Ocean';
  return 'International Waters';
}

function none(msg) {
  return `<div style="color:var(--text-dim);font-size:.72rem;padding:8px 0;font-style:italic">${msg}</div>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function injectCSS(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}
