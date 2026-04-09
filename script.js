// ============================================================
// YOUOOO World Intelligence — script.js
// All data sources are 100% free, no API keys required
// ============================================================

// --- Free data endpoints ---
const USGS_URL        = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const EONET_URL       = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100';
const ISS_URL         = 'https://api.wheretheiss.at/v1/satellites/25544';
const KP_URL          = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const SOLAR_WIND_URL  = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';
const COINGECKO_URL   = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,cardano,dogecoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true';
const RSS2JSON        = 'https://api.rss2json.com/v1/api.json?rss_url=';
const YAHOO_PROXY     = 'https://api.allorigins.win/raw?url=';

const RSS_FEEDS = {
  world:    'https://feeds.bbci.co.uk/news/world/rss.xml',
  tech:     'https://feeds.bbci.co.uk/news/technology/rss.xml',
  business: 'https://feeds.bbci.co.uk/news/business/rss.xml',
  science:  'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'
};

const STOCK_WATCHLIST = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'MSFT'];

const CRYPTO_META = [
  { id: 'bitcoin',   symbol: 'BTC',  icon: '₿',  name: 'Bitcoin'   },
  { id: 'ethereum',  symbol: 'ETH',  icon: 'Ξ',  name: 'Ethereum'  },
  { id: 'solana',    symbol: 'SOL',  icon: '◎',  name: 'Solana'    },
  { id: 'ripple',    symbol: 'XRP',  icon: '✕',  name: 'XRP'       },
  { id: 'cardano',   symbol: 'ADA',  icon: '₳',  name: 'Cardano'   },
  { id: 'dogecoin',  symbol: 'DOGE', icon: 'Ð',  name: 'Dogecoin'  }
];

// --- App state ---
const state = {
  earthquakes: [],
  eonetEvents: [],
  crypto: {},
  stocks: [],
  news: {},
  iss: null
};

// --- Map globals ---
let map;
const layers = {};
let activeLayer = 'earthquakes';
let currentNewsFeed = 'world';

// ============================================================
// Boot
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupLayerButtons();
  setupNewsFilter();
  initMap();
  await loadAllData();
  setInterval(loadAllData, 5 * 60 * 1000);   // full refresh every 5 min
  setInterval(refreshISS, 10 * 1000);         // ISS moves fast — refresh every 10 s
});

// ============================================================
// Map
// ============================================================
function initMap() {
  map = L.map('map', { zoomControl: true, worldCopyJump: true }).setView([22, 10], 2.2);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  layers.earthquakes = L.layerGroup().addTo(map);
  layers.fires       = L.layerGroup();
  layers.volcanoes   = L.layerGroup();
  layers.storms      = L.layerGroup();
  layers.iss         = L.layerGroup();
  layers.markets     = L.layerGroup();
}

function switchLayer(name) {
  Object.values(layers).forEach(l => { if (map.hasLayer(l)) map.removeLayer(l); });
  if (layers[name]) map.addLayer(layers[name]);
}

// ============================================================
// Master loader
// ============================================================
async function loadAllData() {
  setUpdatedTime();
  await Promise.allSettled([
    loadEarthquakes(),
    loadNASAEvents(),
    loadCrypto(),
    loadStocks(),
    loadSpaceWeather(),
    loadISS(),
    loadNews('world'),
    loadNews('tech'),
    loadNews('business'),
    loadNews('science')
  ]);
  buildLiveAlerts();
  updateTicker();
}

// ============================================================
// Earthquakes — USGS (free, CORS-enabled)
// ============================================================
async function loadEarthquakes() {
  try {
    const res  = await fetch(USGS_URL);
    const data = await res.json();
    state.earthquakes = data.features || [];

    layers.earthquakes.clearLayers();
    const shown = state.earthquakes.slice(0, 80);
    document.getElementById('quakeCount').textContent = shown.length;

    shown.forEach(f => {
      const [lng, lat, depth] = f.geometry.coordinates;
      const mag   = f.properties.mag ?? 0;
      const place = f.properties.place || 'Unknown location';
      const time  = new Date(f.properties.time).toLocaleString();
      const color = mag >= 6 ? '#ff2d2d'
                  : mag >= 5 ? '#ff6b2d'
                  : mag >= 4 ? '#ffd700'
                  : mag >= 2 ? '#57ffd6'
                  :            '#447799';

      L.circleMarker([lat, lng], {
        radius:      Math.max(3, mag * 2.8),
        color,
        weight:      1.5,
        opacity:     0.95,
        fillColor:   color,
        fillOpacity: mag >= 5 ? 0.75 : 0.4
      }).bindPopup(popup(`🔴 EARTHQUAKE`,
        `<b>${place}</b>`,
        `Magnitude: <b style="color:${color}">${mag}</b>`,
        `Depth: ${depth} km`,
        time
      )).addTo(layers.earthquakes);
    });
  } catch (err) {
    console.error('Earthquakes failed:', err);
  }
}

// ============================================================
// Natural disasters — NASA EONET (free, CORS-enabled)
// ============================================================
async function loadNASAEvents() {
  try {
    const res  = await fetch(EONET_URL);
    const data = await res.json();
    state.eonetEvents = data.events || [];

    layers.fires.clearLayers();
    layers.volcanoes.clearLayers();
    layers.storms.clearLayers();

    let fireCount = 0;
    document.getElementById('eventCount').textContent = state.eonetEvents.length;

    state.eonetEvents.forEach(event => {
      const cat  = (event.categories?.[0]?.title || '').toLowerCase();
      const geom = event.geometries?.[0];
      if (!geom || geom.type !== 'Point') return;

      const [lng, lat] = geom.coordinates;
      const date = geom.date ? new Date(geom.date).toLocaleDateString() : 'Active';
      const title = event.title;

      if (cat.includes('wildfire') || cat.includes('fire')) {
        fireCount++;
        L.circleMarker([lat, lng], {
          radius: 7, color: '#ff4500', fillColor: '#ff6600',
          fillOpacity: 0.75, weight: 1.5
        }).bindPopup(popup('🔥 WILDFIRE', `<b>${title}</b>`, `Date: ${date}`))
          .addTo(layers.fires);

      } else if (cat.includes('volcano')) {
        L.circleMarker([lat, lng], {
          radius: 9, color: '#8B4513', fillColor: '#CD853F',
          fillOpacity: 0.85, weight: 2
        }).bindPopup(popup('🌋 VOLCANO', `<b>${title}</b>`, `Date: ${date}`))
          .addTo(layers.volcanoes);

      } else if (cat.includes('storm') || cat.includes('cyclone') ||
                 cat.includes('hurricane') || cat.includes('typhoon')) {
        L.circleMarker([lat, lng], {
          radius: 11, color: '#7b68ee', fillColor: '#9370db',
          fillOpacity: 0.6, weight: 2
        }).bindPopup(popup('🌀 TROPICAL STORM', `<b>${title}</b>`, `Date: ${date}`))
          .addTo(layers.storms);
      }
    });

    document.getElementById('fireCount').textContent = fireCount;
    renderDisastersFeed(state.eonetEvents);
  } catch (err) {
    console.error('NASA EONET failed:', err);
  }
}

// ============================================================
// Crypto — CoinGecko (free, no key, CORS-enabled)
// ============================================================
async function loadCrypto() {
  try {
    const res  = await fetch(COINGECKO_URL);
    const data = await res.json();
    state.crypto = data;
    renderCrypto(data);
  } catch (err) {
    console.error('CoinGecko failed:', err);
    document.getElementById('cryptoGrid').innerHTML =
      '<div class="empty-state">Crypto data temporarily unavailable</div>';
  }
}

function renderCrypto(data) {
  const container = document.getElementById('cryptoGrid');
  container.innerHTML = CRYPTO_META.map(({ id, symbol, icon, name }) => {
    const coin = data[id];
    if (!coin) return '';
    const price  = coin.usd;
    const change = coin.usd_24h_change ?? 0;
    const cls    = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
    const sign   = change > 0 ? '+' : '';
    return `
      <div class="quote-card">
        <div class="crypto-icon">${icon}</div>
        <div class="symbol">${symbol}</div>
        <div class="price">$${fmtCrypto(price)}</div>
        <div class="change ${cls}">${sign}${change.toFixed(2)}%</div>
        <div class="item-meta">${name}</div>
      </div>`;
  }).join('');
}

// ============================================================
// Stocks — Yahoo Finance via allorigins proxy (free)
// ============================================================
async function loadStocks() {
  const container = document.getElementById('watchlistGrid');
  container.innerHTML = '<div class="empty-state">Loading stocks...</div>';
  try {
    const results = await Promise.allSettled(STOCK_WATCHLIST.map(fetchYahooQuote));
    state.stocks = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    if (!state.stocks.length) {
      container.innerHTML = '<div class="empty-state">Stock data unavailable — CORS proxy may be rate-limited</div>';
      return;
    }
    container.innerHTML = state.stocks.map(q => {
      const chg = parseFloat(q.change);
      const cls  = chg > 0 ? 'positive' : chg < 0 ? 'negative' : 'neutral';
      const sign = chg > 0 ? '+' : '';
      return `
        <div class="quote-card">
          <div class="symbol">${q.symbol}</div>
          <div class="price">$${q.price}</div>
          <div class="change ${cls}">${sign}${q.change}%</div>
        </div>`;
    }).join('');
    renderMarketMarkers(state.stocks);
  } catch (err) {
    console.error('Stocks failed:', err);
    container.innerHTML = '<div class="empty-state">Stock data unavailable</div>';
  }
}

async function fetchYahooQuote(symbol) {
  const yahooUrl  = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const proxyUrl  = `${YAHOO_PROXY}${encodeURIComponent(yahooUrl)}`;
  const res       = await fetch(proxyUrl);
  const data      = JSON.parse(await res.text());
  const result    = data?.chart?.result?.[0];
  if (!result) return null;
  const meta      = result.meta;
  const price     = meta.regularMarketPrice;
  const prev      = meta.previousClose || meta.chartPreviousClose;
  const change    = prev ? ((price - prev) / prev * 100) : 0;
  return { symbol, price: price.toFixed(2), change: change.toFixed(2) };
}

// ============================================================
// ISS — wheretheiss.at (free, CORS-enabled)
// ============================================================
async function loadISS() {
  try {
    const res  = await fetch(ISS_URL);
    const data = await res.json();
    state.iss = data;
    renderISSPanel(data);
    renderISSMap(data);
  } catch (err) {
    console.error('ISS fetch failed:', err);
  }
}

async function refreshISS() {
  if (activeLayer === 'iss') await loadISS();
}

function renderISSPanel(d) {
  const lat = parseFloat(d.latitude).toFixed(4);
  const lng = parseFloat(d.longitude).toFixed(4);
  const alt = parseFloat(d.altitude).toFixed(1);
  const vel = parseInt(d.velocity).toLocaleString();
  document.getElementById('issAlt').textContent = `${alt}km`;
  document.getElementById('issInfo').innerHTML = `
    <div class="iss-grid">
      <div class="iss-stat"><span class="iss-label">LATITUDE</span><span class="iss-val">${lat}°</span></div>
      <div class="iss-stat"><span class="iss-label">LONGITUDE</span><span class="iss-val">${lng}°</span></div>
      <div class="iss-stat"><span class="iss-label">ALTITUDE</span><span class="iss-val">${alt} km</span></div>
      <div class="iss-stat"><span class="iss-label">VELOCITY</span><span class="iss-val">${vel} km/h</span></div>
    </div>
    <div class="iss-note">🌍 Orbiting Earth every ~90 minutes at 27,600 km/h</div>`;
}

function renderISSMap(d) {
  const lat = parseFloat(d.latitude);
  const lng = parseFloat(d.longitude);
  layers.iss.clearLayers();
  const icon = L.divIcon({
    html: '<div class="iss-dot">🛸</div>',
    iconSize: [32, 32], iconAnchor: [16, 16], className: ''
  });
  L.marker([lat, lng], { icon })
    .bindPopup(popup('🛸 INTERNATIONAL SPACE STATION',
      `Lat: ${lat.toFixed(4)}° | Lng: ${lng.toFixed(4)}°`,
      `Altitude: ${parseFloat(d.altitude).toFixed(1)} km`,
      `Velocity: ${parseInt(d.velocity).toLocaleString()} km/h`,
      `Updated: ${new Date().toLocaleTimeString()}`
    )).addTo(layers.iss);
}

// ============================================================
// Space weather — NOAA SWPC (free, CORS-enabled)
// ============================================================
async function loadSpaceWeather() {
  try {
    const [kpRes, swRes] = await Promise.allSettled([
      fetch(KP_URL),
      fetch(SOLAR_WIND_URL)
    ]);

    let kp = null;
    if (kpRes.status === 'fulfilled') {
      const kpData = await kpRes.value.json();
      kp = kpData[kpData.length - 1]?.kp_index ?? null;
    }

    let solarWind = null;
    if (swRes.status === 'fulfilled') {
      const swData = await swRes.value.json();
      const row    = swData[swData.length - 1];
      if (row && row.length >= 3) {
        solarWind = { density: parseFloat(row[1]), speed: parseFloat(row[2]) };
      }
    }

    renderSpaceWeather(kp, solarWind);
  } catch (err) {
    console.error('Space weather failed:', err);
    document.getElementById('spaceWeather').innerHTML =
      '<div class="empty-state">Space weather data unavailable</div>';
  }
}

function renderSpaceWeather(kp, sw) {
  const kpNum = parseFloat(kp) || 0;
  const severity = kpNum >= 7 ? { cls: 'danger',  label: '⚠️ SEVERE STORM',    desc: 'Extreme geomagnetic conditions. Radio blackouts possible.' }
                 : kpNum >= 5 ? { cls: 'warning', label: '⚡ GEOMAGNETIC STORM', desc: 'Aurora visible at lower latitudes. GPS disruption possible.' }
                 : kpNum >= 3 ? { cls: 'moderate',label: '🌠 ACTIVE',            desc: 'Aurora possible at high latitudes.' }
                 :              { cls: 'calm',     label: '✅ QUIET',             desc: 'Calm space weather conditions.' };

  document.getElementById('spaceWeather').innerHTML = `
    <div class="sw-grid">
      <div class="sw-card ${severity.cls}">
        <div class="sw-label">Kp INDEX</div>
        <div class="sw-big">${kpNum.toFixed(1)}</div>
        <div class="sw-tag">${severity.label}</div>
      </div>
      ${sw ? `
      <div class="sw-card">
        <div class="sw-label">SOLAR WIND</div>
        <div class="sw-big">${Math.round(sw.speed)}</div>
        <div class="sw-tag">km/s</div>
      </div>
      <div class="sw-card">
        <div class="sw-label">DENSITY</div>
        <div class="sw-big">${sw.density.toFixed(1)}</div>
        <div class="sw-tag">p/cm³</div>
      </div>` : ''}
    </div>
    <div class="sw-note">${severity.desc}</div>`;
}

// ============================================================
// News — BBC RSS via rss2json (free, no key)
// ============================================================
async function loadNews(feed) {
  try {
    const url  = `${RSS2JSON}${encodeURIComponent(RSS_FEEDS[feed])}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('RSS parse failed');
    state.news[feed] = data.items || [];
    if (feed === currentNewsFeed) renderNews(state.news[feed]);
  } catch (err) {
    console.error(`News (${feed}) failed:`, err);
    if (feed === currentNewsFeed) {
      document.getElementById('newsFeed').innerHTML =
        '<div class="empty-state">News temporarily unavailable</div>';
    }
  }
}

function renderNews(items) {
  const container = document.getElementById('newsFeed');
  if (!items || !items.length) {
    container.innerHTML = '<div class="empty-state">No news available</div>';
    return;
  }
  container.innerHTML = items.slice(0, 10).map(item => {
    const title = escapeHtml(item.title || 'Untitled');
    const date  = item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : '';
    const desc  = escapeHtml((item.description || '').replace(/<[^>]*>/g, '').slice(0, 160));
    const url   = item.link || '#';
    return `
      <div class="news-item">
        <div class="news-title"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></div>
        <div class="news-source">BBC News • ${date}</div>
        <div class="item-meta">${desc}</div>
      </div>`;
  }).join('');
}

// ============================================================
// Disasters feed (side panel)
// ============================================================
function renderDisastersFeed(events) {
  const container = document.getElementById('disastersFeed');
  if (!events.length) {
    container.innerHTML = '<div class="empty-state">No active events</div>';
    return;
  }
  container.innerHTML = events.slice(0, 20).map(event => {
    const cat  = event.categories?.[0]?.title || 'Natural Event';
    const icon = catIcon(cat);
    const date = event.geometries?.[0]?.date
      ? new Date(event.geometries[0].date).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
      : 'Active';
    return `
      <div class="event-item">
        <div class="event-icon">${icon}</div>
        <div class="event-body">
          <div class="event-title">${escapeHtml(event.title)}</div>
          <div class="event-meta">${escapeHtml(cat)} • ${date}</div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// Market markers on map
// ============================================================
function renderMarketMarkers(quotes) {
  layers.markets.clearLayers();
  const positions = {
    SPY:  [40.7128, -74.0060],
    QQQ:  [37.7749, -122.4194],
    NVDA: [37.3875, -122.0575],
    TSLA: [30.2672, -97.7431],
    AAPL: [37.3361, -122.0090],
    MSFT: [47.6062, -122.3321]
  };
  quotes.forEach(q => {
    const pos  = positions[q.symbol];
    if (!pos) return;
    const chg  = parseFloat(q.change);
    const col  = chg > 0 ? '#6dff98' : chg < 0 ? '#ff6b7d' : '#77b6ff';
    const arr  = chg > 0 ? '▲' : chg < 0 ? '▼' : '—';
    const icon = L.divIcon({
      html: `<div class="mkt-label" style="border-color:${col};color:${col}">${q.symbol} ${arr}${Math.abs(chg)}%</div>`,
      className: '', iconAnchor: [40, 14]
    });
    L.marker(pos, { icon })
      .bindPopup(popup(`📈 ${q.symbol}`,
        `Price: $${q.price}`,
        `<span class="${chg>0?'positive':chg<0?'negative':'neutral'}">${chg>0?'+':''}${chg}% today</span>`
      )).addTo(layers.markets);
  });
}

// ============================================================
// Live alerts panel
// ============================================================
function buildLiveAlerts() {
  const alerts = [];

  state.earthquakes
    .filter(f => f.properties.mag >= 4.5)
    .slice(0, 4)
    .forEach(f => {
      const mag   = f.properties.mag;
      const place = f.properties.place || 'Unknown';
      alerts.push({ icon: mag >= 6 ? '🚨' : '🔴', text: `M${mag} earthquake — ${place}`, cls: 'quake' });
    });

  state.eonetEvents.slice(0, 5).forEach(e => {
    const cat = e.categories?.[0]?.title || 'Event';
    alerts.push({ icon: catIcon(cat), text: e.title, cls: 'disaster' });
  });

  if (state.crypto.bitcoin) {
    const c   = state.crypto.bitcoin;
    const chg = c.usd_24h_change ?? 0;
    if (Math.abs(chg) > 2) {
      alerts.push({
        icon: chg > 0 ? '📈' : '📉',
        text: `BTC ${chg > 0 ? '+' : ''}${chg.toFixed(1)}% — $${fmtCrypto(c.usd)}`,
        cls:  'market'
      });
    }
  }

  const container = document.getElementById('liveAlerts');
  document.getElementById('alertCount').textContent = alerts.length;

  if (!alerts.length) {
    container.innerHTML = '<div class="empty-state">No active alerts</div>';
    return;
  }
  container.innerHTML = alerts.map(a => `
    <div class="alert-item alert-${a.cls}">
      <span class="alert-icon">${a.icon}</span>
      <span>${escapeHtml(a.text)}</span>
    </div>`).join('');
}

// ============================================================
// Ticker
// ============================================================
function updateTicker() {
  const items = [];

  state.earthquakes
    .filter(f => f.properties.mag >= 4)
    .slice(0, 6)
    .forEach(f => items.push(`🔴 M${f.properties.mag} — ${f.properties.place}`));

  state.eonetEvents
    .slice(0, 5)
    .forEach(e => items.push(`${catIcon(e.categories?.[0]?.title||'')} ${e.title}`));

  if (state.crypto.bitcoin)  items.push(`₿ BTC $${fmtCrypto(state.crypto.bitcoin.usd)} (${(state.crypto.bitcoin.usd_24h_change||0).toFixed(1)}% 24h)`);
  if (state.crypto.ethereum) items.push(`Ξ ETH $${fmtCrypto(state.crypto.ethereum.usd)} (${(state.crypto.ethereum.usd_24h_change||0).toFixed(1)}% 24h)`);
  if (state.crypto.solana)   items.push(`◎ SOL $${fmtCrypto(state.crypto.solana.usd)} (${(state.crypto.solana.usd_24h_change||0).toFixed(1)}% 24h)`);

  state.stocks.slice(0, 4).forEach(q => {
    const chg = parseFloat(q.change);
    items.push(`${chg>=0?'▲':'▼'} ${q.symbol} $${q.price} (${chg>=0?'+':''}${q.change}%)`);
  });

  const track = document.getElementById('tickerTrack');
  if (items.length) {
    const text = items.join('     ·     ');
    track.textContent = text + '     ·     ' + text; // duplicate for seamless loop
  }
}

// ============================================================
// UI setup
// ============================================================
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

function setupLayerButtons() {
  document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLayer = btn.dataset.layer;
      switchLayer(activeLayer);
    });
  });
}

function setupNewsFilter() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentNewsFeed = btn.dataset.feed;
      if (state.news[currentNewsFeed]?.length) {
        renderNews(state.news[currentNewsFeed]);
      } else {
        loadNews(currentNewsFeed);
      }
    });
  });
}

function setUpdatedTime() {
  document.getElementById('updatedAt').textContent =
    `UPDATED: ${new Date().toLocaleTimeString()}`;
}

// ============================================================
// Helpers
// ============================================================
function popup(...lines) {
  return `<div class="map-popup">${lines.map((l, i) =>
    i === 0 ? `<div class="popup-title">${l}</div>` : `<div class="popup-line">${l}</div>`
  ).join('')}</div>`;
}

function catIcon(cat) {
  const c = cat.toLowerCase();
  if (c.includes('wildfire') || c.includes('fire'))                           return '🔥';
  if (c.includes('volcano'))                                                  return '🌋';
  if (c.includes('storm') || c.includes('cyclone') ||
      c.includes('hurricane') || c.includes('typhoon'))                       return '🌀';
  if (c.includes('flood'))                                                    return '🌊';
  if (c.includes('earthquake'))                                               return '🔴';
  if (c.includes('drought'))                                                  return '☀️';
  if (c.includes('snow') || c.includes('ice') || c.includes('blizzard'))     return '❄️';
  if (c.includes('landslide') || c.includes('avalanche'))                     return '⛰️';
  if (c.includes('tsunami'))                                                  return '🌊';
  return '⚠️';
}

function fmtCrypto(price) {
  if (price >= 10000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (price >= 1)     return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
