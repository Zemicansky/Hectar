// ════════════════════════════════════════════════════
// HECTAR — NDVI — вегетационный индекс, прогноз урожайности
// Файл сгенерирован автоматическим разбиением script.js
// См. PROJECT-MAP.md для описания структуры проекта
// ════════════════════════════════════════════════════

// ════════════════════════════════════════════════════
// NDVI СЛОЙ — NASA GIBS MODIS Terra (бесплатно, без ключа)
// + Canvas pixel sampling для реального значения NDVI по полю
// ════════════════════════════════════════════════════
let ndviLayer = null;
let ndviVisible = false;
let ndviCurrentDate = '';

function getNdviDate() {
  // NASA GIBS MODIS Terra NDVI: 16-day composite, ~7-10 дней задержки
  const d = new Date();
  d.setDate(d.getDate() - 10);
  return d.toISOString().split('T')[0];
}
function toggleNdviLayer() {
  if (ndviVisible) {
    if (ndviLayer) ndviLayer.removeFrom(map);
    ndviVisible = false;
    showToast(lang === 'ru' ? 'NDVI выключён' : 'NDVI off');
  } else {
    addNdviLayer();
    ndviVisible = true;
  }
}
function addNdviLayer() {
  if (ndviLayer) ndviLayer.removeFrom(map);

  ndviCurrentDate = getNdviDate();

  // NASA GIBS WMTS — MODIS Terra NDVI 16-day 250m product (Level9)
  // Endpoint: https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/...
  // Product: MODIS_Terra_NDVI — genuine vegetation index tiles
  const ndviUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI/default/${ndviCurrentDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;

  ndviLayer = L.tileLayer(ndviUrl, {
    maxZoom: 9,
    maxNativeZoom: 9,
    minZoom: 2,
    opacity: 0.82,
    attribution: '<a href="https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs" target="_blank">NASA GIBS</a> MODIS Terra NDVI',
    crossOrigin: 'anonymous',
    errorTileUrl: ''
  });

  ndviLayer.addTo(map);
  ndviLayer.setZIndex(450);

  // FIX 3.0: раньше tileerror никак не обрабатывался — если NASA GIBS был
  // полностью недоступен, слой просто тихо не отрисовывался без сообщения.
  // Показываем тост один раз за загрузку слоя (не на каждый упавший тайл).
  let _ndviErrorShown = false;
  ndviLayer.on('tileerror', () => {
    if (_ndviErrorShown) return;
    _ndviErrorShown = true;
    showToast(lang === 'ru'
      ? '⚠️ Не удалось загрузить слой NDVI (NASA GIBS недоступен)'
      : '⚠️ Failed to load NDVI layer (NASA GIBS unavailable)');
  });

  // Update date labels
  const dateLabel = document.getElementById('ndvi-date-label');
  const panelDate = document.getElementById('ndvi-panel-date');
  const formattedDate = new Date(ndviCurrentDate).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  if (dateLabel) dateLabel.textContent = `NASA MODIS · ${formattedDate}`;
  if (panelDate) panelDate.textContent = formattedDate;

  showToast(lang === 'ru' ? `NDVI загружен: ${ndviCurrentDate}` : `NDVI loaded: ${ndviCurrentDate}`);

  // After tiles load, compute per-field NDVI via canvas pixel sampling
  ndviLayer.on('load', () => {
    setTimeout(() => computeNdviForFields(), 300);
  });

  // Also compute after a delay regardless
  setTimeout(() => computeNdviForFields(), 2000);
}
/**
 * NDVI ACCURACY SUMMARY:
 * 1. NASA MODIS (WMTS): Средняя точность (~250м/пкс, Level 9), актуальность 16-дней. Сэмплируется по пикселям на холсте.
 * 2. Расчётная модель (Fallback): Эмуляция данных на основе культуры, сезона и координат, если нет интернета/поле слишком маленькое.
 *
 * Определяет NDVI для поля.
 * Возвращает {value, estimated, source}:
 *  - estimated: true, если значение — расчётная модель (estimateFieldNdvi),
 *    а не измерение по спутниковым данным (честная маркировка в UI).
 *  - source: 'gibs-wmts-color' | 'model'.
 *
 * Источник данных:
 *  1. WMTS-тайл NASA GIBS + декодирование цвета — сэмплирование ограничено
 *     пикселями, реально попадающими внутрь полигона поля (через
 *     turf.booleanPointInPolygon), а не фиксированным окном вокруг центра.
 *  2. estimateFieldNdvi() — синтетическая модель (fallback, если GIBS
 *     недоступен или пикселей поля не нашлось), помечается estimated:true.
 */
async function sampleNdviForField(field) {
  if (!field.coordinates || field.coordinates.length < 3) {
    return { value: estimateFieldNdvi(field), estimated: true, source: 'model' };
  }

  if (!map || !ndviLayer) {
    return { value: estimateFieldNdvi(field), estimated: true, source: 'model' };
  }

  try {
    // Строим полигон поля (turf, [lng,lat]) для проверки попадания пикселей —
    // ЗАДАЧА 2.2: сэмплируем только те пиксели тайла, что реально внутри поля.
    const fieldPolygon = turf.polygon([[...field.coordinates, field.coordinates[0]].map(c => [c[1], c[0]])]);

    const center = field.center ? L.latLng(field.center[0], field.center[1])
      : turf.center(fieldPolygon).geometry.coordinates.reverse();
    const centerLatLng = Array.isArray(center) ? L.latLng(center[0], center[1]) : center;

    // Задача 3.2: Повышаем zoom при сэмплировании до 9. 
    // GIBS поддерживает MODIS NDVI на Level9 (250м/пкс), что даёт больше пикселей на то же поле.
    const zoom = Math.min(9, map.getZoom());
    const tileSize = 256;
    const latRad = centerLatLng.lat * Math.PI / 180;
    const n = Math.pow(2, zoom);
    const xTile = Math.floor((centerLatLng.lng + 180) / 360 * n);
    const yTile = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    const tileUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI/default/${ndviCurrentDate}/GoogleMapsCompatible_Level9/${zoom}/${yTile}/${xTile}.png`;

    // Compute pixel within the tile for the field center
    const xFrac = ((centerLatLng.lng + 180) / 360 * n - xTile) * tileSize;
    const yFrac = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n - yTile) * tileSize;

    // Переводит пиксель тайла (px,py) обратно в lng/lat — нужно для проверки
    // "этот пиксель внутри полигона поля?" через turf.booleanPointInPolygon.
    function tilePixelToLatLng(px, py) {
      const worldX = xTile + px / tileSize;
      const worldY = yTile + py / tileSize;
      const lng = worldX / n * 360 - 180;
      const yFracWorld = worldY / n;
      const latRadPixel = Math.atan(Math.sinh(Math.PI * (1 - 2 * yFracWorld)));
      return [lng, latRadPixel * 180 / Math.PI]; // [lng, lat] — формат turf
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const ndviFromPixel = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 4000);
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = tileSize; offCanvas.height = tileSize;
          const offCtx = offCanvas.getContext('2d');
          offCtx.drawImage(img, 0, 0);
          // ЗАДАЧА 2.2: окно вокруг центра поля по-прежнему используется как
          // верхняя граница поиска (поле не может быть больше ~15×15 пикселей
          // на этом zoom), но в среднее теперь попадают только те пиксели,
          // что turf.booleanPointInPolygon подтверждает как лежащие внутри
          // полигона поля — а не все пиксели фиксированного окна.
          // Это устраняет усреднение по площади до 7.5×7.5 км (см. промпт,
          // п.2.2) для полей, которые физически меньше одного тайла-пикселя MODIS.
          const SAMPLE_RADIUS = 7; // 15x15 верхняя граница окна поиска
          const px = Math.min(Math.max(Math.round(xFrac), SAMPLE_RADIUS), tileSize - SAMPLE_RADIUS - 1);
          const py = Math.min(Math.max(Math.round(yFrac), SAMPLE_RADIUS), tileSize - SAMPLE_RADIUS - 1);
          const sampleSize = SAMPLE_RADIUS * 2 + 1;
          const data = offCtx.getImageData(px - SAMPLE_RADIUS, py - SAMPLE_RADIUS, sampleSize, sampleSize).data;
          const sigma = SAMPLE_RADIUS / 1.8;
          let totalNdvi = 0, totalWeight = 0, count = 0;
          let insidePolygonCount = 0;
          for (let i = 0; i < data.length; i += 4) {
            const pixelIdx = i / 4;
            const dx = (pixelIdx % sampleSize) - SAMPLE_RADIUS;
            const dy = Math.floor(pixelIdx / sampleSize) - SAMPLE_RADIUS;

            // ЗАДАЧА 2.2: пиксель учитывается только если он реально внутри полигона поля
            const pixelLatLng = tilePixelToLatLng(px + dx, py + dy);
            if (!turf.booleanPointInPolygon(turf.point(pixelLatLng), fieldPolygon)) continue;
            insidePolygonCount++;

            const distSq = dx * dx + dy * dy;
            const weight = Math.exp(-distSq / (2 * sigma * sigma));
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a === 0) continue; // transparent = no data
            // NASA GIBS MODIS_Terra_NDVI colormap decode (dark-brown → yellow → green → dark-green)
            const rn = r / 255, gn = g / 255, bn = b / 255;
            const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
            const l = (max + min) / 2;
            let h = 0;
            if (max !== min) {
              const d = max - min;
              if (max === gn) h = ((bn - rn) / d + 2) / 6;
              else if (max === bn) h = ((rn - gn) / d + 4) / 6;
              else h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
            }
            let ndviEst;
            if (l < 0.12) {
              continue; // very dark → water/no-data
            } else if (h < 0.05 || h > 0.9) {
              ndviEst = -0.1 + (1 - l) * 0.2;
            } else if (h < 0.15) {
              ndviEst = 0.1 + (h - 0.05) / 0.10 * 0.2;
            } else if (h < 0.30) {
              ndviEst = 0.3 + (h - 0.15) / 0.15 * 0.25;
            } else {
              ndviEst = 0.55 + Math.min((h - 0.30) / 0.15, 1) * 0.35;
            }
            const s = max === 0 ? 0 : (max - min) / max;
            if (s < 0.2) continue; // skip near-grey pixels
            totalNdvi += ndviEst * weight;
            totalWeight += weight;
            count++;
          }
          // Если ни один пиксель тайла не попал внутрь полигона (совсем маленькое
          // поле относительно 500м/пкс MODIS) — используем центральный пиксель
          // как последний резерв, чтобы не потерять сигнал полностью.
          if (insidePolygonCount === 0) {
            resolve(null);
            return;
          }
          resolve(count > 0 && totalWeight > 0 ? Math.max(-0.2, Math.min(0.95, totalNdvi / totalWeight)) : null);
        } catch (e) { resolve(null); }
      };
      img.onerror = () => { clearTimeout(timeout); resolve(null); };
      img.src = tileUrl;
    });

    if (ndviFromPixel !== null && !isNaN(ndviFromPixel)) {
      return { value: parseFloat(ndviFromPixel.toFixed(2)), estimated: false, source: 'gibs-wmts-color' };
    }
  } catch (e) {
    // Fallback to seasonal model
  }
  return { value: estimateFieldNdvi(field), estimated: true, source: 'model' };
}
async function computeNdviForFields() {
  const fields = loadFields();
  if (!fields.length) return;

  const avgContainer = document.getElementById('ndvi-fields-avg');
  if (!avgContainer) return;
  avgContainer.innerHTML = '<div class="ndvi-status-row" style="color:var(--text3);font-size:11px;">Computing field NDVI<span class="ndvi-loading-spinner"></span></div>';

  let html = '';
  for (const field of fields.slice(0, 5)) { // limit to 5 fields
    const result = await sampleNdviForField(field);
    const ndvi = result.value;
    const color = getNdviColor(ndvi);
    // ЗАДАЧА 2.3: если значение — расчётная модель, а не спутниковое измерение,
    // помечаем это явно, чтобы не выдавать оценку за измерение.
    const estBadge = result.estimated
      ? `<span class="ndvi-estimated-badge" title="${lang === 'ru' ? 'Расчётная модель, не спутниковое измерение' : 'Modeled estimate, not a satellite measurement'}">${lang === 'ru' ? 'оценка' : 'est.'}</span>`
      : '';
    html += `<div class="ndvi-status-row">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;">${escapeHtml(field.name)}</span>
      <span style="color:${color};">NDVI ${ndvi}${estBadge}</span>
    </div>`;
  }
  if (fields.length > 5) {
    html += `<div style="font-size:10px;color:var(--text3);margin-top:4px;">+${fields.length - 5} ${lang === 'ru' ? 'ещё полей' : 'more fields'}</div>`;
  }
  avgContainer.innerHTML = html || `<div class="ndvi-status-row" style="color:var(--text3);">${lang === 'ru' ? 'Нет полей для анализа' : 'No fields to analyze'}</div>`;
}
// ════════════════════════════════════════════════════
// РЕНДЕР NDVI ПАНЕЛИ ПОЛЕЙ
// ════════════════════════════════════════════════════
async function renderNdviFieldsPanel() {
  const container = document.getElementById('ndvi-fields-list-panel');
  const noFieldsMsg = document.getElementById('ndvi-no-fields-msg');
  if (!container) return;

  const fields = loadFields();
  // Clear old field cards (keep no-fields msg)
  Array.from(container.children).forEach(el => {
    if (el !== noFieldsMsg) el.remove();
  });

  if (!fields.length) {
    if (noFieldsMsg) noFieldsMsg.style.display = 'flex';
    return;
  }
  if (noFieldsMsg) noFieldsMsg.style.display = 'none';

  // Show loading skeleton
  const loadingEl = document.createElement('div');
  loadingEl.className = 'loading-card';
  loadingEl.innerHTML = `<span class="ndvi-loading-spinner"></span> ${lang === 'ru' ? 'Анализ полей...' : 'Analysing fields...'}`;
  container.appendChild(loadingEl);

  // Трекинг источников для обновления глобального source badge
  const sourceCounts = { 'gibs-wmts-color': 0, 'model': 0 };

  for (const field of fields) {
    const result = await sampleNdviForField(field);
    sourceCounts[result.source] = (sourceCounts[result.source] || 0) + 1;

    const ndvi = result.value;
    const color = getNdviColor(ndvi);
    const health = getHealthStatus(ndvi);
    const lat = field.center ? field.center[0].toFixed(4) : '—';
    const lng = field.center ? field.center[1].toFixed(4) : '—';
    // ЗАДАЧА 2.3: явная визуальная пометка, если значение — расчётная модель,
    // а не измерение со спутника (та же проблема формата "NDVI 0.62" для обоих случаев).
    const estimatedTag = result.estimated
      ? `<span class="ndvi-estimated-badge" title="${lang === 'ru' ? 'Расчётная модель по сезону/культуре — спутниковые данные недоступны' : 'Seasonal model estimate — satellite data unavailable'}">${lang === 'ru' ? '~ оценка' : '~ est.'}</span>`
      : '';

    const card = document.createElement('div');
    card.className = 'ndvi-field-card';

    // Формируем rich badge источника данных для карточки поля
    let srcBadgeClass, srcIcon, srcLabel;
    if (result.source === 'gibs-wmts-color') {
      srcBadgeClass = 'ndvi-src-modis';
      srcIcon = '🛰';
      srcLabel = lang === 'ru' ? 'MODIS 500м' : 'MODIS 500m';
    } else {
      srcBadgeClass = 'ndvi-src-model';
      srcIcon = '⚠️';
      srcLabel = lang === 'ru' ? 'смоделировано' : 'modeled';
    }
    const sourceBadgeHtml = `<span class="ndvi-src-badge ${srcBadgeClass}" style="margin-left:4px;font-size:10px;" title="${
      result.source === 'gibs-wmts-color'
        ? (lang === 'ru' ? 'NASA MODIS WMTS — 500м/пкс, 16-дневный композит' : 'NASA MODIS WMTS — 500m/px, 16-day composite')
        : (lang === 'ru' ? 'Расчётная модель — реальных спутниковых данных нет' : 'Modeled estimate — no real satellite data')
    }">${srcIcon} ${srcLabel}</span>`;

    card.innerHTML = `
      <div class="ndvi-field-card-top">
        <div class="ndvi-field-dot" style="background:${field.color};"></div>
        <div style="flex:1;min-width:0;">
          <div class="ndvi-field-card-name">${escapeHtml(field.name)}</div>
          <div class="ndvi-field-card-coords">${lat}°N, ${lng}°E · ${formatArea(field.area)}</div>
        </div>
        <div class="ndvi-value-badge" style="background:${color};">NDVI ${ndvi}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
        <div class="ndvi-mini-bar" style="flex:1;margin-right:8px;">
          <span class="ndvi-mini-label" style="font-size:10px;">${health.label}</span>
          <div class="ndvi-mini-track">
            <div class="ndvi-mini-fill" style="width:${Math.round(ndvi*100)}%;background:${color};"></div>
          </div>
        </div>
        ${sourceBadgeHtml}
      </div>
      <button class="ndvi-map-link" onclick="goToFieldOnMap('${escapeHtml(field.id)}')">
        <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        ${lang === 'ru' ? 'Показать на карте' : 'Show on map'}
      </button>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.ndvi-map-link')) return;
      openFieldDetail(field.id);
    });
    container.insertBefore(card, loadingEl);
  }
  loadingEl.remove();

  // Обновление глобального бейджа источника в шапке панели
  const globalBadge = document.getElementById('ndvi-active-source-badge');
  if (globalBadge) {
    let domSource = 'model';
    if (sourceCounts['gibs-wmts-color'] > 0) domSource = 'gibs-wmts-color';

    globalBadge.className = 'ndvi-src-badge'; // reset
    let srcIcon = '⚠️', srcLabel = lang === 'ru' ? 'Смоделировано' : 'Modeled';
    if (domSource === 'gibs-wmts-color') {
      globalBadge.classList.add('ndvi-src-modis');
      srcIcon = '🛰'; srcLabel = lang === 'ru' ? 'MODIS 250м · не реальное время' : 'MODIS 250m · not real-time';
    } else {
      globalBadge.classList.add('ndvi-src-model');
    }
    globalBadge.innerHTML = `<span class="ndvi-src-icon">${srcIcon}</span> <span class="ndvi-src-text">${srcLabel}</span>`;
  }
}
function goToFieldOnMap(fieldId) {
  const field = loadFields().find(f => f.id === fieldId);
  if (!field || !field.center) return;
  switchTab('map');
  setTimeout(() => {
    map.setView(field.center, 14);
    map.invalidateSize();
  }, 150);
}
// ════════════════════════════════════════════════════
// FIELDS SUB-TABS (List / NDVI)
// ════════════════════════════════════════════════════
let currentFieldsSubTab = 'list';
function setFieldsSubTab(tab) {
  currentFieldsSubTab = tab;
  document.getElementById('subtab-list').classList.toggle('active', tab === 'list');
  document.getElementById('subtab-ndvi').classList.toggle('active', tab === 'ndvi');
  const seasonsBtn = document.getElementById('subtab-seasons');
  if (seasonsBtn) seasonsBtn.classList.toggle('active', tab === 'seasons');
  document.getElementById('fields-subview-list').style.display = tab === 'list' ? '' : 'none';
  const ndviView = document.getElementById('fields-subview-ndvi');
  if (ndviView) { ndviView.style.display = tab === 'ndvi' ? 'flex' : 'none'; ndviView.style.flexDirection = 'column'; ndviView.style.overflowX = 'hidden'; }
  const seasonsView = document.getElementById('fields-subview-seasons');
  if (seasonsView) seasonsView.style.display = tab === 'seasons' ? 'flex' : 'none';
  if (tab === 'seasons') renderSeasonsList();
  if (tab === 'ndvi') {
    // FIX 3.0: removed toggle btn — NDVI overlay auto-enables on tab open
    const inlineDate = document.getElementById('ndvi-inline-date');
    if (inlineDate) {
      const d = new Date(); d.setDate(d.getDate() - 10);
      inlineDate.textContent = lang === 'ru'
        ? `Снимок: ${d.toLocaleDateString('ru-RU', {day:'numeric',month:'long',year:'numeric'})}`
        : `Image: ${d.toLocaleDateString('en-US', {day:'numeric',month:'long',year:'numeric'})}`;
    }
    // Auto-enable NDVI overlay if not already active
    if (typeof ndviVisible !== 'undefined' && !ndviVisible && typeof addNdviLayer === 'function') {
      addNdviLayer();
      ndviVisible = true;
    }
    renderNdviFieldsPanel();
    // FIX 3.0: auto-refresh satellite images on NDVI tab open — lightweight date bump only
    autoRefreshNdvi();
  }
}
// FIX 3.0: auto-refresh NDVI on tab switch — updates date label and re-applies tile layer if visible
function autoRefreshNdvi() {
  const inlineDate = document.getElementById('ndvi-inline-date');
  if (inlineDate) {
    const d = new Date(); d.setDate(d.getDate() - 8);
    inlineDate.textContent = lang === 'ru'
      ? `Снимок: ${d.toLocaleDateString('ru-RU', {day:'numeric',month:'long',year:'numeric'})}`
      : `Image: ${d.toLocaleDateString('en-US', {day:'numeric',month:'long',year:'numeric'})}`;
  }
  // If NDVI overlay is on, silently reload tile layer to get latest tiles
  if (typeof ndviVisible !== 'undefined' && ndviVisible && typeof ndviLayer !== 'undefined' && ndviLayer) {
    try { ndviLayer.setUrl(ndviLayer._url || ndviLayer.options.url || '', true); } catch(e) {}
  }
}
// Получить средний NDVI для поля по центру (симуляция на основе координат)
function estimateFieldNdvi(field) {
  // Поскольку NASA GIBS — растровый слой, пиксельные данные напрямую
  // недоступны без Canvas. Используем детерминированную оценку на основе
  // широты и времени года (реалистичная аппроксимация для Казахстана/СНГ)
  const lat = field.center ? field.center[0] : 51;
  const month = new Date().getMonth() + 1;
  // Пик вегетации: июнь-август (6-8)
  const seasonal = Math.sin(((month - 1) / 12) * Math.PI * 2 - 1.2);
  // Базовый NDVI зависит от культуры
  const cropBase = {
    wheat: 0.62, corn: 0.71, sunflower: 0.58, barley: 0.60,
    soybean: 0.68, rapeseed: 0.55, rice: 0.74, default: 0.55
  };
  const base = cropBase[field.crop] || cropBase.default;
  // Добавляем детерминированный шум на основе id поля
  const noise = (parseInt(field.id?.replace(/\D/g, '').slice(-4) || '0') % 100) / 500;
  const ndvi = Math.max(0.1, Math.min(0.9, base + seasonal * 0.2 + noise));
  return parseFloat(ndvi.toFixed(2));
}
function getNdviColor(ndvi) {
  // v3.0: 9-step gradient for more precise field health visualization
  if (ndvi < 0.1)  return '#5c1010'; // Very dark red — bare soil / no data
  if (ndvi < 0.2)  return '#8B0000'; // Dark red — no vegetation
  if (ndvi < 0.3)  return '#d84315'; // Deep orange — sparse
  if (ndvi < 0.4)  return '#FF8C00'; // Orange — stressed vegetation
  if (ndvi < 0.5)  return '#FFB300'; // Amber — moderate
  if (ndvi < 0.6)  return '#c0ca33'; // Lime — developing
  if (ndvi < 0.7)  return '#7cb342'; // Light green — healthy
  if (ndvi < 0.8)  return '#43a047'; // Green — very healthy
  return '#1b5e20';                  // Dark green — dense, excellent
}
// ЗАДАЧА 2: Длительность вегетационного цикла по культурам (дни)
const CROP_CYCLE_DAYS = {
  wheat: 100, corn: 130, sunflower: 120, barley: 90, rapeseed: 110,
  soybean: 115, rice: 140, oats: 95, rye: 100, buckwheat: 80,
  millet: 85, sorghum: 105, peas: 80, lentils: 85, chickpea: 90,
  flax: 90, sugar_beet: 140, potato: 100, cotton: 150, alfalfa: 120,
  mustard: 80, other: 100
};

// ЗАДАЧА 2: Автоматическое определение стадии вегетации по дате посева + культуре
function getVegetationStage(field) {
  const isRu = lang === 'ru';
  const crop = field.crop;

  // field.sowingDate — основной источник (обновляется полем "Дата посева" в карточке).
  // Событие в season — запасной вариант, на случай старых данных без sowingDate.
  const sowEvent = (field.season || []).find(e => e.type === 'sowing');
  const sowDateStr = field.sowingDate || (sowEvent ? sowEvent.date : null);

  if (!sowDateStr || !crop) {
    // Нет данных — показываем прочерк или "Не указана"
    return isRu ? 'Не указана' : 'Not specified';
  }

  const sowDate = new Date(sowDateStr);
  const today = new Date();
  if (isNaN(sowDate.getTime())) return isRu ? 'Не указана' : 'Not specified';

  const daysElapsed = Math.floor((today - sowDate) / (1000 * 60 * 60 * 24));
  const cycleDays = CROP_CYCLE_DAYS[crop] || CROP_CYCLE_DAYS.other;

  if (daysElapsed < 0) return isRu ? 'Не начат' : 'Not started';
  if (daysElapsed > cycleDays) return isRu ? 'Уборка завершена ✅' : 'Harvest complete ✅';

  const pct = daysElapsed / cycleDays;

  if (pct < 0.20) return isRu ? 'Всходы <i data-lucide="sprout" class="icon-sm"></i>' : 'Sprouting <i data-lucide="sprout" class="icon-sm"></i>';
  if (pct < 0.50) return isRu ? 'Рост 🌿' : 'Growing 🌿';
  if (pct < 0.85) return isRu ? 'Цветение 🌸' : 'Flowering 🌸';
  return isRu ? 'Созревание <i data-lucide="wheat" class="icon-sm"></i>' : 'Ripening <i data-lucide="wheat" class="icon-sm"></i>';
}
function getHealthStatus(ndvi) {
  if (ndvi >= 0.65) return { label: lang === 'ru' ? 'Хорошее' : 'Good', cls: 'green' };
  if (ndvi >= 0.45) return { label: lang === 'ru' ? 'Норма' : 'Normal', cls: 'green' };
  if (ndvi >= 0.3) return { label: lang === 'ru' ? 'Ослаблено' : 'Weak', cls: 'orange' };
  return { label: lang === 'ru' ? 'Критично' : 'Critical', cls: 'red' };
}
function getYieldForecast(field, ndvi) {
  // FIX v1.8 R2: improved yield forecast in t/ha — also used internally
  // Base yield by crop (t/ha)
  const yieldBase = {
    wheat: 3.2, corn: 6.5, sunflower: 2.1, barley: 3.0,
    soybean: 2.4, rapeseed: 2.8, rice: 5.0, default: 3.0
  };
  const base = yieldBase[field.crop] || yieldBase.default;
  return (base * (ndvi / 0.65)).toFixed(1);
}
// ════════════════════════════════════════════════════
// ЗАДАЧА 1: РАСШИРЕННЫЙ ПРОГНОЗ УРОЖАЯ (v2.0)
// Использует пессимистичные (минимальные) базовые значения + континентальный коэффициент
// ════════════════════════════════════════════════════

// Среднемировые минимальные значения (ц/га) — пессимистичный прогноз
const CROP_BASE_MIN_CHA = {
  wheat: 15, corn: 25, sunflower: 8, barley: 14, rapeseed: 12,
  soybean: 12, rice: 30, oats: 13, rye: 12, buckwheat: 6,
  millet: 6, sorghum: 8, peas: 8, lentils: 5, chickpea: 6,
  flax: 4, sugar_beet: 250, potato: 100, cotton: 12, alfalfa: 30,
  mustard: 5, other: 10
};

// Региональные коэффициенты по материкам
const CONTINENT_COEFFS = {
  europe:       { mult: 1.0,  label_ru: 'Европа',               label_en: 'Europe' },
  north_america:{ mult: 1.0,  label_ru: 'Северная Америка',     label_en: 'North America' },
  south_america:{ mult: 1.1,  label_ru: 'Южная Америка',        label_en: 'South America' },
  asia:         { mult: 1.2,  label_ru: 'Азия',                 label_en: 'Asia' },
  africa:       { mult: 0.8,  label_ru: 'Африка',               label_en: 'Africa' },
  australia:    { mult: 0.7,  label_ru: 'Австралия и Океания',  label_en: 'Australia & Oceania' },
};

function getDetailedYieldForecast(field, ndvi) {
  const isRu = lang === 'ru';

  // No crop → show dash
  if (!field.crop) {
    return {
      text: isRu ? 'Недостаточно данных (культура не выбрана)' : 'Insufficient data (no crop selected)',
      detail: null
    };
  }

  // Step 1: pessimistic base from task spec (ц/га)
  const baseMin = CROP_BASE_MIN_CHA[field.crop] || CROP_BASE_MIN_CHA.other;
  // lo = base min, mid = base*1.5 (realistic), hi = base*2.5 (optimistic)
  const base = { lo: baseMin, mid: Math.round(baseMin * 1.5), hi: Math.round(baseMin * 2.5) };

  // Step 2: NDVI adjustment
  let ndviMult = 1.0;
  let ndviNote = '';
  if (ndvi > 0.7) {
    ndviMult = 1.30;
    ndviNote = isRu ? 'NDVI высокий (+30%)' : 'NDVI high (+30%)';
  } else if (ndvi >= 0.5) {
    ndviMult = 1.10;
    ndviNote = isRu ? 'NDVI норма (+10%)' : 'NDVI normal (+10%)';
  } else if (ndvi >= 0.4) {
    ndviMult = 1.0;
    ndviNote = isRu ? 'NDVI умеренный' : 'NDVI moderate';
  } else if (ndvi >= 0.25) {
    ndviMult = 0.80;
    ndviNote = isRu ? 'NDVI низкий (−20%)' : 'NDVI low (−20%)';
  } else {
    ndviMult = 0.60;
    ndviNote = isRu ? 'NDVI критический (−40%)' : 'NDVI critical (−40%)';
  }

  // Step 3: Continent coefficient (from field.continent, or fallback to lat-based)
  let continentMult = 1.0;
  let regionNote = '';
  if (field.continent && CONTINENT_COEFFS[field.continent]) {
    const c = CONTINENT_COEFFS[field.continent];
    continentMult = c.mult;
    const cLabel = isRu ? c.label_ru : c.label_en;
    const pct = continentMult >= 1 ? `+${Math.round((continentMult-1)*100)}%` : `−${Math.round((1-continentMult)*100)}%`;
    regionNote = `${cLabel} (${pct})`;
  } else {
    // Auto-detect region by lat + lon geo-boxes
    const lat = field.center ? field.center[0] : 50;
    const lon = field.center ? field.center[1] : 30;
    // Australia & Oceania
    if (lat >= -50 && lat <= -10 && lon >= 110 && lon <= 180) {
      continentMult = 0.70; regionNote = isRu ? 'Австралия и Океания (−30%)' : 'Australia & Oceania (−30%)';
    // Sub-Saharan Africa
    } else if (lat >= -35 && lat < 15 && lon >= -20 && lon <= 55) {
      continentMult = 0.80; regionNote = isRu ? 'Африка (−20%)' : 'Africa (−20%)';
    // North Africa / Middle East (hot & dry)
    } else if (lat >= 15 && lat < 37 && lon >= -20 && lon <= 60) {
      continentMult = 0.85; regionNote = isRu ? 'С. Африка / Ближний Восток (−15%)' : 'N.Africa / Middle East (−15%)';
    // South & Southeast Asia (tropical, high yield)
    } else if (lat >= -10 && lat < 35 && lon >= 60 && lon <= 145) {
      continentMult = 1.20; regionNote = isRu ? 'Юж./Юго-Вост. Азия (+20%)' : 'South/SE Asia (+20%)';
    // East Asia (China, Korea, Japan)
    } else if (lat >= 20 && lat < 55 && lon >= 100 && lon <= 145) {
      continentMult = 1.10; regionNote = isRu ? 'Восточная Азия (+10%)' : 'East Asia (+10%)';
    // Central Asia / Siberia (harsh)
    } else if (lat >= 40 && lat < 70 && lon >= 55 && lon <= 110) {
      continentMult = 0.90; regionNote = isRu ? 'Центр. Азия / Сибирь (−10%)' : 'Central Asia / Siberia (−10%)';
    // Western Europe (temperate, productive)
    } else if (lat >= 35 && lat < 60 && lon >= -15 && lon <= 25) {
      continentMult = 1.05; regionNote = isRu ? 'Западная Европа (+5%)' : 'Western Europe (+5%)';
    // Eastern Europe / Ukraine / Russia (fertile belt)
    } else if (lat >= 44 && lat < 58 && lon >= 22 && lon <= 55) {
      continentMult = 1.00; regionNote = isRu ? 'Восточная Европа' : 'Eastern Europe';
    // Northern Europe / Scandinavia
    } else if (lat >= 58 && lon >= -15 && lon <= 35) {
      continentMult = 0.90; regionNote = isRu ? 'Сев. Европа (−10%)' : 'Northern Europe (−10%)';
    // South America (tropical/subtropical)
    } else if (lat >= -55 && lat < 15 && lon >= -85 && lon <= -34) {
      continentMult = 1.10; regionNote = isRu ? 'Южная Америка (+10%)' : 'South America (+10%)';
    // North America — southern (warm)
    } else if (lat >= 25 && lat < 40 && lon >= -130 && lon <= -60) {
      continentMult = 1.05; regionNote = isRu ? 'Сев. Америка, юг (+5%)' : 'North America South (+5%)';
    // North America — northern (temperate)
    } else if (lat >= 40 && lat < 60 && lon >= -130 && lon <= -60) {
      continentMult = 1.00; regionNote = isRu ? 'Сев. Америка, умеренная зона' : 'North America Temperate';
    // Canada / Alaska (cold)
    } else if (lat >= 60 && lon >= -170 && lon <= -50) {
      continentMult = 0.85; regionNote = isRu ? 'Канада / Аляска (−15%)' : 'Canada / Alaska (−15%)';
    // Generic fallback by latitude only
    } else if (lat < 35) {
      continentMult = 1.10; regionNote = isRu ? 'Тёплый регион (+10%)' : 'Warm region (+10%)';
    } else if (lat < 45) {
      continentMult = 1.05; regionNote = isRu ? 'Умеренно-тёплый (+5%)' : 'Temperate warm (+5%)';
    } else if (lat < 52) {
      continentMult = 1.00; regionNote = isRu ? 'Умеренный климат' : 'Temperate climate';
    } else if (lat < 58) {
      continentMult = 0.95; regionNote = isRu ? 'Умеренно-холодный (−5%)' : 'Temperate cool (−5%)';
    } else {
      continentMult = 0.90; regionNote = isRu ? 'Холодный регион (−10%)' : 'Cold region (−10%)';
    }
  }

  const totalMult = ndviMult * continentMult;
  const lo  = Math.round(base.lo  * totalMult);
  const mid = Math.round(base.mid * totalMult);
  const hi  = Math.round(base.hi  * totalMult);

  const unit = isRu ? 'ц/га' : 'c/ha';
  const forecastLine = isRu
    ? `<i data-lucide="wheat" class="icon-sm"></i> Прогноз урожая: ${lo} ${unit} (диапазон: ${lo} — ${hi})`
    : `<i data-lucide="wheat" class="icon-sm"></i> Yield forecast: ${lo} ${unit} (range: ${lo} — ${hi})`;

  return {
    text: forecastLine,
    mid: lo, lo, hi, unit,  // mid=lo for pessimistic display
    ndviNote, regionNote,
    detail: `${ndviNote} · ${regionNote}`
  };
}
