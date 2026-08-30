// ════════════════════════════════════════════════════
// HECTAR — MAP — карта, слои, поиск мест, рисование поля, леса/зоны
// Файл сгенерирован автоматическим разбиением script.js
// См. PROJECT-MAP.md для описания структуры проекта
// ════════════════════════════════════════════════════

// ════════════════════════════════════════════════════
// КАРТА LEAFLET
// ════════════════════════════════════════════════════
let map, satelliteLayer, osmLayer, eoxLayer, drawnPolygons = {};
let countriesLayer = null, countryLabelsLayer = null, cityLabelsLayer = null;
let countriesGeoData = null, citiesGeoData = null;
let currentDrawPoints = [];
let tempPolyline = null, tempPolygon = null;
let currentLayer = 'satellite';
let isDrawing = false;
let isMeasureMode = false;
let currentMeasurePoints = [];
let currentFieldIdForPhotos = null;

// Лесной режим рисования
let _forestDrawMode = false;
let _forestTargetFieldId = null;
const forestPolygons = {};
let currentNoteFilter = 'all';
let searchDebounceTimer = null;
let searchMarker = null;
let searchAbortController = null;
let openModalId = null;

// Цвета для полей
const FIELD_COLORS = [BRAND.accent,'#FF9800','#2196F3','#E91E63','#9C27B0','#00BCD4','#FF5722','#FFEB3B'];
let selectedNewFieldColor = FIELD_COLORS[0];

// Инициализация карты
// FIX v3.0 п.1: автоматический переход на поля пользователя при загрузке.
// Если полей нет (или у них нет валидных координат) — карта остаётся на
// DEFAULT_MAP_CENTER (Астана), как и раньше, для нового пользователя.
function autoFitMapToUserFields() {
  if (!map) return;
  const fields = loadFields();
  if (!fields || fields.length === 0) return; // полей нет — остаёмся в Астане

  const boundsPoints = [];
  fields.forEach(f => {
    const coords = f.coordinates || f.coords;
    if (coords && coords.length > 0) {
      coords.forEach(p => {
        if (Array.isArray(p) && p.length >= 2 && isFinite(p[0]) && isFinite(p[1])) {
          boundsPoints.push([p[0], p[1]]);
        }
      });
    } else if (f.center && isFinite(f.center[0]) && isFinite(f.center[1])) {
      boundsPoints.push([f.center[0], f.center[1]]);
    }
  });

  if (boundsPoints.length === 0) return; // ни у одного поля нет валидных координат

  try {
    if (boundsPoints.length === 1) {
      // Одна точка (одно поле без контура, только center) — fitBounds не
      // сработает на единственной точке, поэтому просто центрируем с
      // разумным зумом уровня отдельного поля.
      map.setView(boundsPoints[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [60, 60], maxZoom: 16 });
    }
  } catch (e) {
    console.warn('autoFitMapToUserFields failed, staying on default center', e);
  }
}
function initMap() {
  map = L.map('map', {
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
    zoomControl: false,
    attributionControl: false,
    fadeAnimation: false,
    zoomAnimation: true,
    preferCanvas: true
  });

  // Satellite: ArcGIS (reliable, no key needed)
  satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { ...TILE_OPTS, detectRetina: false }
  );

  // FIXED #2: osmLayer is NOT created here — it is created lazily on first use in setMapLayer().
  // Creating both layers at init caused both to request tiles simultaneously in the background,
  // resulting in slow initial load and grey tile flicker.

  satelliteLayer.on('tileerror', function(e) {
    const tile = e.tile;
    if (!tile._satRetry) {
      tile._satRetry = 1;
      // Try ESRI clarity as fallback
      const esriUrl = `https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/${e.coords.z}/${e.coords.y}/${e.coords.x}`;
      setTimeout(() => { tile.src = esriUrl; }, 800);
    } else if (tile._satRetry === 1) {
      tile._satRetry = 2;
      // Last resort: retry original
      setTimeout(() => { tile.src = tile.src; }, 1500);
    }
  });

  satelliteLayer.addTo(map);

  // FIXED #2: Tile loading spinner — only satellite layer events registered here.
  // osmLayer events registered lazily in setMapLayer() on first switch.
  let tilesPending = 0;
  let _tileLoaderTimeout = null;
  function showTileLoader(msg) {
    const loader = document.getElementById('map-tile-loader');
    const txt = document.getElementById('map-tile-loader-text');
    if (!loader) return;
    tilesPending++;
    loader.style.display = 'flex';
    if (txt) txt.textContent = msg || (lang === 'ru' ? 'Загрузка карты…' : 'Loading map…');
    // FIXED #2: safety — always hide after 5 seconds
    clearTimeout(_tileLoaderTimeout);
    _tileLoaderTimeout = setTimeout(() => {
      tilesPending = 0;
      if (loader) loader.style.display = 'none';
    }, 5000);
  }
  function hideTileLoader() {
    tilesPending = Math.max(0, tilesPending - 1);
    if (tilesPending === 0) {
      clearTimeout(_tileLoaderTimeout);
      const loader = document.getElementById('map-tile-loader');
      if (loader) loader.style.display = 'none';
    }
  }
  satelliteLayer.on('loading', () => showTileLoader());
  satelliteLayer.on('load', () => hideTileLoader());
  satelliteLayer.on('tileerror', () => hideTileLoader());
  // Store for setMapLayer lazy registration
  map._showTileLoader = showTileLoader;
  map._hideTileLoader = hideTileLoader;

  loadMapGeoLayers();

  loadFields().forEach(field => addFieldToMap(field));

  // FIX v3.0 п.1: раньше карта при КАЖДОЙ загрузке жёстко стартовала с
  // DEFAULT_MAP_CENTER (Астана), даже если у пользователя уже есть свои
  // поля где-то ещё — приходилось вручную искать и перелетать к ним.
  // Теперь: если поля есть — сразу подгоняем вид карты под ВСЕ поля
  // пользователя (fitBounds по их контурам, с отступом); Астана остаётся
  // только запасным вариантом для нового пользователя без единого поля.
  autoFitMapToUserFields();

  map.on('click', onMapClick);
  // FIX 1.8: регистрируем mousemove для резиновой линии
  map.on('mousemove', onMapMouseMove);
  let labelTimer;
  map.on('zoomend moveend', () => {
    clearTimeout(labelTimer);
    labelTimer = setTimeout(updateMapLabels, 200);
  });
}
// Загрузка GeoJSON границ и населённых пунктов
async function loadMapGeoLayers() {
  countriesLayer = L.layerGroup().addTo(map);
  countryLabelsLayer = L.layerGroup().addTo(map);
  cityLabelsLayer = L.layerGroup().addTo(map);

  try {
    const countriesRes = await fetch(COUNTRIES_GEOJSON_URL);
    countriesGeoData = await countriesRes.json();

    L.geoJSON(countriesGeoData, {
      style: {
        color: 'rgba(255,255,255,0.35)',
        weight: 1,
        fillOpacity: 0
      },
      interactive: false
    }).addTo(countriesLayer);

    updateMapLabels();

    fetch(CITIES_GEOJSON_URL)
      .then(r => r.json())
      .then(data => { citiesGeoData = data; updateMapLabels(); })
      .catch(() => {});
  } catch (e) {
    console.warn('GeoJSON load failed', e);
  }
}
function getFeatureCenter(feature) {
  if (feature.geometry.type === 'Point') {
    const [lng, lat] = feature.geometry.coordinates;
    return [lat, lng];
  }
  try {
    const c = turf.centroid(feature);
    return [c.geometry.coordinates[1], c.geometry.coordinates[0]];
  } catch {
    return null;
  }
}
function updateMapLabels() {
  if (!map || !countriesGeoData) return;
  const zoom = map.getZoom();
  const bounds = map.getBounds();

  countryLabelsLayer.clearLayers();
  cityLabelsLayer.clearLayers();

  if (zoom >= 4) {
    countriesGeoData.features.forEach(f => {
      const name = f.properties?.name || f.properties?.NAME || f.properties?.ADMIN
        || f.properties?.name_long || f.properties?.formal_en;
      if (!name) return;
      const center = getFeatureCenter(f);
      if (!center || !bounds.contains(center)) return;
      const marker = L.marker(center, {
        icon: L.divIcon({
          className: '',
          html: `<div class="map-label-country" data-name="${escapeHtml(name)}">${escapeHtml(name)}</div>`,
          iconSize: [0, 0]
        }),
        interactive: true
      });
      marker.on('click', () => {
        map.setView(center, Math.max(zoom, 5));
        showToast(name);
      });
      marker.addTo(countryLabelsLayer);
    });
  }

  if (zoom >= 7 && citiesGeoData) {
    citiesGeoData.features.forEach(f => {
      const name = f.properties?.name || f.properties?.NAME || f.properties?.nameascii;
      const pop = f.properties?.POP_MAX || f.properties?.pop_max || f.properties?.pop_max || 0;
      if (!name) return;
      if (zoom < 9 && pop < 500000) return;
      if (zoom < 11 && pop < 100000) return;
      const center = getFeatureCenter(f);
      if (!center || !bounds.contains(center)) return;
      const marker = L.marker(center, {
        icon: L.divIcon({
          className: '',
          html: `<div class="map-label-city">${escapeHtml(name)}</div>`,
          iconSize: [0, 0]
        }),
        interactive: true
      });
      marker.on('click', () => {
        map.setView(center, Math.max(zoom, 10));
        showToast(name);
      });
      marker.addTo(cityLabelsLayer);
    });
  }
}
// ════════════════════════════════════════════════════
// ПОИСК (Photon + Nominatim fallback)
// ════════════════════════════════════════════════════
// ── Search history (localStorage) ────────────────────────────────────────────
const SEARCH_HISTORY_KEY = 'hectar-search-history';
const SEARCH_HISTORY_MAX = 3; // FIX 3.0: store up to 3 recent places

function loadSearchHistory() {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveSearchHistory(history) {
  try { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history)); }
  catch {}
}
function addToSearchHistory(item) {
  let history = loadSearchHistory();
  // Remove duplicate by name+lat+lon
  history = history.filter(h => !(h.name === item.name && h.lat === item.lat && h.lon === item.lon));
  history.unshift(item);
  if (history.length > SEARCH_HISTORY_MAX) history = history.slice(0, SEARCH_HISTORY_MAX);
  saveSearchHistory(history);
}
function removeFromSearchHistory(idx) {
  let history = loadSearchHistory();
  history.splice(idx, 1);
  saveSearchHistory(history);
  renderSearchHistory();
}
function clearSearchHistory() {
  saveSearchHistory([]);
  renderSearchHistory();
}
function renderSearchHistory() {
  const list = document.getElementById('search-results');
  if (!list) return;
  const history = loadSearchHistory();
  const isRu = lang === 'ru';

  if (!history.length) {
    list.innerHTML = `<li style="padding:16px 0;text-align:center;color:var(--text3);font-size:13px;">${isRu ? 'История поиска пуста' : 'Search history is empty'}</li>`;
    return;
  }

  list.innerHTML = `
    <li class="search-history-header" style="list-style:none;">
      <span class="search-history-title">${isRu ? '🕐 Недавние' : '🕐 Recent'}</span>
      <button class="search-history-clear" onclick="clearSearchHistory()">${isRu ? 'Очистить' : 'Clear'}</button>
    </li>
    ${history.map((h, idx) => `
    <li class="search-history-item" style="list-style:none;" onclick="selectSearchResult(${h.lat}, ${h.lon}, '${escapeHtml(h.name).replace(/'/g,"&#39;")}', {})">
      <svg class="search-history-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <div style="flex:1;min-width:0;">
        <div class="search-history-name">${escapeHtml(h.name)}</div>
        ${h.meta ? `<div class="search-history-meta">${escapeHtml(h.meta)}</div>` : ''}
      </div>
      <button class="search-history-delete" onclick="event.stopPropagation();removeFromSearchHistory(${idx})" title="${isRu ? 'Удалить' : 'Remove'}">×</button>
    </li>`).join('')}
  `;
}
function openSearchModal() {
  closeAllModals();
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  openModal('modal-search');
  renderSearchHistory();
  setTimeout(() => input && input.focus(), 200);
}
function formatPlaceLabel(props, fallback) {
  const parts = [props.name, props.city, props.state, props.country].filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.length ? unique.join(', ') : fallback;
}
function selectSearchResult(lat, lon, name, meta) {
  // Save to history
  const metaStr = typeof meta === 'object' && meta && meta.meta ? meta.meta : (typeof meta === 'string' ? meta : '');
  addToSearchHistory({ lat, lon, name, meta: metaStr });

  if (map) {
    const zoom = meta && meta.type === 'country' ? 5 : 12;
    map.setView([lat, lon], zoom);
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([lat, lon]).addTo(map)
      .bindPopup(`<div class="popup-name">${escapeHtml(name)}</div>`)
      .openPopup();
    setTimeout(() => map.invalidateSize(), 100);
  }
  closeAllModals();
  switchTab('map');
  showToast(name);
}
async function searchPlaces(query) {
  const list = document.getElementById('search-results');
  if (!list) return;

  if (!query || query.length < 2) {
    if (query) {
      list.innerHTML = `<li class="search-empty">${t('searchMinChars')}</li>`;
    } else {
      renderSearchHistory();
    }
    return;
  }

  if (searchAbortController) searchAbortController.abort();
  searchAbortController = new AbortController();
  const signal = searchAbortController.signal;

  list.innerHTML = `<li class="search-empty">${t('searching')}</li>`;

  // ── Поиск по своим полям (мгновенный, без сети) ──────────────────
  const myFields = loadFields();
  const ql = query.toLowerCase();
  const fieldMatches = myFields.filter(f =>
    f.name && f.name.toLowerCase().includes(ql)
  );

  let results = [];

  // Таймаут на каждый запрос (5 сек)
  function fetchWithTimeout(url, opts = {}, ms = 5000) {
    const tc = new AbortController();
    const timer = setTimeout(() => tc.abort(), ms);
    const combined = { ...opts };
    // Объединяем сигналы если есть
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => tc.abort());
    }
    return fetch(url, { ...combined, signal: tc.signal })
      .finally(() => clearTimeout(timer));
  }

  // Парсинг результатов Nominatim
  const parseNominatim = (data) => data.map(r => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    name: r.display_name.split(',')[0],
    meta: r.display_name,
    type: r.type
  }));

  // Парсинг результатов Photon
  const parsePhoton = (data) => (data.features || []).map(f => {
    const [lon, lat] = f.geometry.coordinates;
    const p = f.properties || {};
    const name = p.name || p.city || p.country || query;
    const meta = formatPlaceLabel(p, name);
    return { lat, lon, name, meta, type: p.type };
  });

  const nomQ = `format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&accept-language=${lang === 'ru' ? 'ru,en' : 'en,ru'}`;
  const photonQ = `q=${encodeURIComponent(query)}&limit=10&lang=${lang === 'ru' ? 'ru' : 'en'}`;

  // Источники с таймаутом 5 сек каждый
  const sources = [
    // 1. Nominatim напрямую (самый надёжный на ПК)
    async () => {
      const res = await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/search?${nomQ}`,
        { headers: { 'Accept': 'application/json' } }, 5000
      );
      if (!res.ok) throw new Error('nom_direct');
      const d = await res.json();
      if (!d.length) throw new Error('nom_empty');
      return parseNominatim(d);
    },
    // 2. Photon напрямую
    async () => {
      const res = await fetchWithTimeout(
        `https://photon.komoot.io/api/?${photonQ}`, {}, 5000
      );
      if (!res.ok) throw new Error('photon_direct');
      const d = await res.json();
      const r = parsePhoton(d);
      if (!r.length) throw new Error('photon_empty');
      return r;
    },
    // 3. Open-Meteo geocoding (работает без CORS проблем)
    async () => {
      const res = await fetchWithTimeout(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=${lang === 'ru' ? 'ru' : 'en'}&format=json`,
        {}, 5000
      );
      if (!res.ok) throw new Error('openmeteo_fail');
      const d = await res.json();
      const arr = d.results || [];
      if (!arr.length) throw new Error('openmeteo_empty');
      return arr.map(r => ({
        lat: r.latitude,
        lon: r.longitude,
        name: r.name,
        meta: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
        type: 'place'
      }));
    },
    // 4. Nominatim через corsproxy.io
    async () => {
      const inner = encodeURIComponent(`https://nominatim.openstreetmap.org/search?${nomQ}`);
      const res = await fetchWithTimeout(`https://corsproxy.io/?${inner}`, {}, 5000);
      if (!res.ok) throw new Error('proxy1_fail');
      const d = await res.json();
      if (!d.length) throw new Error('proxy1_empty');
      return parseNominatim(d);
    },
    // 5. Nominatim через api.allorigins.win
    async () => {
      const inner = encodeURIComponent(`https://nominatim.openstreetmap.org/search?${nomQ}`);
      const res = await fetchWithTimeout(`https://api.allorigins.win/get?url=${inner}`, {}, 5000);
      if (!res.ok) throw new Error('proxy2_fail');
      const wrapper = await res.json();
      const d = JSON.parse(wrapper.contents);
      if (!d.length) throw new Error('proxy2_empty');
      return parseNominatim(d);
    },
  ];

  try {
    results = await Promise.any(sources.map(fn => fn()));
  } catch (e) {
    if (e.name === 'AbortError' || (e.errors && e.errors.some(x => x.name === 'AbortError'))) return;
    // Если нет сетевых результатов, но есть поля — показываем только поля
    if (fieldMatches.length) {
      results = [];
    } else {
      list.innerHTML = `<li class="search-empty">${t('searchError')}</li>`;
      return;
    }
  }

  if (!results.length && !fieldMatches.length) {
    list.innerHTML = `<li class="search-empty">${t('noSearchResults')}</li>`;
    return;
  }

  list.innerHTML = '';

  // Показываем совпадения по своим полям в начале списка
  if (fieldMatches.length > 0) {
    const fieldHeader = document.createElement('li');
    fieldHeader.style.cssText = 'padding:4px 14px;font-size:10px;font-weight:700;color:var(--accent);letter-spacing:0.06em;text-transform:uppercase;pointer-events:none;';
    fieldHeader.textContent = lang === 'ru' ? '<i data-lucide="map-pin" class="icon-sm"></i> Мои поля' : '<i data-lucide="map-pin" class="icon-sm"></i> My Fields';
    list.appendChild(fieldHeader);

    fieldMatches.forEach(field => {
      const center = field.center ||
        (field.coordinates && field.coordinates.length
          ? [field.coordinates.reduce((s,c)=>s+c[0],0)/field.coordinates.length,
             field.coordinates.reduce((s,c)=>s+c[1],0)/field.coordinates.length]
          : null);
      if (!center) return;
      const li = document.createElement('li');
      li.className = 'search-result-item';
      li.innerHTML = `<div class="place-name"><i data-lucide="wheat" class="icon-sm"></i> ${escapeHtml(field.name)}</div><div class="place-meta">${field.crop ? cropDisplayName(field.crop) + ' · ' : ''}${formatArea(field.area)}</div>`;
      li.addEventListener('click', () => {
        closeAllModals();
        switchTab('map');
        if (map) map.setView([center[0], center[1]], 15);
        setTimeout(() => openFieldDetail(field.id), 300);
      });
      list.appendChild(li);
    });

    if (results.length > 0) {
      const sep = document.createElement('li');
      sep.style.cssText = 'padding:4px 14px;font-size:10px;font-weight:700;color:var(--text3);letter-spacing:0.06em;text-transform:uppercase;pointer-events:none;';
      sep.textContent = lang === 'ru' ? '<i data-lucide="map" class="icon-sm"></i>️ Места на карте' : '<i data-lucide="map" class="icon-sm"></i>️ Places';
      list.appendChild(sep);
    }
  }

  results.forEach(r => {
    const li = document.createElement('li');
    li.className = 'search-result-item';
    li.setAttribute('role', 'option');
    li.innerHTML = `<div class="place-name">${escapeHtml(r.name)}</div><div class="place-meta">${escapeHtml(r.meta)}</div>`;
    li.addEventListener('click', () => selectSearchResult(r.lat, r.lon, r.name, r));
    list.appendChild(li);
  });

  if (!fieldMatches.length && !results.length) {
    list.innerHTML = `<li class="search-empty">${t('noSearchResults')}</li>`;
  }
}
// Переключить слой карты
// FIXED #2: osmLayer is created lazily here on first switch to avoid background tile loading
let _osmLayerReady = false;
function _ensureOsmLayer() {
  if (_osmLayerReady) return;
  _osmLayerReady = true;
  // Create OSM layer now (lazy)
  // FIX: Use CartoCDN as primary (more reliable), OSM as fallback
  osmLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    { ...TILE_OPTS, subdomains: ['a','b','c','d'], detectRetina: false, maxNativeZoom: 19, maxZoom: 19, r: '' }
  );
  // FIX: On tile error — fallback to OSM then Stadia
  osmLayer.on('tileerror', function(e) {
    const tile = e.tile;
    if (!tile._retryCount) tile._retryCount = 0;
    if (tile._retryCount < 2) {
      tile._retryCount++;
      const fallbacks = [
        `https://a.tile.openstreetmap.org/${e.coords.z}/${e.coords.x}/${e.coords.y}.png`,
        `https://b.tile.openstreetmap.org/${e.coords.z}/${e.coords.x}/${e.coords.y}.png`,
      ];
      const url = fallbacks[(tile._retryCount - 1) % fallbacks.length];
      setTimeout(() => { if (tile.src !== url) tile.src = url; }, 500 * tile._retryCount);
    }
  });
  // Register spinner events only now
  if (map._showTileLoader) {
    osmLayer.on('loading', () => map._showTileLoader());
    osmLayer.on('load',    () => map._hideTileLoader());
    osmLayer.on('tileerror', () => map._hideTileLoader());
  }
}
// EOX Sentinel-2 Cloudless — официальный бесплатный сервис ESA, снимки 2023, 10м/пкс
let _eoxLayerReady = false;
function _ensureEoxLayer() {
  if (_eoxLayerReady) return;
  _eoxLayerReady = true;
  // tiles.maps.eox.at — актуальный хост EOX (s2maps-tiles.eu устарел)
  // Слой s2cloudless-2024_3857 — последний доступный годовой мозаик 10м/пкс
  eoxLayer = L.tileLayer(
    'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg',
    {
      ...TILE_OPTS,
      maxNativeZoom: 14,
      maxZoom: 18,
      attribution: '<a href="https://s2maps.eu" target="_blank">Sentinel-2 cloudless 2024</a> &copy; <a href="https://eox.at" target="_blank">EOX IT Services GmbH</a> (Copernicus Sentinel data 2024)'
    }
  );
  if (map._showTileLoader) {
    eoxLayer.on('loading', () => map._showTileLoader());
    eoxLayer.on('load',    () => map._hideTileLoader());
    eoxLayer.on('tileerror', () => map._hideTileLoader());
  }
}
function setMapLayer(type) {
  // Remove all base layers
  if (osmLayer && map.hasLayer(osmLayer)) osmLayer.removeFrom(map);
  if (eoxLayer && map.hasLayer(eoxLayer)) eoxLayer.removeFrom(map);
  if (map.hasLayer(satelliteLayer)) satelliteLayer.removeFrom(map);

  if (type === 'satellite') {
    satelliteLayer.addTo(map);
  } else if (type === 'eox') {
    _ensureEoxLayer();
    eoxLayer.addTo(map);
    setTimeout(() => { map.invalidateSize(); eoxLayer.redraw(); }, 100);
  } else {
    _ensureOsmLayer();
    osmLayer.addTo(map);
    setTimeout(() => { map.invalidateSize(); osmLayer.redraw(); }, 100);
  }
  currentLayer = type;
  ['satellite','osm','eox'].forEach(t => {
    const btn = document.getElementById(`layer-btn-${t}`);
    if (btn) btn.classList.toggle('active', t === type);
  });
}
// Геолокация с синей точкой и watchPosition
let _geoWatchId = null;
let _geoMarker = null;
let _geoAccCircle = null;

function geolocate() {
  if (!navigator.geolocation) { showToast(t('geolocateUnavailable')); return; }

  // Запрашиваем разрешение через navigator.geolocation
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = pos.coords.accuracy;

    // Центрируем карту
    map.setView([lat, lng], 15);

    // Создаём синюю точку если не существует
    if (!_geoMarker) {
      const blueIcon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#2979ff;border:3px solid #fff;box-shadow:0 0 8px rgba(41,121,255,0.6);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      _geoMarker = L.marker([lat, lng], { icon: blueIcon, zIndexOffset: 1000 }).addTo(map);
      _geoAccCircle = L.circle([lat, lng], {
        radius: acc,
        color: '#2979ff',
        fillColor: '#2979ff',
        fillOpacity: 0.08,
        weight: 1
      }).addTo(map);
    }

    // Запускаем watchPosition для отслеживания движения
    if (_geoWatchId !== null) navigator.geolocation.clearWatch(_geoWatchId);
    _geoWatchId = navigator.geolocation.watchPosition(wpos => {
      const wlat = wpos.coords.latitude;
      const wlng = wpos.coords.longitude;
      const wacc = wpos.coords.accuracy;
      if (_geoMarker) _geoMarker.setLatLng([wlat, wlng]);
      if (_geoAccCircle) { _geoAccCircle.setLatLng([wlat, wlng]); _geoAccCircle.setRadius(wacc); }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 5000 });

  }, () => showToast(t('geolocateFailed')), { enableHighAccuracy: true });
}
// Добавить поле на карту
function addFieldToMap(field) {
  if (!field.coordinates || field.coordinates.length < 3) return;
  const latlngs = field.coordinates.map(c => [c[0], c[1]]);
  const polygon = L.polygon(latlngs, {
    color: field.color || BRAND.accent,
    fillColor: field.color || BRAND.accent,
    fillOpacity: 0.25,
    weight: 2
  }).addTo(map);

  // Попап при клике — FIX 2.4: не показываем информацию о поле во время рисования/измерения
  polygon.on('click', (e) => {
    if (isDrawing || isMeasureMode) return; // блокируем во время активного режима
    const ndvi = estimateFieldNdvi(field);
    const health = getHealthStatus(ndvi);
    const ndviColor = getNdviColor(ndvi);
    const colorDot = field.color || BRAND.accent;
    const popupContent = `
      <div class="agri-popup-inner">
        <div class="agri-popup-header">
          <span class="agri-popup-dot" style="background:${colorDot};"></span>
          <span class="agri-popup-name">${escapeHtml(field.name)}</span>
          <button class="agri-popup-close" onclick="map.closePopup()" title="Закрыть">✕</button>
        </div>
        <div class="agri-popup-rows">
          <div class="agri-popup-row">
            <span class="agri-popup-icon"><i data-lucide="sprout" class="icon-sm"></i></span>
            <span>${field.crop ? cropDisplayName(field.crop) : (lang === 'ru' ? 'Без культуры' : 'No crop')}</span>
          </div>
          <div class="agri-popup-row">
            <span class="agri-popup-icon">📐</span>
            <span>${formatArea(field.area)} &nbsp;·&nbsp; ${field.perimeter} ${t('km')}</span>
          </div>
          <div class="agri-popup-row">
            <span class="agri-popup-icon">🌿</span>
            <span style="color:${ndviColor};font-weight:600;">NDVI ${ndvi} · ${health.label} <span class="ndvi-estimated-badge" title="${lang === 'ru' ? 'Расчётная модель, не спутниковое измерение' : 'Modeled estimate, not a satellite measurement'}">${lang === 'ru' ? '~оценка' : '~est.'}</span></span>
          </div>
        </div>
        <button class="agri-popup-btn" onclick="map.closePopup(); switchTab('fields'); setTimeout(() => openFieldDetail('${escapeHtml(field.id)}'), 150);">
          ${lang === 'ru' ? 'Подробнее' : 'View details'}
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="margin-left:4px;"><polyline points="9,18 15,12 9,6"/></svg>
        </button>
      </div>
    `;
    L.popup({ className: 'agri-popup', maxWidth: 260, minWidth: 220, offset: [0, -6] })
      .setLatLng([field.center[0], field.center[1]])
      .setContent(popupContent)
      .openOn(map);
  });

  // Подпись на поле
  const center = L.latLng(field.center[0], field.center[1]);
  const labelMarker = L.marker(center, {
    icon: L.divIcon({
      className: '',
      html: `<div style="color:#fff;font-size:12px;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.8);white-space:nowrap;">${escapeHtml(field.name)}</div>`,
      iconAnchor: [0, 0]
    })
  }).addTo(map);

  drawnPolygons[field.id] = polygon;
  // Сохраняем метку отдельно чтобы удалить её вместе с полем
  drawnPolygons[field.id + '_label'] = labelMarker;
  // Нарисовать лесные зоны поля если есть
  renderForestPolygonsForField(field);
}
// ════════════════════════════════════════════════════
// РЕЖИМ РИСОВАНИЯ ПОЛЯ
// ════════════════════════════════════════════════════
function setDrawModeActive(active) {
  const screenMap = document.getElementById('screen-map');
  const drawUi = document.getElementById('draw-mode-ui');
  const hint = document.getElementById('draw-hint');
  if (screenMap) screenMap.classList.toggle('draw-active', active);
  if (drawUi) drawUi.classList.toggle('active', active);
  if (hint) hint.classList.toggle('visible', active);
  document.getElementById('btn-add-field-map').style.display = active ? 'none' : '';
}
function startDrawMode() {
  // FIX: switch to map tab FIRST so screen-map is visible before draw UI activates
  switchTab('map');
  closeAllModals();
  isDrawing = true;
  currentDrawPoints = [];
  // FIX: activate draw UI after switchTab (switchTab cancel-block only fires for non-map tabs, safe here)
  setDrawModeActive(true);
  clearTempDrawLayers();
  updateDrawArea();
  // FIX: ensure draw-mode-ui is shown and Add Field btn is hidden (guard against race)
  const drawUi = document.getElementById('draw-mode-ui');
  if (drawUi) drawUi.classList.add('active');
  const addBtn = document.getElementById('btn-add-field-map');
  if (addBtn) addBtn.style.display = 'none';
}
function cancelDrawMode() {
  isDrawing = false;
  isMeasureMode = false;
  currentDrawPoints = [];
  currentMeasurePoints = [];
  if (window._rulerLine) { map.removeLayer(window._rulerLine); window._rulerLine = null; }
  if (window._rulerMarkers) { window._rulerMarkers.forEach(m => map.removeLayer(m)); window._rulerMarkers = []; }
  clearRubberBand(); // FIX 1.8
  setDrawModeActive(false);
  clearTempDrawLayers();
  hideIntersectError();
  // Сброс лесного режима если был активен
  if (_forestDrawMode) cancelForestDraw();
}
// FIX 1.8: переменные для резиновой линии (preview от последней точки до курсора)
let rubberBandLine = null;
let rafPending = false;

// FIX 1.8: обработчик движения мыши/пальца для резиновой линии
function onMapMouseMove(e) {
  if (!isDrawing || currentDrawPoints.length === 0) return;
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    if (!isDrawing || currentDrawPoints.length === 0) return;
    const last = currentDrawPoints[currentDrawPoints.length - 1];
    const cur = [e.latlng.lat, e.latlng.lng];
    if (rubberBandLine) {
      rubberBandLine.setLatLngs([last, cur]);
    } else {
      rubberBandLine = L.polyline([last, cur], {
        color: BRAND.accent, weight: 2, dashArray: '4,4', opacity: 0.7,
        interactive: false
      }).addTo(map);
    }
    // FIX 1.8: обновляем площадь в реальном времени
    updateDrawAreaLive(cur);
  });
}
// FIX 1.8: очистить резиновую линию
function clearRubberBand() {
  if (rubberBandLine) { map.removeLayer(rubberBandLine); rubberBandLine = null; }
}
// FIX 1.8: обновление площади с предварительной точкой (курсором)
function updateDrawAreaLive(previewPoint) {
  const label = document.getElementById('draw-area-label');
  if (!label) return;
  const pts = previewPoint ? [...currentDrawPoints, previewPoint] : currentDrawPoints;
  if (pts.length >= 3) {
    const coords = [...pts, pts[0]];
    try {
      const poly = turf.polygon([coords.map(c => [c[1], c[0]])]);
      const areaHa = turf.area(poly) / 10000;
      const areaKm = areaHa / 100;
      // FIX: Always show km² first, then ha in parentheses
      label.textContent = `${areaKm.toFixed(2)} ${lang === 'ru' ? 'км²' : 'km²'} (${areaHa.toFixed(1)} ${lang === 'ru' ? 'га' : 'ha'})`;
    } catch(_) {}
  }
}
// FIX 1.8: clearTempDrawLayers — также убирает резиновую линию и сохраняет глобальный mousemove
function clearTempDrawLayers() {
  if (!map) return;
  clearRubberBand(); // FIX 1.8: убираем резиновую линию
  if (tempPolyline) { map.removeLayer(tempPolyline); tempPolyline = null; }
  if (tempPolygon) { map.removeLayer(tempPolygon); tempPolygon = null; }
  const toRemove = [];
  map.eachLayer(l => { if (l._drawTemp) toRemove.push(l); });
  toRemove.forEach(l => map.removeLayer(l));
  // FIX 1.8: убираем только перетаскивание вершин, но НЕ глобальный mousemove
  map.off('mouseup touchend');
  // FIX 1.8: восстанавливаем глобальный mousemove для rubber band
  map.off('mousemove'); // сброс всех слушателей mousemove
  map.on('mousemove', onMapMouseMove); // и восстанавливаем наш
}
function onMapClick(e) {
  if (typeof tractorActive !== 'undefined' && tractorActive) {
    updateTractorLocation([e.latlng.lat, e.latlng.lng]);
    return;
  }
  // Ruler / measure mode — unlimited points, shows segment + total distance
  if (isMeasureMode) {
    const pt = [e.latlng.lat, e.latlng.lng];
    currentMeasurePoints.push(pt);
    if (!window._rulerMarkers) window._rulerMarkers = [];

    // Draw marker for this point
    const isFirst = currentMeasurePoints.length === 1;
    const marker = L.circleMarker([pt[0], pt[1]], {
      radius: isFirst ? 6 : 5,
      color: '#FFD700',
      fillColor: isFirst ? '#FF8C00' : '#FFD700',
      fillOpacity: 1,
      weight: 2
    }).addTo(map);
    window._rulerMarkers.push(marker);

    if (currentMeasurePoints.length === 1) {
      const hint = document.getElementById('draw-hint');
      if (hint) hint.textContent = lang === 'ru'
        ? 'Добавляйте точки — маршрут накапливается. Кнопка сброса — "Отменить"'
        : 'Keep adding points — route accumulates. Use "Undo" to reset';
    }

    if (currentMeasurePoints.length >= 2) {
      // Redraw full polyline through all points
      if (window._rulerLine) map.removeLayer(window._rulerLine);
      window._rulerLine = L.polyline(currentMeasurePoints, {
        color: '#FFD700', weight: 2.5, dashArray: '8,5', opacity: 0.95
      }).addTo(map);

      // Compute total distance along all segments
      const line = turf.lineString(currentMeasurePoints.map(c => [c[1], c[0]]));
      const totalKm = turf.length(line, { units: 'kilometers' });

      // Also compute last segment distance
      const lastTwo = currentMeasurePoints.slice(-2);
      const segLine = turf.lineString(lastTwo.map(c => [c[1], c[0]]));
      const segKm = turf.length(segLine, { units: 'kilometers' });

      const label = document.getElementById('draw-area-label');
      if (label) {
        const fmtKm = (km) => km >= 1
          ? km.toFixed(3) + (lang === 'ru' ? ' км' : ' km')
          : (km * 1000).toFixed(0) + (lang === 'ru' ? ' м' : ' m');
        const n = currentMeasurePoints.length;
        if (n === 2) {
          label.textContent = fmtKm(totalKm);
        } else {
          label.textContent = `${fmtKm(totalKm)} (${lang === 'ru' ? 'последний' : 'seg'}: ${fmtKm(segKm)})`;
        }
      }
    }
    return;
  }
  if (!isDrawing) return;
  // FIX 1.8: моментально убираем резиновую линию при клике (новая точка)
  clearRubberBand();
  currentDrawPoints.push([e.latlng.lat, e.latlng.lng]);
  updateTempDraw();
  updateDrawArea();
  document.getElementById('draw-hint')?.classList.remove('visible');

  // Real-time intersection check
  if (currentDrawPoints.length >= 4) {
    if (checkPolygonSelfIntersects(currentDrawPoints)) {
      showIntersectError();
      if (tempPolygon) tempPolygon.setStyle({ color: '#ef5350', fillColor: '#ef5350' });
      if (tempPolyline) tempPolyline.setStyle({ color: '#ef5350' });
    } else {
      hideIntersectError();
      if (tempPolygon) tempPolygon.setStyle({ color: BRAND.accent, fillColor: BRAND.accent });
      if (tempPolyline) tempPolyline.setStyle({ color: BRAND.accent });
    }
  }
}
function updateTempDraw() {
  clearTempDrawLayers();

  if (currentDrawPoints.length >= 2) {
    tempPolyline = L.polyline(currentDrawPoints, {
      color: BRAND.accent, weight: 2.5, dashArray: '6,4', opacity: 0.9
    }).addTo(map);
  }
  if (currentDrawPoints.length >= 3) {
    tempPolygon = L.polygon(currentDrawPoints, {
      color: BRAND.accent, fillColor: BRAND.accent, fillOpacity: 0.18, weight: 2.5
    }).addTo(map);
  }

  // Перетаскиваемые вершины
  currentDrawPoints.forEach((pt, idx) => {
    const m = L.circleMarker(pt, {
      radius: 8, color: '#fff', fillColor: BRAND.accent, fillOpacity: 1, weight: 2.5,
      interactive: true, bubblingMouseEvents: false
    }).addTo(map);
    m._drawTemp = true;
    m._drawIdx = idx;

    // Поддержка перетаскивания на мобильных и десктопе
    let dragging = false;
    m.on('mousedown touchstart', (e) => {
      dragging = true;
      map.dragging.disable();
      L.DomEvent.stopPropagation(e);
    });
    map.off('mousemove touchmove');
    map.off('mouseup touchend');
    map.on('mousemove touchmove', (e) => {
      if (!dragging) return;
      const latlng = e.latlng || map.mouseEventToLatLng(e.originalEvent?.touches?.[0] || e.originalEvent);
      if (!latlng) return;
      currentDrawPoints[idx] = [latlng.lat, latlng.lng];
      m.setLatLng(latlng);
      updateTempDrawLive();
      updateDrawArea();
    });
    map.on('mouseup touchend', () => {
      if (dragging) {
        dragging = false;
        map.dragging.enable();
        updateTempDraw();
        updateDrawArea();
      }
    });
  });
}
function updateTempDrawLive() {
  if (tempPolyline) tempPolyline.setLatLngs(currentDrawPoints);
  if (tempPolygon) tempPolygon.setLatLngs(currentDrawPoints);
}
function updateDrawArea() {
  const label = document.getElementById('draw-area-label');
  if (currentDrawPoints.length >= 3) {
    const coords = [...currentDrawPoints, currentDrawPoints[0]];
    const poly = turf.polygon([coords.map(c => [c[1], c[0]])]);
    const area = turf.area(poly) / 10000;
    const line = turf.lineString(coords.map(c => [c[1], c[0]]));
    const perim = turf.length(line, { units: 'kilometers' });
    // FIX: Always km² first, then ha, then perimeter
    const areaKm2 = area / 100;
    label.textContent = `${areaKm2.toFixed(2)} ${lang === 'ru' ? 'км²' : 'km²'} (${area.toFixed(1)} ${lang === 'ru' ? 'га' : 'ha'})`;
  } else if (currentDrawPoints.length === 2) {
    const line = turf.lineString(currentDrawPoints.map(c => [c[1], c[0]]));
    const dist = turf.length(line, { units: 'kilometers' });
    label.textContent = `${(dist * 1000).toFixed(0)} ${lang === 'ru' ? 'м' : 'm'}`;
  } else {
    label.textContent = '';
  }
}
function undoLastPoint() {
  // Measure/ruler mode: remove last point and redraw
  if (isMeasureMode) {
    if (currentMeasurePoints.length === 0) return;
    currentMeasurePoints.pop();
    // Remove last marker
    if (window._rulerMarkers && window._rulerMarkers.length > 0) {
      const lastMarker = window._rulerMarkers.pop();
      map.removeLayer(lastMarker);
    }
    // Redraw line
    if (window._rulerLine) { map.removeLayer(window._rulerLine); window._rulerLine = null; }
    if (currentMeasurePoints.length >= 2) {
      window._rulerLine = L.polyline(currentMeasurePoints, {
        color: '#FFD700', weight: 2.5, dashArray: '8,5', opacity: 0.95
      }).addTo(map);
      const line = turf.lineString(currentMeasurePoints.map(c => [c[1], c[0]]));
      const totalKm = turf.length(line, { units: 'kilometers' });
      const fmtKm = (km) => km >= 1
        ? km.toFixed(3) + (lang === 'ru' ? ' км' : ' km')
        : (km * 1000).toFixed(0) + (lang === 'ru' ? ' м' : ' m');
      const label = document.getElementById('draw-area-label');
      if (label) {
        const n = currentMeasurePoints.length;
        if (n === 2) {
          label.textContent = fmtKm(totalKm);
        } else {
          const lastTwo = currentMeasurePoints.slice(-2);
          const segKm = turf.length(turf.lineString(lastTwo.map(c => [c[1], c[0]])), { units: 'kilometers' });
          label.textContent = `${fmtKm(totalKm)} (${lang === 'ru' ? 'последний' : 'seg'}: ${fmtKm(segKm)})`;
        }
      }
    } else {
      const label = document.getElementById('draw-area-label');
      if (label) label.textContent = '';
    }
    if (currentMeasurePoints.length === 0) {
      const hint = document.getElementById('draw-hint');
      if (hint) hint.textContent = lang === 'ru' ? 'Нажимайте на карту, чтобы добавить точки маршрута' : 'Tap on map to add route points';
    }
    return;
  }
  if (currentDrawPoints.length > 0) {
    currentDrawPoints.pop();
    updateTempDraw();
    updateDrawArea();
    if (currentDrawPoints.length === 0) {
      document.getElementById('draw-hint')?.classList.add('visible');
    }
    // Re-check intersections after undo
    if (currentDrawPoints.length >= 4 && checkPolygonSelfIntersects(currentDrawPoints)) {
      showIntersectError();
    } else {
      hideIntersectError();
      if (tempPolygon) tempPolygon.setStyle({ color: BRAND.accent, fillColor: BRAND.accent });
      if (tempPolyline) tempPolyline.setStyle({ color: BRAND.accent });
    }
  }
}
function setDrawModeDraw() {
  document.getElementById('draw-draw-btn').classList.add('active');
  document.getElementById('draw-select-btn').classList.remove('active');
  // FIX 2.4: fully clear measure mode before starting draw mode
  isMeasureMode = false;
  currentMeasurePoints = [];
  if (window._rulerLine) { map.removeLayer(window._rulerLine); window._rulerLine = null; }
  if (window._rulerMarkers) { window._rulerMarkers.forEach(m => map.removeLayer(m)); window._rulerMarkers = []; }
  // Reset draw points too for a clean slate
  currentDrawPoints = [];
  clearTempDrawLayers();
  isDrawing = true;
  updateDrawArea();
  const hint = document.getElementById('draw-hint');
  if (hint) { hint.textContent = lang === 'ru' ? 'Нажмите на карту, чтобы добавить точки' : 'Tap on map to add points'; hint.classList.add('visible'); }
}
function setDrawModeSelect() {
  document.getElementById('draw-select-btn').classList.add('active');
  document.getElementById('draw-draw-btn').classList.remove('active');
  // FIX 2.4: fully clear draw mode before starting measure mode
  isDrawing = false;
  currentDrawPoints = [];
  clearTempDrawLayers();
  // Activate ruler/measure mode
  isMeasureMode = true;
  currentMeasurePoints = [];
  if (window._rulerLine) { map.removeLayer(window._rulerLine); window._rulerLine = null; }
  if (window._rulerMarkers) { window._rulerMarkers.forEach(m => map.removeLayer(m)); window._rulerMarkers = []; }
  const label = document.getElementById('draw-area-label');
  if (label) label.textContent = '';
  const hint = document.getElementById('draw-hint');
  if (hint) hint.textContent = lang === 'ru' ? 'Нажимайте на карту, чтобы добавить точки маршрута' : 'Tap on map to add route points';
  hint && hint.classList.add('visible');
}
// ════════════════════════════════════════════════════
// ВАЛИДАЦИЯ САМОПЕРЕСЕЧЕНИЙ ПОЛИГОНА
// ════════════════════════════════════════════════════
function doSegmentsIntersect(p1, p2, p3, p4) {
  // Check if segment p1-p2 intersects segment p3-p4 (excluding shared endpoints)
  function cross(o, a, b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  }
  function onSegment(p, q, r) {
    return q[0] <= Math.max(p[0], r[0]) && q[0] >= Math.min(p[0], r[0]) &&
           q[1] <= Math.max(p[1], r[1]) && q[1] >= Math.min(p[1], r[1]);
  }
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  if (d1 === 0 && onSegment(p3, p1, p4)) return true;
  if (d2 === 0 && onSegment(p3, p2, p4)) return true;
  if (d3 === 0 && onSegment(p1, p3, p2)) return true;
  if (d4 === 0 && onSegment(p1, p4, p2)) return true;
  return false;
}
function checkPolygonSelfIntersects(pts) {
  // Close the polygon
  const closed = [...pts, pts[0]];
  const n = closed.length - 1; // number of edges
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      // Skip adjacent edges (they share an endpoint)
      if (i === 0 && j === n - 1) continue;
      if (doSegmentsIntersect(closed[i], closed[i + 1], closed[j], closed[j + 1])) {
        return true;
      }
    }
  }
  return false;
}
let intersectErrorTimer = null;
function showIntersectError() {
  const el = document.getElementById('draw-intersect-error');
  if (!el) return;
  el.classList.add('visible');
  clearTimeout(intersectErrorTimer);
  intersectErrorTimer = setTimeout(() => el.classList.remove('visible'), 3000);
}
function hideIntersectError() {
  const el = document.getElementById('draw-intersect-error');
  if (el) el.classList.remove('visible');
}
// Завершить рисование → открыть модалку сохранения
// (или завершить обводку леса если активен лесной режим)
function finishDrawing() {
  if (_forestDrawMode) {
    finishForestDrawing();
    return;
  }
  if (currentDrawPoints.length < 3) {
    showToast(t('minPoints'));
    return;
  }

  // <i data-lucide="arrow-right" class="icon-sm"></i> Validate: no self-intersections
  if (checkPolygonSelfIntersects(currentDrawPoints)) {
    showIntersectError();
    showToast(lang === 'ru' ? 'Линии не должны пересекаться' : 'Lines must not intersect');
    // Highlight the polygon red to signal the error
    if (tempPolygon) {
      tempPolygon.setStyle({ color: '#ef5350', fillColor: '#ef5350' });
      setTimeout(() => {
        if (tempPolygon) tempPolygon.setStyle({ color: BRAND.accent, fillColor: BRAND.accent });
      }, 2500);
    }
    return; // Prevent saving
  }

  hideIntersectError();
  clearTempDrawLayers();

  // Вычислить площадь и периметр
  const coords = [...currentDrawPoints, currentDrawPoints[0]];
  const poly = turf.polygon([coords.map(c => [c[1], c[0]])]);
  const area = (turf.area(poly) / 10000).toFixed(1);
  const line = turf.lineString(coords.map(c => [c[1], c[0]]));
  const perim = (turf.length(line, { units: 'kilometers' })).toFixed(2);

  window._pendingFieldData = {
    coords: currentDrawPoints,
    area: parseFloat(area),
    perimeter: parseFloat(perim),
    center: turf.center(poly).geometry.coordinates.reverse()
  };

  // Предзаполнить название поля
  const fields = loadFields();
  document.getElementById('new-field-name').value = `${t('field')} ${fields.length + 1}`;

  // Цвет по умолчанию
  selectedNewFieldColor = FIELD_COLORS[fields.length % FIELD_COLORS.length];
  renderColorPicker('new-field-colors', selectedNewFieldColor, (c) => { selectedNewFieldColor = c; });
  populateCropSelect(document.getElementById('new-field-crop'));

  openModal('modal-save-field');
  setDrawModeActive(false);
  isDrawing = false;
}
/**
 * Запускает режим рисования для обводки леса.
 */
function startForestDraw(fieldId) {
  _forestDrawMode = true;
  _forestTargetFieldId = fieldId;

  // Переключить на вкладку карты и запустить рисование
  closeFieldDetail();
  switchTab('map');

  // Небольшая задержка — дать Leaflet отрисоваться
  setTimeout(() => {
    // FIX 2: Центрируем карту на поле перед началом рисования
    const _allFields = loadFields();
    const _tgtField = _allFields.find(f => f.id === fieldId) || _allFields[0];
    if (_tgtField && _tgtField.center && map) {
      map.setView([_tgtField.center[0], _tgtField.center[1]], Math.max(map.getZoom(), 14));
    }

    startDrawMode();

    // Заменить подсказку
    const hint = document.getElementById('draw-hint');
    if (hint) {
      hint.textContent = lang === 'ru'
        ? '🌲 Обведите лес. Нажимайте точки по контуру.'
        : '🌲 Outline the forest. Tap to add points.';
      hint.classList.add('forest-hint');
    }

    // Изменить цвет кнопки "Finish" чтобы отличать режимы
    const finishBtn = document.getElementById('btn-finish-draw');
    if (finishBtn) {
      finishBtn.style.background = '#388E3C';
      const lbl = finishBtn.querySelector('[data-i18n="finishShort"]') || finishBtn;
      lbl.textContent = lang === 'ru' ? 'Сохранить лес' : 'Save forest';
    }

    showToast(lang === 'ru' ? '🌲 Режим обводки леса' : '🌲 Forest drawing mode');
  }, 200);
}
/**
 * Завершить рисование леса — вычислить площадь и вычесть из поля.
 * Вызывается вместо finishDrawing() когда _forestDrawMode === true.
 */
function finishForestDrawing() {
  if (currentDrawPoints.length < 3) {
    showToast(t('minPoints'));
    return;
  }

  // Проверить самопересечения
  if (checkPolygonSelfIntersects(currentDrawPoints)) {
    showIntersectError();
    showToast(lang === 'ru' ? 'Линии не должны пересекаться' : 'Lines must not intersect');
    return;
  }

  hideIntersectError();

  // Посчитать площадь леса
  const coords = [...currentDrawPoints, currentDrawPoints[0]];
  const poly = turf.polygon([coords.map(c => [c[1], c[0]])]);
  const forestArea = parseFloat((turf.area(poly) / 10000).toFixed(2));

  // Загрузить поля, найти нужное
  const fields = loadFields();
  const field = fields.find(f => f.id === _forestTargetFieldId);
  if (!field) {
    showToast(lang === 'ru' ? 'Поле не найдено' : 'Field not found');
    cancelForestDraw();
    return;
  }

  if (!field.forests) field.forests = [];

  // Ограничение: лес не может быть >= площади поля
  const totalForestSoFar = field.forests.reduce((s, fz) => s + fz.area, 0);
  if (totalForestSoFar + forestArea >= field.area) {
    showToast(lang === 'ru'
      ? '⚠ Площадь лесов не может превышать площадь поля'
      : '⚠ Forest area cannot exceed field area');
    return;
  }

  const newForest = {
    id: generateId(),
    area: forestArea,
    coordinates: currentDrawPoints,
    zoneType: _forestZoneType || 'forest'
  };
  field.forests.push(newForest);
  saveFields(fields);

  // Нарисовать зону на карте (цвет зависит от типа)
  const zoneColors = { road: '#795548', water: '#1565C0', building: '#37474F', forest: BRAND.accent2 };
  const zoneFill = { road: '#6D4C41', water: '#1976D2', building: '#455A64', forest: BRAND.accentDark };
  const zoneType = newForest.zoneType || 'forest';
  const forestKey = field.id + '_forest_' + newForest.id;
  const leafletCoords = currentDrawPoints.map(c => [c[0], c[1]]);
  const poly2 = L.polygon(leafletCoords, {
    color: zoneColors[zoneType] || zoneColors.forest,
    fillColor: zoneFill[zoneType] || zoneFill.forest,
    fillOpacity: 0.45,
    weight: 2,
    dashArray: '6,4'
  }).addTo(map);
  const zoneIcons = { road: '🛤️', water: '<i data-lucide="droplets" class="icon-sm"></i>', building: '🏗️', forest: '🌲' };
  poly2.bindTooltip(`${zoneIcons[zoneType] || '🌲'} ${forestArea.toFixed(2)} ${getAreaUnit()}`, { permanent: false });
  // FIX v3.0 п.1: Разрешаем клики везде (включая лесные/нерабочие зоны).
  // Убрали stopPropagation — теперь клик проходит до карты,
  // и метки рулетки/рисования ставятся в любой точке.
  poly2.on('click', function() {
    poly2.closeTooltip();
    // событие намеренно НЕ останавливается — map.on('click') должен сработать
  });
  poly2.on('mouseover', function() {
    if (isDrawing || isMeasureMode) {
      poly2.closeTooltip();
    }
  });
  forestPolygons[forestKey] = poly2;

  // Сбросить режим рисования
  clearTempDrawLayers();
  currentDrawPoints = [];
  isDrawing = false;
  setDrawModeActive(false);
  cancelForestDraw();

  const net = getNetFieldArea(field).toFixed(2);
  const zoneLabel = lang === 'ru'
    ? { forest: 'Лес', road: 'Дорога', water: 'Вода', building: 'Постройка' }[zoneType] || 'Зона'
    : { forest: 'Forest', road: 'Road', water: 'Water', building: 'Building' }[zoneType] || 'Zone';
  showToast(lang === 'ru'
    ? `${zoneIcons[zoneType]||'🌲'} ${zoneLabel} вычтен. Чистая пашня: ${net} ${getAreaUnit()}`
    : `${zoneIcons[zoneType]||'🌲'} ${zoneLabel} subtracted. Net area: ${net} ${getAreaUnit()}`);

  // Открыть детали поля обратно
  setTimeout(() => openFieldDetail(_forestTargetFieldId !== null ? _forestTargetFieldId : field.id), 300);
}
let _forestZoneType = 'forest';

function setForestZoneType(fieldId, ztype, btn) {
  _forestZoneType = ztype;
  const selector = document.getElementById(`forest-type-selector-${fieldId}`);
  if (selector) {
    selector.querySelectorAll('button').forEach(b => {
      b.style.background = 'var(--bg3)';
      b.style.color = 'var(--text2)';
    });
    btn.style.background = 'var(--accent)';
    btn.style.color = '#fff';
  }
}
function cancelForestDraw() {
  _forestDrawMode = false;
  _forestTargetFieldId = null;

  const hint = document.getElementById('draw-hint');
  if (hint) hint.classList.remove('forest-hint');

  const finishBtn = document.getElementById('btn-finish-draw');
  if (finishBtn) {
    finishBtn.style.background = '';
    const span = finishBtn.querySelector('span:first-child');
    if (span) span.textContent = t('finishShort') || 'Finish';
  }
}
/**
 * Удалить лесную зону по индексу.
 */
function deleteForestZone(fieldId, idx) {
  const fields = loadFields();
  const field = fields.find(f => f.id === fieldId);
  if (!field || !field.forests) return;

  const fz = field.forests[idx];
  if (!fz) return;

  // Убрать полигон с карты
  const forestKey = fieldId + '_forest_' + fz.id;
  if (forestPolygons[forestKey]) {
    forestPolygons[forestKey].removeFrom(map);
    delete forestPolygons[forestKey];
  }

  field.forests.splice(idx, 1);
  saveFields(fields);

  showToast(lang === 'ru' ? 'Лесная зона удалена' : 'Forest zone removed');

  // Обновить секцию без полного перерендера
  const sec = document.getElementById(`forest-section-${fieldId}`);
  if (sec) sec.innerHTML = renderForestSectionHTML(field);
}
/**
 * При загрузке полей с карты — нарисовать их леса.
 */
function renderForestPolygonsForField(field) {
  if (!field.forests || !field.forests.length) return;
  field.forests.forEach(fz => {
    if (!fz.coordinates || fz.coordinates.length < 3) return;
    const key = field.id + '_forest_' + fz.id;
    if (forestPolygons[key]) return; // уже нарисован
    const leafletCoords = fz.coordinates.map(c => [c[0], c[1]]);
    const poly = L.polygon(leafletCoords, {
      color: BRAND.accent2,
      fillColor: BRAND.accentDark,
      fillOpacity: 0.45,
      weight: 2,
      dashArray: '6,4'
    }).addTo(map);
    poly.bindTooltip(`🌲 ${lang === 'ru' ? 'Лес' : 'Forest'} ${fz.area.toFixed(1)} ${getAreaUnit()}`, { permanent: false });
    // FIX v3.0 п.1 (загруженные леса): убираем stopPropagation — клик проходит на карту,
    // метки рулетки/рисования ставятся в любой зоне включая лесные.
    poly.on('click', function() {
      poly.closeTooltip();
      // НЕ вызываем stopPropagation — событие идёт дальше на map
    });
    poly.on('mouseover', function() {
      if (isDrawing || isMeasureMode) {
        poly.closeTooltip();
      }
    });
    forestPolygons[key] = poly;
  });
}
