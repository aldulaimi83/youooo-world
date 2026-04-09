// ═══════════════════════════════════════════════════════════
// YOUOOO INTEL v5 — Global Operations Center
// ═══════════════════════════════════════════════════════════

// ── Data sources (100% free, no keys) ──
const API = {
  usgs:      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  eonet:     'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100',
  iss:       'https://api.wheretheiss.at/v1/satellites/25544',
  kp:        'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
  solar:     'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json',
  gecko:     'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,cardano,dogecoin,binancecoin&vs_currencies=usd&include_24hr_change=true',
  opensky:   'https://opensky-network.org/api/states/all?lamin=20&lamax=65&lomin=-130&lomax=50',
  hn:        'https://hacker-news.firebaseio.com/v0/topstories.json',
  hnItem:    id => `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
  rss:       feed => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`,
  wiki:      'https://stream.wikimedia.org/v2/stream/recentchange'
};

const RSS_URLS = {
  world:   'https://feeds.bbci.co.uk/news/world/rss.xml',
  tech:    'https://feeds.bbci.co.uk/news/technology/rss.xml',
  science: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'
};

const CRYPTOS = [
  { id:'bitcoin',     sym:'BTC' },
  { id:'ethereum',    sym:'ETH' },
  { id:'binancecoin', sym:'BNB' },
  { id:'solana',      sym:'SOL' },
  { id:'ripple',      sym:'XRP' },
  { id:'cardano',     sym:'ADA' },
  { id:'dogecoin',    sym:'DOGE'}
];

// ── State ──
const S = {
  quakes:    [],
  events:    [],
  crypto:    {},
  iss:       null,
  kp:        0,
  solar:     null,
  aircraft:  [],
  news:      {},
  hn:        [],
  wiki:      [],
  wikiRate:  0,
  wikiEdits: 0,
  wikiTimer: null
};

let map, lyr = {}, activeL = new Set(['earthquakes','aircraft']);
let newsFeed = 'hn';
let soundOn = false;
let audioCtx = null;
const toastSeen = new Set();

// ═══════════════════════════════════════════════════════════
// BOOT SEQUENCE
// ═══════════════════════════════════════════════════════════
const BOOT_LINES = [
  'Initializing core systems...',
  'Connecting to USGS seismic feed...',
  'Handshake with NASA EONET API...',
  'Linking OpenSky aircraft transponders...',
  'Acquiring ISS orbital data...',
  'Establishing NOAA space weather link...',
  'CoinGecko market feed connected...',
  'Decrypting BBC/HackerNews intelligence...',
  'Wikipedia live stream active...',
  'Map tiles loaded — dark cartography...',
  'Threat matrix calibrated...',
  'All 8 systems nominal. Launching OPS CENTER.',
];

async function runBoot() {
  const lines = document.getElementById('bootLines');
  const bar   = document.getElementById('bootBar');
  for (let i = 0; i < BOOT_LINES.length; i++) {
    const d = document.createElement('div');
    d.textContent = '> ' + BOOT_LINES[i];
    lines.appendChild(d);
    lines.scrollTop = lines.scrollHeight;
    bar.style.width = `${Math.round((i + 1) / BOOT_LINES.length * 100)}%`;
    await sleep(110 + Math.random() * 80);
  }
  await sleep(400);
  document.getElementById('boot').classList.add('gone');
}

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  runBoot();
  startClocks();
  setupKeys();
  setupLayerBtns();
  setupNewsTabs();
  setupSoundBtn();
  initMap();
  initWikiStream();

  await loadAll();
  setInterval(loadAll, 5 * 60 * 1000);
  setInterval(tickISS, 10 * 1000);
  setInterval(tickAircraft, 30 * 1000);
  setInterval(tickCrypto, 60 * 1000);
});

// ═══════════════════════════════════════════════════════════
// CLOCKS
// ═══════════════════════════════════════════════════════════
function startClocks() {
  const tick = () => {
    const n = new Date();
    const f = tz => n.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
    document.getElementById('tz-utc').textContent = f('UTC');
    document.getElementById('tz-nyc').textContent = f('America/New_York');
    document.getElementById('tz-lon').textContent = f('Europe/London');
    document.getElementById('tz-dxb').textContent = f('Asia/Dubai');
    document.getElementById('tz-tyo').textContent = f('Asia/Tokyo');
  };
  tick(); setInterval(tick, 1000);
}

// ═══════════════════════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════════════════════
function initMap() {
  map = L.map('map', { zoomControl: false, worldCopyJump: true, attributionControl: false })
          .setView([28, 15], 2.3);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);

  L.control.attribution({ position:'bottomright', prefix:'© OpenStreetMap © CARTO' }).addTo(map);
  L.control.zoom({ position:'bottomright' }).addTo(map);

  ['earthquakes','fires','volcanoes','storms','iss','aircraft'].forEach(k => {
    lyr[k] = L.layerGroup();
    if (activeL.has(k)) map.addLayer(lyr[k]);
  });
}

function syncLayers() {
  Object.keys(lyr).forEach(k => {
    activeL.has(k) ? (!map.hasLayer(lyr[k]) && map.addLayer(lyr[k]))
                   : (map.hasLayer(lyr[k]) && map.removeLayer(lyr[k]));
  });
}

// ═══════════════════════════════════════════════════════════
// MASTER LOAD
// ═══════════════════════════════════════════════════════════
async function loadAll() {
  setSyncLabel();
  await Promise.allSettled([
    loadQuakes(),
    loadEONET(),
    loadCrypto(),
    loadISS(),
    loadSpaceWeather(),
    loadAircraft(),
    loadHN(),
    loadRSS('world'),
    loadRSS('tech'),
    loadRSS('science')
  ]);
  buildThreat();
  buildTicker();
}

function setSyncLabel() {
  document.getElementById('syncLbl').textContent =
    'SYNC: ' + new Date().toLocaleTimeString('en-GB', { hour12: false });
}

// ═══════════════════════════════════════════════════════════
// EARTHQUAKES
// ═══════════════════════════════════════════════════════════
async function loadQuakes() {
  try {
    const d = await getJSON(API.usgs);
    const prev = new Set(S.quakes.map(f => f.id));
    S.quakes = (d.features || []).filter(f => (f.properties.mag || 0) > 0);

    // Toast big new quakes
    S.quakes.filter(f => f.properties.mag >= 6 && !prev.has(f.id) && !toastSeen.has(f.id))
      .slice(0, 2).forEach(f => {
        toastSeen.add(f.id);
        toast('quake', '🔴 MAJOR EARTHQUAKE',
          `M${f.properties.mag} — ${shortPlace(f.properties.place || 'Unknown')}`);
        beep(220, 0.4, 'sawtooth');
      });

    lyr.earthquakes.clearLayers();
    S.quakes.slice(0, 120).forEach(f => {
      const [lng, lat, dep] = f.geometry.coordinates;
      const mag = f.properties.mag ?? 0;
      const col = magColor(mag);
      const r   = Math.max(3, Math.min(24, mag * 3));

      injectCSS('eq-pulse', `@keyframes eq-pulse{0%{transform:scale(1);opacity:.9}70%{transform:scale(2.6);opacity:0}100%{transform:scale(1);opacity:0}}`);

      const icon = L.divIcon({
        className:'', iconSize:[r*3,r*3], iconAnchor:[r*1.5,r*1.5],
        html:`<div style="position:relative;width:${r*3}px;height:${r*3}px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:${r*2.8}px;height:${r*2.8}px;border-radius:50%;border:1.5px solid ${col};animation:eq-pulse ${2.8-Math.min(1,mag/9)}s ease-out infinite;opacity:.6"></div>
          <div style="width:${r}px;height:${r}px;border-radius:50%;background:${col};opacity:.85;box-shadow:0 0 ${r*1.5}px ${col}88"></div>
        </div>`
      });

      L.marker([lat,lng], { icon })
        .bindPopup(mp('◉ SEISMIC EVENT',
          `<b>${f.properties.place||'Unknown'}</b>`,
          `Magnitude: <b style="color:${col}">${mag}</b>`,
          `Depth: ${dep} km`,
          ago(f.properties.time)
        )).addTo(lyr.earthquakes);
    });

    const top = [...S.quakes].sort((a,b) => b.properties.mag - a.properties.mag).slice(0, 8);
    document.getElementById('seismicBadge').textContent = S.quakes.length;
    document.getElementById('hQuakes').textContent = S.quakes.length;
    document.getElementById('seismicList').innerHTML = top.map(f => {
      const mag = f.properties.mag, place = f.properties.place || 'Unknown';
      const cls = mag>=6?'c':mag>=5?'h':mag>=4?'m':'l';
      return `<div class="qi">
        <div class="qm ${cls}">M${mag}</div>
        <div><div class="qp">${esc(shortPlace(place))}</div><div class="qt">${ago(f.properties.time)}</div></div>
      </div>`;
    }).join('') || none('No data');
  } catch(e){ console.error('Quakes:', e); }
}

// ═══════════════════════════════════════════════════════════
// NASA EONET
// ═══════════════════════════════════════════════════════════
async function loadEONET() {
  try {
    const d = await getJSON(API.eonet);
    S.events = d.events || [];
    lyr.fires.clearLayers(); lyr.volcanoes.clearLayers(); lyr.storms.clearLayers();

    S.events.forEach(ev => {
      const cat  = (ev.categories?.[0]?.title || '').toLowerCase();
      const geom = ev.geometries?.[0];
      if (!geom || geom.type !== 'Point') return;
      const [lng, lat] = geom.coordinates;
      const when = geom.date ? ago(new Date(geom.date).getTime()) : 'Active';

      if (cat.includes('wildfire') || cat.includes('fire')) {
        L.marker([lat,lng], { icon: emojiIcon('🔥',22,'filter:drop-shadow(0 0 6px #ff7700)') })
          .bindPopup(mp('🔥 WILDFIRE', `<b>${ev.title}</b>`, when)).addTo(lyr.fires);
      } else if (cat.includes('volcano')) {
        L.marker([lat,lng], { icon: emojiIcon('🌋',22,'filter:drop-shadow(0 0 6px #ff4422)') })
          .bindPopup(mp('🌋 VOLCANIC ACTIVITY', `<b>${ev.title}</b>`, when)).addTo(lyr.volcanoes);
      } else if (cat.includes('storm')||cat.includes('cyclone')||cat.includes('hurricane')||cat.includes('typhoon')) {
        injectCSS('spin-kf','@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}');
        L.marker([lat,lng], { icon: emojiIcon('🌀',26,'filter:drop-shadow(0 0 8px #aa55ff);animation:spin 8s linear infinite') })
          .bindPopup(mp('🌀 TROPICAL SYSTEM', `<b>${ev.title}</b>`, when)).addTo(lyr.storms);
      }
    });

    document.getElementById('hEvents').textContent = S.events.length;
  } catch(e){ console.error('EONET:', e); }
}

// ═══════════════════════════════════════════════════════════
// AIRCRAFT — OpenSky (free, anonymous, CORS OK)
// ═══════════════════════════════════════════════════════════
async function loadAircraft() {
  try {
    const d = await getJSON(API.opensky);
    const states = (d.states || []).filter(s => s[5] && s[6] && s[2]); // lon, lat, origin country
    S.aircraft = states.slice(0, 600);

    lyr.aircraft.clearLayers();
    S.aircraft.forEach(s => renderPlane(s));

    document.getElementById('hAircraft').textContent = (d.states||[]).length.toLocaleString();
    renderAirPanel(S.aircraft);
  } catch(e){
    console.error('OpenSky:', e);
    document.getElementById('airPanel').innerHTML = none('OpenSky rate-limited — try again in 1 min');
  }
}

async function tickAircraft() { await loadAircraft(); }

function renderPlane(s) {
  const [,cs,,,,lng,lat,,vel,,trk,,,,cat] = s;
  if (!lat||!lng) return;
  const hdg = trk || 0;
  const icon = L.divIcon({
    html:`<div class="ac-icon" style="transform:rotate(${hdg}deg)">✈</div>`,
    iconSize:[18,18], iconAnchor:[9,9], className:''
  });
  const alt = s[7] != null ? `${Math.round(s[7])} m` : 'N/A';
  const spd = vel ? `${Math.round(vel * 3.6)} km/h` : 'N/A';
  const callsign = (cs||'').trim() || 'UNKNOWN';
  L.marker([lat,lng], { icon })
    .bindPopup(mp('✈ AIRCRAFT',
      `<b>${esc(callsign)}</b>`,
      `Origin: ${esc(s[2]||'?')}`,
      `Altitude: <b>${alt}</b>`,
      `Speed: <b>${spd}</b>`,
      `Heading: ${Math.round(hdg)}°`
    )).addTo(lyr.aircraft);
}

function renderAirPanel(states) {
  const total  = states.length;
  const airborne = states.filter(s => !s[8]); // on_ground = false
  const byCountry = {};
  states.forEach(s => { const c = s[2]||'?'; byCountry[c]=(byCountry[c]||0)+1; });
  const topCtry = Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).slice(0,3);

  const sample = states.filter(s=>(s[1]||'').trim()).slice(0,6);

  document.getElementById('airPanel').innerHTML = `
    <div class="air-stat">
      <div class="as-cell"><div class="as-lbl">TRACKED</div><div class="as-val">${total.toLocaleString()}</div></div>
      <div class="as-cell"><div class="as-lbl">AIRBORNE</div><div class="as-val">${airborne.length.toLocaleString()}</div></div>
    </div>
    <div class="air-list">
      ${sample.map(s => {
        const cs  = (s[1]||'').trim() || '?';
        const alt = s[7]!=null ? Math.round(s[7]/100)/10+'km' : '?';
        const spd = s[9] ? Math.round(s[9]*3.6)+'km/h' : '?';
        return `<div class="air-item">
          <span class="air-ico">✈</span>
          <span class="air-cs">${esc(cs)}</span>
          <span class="air-info">${esc(s[2]||'')}</span>
          <span class="air-alt">${alt}</span>
        </div>`;
      }).join('')}
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// CRYPTO — CoinGecko (free, no key)
// ═══════════════════════════════════════════════════════════
async function loadCrypto() {
  try {
    S.crypto = await getJSON(API.gecko);
    document.getElementById('cryptoTime').textContent =
      new Date().toLocaleTimeString('en-GB',{hour12:false});
    renderCrypto();
  } catch(e){ console.error('Gecko:', e); }
}

async function tickCrypto() { await loadCrypto(); }

function renderCrypto() {
  document.getElementById('assetList').innerHTML = CRYPTOS.map(({id,sym}) => {
    const c = S.crypto[id]; if(!c) return '';
    const px = c.usd, ch = c.usd_24h_change||0;
    const cls = ch>0.3?'up':ch<-0.3?'down':'flat';
    const arr = ch>0.3?'▲':ch<-0.3?'▼':'─';
    return `<div class="ar">
      <div class="ar-sym">${sym}</div>
      <div class="ar-price">$${fmtPx(px)}</div>
      <div class="ar-chg ${cls}">${arr}${Math.abs(ch).toFixed(2)}%</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// ISS
// ═══════════════════════════════════════════════════════════
async function loadISS() {
  try {
    S.iss = await getJSON(API.iss);
    renderISS(S.iss);
    renderISSMap(S.iss);
  } catch(e){ console.error('ISS:', e); }
}

async function tickISS() { await loadISS(); }

function renderISS(d) {
  const lat = parseFloat(d.latitude), lng = parseFloat(d.longitude);
  const alt = parseFloat(d.altitude).toFixed(1);
  const vel = parseInt(d.velocity).toLocaleString();
  const latS = lat>=0?`${lat.toFixed(3)}°N`:`${Math.abs(lat).toFixed(3)}°S`;
  const lngS = lng>=0?`${lng.toFixed(3)}°E`:`${Math.abs(lng).toFixed(3)}°W`;

  document.getElementById('orbitalInfo').innerHTML = `
    <div class="og">
      <div class="oc"><span class="ol">LATITUDE</span><span class="ov">${latS}</span></div>
      <div class="oc"><span class="ol">LONGITUDE</span><span class="ov">${lngS}</span></div>
      <div class="oc"><span class="ol">ALTITUDE</span><span class="ov">${alt} km</span></div>
      <div class="oc"><span class="ol">VELOCITY</span><span class="ov">${vel}<small style="font-size:.55rem"> km/h</small></span></div>
    </div>
    <div class="over">OVERHEAD: <span>${region(lat,lng)}</span></div>`;

  document.getElementById('issFoot').innerHTML =
    `🛸 <strong>ISS</strong> ${latS} ${lngS} — ${alt} km — ${vel} km/h`;
}

function renderISSMap(d) {
  lyr.iss.clearLayers();
  const lat = parseFloat(d.latitude), lng = parseFloat(d.longitude);
  L.marker([lat,lng], { icon: L.divIcon({ html:'<div class="iss-mk">🛸</div>', iconSize:[26,26], iconAnchor:[13,13], className:'' }) })
    .bindPopup(mp('🛸 ISS LIVE',
      `${parseFloat(d.latitude).toFixed(3)}° / ${parseFloat(d.longitude).toFixed(3)}°`,
      `Altitude: <b>${parseFloat(d.altitude).toFixed(1)} km</b>`,
      `Velocity: <b>${parseInt(d.velocity).toLocaleString()} km/h</b>`,
      `Over: ${region(parseFloat(d.latitude), parseFloat(d.longitude))}`
    )).addTo(lyr.iss);
}

// ═══════════════════════════════════════════════════════════
// SPACE WEATHER
// ═══════════════════════════════════════════════════════════
async function loadSpaceWeather() {
  try {
    const [kr, sr] = await Promise.allSettled([getJSON(API.kp), getJSON(API.solar)]);
    if (kr.status==='fulfilled') {
      const last = kr.value[kr.value.length-1];
      S.kp = parseFloat(last?.kp_index)||0;
    }
    if (sr.status==='fulfilled') {
      const row = sr.value[sr.value.length-1];
      if (row?.length>=3) S.solar = { den: parseFloat(row[1]), spd: parseFloat(row[2]) };
    }
    const kp  = S.kp;
    const sev = kp>=7?'⚠ SEVERE STORM':kp>=5?'⚡ GEO-STORM':kp>=3?'🌠 ACTIVE':'✓ QUIET';
    document.getElementById('swFoot').innerHTML =
      `☀ Kp: <strong>${kp.toFixed(1)}</strong> ${sev}`+
      (S.solar?` · Wind: <strong>${Math.round(S.solar.spd)} km/s</strong> · ρ: <strong>${S.solar.den.toFixed(1)}/cm³</strong>`:'');
  } catch(e){ console.error('SpaceWX:', e); }
}

// ═══════════════════════════════════════════════════════════
// HACKER NEWS (free JSON API)
// ═══════════════════════════════════════════════════════════
async function loadHN() {
  try {
    const ids = await getJSON(API.hn);
    const top12 = ids.slice(0, 12);
    const items = await Promise.allSettled(top12.map(id => getJSON(API.hnItem(id))));
    S.hn = items.filter(r=>r.status==='fulfilled'&&r.value?.title).map(r=>r.value);
    if (newsFeed === 'hn') renderNews();
  } catch(e){ console.error('HN:', e); }
}

// ═══════════════════════════════════════════════════════════
// RSS NEWS
// ═══════════════════════════════════════════════════════════
async function loadRSS(feed) {
  try {
    const d = await getJSON(API.rss(RSS_URLS[feed]));
    if (d.status!=='ok') throw new Error('rss fail');
    S.news[feed] = d.items||[];
    if (newsFeed===feed) renderNews();
  } catch(e){ console.error(`RSS(${feed}):`, e); }
}

function renderNews() {
  const el = document.getElementById('intelList');
  if (newsFeed === 'hn') {
    if (!S.hn.length) { el.innerHTML=none('Loading HN...');return; }
    el.innerHTML = S.hn.map(item => {
      const pts  = item.score ? `${item.score} pts · ${item.descendants||0} comments` : '';
      const time = item.time ? ago(item.time*1000) : '';
      const url  = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
      return `<div class="ii">
        <div class="ii-meta"><span class="ii-src">HACKER NEWS</span><span class="ii-time">${time}</span></div>
        <div class="ii-title"><a href="${url}" target="_blank" rel="noopener">${esc(item.title)}</a></div>
        ${pts?`<div class="ii-pts">${pts}</div>`:''}
      </div>`;
    }).join('');
  } else {
    const items = S.news[newsFeed]||[];
    if (!items.length) { el.innerHTML=none('Loading...');return; }
    el.innerHTML = items.slice(0,12).map(item => {
      const date = item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '';
      return `<div class="ii">
        <div class="ii-meta"><span class="ii-src">BBC ${newsFeed.toUpperCase()}</span><span class="ii-time">${date}</span></div>
        <div class="ii-title"><a href="${item.link||'#'}" target="_blank" rel="noopener">${esc(item.title||'Untitled')}</a></div>
      </div>`;
    }).join('');
  }
}

// ═══════════════════════════════════════════════════════════
// WIKIPEDIA LIVE STREAM — Server-Sent Events
// ═══════════════════════════════════════════════════════════
function initWikiStream() {
  try {
    const es = new EventSource(API.wiki);
    let perMinBucket = 0;

    es.onmessage = e => {
      try {
        const d = JSON.parse(e.data);
        if (d.type !== 'edit') return;
        if (d.namespace !== 0) return; // main articles only
        if (!d.title || d.bot) return; // skip bots

        perMinBucket++;
        S.wikiEdits++;

        const item = {
          title:  d.title,
          user:   d.user || '?',
          url:    `https://en.wikipedia.org/wiki/${encodeURIComponent(d.title)}`,
          time:   Date.now(),
          diff:   (d.length?.new||0) - (d.length?.old||0)
        };

        S.wiki.unshift(item);
        if (S.wiki.length > 25) S.wiki.pop();
        renderWiki();
      } catch(_){}
    };

    es.onerror = () => {
      document.getElementById('wikiList').innerHTML = none('Wiki stream reconnecting...');
    };

    // Rate counter — edits per minute
    setInterval(() => {
      S.wikiRate = perMinBucket;
      perMinBucket = 0;
      document.getElementById('hWiki').textContent = S.wikiRate;
    }, 60000);

    // Tick the rate from current session edits
    setInterval(() => {
      if (S.wikiEdits > 0) {
        document.getElementById('hWiki').textContent = S.wikiEdits;
      }
    }, 5000);

  } catch(e) {
    console.error('Wiki SSE:', e);
    document.getElementById('wikiList').innerHTML = none('Wiki stream unavailable');
  }
}

function renderWiki() {
  const el = document.getElementById('wikiList');
  el.innerHTML = S.wiki.slice(0, 15).map(w => {
    const diff = w.diff > 0 ? `+${w.diff}` : `${w.diff}`;
    const col  = w.diff > 0 ? 'var(--green)' : w.diff < 0 ? 'var(--red)' : 'var(--dim)';
    return `<div class="wi">
      <div class="wi-ico">${w.diff > 100 ? '📝' : w.diff < -100 ? '✂️' : '✏️'}</div>
      <div class="wi-body">
        <div class="wi-title"><a href="${w.url}" target="_blank" rel="noopener">${esc(w.title)}</a></div>
        <div class="wi-meta">${esc(w.user)} · <span style="color:${col}">${diff} chars</span> · ${ago(w.time)}</div>
      </div>
    </div>`;
  }).join('') || none('Waiting for edits...');
}

// ═══════════════════════════════════════════════════════════
// THREAT MATRIX
// ═══════════════════════════════════════════════════════════
function buildThreat() {
  const maxMag = Math.max(0, ...S.quakes.map(f => f.properties.mag||0));
  const fires  = S.events.filter(e => (e.categories?.[0]?.title||'').toLowerCase().includes('fire')).length;
  const storms = S.events.filter(e => { const c=(e.categories?.[0]?.title||'').toLowerCase(); return c.includes('storm')||c.includes('cyclone')||c.includes('hurricane')||c.includes('typhoon'); }).length;
  const volcs  = S.events.filter(e => (e.categories?.[0]?.title||'').toLowerCase().includes('volcano')).length;
  const kp     = S.kp;

  const rows = [
    { icon:'🔴', name:'SEISMIC',   pct: clamp(maxMag>=7?1:maxMag>=6?.82:maxMag>=5?.56:maxMag>=4?.3:.1) },
    { icon:'🔥', name:'WILDFIRE',  pct: clamp(fires>=30?1:fires>=15?.78:fires>=5?.48:fires>=1?.25:.06) },
    { icon:'🌀', name:'TROPICAL',  pct: clamp(storms>=5?1:storms>=3?.75:storms>=1?.44:.06) },
    { icon:'🌋', name:'VOLCANIC',  pct: clamp(volcs>=10?.9:volcs>=5?.62:volcs>=1?.36:.06) },
    { icon:'☀',  name:'SPACE WX', pct: clamp(kp>=7?1:kp>=5?.72:kp>=3?.42:.12) },
    { icon:'✈',  name:'AIRSPACE', pct: clamp(S.aircraft.length>=400?.85:S.aircraft.length>=200?.55:S.aircraft.length>=50?.3:.1) }
  ];

  document.getElementById('threatMatrix').innerHTML = rows.map(r => {
    const { label, cls, color } = threatLv(r.pct);
    return `<div class="tr-row">
      <span class="tr-ico">${r.icon}</span>
      <span class="tr-name">${r.name}</span>
      <div class="tr-bw"><div class="tr-bf" style="width:${Math.round(r.pct*100)}%;background:${color}"></div></div>
      <span class="tr-lv ${cls}">${label}</span>
    </div>`;
  }).join('');
}

function threatLv(p) {
  if (p>=.85) return { label:'CRITICAL', cls:'lv-critical', color:'var(--red)' };
  if (p>=.6)  return { label:'HIGH',     cls:'lv-high',     color:'var(--orange)' };
  if (p>=.36) return { label:'MODERATE', cls:'lv-moderate', color:'var(--yellow)' };
  return            { label:'LOW',       cls:'lv-low',      color:'var(--green)' };
}

// ═══════════════════════════════════════════════════════════
// TICKER
// ═══════════════════════════════════════════════════════════
function buildTicker() {
  const parts = [];
  S.quakes.filter(f=>f.properties.mag>=5).slice(0,5)
    .forEach(f => parts.push(`⬤ M${f.properties.mag} ${f.properties.place}`));
  S.events.slice(0,4).forEach(e => parts.push(`${catIcon(e.categories?.[0]?.title||'')} ${e.title}`));
  if (S.crypto.bitcoin)    parts.push(`₿ $${fmtPx(S.crypto.bitcoin.usd)} (${fmtChg(S.crypto.bitcoin.usd_24h_change)}%)`);
  if (S.crypto.ethereum)   parts.push(`Ξ $${fmtPx(S.crypto.ethereum.usd)} (${fmtChg(S.crypto.ethereum.usd_24h_change)}%)`);
  if (S.aircraft.length)   parts.push(`✈ ${S.aircraft.length.toLocaleString()} AIRCRAFT TRACKED`);
  if (S.iss)               parts.push(`🛸 ISS ALTITUDE ${parseFloat(S.iss.altitude).toFixed(0)} km`);
  if (S.kp)                parts.push(`☀ Kp INDEX: ${S.kp.toFixed(1)}`);
  if (S.wiki.length)       parts.push(`📝 ${S.wikiEdits.toLocaleString()} WIKI EDITS THIS SESSION`);

  const txt = parts.join('    ◈    ');
  document.getElementById('tickSpan').textContent = txt + '    ◈    ' + txt;
}

// ═══════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════
function toast(type, title, msg, duration=7000) {
  const wrap = document.getElementById('toasts');
  const el   = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <div class="toast-icon">${type==='quake'?'🔴':type==='fire'?'🔥':type==='storm'?'🌀':'ℹ️'}</div>
    <div class="toast-body">
      <div class="toast-title">${esc(title)}</div>
      <div class="toast-msg">${esc(msg)}</div>
    </div>`;
  wrap.appendChild(el);
  el.addEventListener('click', () => dismiss(el));
  setTimeout(() => dismiss(el), duration);
}

function dismiss(el) {
  el.classList.add('leaving');
  setTimeout(() => el.remove(), 400);
}

// ═══════════════════════════════════════════════════════════
// SOUND — Web Audio API synth (no files needed)
// ═══════════════════════════════════════════════════════════
function beep(freq=440, vol=0.3, type='sine', dur=0.25) {
  if (!soundOn) return;
  if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.start(); osc.stop(audioCtx.currentTime + dur);
}

function radarPing() {
  beep(880, 0.15, 'sine', 0.08);
  setTimeout(()=>beep(660, 0.1, 'sine', 0.06), 120);
}

// ═══════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════
function setupKeys() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    const layerKeys = {'1':'earthquakes','2':'aircraft','3':'fires','4':'volcanoes','5':'storms','6':'iss'};
    if (layerKeys[e.key]) {
      const k = layerKeys[e.key];
      const btn = document.querySelector(`.lb[data-layer="${k}"]`);
      if (btn) btn.click();
    } else if (e.key === 'f' || e.key === 'F') {
      document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    } else if (e.key === 'r' || e.key === 'R') {
      loadAll();
      toast('info','↺ REFRESH','Reloading all data sources...',3000);
    } else if (e.key === 's' || e.key === 'S') {
      document.getElementById('soundBtn').click();
    } else if (e.key === '?') {
      document.getElementById('kbdHint').classList.toggle('hidden');
    }
  });
}

// ═══════════════════════════════════════════════════════════
// UI SETUP
// ═══════════════════════════════════════════════════════════
function setupLayerBtns() {
  document.querySelectorAll('.lb').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.layer;
      if (activeL.has(k)) { activeL.delete(k); btn.classList.remove('active'); }
      else { activeL.add(k); btn.classList.add('active'); }
      syncLayers();
      if (k==='aircraft') beep(660,0.1,'square',0.1);
    });
  });
}

function setupNewsTabs() {
  document.querySelectorAll('.itab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.itab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      newsFeed = btn.dataset.feed;
      renderNews();
    });
  });
}

function setupSoundBtn() {
  const btn = document.getElementById('soundBtn');
  btn.addEventListener('click', () => {
    soundOn = !soundOn;
    btn.textContent = soundOn ? '🔊' : '🔇';
    btn.classList.toggle('on', soundOn);
    if (soundOn) {
      if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      audioCtx.resume();
      radarPing();
    }
  });
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function mp(title, ...lines) {
  return `<div class="mp"><div class="mp-h">${title}</div>${lines.map(l=>`<div class="mp-r">${l}</div>`).join('')}</div>`;
}

function emojiIcon(emoji, size, style='') {
  return L.divIcon({
    html:`<div style="font-size:${size}px;line-height:1;${style}">${emoji}</div>`,
    iconSize:[size,size], iconAnchor:[size/2,size/2], className:''
  });
}

function magColor(mag) {
  if (mag>=7) return '#ff0022';
  if (mag>=6) return '#ff3344';
  if (mag>=5) return '#ff7700';
  if (mag>=4) return '#ffd700';
  if (mag>=2) return '#57ffd6';
  return '#224466';
}

function catIcon(cat) {
  const c=cat.toLowerCase();
  if(c.includes('wildfire')||c.includes('fire'))return'🔥';
  if(c.includes('volcano'))return'🌋';
  if(c.includes('storm')||c.includes('cyclone')||c.includes('hurricane')||c.includes('typhoon'))return'🌀';
  if(c.includes('flood'))return'🌊';
  if(c.includes('drought'))return'☀';
  if(c.includes('snow')||c.includes('ice'))return'❄';
  return'⚠';
}

function fmtPx(n) {
  if(n>=1000) return n.toLocaleString('en-US',{maximumFractionDigits:0});
  if(n>=1)    return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  return n.toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:4});
}

function fmtChg(n) {
  n = n||0;
  return (n>0?'+':'')+n.toFixed(2);
}

function shortPlace(p) { return p.replace(/^\d+\s*km\s+\w+\s+of\s+/i,''); }

function ago(ts) {
  const m = Math.floor((Date.now()-new Date(ts).getTime())/60000);
  if(m<1)  return 'Just now';
  if(m<60) return `${m}m ago`;
  const h=Math.floor(m/60);
  if(h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

function region(lat,lng) {
  if(lat>66)  return 'Arctic';
  if(lat<-60) return 'Antarctic';
  if(lng>100&&lng<180&&lat>0)   return 'East Asia / Pacific';
  if(lng>60 &&lng<100&&lat>0)   return 'South / Central Asia';
  if(lng>25 &&lng<60 &&lat>10)  return 'Middle East / E.Africa';
  if(lng>-20&&lng<55 &&lat>-10) return 'Africa / Europe';
  if(lng>-80&&lng<-35)          return 'South America';
  if(lng>-140&&lng<-50&&lat>10) return 'North America';
  return 'International Waters';
}

function clamp(v,min=0,max=1){ return Math.min(max,Math.max(min,v)); }
function none(msg){ return `<div style="color:var(--dim);font-size:.7rem;padding:8px 0;font-style:italic">${msg}</div>`; }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function injectCSS(id, css) {
  if(document.getElementById(id)) return;
  const s=document.createElement('style');
  s.id=id; s.textContent=css;
  document.head.appendChild(s);
}
