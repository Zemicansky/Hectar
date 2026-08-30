// ════════════════════════════════════════════════════
// HECTAR — WEATHER — погода по полям и городам
// Файл сгенерирован автоматическим разбиением script.js
// См. PROJECT-MAP.md для описания структуры проекта
// ════════════════════════════════════════════════════

// ════════════════════════════════════════════════════
// ПОГОДА — РЕЖИМ (поле / город)
// ════════════════════════════════════════════════════
let weatherMode = 'field'; // 'field' | 'city'
let weatherCityLat = null;
let weatherCityLng = null;
let weatherCityName = '';
let weatherCityDebounceTimer = null;

function setWeatherMode(mode) {
  weatherMode = mode;
  // Задача 4: новая разметка — управляем классами чипов-контейнеров
  const fieldChip = document.getElementById('weather-chip-field');
  const cityChip = document.getElementById('weather-chip-city');
  const fieldContent = document.getElementById('weather-mode-field');  // inline select
  const cityContent = document.getElementById('weather-mode-city');    // inline search
  const cityExtras = document.getElementById('weather-city-extras');   // results + favourites

  // Переключаем active-чип
  if (fieldChip) fieldChip.classList.toggle('weather-mode-chip--active', mode === 'field');
  if (cityChip) cityChip.classList.toggle('weather-mode-chip--active', mode === 'city');

  // Показываем inline-контент только активного чипа
  if (fieldContent) fieldContent.style.display = mode === 'field' ? 'flex' : 'none';
  if (cityContent) cityContent.style.display = mode === 'city' ? 'flex' : 'none';

  // City extras (results dropdown + favourites) — только в city-режиме
  if (cityExtras) cityExtras.style.display = mode === 'city' ? 'block' : 'none';

  // Обновляем стили кнопок для обратной совместимости с JS, который напрямую обращается к fieldBtn/cityBtn
  const fieldBtn = document.getElementById('weather-mode-field-btn');
  const cityBtn = document.getElementById('weather-mode-city-btn');
  if (fieldBtn) { fieldBtn.style.background = ''; fieldBtn.style.color = ''; } // сброс — CSS управляет через .active класс
  if (cityBtn) { fieldBtn && (fieldBtn.style.background = ''); cityBtn.style.background = ''; cityBtn.style.color = ''; }

  // i18n меток
  const fieldLabel = document.getElementById('weather-mode-field-label');
  const cityLabel = document.getElementById('weather-mode-city-label');
  const cityInput = document.getElementById('weather-city-input');
  if (fieldLabel) fieldLabel.textContent = lang === 'ru' ? 'По полю' : 'By Field';
  if (cityLabel) cityLabel.textContent = lang === 'ru' ? 'По городу' : 'By City';
  if (cityInput) cityInput.placeholder = lang === 'ru' ? 'Поиск города или места...' : 'Search city or location...';

  // Hide field-info bar when switching to city mode
  const fieldInfoBar = document.getElementById('weather-field-info');
  if (fieldInfoBar && mode === 'city') fieldInfoBar.style.display = 'none';
  // FIX v1.9: render favourites when city mode becomes active
  if (mode === 'city') renderFavouriteCities();
  loadWeather();
}
let weatherCitySearchController = null;

function onWeatherCityInput(val) {
  clearTimeout(weatherCityDebounceTimer);
  const results = document.getElementById('weather-city-results');
  if (!val.trim()) { if (results) results.style.display = 'none'; return; }
  weatherCityDebounceTimer = setTimeout(() => searchWeatherCity(val), 400);
}
async function searchWeatherCity(query) {
  if (!query || !query.trim()) return;
  const results = document.getElementById('weather-city-results');
  if (!results) return;
  results.style.display = 'block';
  results.innerHTML = `<div style="padding:10px 14px;font-size:13px;color:var(--text3);">${lang === 'ru' ? 'Поиск...' : 'Searching...'}</div>`;
  try {
    if (weatherCitySearchController) weatherCitySearchController.abort();
    weatherCitySearchController = new AbortController();
    // Use Open-Meteo Geocoding API — free, no key, browser-friendly
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=${lang === 'ru' ? 'ru' : 'en'}&format=json`,
      { signal: weatherCitySearchController.signal }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const places = data.results || [];
    if (!places.length) {
      results.innerHTML = `<div style="padding:10px 14px;font-size:13px;color:var(--text3);">${lang === 'ru' ? 'Ничего не найдено' : 'Nothing found'}</div>`;
      return;
    }
    results.innerHTML = places.map((p) => {
      const parts = [p.name, p.admin1, p.country].filter(Boolean);
      const name = parts.join(', ');
      const sub = [p.country_code, p.timezone].filter(Boolean).join(' · ');
      // FIX (security): escape name for HTML content, and separately for the
      // single-quoted JS string literal inside the onclick attribute, to
      // prevent HTML/JS injection from geocoding API results.
      const nameHtml = escapeHtml(name);
      const subHtml = escapeHtml(sub);
      const nameForAttr = escapeHtml(name).replace(/'/g, '&#39;');
      return `<div onclick="selectWeatherCity(${p.latitude},${p.longitude},'${nameForAttr}')"
        style="padding:10px 14px;font-size:13px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;"
        onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''"
      >
        <div style="font-weight:600;color:var(--text);">${nameHtml}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">${subHtml} · ${p.latitude.toFixed(3)}° ${p.longitude.toFixed(3)}°</div>
      </div>`;
    }).join('');
  } catch(e) {
    if (e.name === 'AbortError') return;
    results.innerHTML = `<div style="padding:10px 14px;font-size:13px;color:var(--danger);">${lang === 'ru' ? 'Ошибка поиска. Проверьте соединение.' : 'Search error. Check your connection.'}</div>`;
  }
}
function selectWeatherCity(lat, lon, name) {
  weatherCityLat = parseFloat(lat);
  weatherCityLng = parseFloat(lon);
  weatherCityName = name;
  const results = document.getElementById('weather-city-results');
  const current = document.getElementById('weather-city-current');
  const input = document.getElementById('weather-city-input');
  if (results) results.style.display = 'none';
  if (current) { current.style.display = 'block'; current.innerHTML = `<i data-lucide="map-pin" class="icon-sm"></i> <strong style="color:var(--text);">${escapeHtml(name)}</strong>`; }
  if (input) input.value = name.split(',')[0];
  // FIX v1.9: update add-btn state after selecting a city
  updateFavAddBtnState();
  loadWeather();
}
// FIX v1.9: ═══════════════════════════════════
// FAVOURITE CITIES — localStorage, max 5
// ═══════════════════════════════════════════════
const FAVS_KEY = STORAGE_PREFIX + '-weather-favs';

function loadFavouriteCities() {
  try { return JSON.parse(localStorage.getItem(FAVS_KEY) || '[]'); } catch { return []; }
}
let saveFavouriteCities = function(favs) {
  localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
};

function renderFavouriteCities() {
  const list = document.getElementById('weather-fav-list');
  const empty = document.getElementById('weather-fav-empty');
  if (!list) return;
  const favs = loadFavouriteCities();
  // clear chips (keep empty label)
  Array.from(list.children).forEach(el => { if (el !== empty) el.remove(); });
  if (!favs.length) {
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  favs.forEach((fav, idx) => {
    const chip = document.createElement('div');
    chip.className = 'weather-fav-chip';
    // FIX (security): escape favourite city name before inserting as HTML,
    // since it comes from localStorage (which can be edited via devtools or
    // an imported backup file) and was previously inserted unescaped.
    const displayName = escapeHtml(fav.name.split(',')[0]);
    chip.innerHTML = `<span onclick="selectFavouriteCity(${idx})" style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">⭐ ${displayName}</span><span class="fav-del" onclick="deleteFavouriteCity(${idx},event)" title="Remove">✕</span>`;
    list.appendChild(chip);
  });
  updateFavAddBtnState();
}
function updateFavAddBtnState() {
  const btn = document.getElementById('weather-fav-add-btn');
  if (!btn) return;
  const favs = loadFavouriteCities();
  const hasCity = !!(weatherCityLat && weatherCityLng && weatherCityName);
  const maxReached = favs.length >= 5;
  const alreadySaved = favs.some(f => f.name === weatherCityName);
  btn.disabled = !hasCity || maxReached || alreadySaved;
  if (maxReached) btn.title = 'Maximum 5 favourites reached';
  else if (alreadySaved) btn.title = 'Already in favourites';
  else btn.title = 'Add current city to favourites';
}
function addCurrentCityToFavourites() {
  if (!weatherCityLat || !weatherCityLng || !weatherCityName) {
    showToast(lang === 'ru' ? 'Сначала выберите город' : 'Select a city first');
    return;
  }
  const favs = loadFavouriteCities();
  if (favs.length >= 5) { showToast(lang === 'ru' ? 'Максимум 5 избранных' : 'Maximum 5 favourites'); return; }
  if (favs.some(f => f.name === weatherCityName)) { showToast(lang === 'ru' ? 'Уже в избранном' : 'Already saved'); return; }
  favs.push({ name: weatherCityName, lat: weatherCityLat, lng: weatherCityLng });
  saveFavouriteCities(favs);
  renderFavouriteCities();
  showToast((lang === 'ru' ? '⭐ Добавлено: ' : '⭐ Added: ') + weatherCityName.split(',')[0]);
}
function selectFavouriteCity(idx) {
  const favs = loadFavouriteCities();
  const fav = favs[idx];
  if (!fav) return;
  selectWeatherCity(fav.lat, fav.lng, fav.name);
}
function deleteFavouriteCity(idx, e) {
  if (e) { e.stopPropagation(); }
  const favs = loadFavouriteCities();
  const removed = favs.splice(idx, 1);
  saveFavouriteCities(favs);
  renderFavouriteCities();
  if (removed[0]) showToast((lang === 'ru' ? 'Удалено: ' : 'Removed: ') + removed[0].name.split(',')[0]);
}
// FIX v1.9: ═══ end favourites ═══════════════

// ════════════════════════════════════════════════════
// ПОГОДА (Open-Meteo API — 7 дней, по выбранному полю)
// ════════════════════════════════════════════════════
const WMO_ICONS = {
  0:'<i data-lucide="sun" class="icon-sm"></i>', 1:'🌤️', 2:'⛅', 3:'<i data-lucide="cloud" class="icon-sm"></i>',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'❄️', 73:'❄️', 75:'❄️',
  77:'🌨️', 80:'🌦️', 81:'🌧️', 82:'⛈️',
  85:'🌨️', 86:'❄️',
  95:'⛈️', 96:'⛈️', 99:'⛈️'
};
const WMO_LABELS = {
  0:'Ясно', 1:'Почти ясно', 2:'Переменная облачность', 3:'Пасмурно',
  45:'Туман', 48:'Туман',
  51:'Морось', 53:'Морось', 55:'Ливень',
  61:'Дождь', 63:'Дождь', 65:'Сильный дождь',
  71:'Снег', 73:'Снег', 75:'Сильный снег',
  80:'Ливни', 81:'Ливни', 82:'Сильные ливни',
  95:'Гроза', 96:'Гроза с градом', 99:'Сильная гроза'
};
const WMO_LABELS_EN = {
  0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Fog', 48:'Fog',
  51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Rain', 63:'Moderate rain', 65:'Heavy rain',
  71:'Snow', 73:'Moderate snow', 75:'Heavy snow',
  80:'Rain showers', 81:'Rain showers', 82:'Heavy showers',
  95:'Thunderstorm', 96:'Thunderstorm with hail', 99:'Heavy thunderstorm'
};

let selectedWeatherFieldId = null;

function populateWeatherFieldSelect() {
  const sel = document.getElementById('weather-field-select');
  if (!sel) return;
  const fields = loadFields();
  // Clear options except the placeholder
  while (sel.options.length > 1) sel.remove(1);
  fields.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `${f.name} (${f.area} га)`;
    sel.appendChild(opt);
  });
  // Auto-select previously selected or first field
  if (selectedWeatherFieldId) {
    const exists = fields.find(f => f.id === selectedWeatherFieldId);
    if (exists) sel.value = selectedWeatherFieldId;
  } else if (fields.length === 1) {
    sel.value = fields[0].id;
    selectedWeatherFieldId = fields[0].id;
  }
}
function onWeatherFieldChange(fieldId) {
  selectedWeatherFieldId = fieldId || null;
  loadWeather();
}
async function loadWeather() {
  const fields = loadFields();
  const container = document.getElementById('weather-list-container');
  const noFieldDiv = document.getElementById('weather-no-field');
  const fieldInfoBar = document.getElementById('weather-field-info');

  // ── CITY MODE ──────────────────────────────────────
  if (weatherMode === 'city') {
    // Always hide field-related UI in city mode
    if (fieldInfoBar) fieldInfoBar.style.display = 'none';
    // FIX v1.9: hide field meta pill in city mode
    const metaElCity = document.getElementById('weather-field-meta');
    if (metaElCity) metaElCity.style.display = 'none';
    const fieldModeSection = document.getElementById('weather-mode-field');
    if (fieldModeSection) fieldModeSection.style.display = 'none';

    if (!weatherCityLat || !weatherCityLng) {
      container.innerHTML = `
        <div class="weather-no-field" style="display:flex;">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24" style="opacity:0.3;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
          <p>${lang === 'ru' ? 'Введите название города<br>в поле поиска выше' : 'Enter a city name<br>in the search box above'}</p>
        </div>`;
      return;
    }
    // Have city coords — fetch weather
    container.innerHTML = `<div class="loading-card"><span class="ndvi-loading-spinner"></span> ${lang === 'ru' ? 'Загрузка прогноза...' : 'Loading forecast...'}</div>`;
    try {
      const lat = weatherCityLat, lng = weatherCityLng;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`
        + `&current=temperature_2m,windspeed_10m,weathercode,precipitation,relativehumidity_2m,apparent_temperature`
        + `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,precipitation_probability_max`
        + `&timezone=auto&forecast_days=7`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const cur = data.current;
      const daily = data.daily;
      const wind = cur.windspeed_10m;
      const rain = cur.precipitation;
      const humidity = cur.relativehumidity_2m;
      const feelsLike = cur.apparent_temperature;
      const isRu = lang === 'ru';

      const forecastHTML = daily.time.map((dateStr, i) => {
        const day = new Date(dateStr);
        const isToday = i === 0;
        const dayName = isToday ? (isRu ? 'Сегодня' : 'Today') : day.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { weekday: 'short' });
        const icon = WMO_ICONS[daily.weathercode[i]] || '🌡️';
        const rain_mm = daily.precipitation_sum[i] || 0;
        const rainProb = daily.precipitation_probability_max ? (daily.precipitation_probability_max[i] || 0) : null;
        return `<div class="forecast-day-card ${isToday ? 'today' : ''}">
          <div class="fday-name">${dayName}</div>
          <div class="fday-icon">${icon}</div>
          <div class="fday-max">${Math.round(daily.temperature_2m_max[i])}°</div>
          <div class="fday-min">${Math.round(daily.temperature_2m_min[i])}°</div>
          ${rainProb !== null ? `<div class="fday-rain">🌂${Math.round(rainProb)}%</div>` : rain_mm > 0 ? `<div class="fday-rain"><i data-lucide="droplets" class="icon-sm"></i>${rain_mm.toFixed(1)}</div>` : ''}
        </div>`;
      }).join('');

      let rainProb = null;
      if (data.daily.precipitation_probability_max && data.daily.precipitation_probability_max[0] !== undefined) {
        rainProb = data.daily.precipitation_probability_max[0];
      } else {
        const wc = cur.weathercode;
        if (wc === 0) rainProb = 2; else if (wc <= 2) rainProb = 10; else if (wc === 3) rainProb = 20;
        else if (wc <= 48) rainProb = 30; else if (wc <= 55) rainProb = 55; else if (wc <= 65) rainProb = 75;
        else if (wc <= 77) rainProb = 80; else if (wc <= 82) rainProb = 70; else rainProb = 90;
        if (rain > 0) rainProb = Math.min(100, rainProb + 20);
      }
      const probNum = Math.round(rainProb);
      const probColor = probNum < 30 ? BRAND.accent : probNum < 60 ? '#ff9800' : '#2196F3';
      const probLabel = probNum < 20 ? (isRu ? 'Маловероятно' : 'Unlikely') : probNum < 50 ? (isRu ? 'Возможно' : 'Possible') : probNum < 75 ? (isRu ? 'Вероятно' : 'Likely') : (isRu ? 'Очень вероятно' : 'Very likely');
      const windLabel = wind < 3 ? (isRu?'Штиль':'Calm') : wind < 5 ? (isRu?'Слабый':'Light') : wind < 10 ? (isRu?'Умеренный':'Moderate') : (isRu?'Сильный':'Strong');
      const humLabel = humidity < 40 ? (isRu?'Сухо':'Dry') : humidity < 70 ? (isRu?'Комфортно':'Comfortable') : (isRu?'Влажно':'Humid');
      const feelLabel = feelsLike < 0 ? (isRu?'Очень холодно':'Very cold') : feelsLike < 10 ? (isRu?'Холодно':'Cold') : feelsLike < 20 ? (isRu?'Прохладно':'Cool') : feelsLike < 28 ? (isRu?'Комфортно':'Comfortable') : (isRu?'Жарко':'Hot');
      const windUnit = isRu ? 'м/с' : 'm/s';
      const rainUnit = isRu ? 'мм' : 'mm';
      const tsLocale = isRu ? 'ru-RU' : 'en-US';

      container.innerHTML = `<div class="weather-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <div style="flex:1;">
            <div class="weather-field-name" style="margin-bottom:2px;">🏙 ${escapeHtml(weatherCityName.split(',')[0])}</div>
            <div style="font-size:12px;color:var(--text3);">
              <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:middle;margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${escapeHtml(weatherCityName)}
            </div>
          </div>
        </div>
        <div class="weather-current">
          <div class="weather-icon">${WMO_ICONS[cur.weathercode] || '🌡️'}</div>
          <div>
            <div class="weather-temp">${Math.round(cur.temperature_2m)}°C</div>
            <div style="font-size:12px;color:var(--text2);">${isRu ? 'Ощущается как' : 'Feels like'} ${Math.round(feelsLike)}°</div>
            <div style="font-size:12px;color:var(--text2);">${(isRu ? WMO_LABELS : WMO_LABELS_EN)[cur.weathercode] || ''}</div>
          </div>
        </div>
        <div class="weather-details-grid">
          <div class="weather-detail-card">
            <div class="weather-detail-label">💨 ${isRu?'Ветер':'Wind'}</div>
            <div class="weather-detail-val">${wind} <span style="font-size:12px;font-weight:400;">${windUnit}</span></div>
            <div class="weather-detail-sub">${windLabel}</div>
          </div>
          <div class="weather-detail-card">
            <div class="weather-detail-label">🌧 ${isRu?'Осадки':'Precip.'}</div>
            <div class="weather-detail-val">${rain} <span style="font-size:12px;font-weight:400;">${rainUnit}</span></div>
            <div class="weather-detail-sub">${rain === 0 ? (isRu?'Нет осадков':'No precipitation') : (isRu?'Есть осадки':'Precipitation')}</div>
          </div>
          <div class="weather-detail-card">
            <div class="weather-detail-label"><i data-lucide="droplets" class="icon-sm"></i> ${isRu?'Влажность':'Humidity'}</div>
            <div class="weather-detail-val">${humidity}<span style="font-size:12px;font-weight:400;">%</span></div>
            <div class="weather-detail-sub">${humLabel}</div>
          </div>
          <div class="weather-detail-card">
            <div class="weather-detail-label">🌡 ${isRu?'Ощущается':'Feels like'}</div>
            <div class="weather-detail-val">${Math.round(feelsLike)}°<span style="font-size:12px;font-weight:400;">C</span></div>
            <div class="weather-detail-sub">${feelLabel}</div>
          </div>
          <div class="rain-prob-card" style="grid-column:1/-1;">
            <div class="rain-prob-label">🌂 ${isRu ? 'Вероятность дождя' : 'Rain Probability'}</div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="flex:1;"><div class="rain-prob-bar-wrap"><div class="rain-prob-bar-fill" style="width:${probNum}%;background:${probColor};"></div></div></div>
              <div class="rain-prob-val" style="color:${probColor};">${probNum}%</div>
            </div>
            <div class="rain-prob-sub">${probLabel}</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${isRu?'Прогноз на 7 дней':'7-Day Forecast'}</div>
        <div class="forecast-7day">${forecastHTML}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:10px;text-align:right;">
          📡 Open-Meteo · ${new Date().toLocaleDateString(tsLocale, {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}
        </div>
      </div>`;
    } catch(err) {
      container.innerHTML = `<div class="weather-card">
        <div class="weather-field-name">${escapeHtml(weatherCityName) || (lang === 'ru' ? 'Город' : 'City')}</div>
        <div style="color:var(--danger);font-size:13px;margin-top:8px;">⚠ ${lang === 'ru' ? 'Не удалось загрузить погоду' : 'Failed to load weather'}</div>
        <button class="modal-btn secondary" style="margin-top:12px;" onclick="loadWeather()">${lang === 'ru' ? 'Повторить' : 'Retry'}</button>
      </div>`;
    }
    return;
  }

  // ── FIELD MODE (original logic) ────────────────────

  // Populate the select
  populateWeatherFieldSelect();

  if (!fields.length) {
    if (fieldInfoBar) fieldInfoBar.style.display = 'none';
    // FIX v1.9: hide meta pill
    const metaElNF = document.getElementById('weather-field-meta');
    if (metaElNF) metaElNF.style.display = 'none';
    container.innerHTML = `
      <div class="weather-no-field" style="display:flex;">
        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24" style="opacity:0.3;"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <p>${lang === 'ru' ? 'Выберите или нарисуйте поле,<br>чтобы увидеть прогноз погоды' : 'Select or draw a field first<br>to see the weather forecast'}</p>
        <button class="modal-btn primary" style="width:auto;padding:12px 24px;margin-top:8px;" onclick="switchTab('map'); startDrawMode()">
          ${lang === 'ru' ? '+ Нарисовать поле' : '+ Draw a field'}
        </button>
      </div>`;
    return;
  }

  // If no field selected, show the prompt
  if (!selectedWeatherFieldId) {
    if (fieldInfoBar) fieldInfoBar.style.display = 'none';
    // FIX v1.9: hide meta pill
    const metaElNS = document.getElementById('weather-field-meta');
    if (metaElNS) metaElNS.style.display = 'none';
    container.innerHTML = `
      <div class="weather-no-field" style="display:flex;">
        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24" style="opacity:0.3;"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <p>${lang === 'ru' ? 'Выберите поле выше,<br>чтобы увидеть прогноз погоды' : 'Select a field above<br>to see the weather forecast'}</p>
      </div>`;
    return;
  }

  const field = fields.find(f => f.id === selectedWeatherFieldId);
  if (!field) return;

  // Show field info bar — FIX 1.8: removed coords. FIX v1.9: show name+area pill
  if (fieldInfoBar) fieldInfoBar.style.display = 'none';
  // FIX v1.9: update field meta pill with name and area in hectares
  const metaEl = document.getElementById('weather-field-meta');
  const metaName = document.getElementById('weather-field-meta-name');
  const metaArea = document.getElementById('weather-field-meta-area');
  if (metaEl && metaName && metaArea) {
    metaEl.style.display = 'flex';
    metaName.textContent = '<i data-lucide="wheat" class="icon-sm"></i> ' + field.name;
    // FIX v1.9: area already stored in ha (field.area), show to 2 decimals
    metaArea.textContent = '📐 ' + formatArea(field.area);
  }

  // Loading state
  container.innerHTML = `<div class="loading-card"><span class="ndvi-loading-spinner"></span> ${lang === 'ru' ? 'Загрузка прогноза...' : 'Loading forecast...'}</div>`;

  try {
    const [lat, lng] = field.center;
    // v3.0: добавлены soil_moisture (4 слоя) и past_days=30 для суммы
    // осадков за последние 30 дней — тот же запрос, тот же бесплатный
    // Open-Meteo API без ключа, реальные модельные данные (ERA5/ECMWF),
    // не тестовые/случайные значения.
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`
      + `&current=temperature_2m,windspeed_10m,weathercode,precipitation,relativehumidity_2m,apparent_temperature`
      + `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,precipitation_probability_max`
      + `&hourly=soil_moisture_0_1cm,soil_moisture_1_3cm,soil_moisture_3_9cm,soil_moisture_9_27cm`
      + `&past_days=30&timezone=auto&forecast_days=7`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const cur = data.current;
    const daily = data.daily;
    const isRu = lang === 'ru';

    const wind = cur.windspeed_10m;
    const rain = cur.precipitation;
    const humidity = cur.relativehumidity_2m;
    const feelsLike = cur.apparent_temperature;
    const canSpray = wind < 5 && rain === 0;

    // v3.0: с добавлением past_days=30 массив daily.time содержит
    // past_days + forecast_days записей (37: 30 прошедших + сегодня + 6
    // будущих), упорядоченных от самой ранней даты к самой поздней.
    // Индекс "сегодня" детерминирован — он всегда равен past_days (30),
    // это надёжнее, чем сравнивать даты через локальные часы браузера
    // (которые могут отличаться от таймзоны поля при &timezone=auto).
    const PAST_DAYS = 30;
    const todayIdx = Math.min(PAST_DAYS, daily.time.length - 1);
    const forecastDays = daily.time.slice(todayIdx, todayIdx + 7);

    // 7-day forecast cards
    const forecastHTML = forecastDays.map((dateStr, iRel) => {
      const i = todayIdx + iRel;
      const day = new Date(dateStr);
      const isToday = iRel === 0;
      const dayName = isToday ? (isRu ? 'Сегодня' : 'Today') : day.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { weekday: 'short' });
      const icon = WMO_ICONS[daily.weathercode[i]] || '🌡️';
      const rain_mm = daily.precipitation_sum[i] || 0;
      const rainProb = daily.precipitation_probability_max ? (daily.precipitation_probability_max[i] || 0) : null;
      return `
        <div class="forecast-day-card ${isToday ? 'today' : ''}">
          <div class="fday-name">${dayName}</div>
          <div class="fday-icon">${icon}</div>
          <div class="fday-max">${Math.round(daily.temperature_2m_max[i])}°</div>
          <div class="fday-min">${Math.round(daily.temperature_2m_min[i])}°</div>
          ${rainProb !== null ? `<div class="fday-rain">🌂${Math.round(rainProb)}%</div>` : rain_mm > 0 ? `<div class="fday-rain"><i data-lucide="droplets" class="icon-sm"></i>${rain_mm.toFixed(1)}</div>` : ''}
        </div>`;
    }).join('');

    // v3.0: сумма осадков за последние 30 дней (дни до todayIdx, не включая
    // сегодня) — реальные дневные суммы из daily.precipitation_sum.
    const past30 = daily.precipitation_sum.slice(Math.max(0, todayIdx - PAST_DAYS), todayIdx);
    const rain30Total = past30.reduce((s, v) => s + (v || 0), 0);
    const rain30Max = Math.max(1, ...past30.map(v => v || 0));
    const rain30BarsHTML = past30.map(v => {
      const h = Math.max(2, Math.round(((v || 0) / rain30Max) * 36));
      return `<div class="rain30-bar" style="height:${h}px;" title="${(v||0).toFixed(1)} mm"></div>`;
    }).join('');

    // v3.0: влажность почвы — реальные данные Open-Meteo (модель ERA5/ECMWF).
    // Берём последнее доступное почасовое значение с непустыми данными по
    // всем слоям — это самый свежий снимок влажности. Прямое сравнение с
    // Date.now() здесь ненадёжно: hourly.time приходит в локальном времени
    // ПОЛЯ (timezone=auto), а не UTC и не таймзоне браузера пользователя,
    // поэтому мы не сопоставляем часы напрямую, а берём последний валидный.
    let soilHTML = '';
    if (data.hourly && data.hourly.time && data.hourly.time.length) {
      const soilLayers = [
        { key: 'soil_moisture_0_1cm', depth: '0–1 см' },
        { key: 'soil_moisture_1_3cm', depth: '1–3 см' },
        { key: 'soil_moisture_3_9cm', depth: '3–9 см' },
        { key: 'soil_moisture_9_27cm', depth: '9–27 см' }
      ];
      let hIdx = data.hourly.time.length - 1;
      while (hIdx > 0 && !soilLayers.some(l => data.hourly[l.key] && data.hourly[l.key][hIdx] != null)) {
        hIdx--;
      }
      const soilRowsHTML = soilLayers.map(l => {
        const v = data.hourly[l.key] ? data.hourly[l.key][hIdx] : null;
        if (v === null || v === undefined) return '';
        // Типичный диапазон объёмной влажности почвы: ~0.05 (сухо) — ~0.5 (насыщено), м³/м³
        const pct = Math.max(0, Math.min(100, Math.round((v / 0.5) * 100)));
        const color = v < 0.15 ? '#ef5350' : v < 0.30 ? '#ffa726' : BRAND.accent;
        return `<div class="soil-layer-row">
          <span class="soil-layer-depth">${l.depth}</span>
          <div class="soil-layer-track"><div class="soil-layer-fill" style="width:${pct}%;background:${color};"></div></div>
          <span class="soil-layer-val" style="color:${color};">${v.toFixed(2)}</span>
        </div>`;
      }).join('');
      if (soilRowsHTML) {
        soilHTML = `<div class="soil-moisture-card">
          <div class="soil-moisture-label"><i data-lucide="sprout" class="icon-sm"></i> ${isRu ? 'Влажность почвы (м³/м³)' : 'Soil moisture (m³/m³)'}</div>
          ${soilRowsHTML}
          <div style="font-size:10px;color:var(--text3);margin-top:6px;">${isRu ? 'Open-Meteo · модель ERA5/ECMWF' : 'Open-Meteo · ERA5/ECMWF model'}</div>
        </div>`;
      }
    }

    // FIX 1: Always use field.name as the primary display title.
    // geoPlaceName = human-readable settlement name from reverse geocode (shown as subtitle).
    // Priority order matches Nominatim address hierarchy:
    //   hamlet > village > town > city > suburb > municipality > county > state > country
    let locationName = field.name; // FIX: primary title is always the field name
    let geoPlaceName = ''; // FIX: settlement name from reverse geocode
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=${lang}`,
        { headers: { 'Accept-Language': lang === 'ru' ? 'ru,en' : 'en' } }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        // FIX: pick the most specific settlement name available
        const settlement =
          addr.hamlet ||
          addr.village ||
          addr.town ||
          addr.city ||
          addr.suburb ||
          addr.borough ||
          addr.municipality ||
          addr.city_district ||
          addr.county ||
          addr.state_district ||
          null;
        const region = addr.state || addr.country || null;
        if (settlement && region) {
          geoPlaceName = `${settlement}, ${region}`;
        } else if (settlement) {
          geoPlaceName = settlement;
        } else if (geoData.display_name) {
          // FIX: fallback — first meaningful segment of display_name
          geoPlaceName = geoData.display_name.split(',').slice(0, 2).join(',').trim();
        }
      }
    } catch(_) {}
    // FIX: last resort fallback — readable coordinates (NOT shown as title, only subtitle)
    if (!geoPlaceName) geoPlaceName = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
    // Keep old variable names for template compatibility
    const geoSubtitle = geoPlaceName;

    const windLabel = wind < 3 ? (isRu?'Штиль':'Calm') : wind < 5 ? (isRu?'Слабый':'Light') : wind < 10 ? (isRu?'Умеренный':'Moderate') : (isRu?'Сильный':'Strong');
    const humLabel = humidity < 40 ? (isRu?'Сухо':'Dry') : humidity < 70 ? (isRu?'Комфортно':'Comfortable') : (isRu?'Влажно':'Humid');
    const windUnit = isRu ? 'м/с' : 'm/s';
    const rainUnit = isRu ? 'мм' : 'mm';
    const tsLocale = isRu ? 'ru-RU' : 'en-US';

    container.innerHTML = `
      <div class="weather-card">
        <!-- FIX 1: Field name header + geo place name subtitle (no pin icon, clean text) -->
        <div style="margin-bottom:14px;">
          <div class="weather-field-name" style="margin-bottom:3px;">${escapeHtml(locationName)}</div>
          <div class="weather-place-name">${escapeHtml(geoSubtitle)}</div>
        </div>

        <!-- Current conditions -->
        <div class="weather-current">
          <div class="weather-icon">${WMO_ICONS[cur.weathercode] || '🌡️'}</div>
          <div>
            <div class="weather-temp">${Math.round(cur.temperature_2m)}°C</div>
            <div style="font-size:12px;color:var(--text2);">${isRu ? 'Ощущается как' : 'Feels like'} ${Math.round(feelsLike)}°</div>
            <div style="font-size:12px;color:var(--text2);">${(isRu ? WMO_LABELS : WMO_LABELS_EN)[cur.weathercode] || ''}</div>
          </div>
        </div>

        <!-- Detail grid -->
        <div class="weather-details-grid">
          <div class="weather-detail-card">
            <div class="weather-detail-label">💨 ${isRu?'Ветер':'Wind'}</div>
            <div class="weather-detail-val">${wind} <span style="font-size:12px;font-weight:400;">${windUnit}</span></div>
            <div class="weather-detail-sub">${windLabel}</div>
          </div>
          <div class="weather-detail-card">
            <div class="weather-detail-label">🌧 ${isRu?'Осадки':'Precip.'}</div>
            <div class="weather-detail-val">${rain} <span style="font-size:12px;font-weight:400;">${rainUnit}</span></div>
            <div class="weather-detail-sub">${rain === 0 ? (isRu?'Нет осадков':'No precipitation') : (isRu?'Есть осадки':'Precipitation')}</div>
          </div>
          <div class="weather-detail-card">
            <div class="weather-detail-label"><i data-lucide="droplets" class="icon-sm"></i> ${isRu?'Влажность':'Humidity'}</div>
            <div class="weather-detail-val">${humidity}<span style="font-size:12px;font-weight:400;">%</span></div>
            <div class="weather-detail-sub">${humLabel}</div>
          </div>
          <div class="weather-detail-card">
            <div class="weather-detail-label">🌿 ${isRu?'Опрыскивание':'Spraying'}</div>
            <div class="weather-detail-val" style="font-size:13px;color:${canSpray ? 'var(--accent)' : 'var(--danger)'};">${canSpray ? (isRu?'✅ Можно':'✅ Safe') : (isRu?'❌ Нельзя':'❌ Avoid')}</div>
            <div class="weather-detail-sub">${canSpray ? (isRu?'Ветер и дождь в норме':'Wind & rain OK') : (isRu?'Ветер/дождь мешают':'Wind/rain prevent')}</div>
          </div>
          ${(() => {
            let rainProb = null;
            if (data.daily.precipitation_probability_max && data.daily.precipitation_probability_max[0] !== undefined) {
              rainProb = data.daily.precipitation_probability_max[0];
            } else {
              const wc = cur.weathercode;
              if (wc === 0) rainProb = 2;
              else if (wc <= 2) rainProb = 10;
              else if (wc === 3) rainProb = 20;
              else if (wc <= 48) rainProb = 30;
              else if (wc <= 55) rainProb = 55;
              else if (wc <= 65) rainProb = 75;
              else if (wc <= 77) rainProb = 80;
              else if (wc <= 82) rainProb = 70;
              else rainProb = 90;
              if (rain > 0) rainProb = Math.min(100, rainProb + 20);
            }
            const probNum = Math.round(rainProb);
            const probColor = probNum < 30 ? BRAND.accent : probNum < 60 ? '#ff9800' : '#2196F3';
            const probLabel = probNum < 20 ? (isRu ? 'Маловероятно' : 'Unlikely') : probNum < 50 ? (isRu ? 'Возможно' : 'Possible') : probNum < 75 ? (isRu ? 'Вероятно' : 'Likely') : (isRu ? 'Очень вероятно' : 'Very likely');
            return `
          <div class="rain-prob-card" style="grid-column:1/-1;">
            <div class="rain-prob-label">🌂 ${isRu ? 'Вероятность дождя' : 'Rain Probability'}</div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="flex:1;">
                <div class="rain-prob-bar-wrap">
                  <div class="rain-prob-bar-fill" style="width:${probNum}%;background:${probColor};"></div>
                </div>
              </div>
              <div class="rain-prob-val" style="color:${probColor};">${probNum}%</div>
            </div>
            <div class="rain-prob-sub">${probLabel}</div>
          </div>`;
          })()}

          <!-- v3.0: сумма осадков за последние 30 дней (реальные данные Open-Meteo) -->
          <div class="rain30-card">
            <div class="rain30-top">
              <span class="soil-moisture-label" style="margin-bottom:0;">🌧 ${isRu ? 'Осадки за 30 дней' : 'Rain, last 30 days'}</span>
              <span class="rain30-val">${rain30Total.toFixed(1)} <span style="font-size:12px;font-weight:400;">${rainUnit}</span></span>
            </div>
            ${past30.length ? `<div class="rain30-bars">${rain30BarsHTML}</div>` : ''}
          </div>

          <!-- v3.0: влажность почвы по слоям (реальные данные Open-Meteo) -->
          ${soilHTML}
        </div>

        <!-- 7-day forecast -->
        <div style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${isRu ? 'Прогноз на 7 дней' : '7-Day Forecast'}</div>
        <div class="forecast-7day">${forecastHTML}</div>

        <div style="font-size:10px;color:var(--text3);margin-top:10px;text-align:right;">
          📡 Open-Meteo · ${new Date().toLocaleDateString(tsLocale, {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}
        </div>
      </div>
    `;
  } catch(err) {
    container.innerHTML = `<div class="weather-card">
      <div class="weather-field-name">${escapeHtml(field.name)}</div>
      <div style="color:var(--danger);font-size:13px;margin-top:8px;">⚠ ${t('weatherLoadError')}</div>
      <button class="modal-btn secondary" style="margin-top:12px;" onclick="loadWeather()">${lang === 'ru' ? 'Повторить' : 'Retry'}</button>
    </div>`;
  }
}
