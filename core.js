// ════════════════════════════════════════════════════
// HECTAR — CORE — переводы, настройки, тема, утилиты, модалки, тосты
// Файл сгенерирован автоматическим разбиением script.js
// См. PROJECT-MAP.md для описания структуры проекта
// ════════════════════════════════════════════════════

// ════════════════════════════════════════════════════
// КОНСТАНТЫ ПРИЛОЖЕНИЯ
// ════════════════════════════════════════════════════
const APP_VERSION = '3.0';
const STORAGE_PREFIX = 'hectar';
const DEFAULT_MAP_CENTER = [51.128, 71.430]; // Астана, Казахстан
const DEFAULT_MAP_ZOOM = 11;
const COUNTRIES_GEOJSON_URL = 'https://geojson.xyz/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson';
const CITIES_GEOJSON_URL = 'https://geojson.xyz/naturalearth-3.3.0/ne_110m_populated_places.geojson';

// ЗАДАЧА 4.4: единая палитра акцента для мест, где цвет нужен как JS-строка
// (Leaflet-стили, canvas, печатный отчёт) — раньше в этих местах зелёный был
// хардкожен по отдельности в каждой функции (#4CAF50, #2e7d32, #1b5e20 и т.д.),
// хотя должен быть частью единой палитры бренда. Значения синхронизированы
// с CSS-переменными --accent/--accent2/--accent-dark в :root.
const BRAND = {
  accent: '#4CAF50',
  accent2: '#2e7d32',
  accentDark: '#1b5e20'
};

// FIX v3.0 п.4 ("на карте не показывается спутниковый снимок / фон карты
// серый"): crossOrigin:'anonymous' раньше стоял в общих TILE_OPTS и попадал
// во ВСЕ базовые слои карты (спутник ArcGIS, OSM, EOX). Он нужен только там,
// где реально нужно читать пиксели тайла через canvas (у нас — отдельный
// ndviLayer ниже, там crossOrigin оставлен). Для обычных базовых тайлов
// (обычные <img>-тайлы Leaflet) это лишний и вредный флаг: если тайл-сервер
// вернёт хоть один запрос без идеальных CORS-заголовков (сбой сети, edge/CDN
// нода без заголовка и т.п.), браузер тихо блокирует ЭТУ картинку — вместо
// одного "битого" тайла получается полностью пустой/серый фон карты, потому
// что crossOrigin переводит подгрузку тайла в "разрешено или ничего" режим.
// Без crossOrigin тайлы грузятся как обычные картинки и всегда отрисуются.
const TILE_OPTS = {
  maxZoom: 18,
  maxNativeZoom: 17,
  minZoom: 3,
  updateWhenIdle: false,
  updateWhenZooming: false,
  keepBuffer: 4,
  errorTileUrl: '',
  tileSize: 256
};

const CROPS = [
  { id: 'wheat', ru: 'Пшеница', en: 'Wheat' },
  { id: 'corn', ru: 'Кукуруза', en: 'Corn' },
  { id: 'sunflower', ru: 'Подсолнух', en: 'Sunflower' },
  { id: 'barley', ru: 'Ячмень', en: 'Barley' },
  { id: 'rapeseed', ru: 'Рапс', en: 'Rapeseed' },
  { id: 'soybean', ru: 'Соя', en: 'Soybean' },
  { id: 'rice', ru: 'Рис', en: 'Rice' },
  { id: 'oats', ru: 'Овёс', en: 'Oats' },
  { id: 'rye', ru: 'Рожь', en: 'Rye' },
  { id: 'buckwheat', ru: 'Гречиха', en: 'Buckwheat' },
  { id: 'millet', ru: 'Просо', en: 'Millet' },
  { id: 'sorghum', ru: 'Сорго', en: 'Sorghum' },
  { id: 'peas', ru: 'Горох', en: 'Peas' },
  { id: 'lentils', ru: 'Чечевица', en: 'Lentils' },
  { id: 'chickpea', ru: 'Нут', en: 'Chickpea' },
  { id: 'flax', ru: 'Лён', en: 'Flax' },
  { id: 'sugar_beet', ru: 'Сахарная свёкла', en: 'Sugar beet' },
  { id: 'potato', ru: 'Картофель', en: 'Potato' },
  { id: 'cotton', ru: 'Хлопок', en: 'Cotton' },
  { id: 'alfalfa', ru: 'Люцерна', en: 'Alfalfa' },
  { id: 'mustard', ru: 'Горчица', en: 'Mustard' },
  { id: 'other', ru: 'Другое', en: 'Other' }
];
function cropLabel(c) { return lang === 'ru' ? c.ru : c.en; }
function resolveCropId(stored) {
  if (!stored) return '';
  const byId = CROPS.find(c => c.id === stored);
  if (byId) return byId.id;
  const byName = CROPS.find(c => c.ru === stored || c.en === stored);
  return byName ? byName.id : stored;
}
function cropDisplayName(stored) {
  if (!stored) return '';
  const id = resolveCropId(stored);
  const c = CROPS.find(x => x.id === id);
  return c ? cropLabel(c) : stored;
}
function populateCropSelect(selectEl, selectedValue) {
  if (!selectEl) return;
  const selected = resolveCropId(selectedValue || '');
  selectEl.innerHTML = `<option value="">${t('noCrop')}</option>`;
  CROPS.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = cropLabel(c);
    if (c.id === selected) opt.selected = true;
    selectEl.appendChild(opt);
  });
}
// ════════════════════════════════════════════════════
// ИНТЕРНАЦИОНАЛИЗАЦИЯ (i18n)
// ════════════════════════════════════════════════════
const translations = {
  ru: {
    map: 'Карта', fields: 'Поля', weather: 'Погода', notes: 'Заметки', profile: 'Профиль',
    allFields: 'Все поля', season2026: 'Сезон 2026',
    ndviTab: 'NDVI', seasonsTab: 'Сезоны',
    addFields: 'Добавить поле', satellite: 'Спутник', streets: 'Карта',
    signInGoogle: 'Войти через Google', signInEmail: 'Войти по Email',
    continueGuest: 'Продолжить как гость',
    select: 'Измерить', draw: 'Нарисовать', undo: 'Шаг назад',
    finishBoundary: 'Завершить границу поля',
    finishShort: 'Готово',
    drawHint: 'Нажмите на карту, чтобы добавить точки',
    noGroups: 'Без группы', satelliteImage: 'Спутниковый снимок',
    noFieldsYet: 'Пока ни одного поля. Нажмите +, чтобы нанести первое',
    back: 'Назад', delete: 'Удалить',
    newField: 'Новое поле', fieldName: 'Название поля', crop: 'Культура',
    fieldColor: 'Цвет', save: 'Сохранить', cancel: 'Отмена',
    noCrop: 'Без культуры', area: 'Площадь', perimeter: 'Периметр',
    created: 'Создано', seasonHistory: 'История сезона',
    addEvent: 'Добавить событие', eventType: 'Тип события',
    date: 'Дата', note: 'Заметка', add: 'Добавить',
    photos: 'Фото', addPhoto: 'Фото',
    sowing: 'Посев', harvest: 'Уборка', watering: 'Полив', spraying: 'Опрыскивание',
    cultivation: 'Культивация', disking: 'Дискование',
    all: 'Все', noNotesYet: 'Здесь пока пусто — заметки появятся тут',
    addNote: 'Добавить заметку', newNote: 'Новая заметка',
    field: 'Поле', selectField: 'Выбрать поле...',
    safeSpray: '✅ Можно опрыскивать', unsafeSpray: '❌ Не рекомендуется',
    wind: 'Ветер', rain: 'Осадки', humidity: 'Влажность',
    noWeatherData: 'Нет полей для отображения погоды',
    deleteConfirm: 'Удалить это поле?',
    ha: 'га', km: 'км', acres: 'акры',
    signIn: 'Войти', signOut: 'Выйти',
    appSettings: 'Настройки приложения',
    units: 'Единицы измерения', theme: 'Тема', notifications: 'Уведомления',
    themeDark: 'Тёмная', themeLight: 'Светлая',
    aboutApp: 'О приложении',
    searchPlace: 'Поиск места', searchPlaceholder: 'Город, страна...',
    noSearchResults: 'Ничего не найдено', searching: 'Поиск...',
    searchError: 'Ошибка сети. Проверьте подключение.',
    searchMinChars: 'Введите минимум 2 символа',
    version: 'Версия', language: 'Язык',
    langEn: 'English', langRu: 'Русский',
    signedIn: 'Вы вошли в систему', signedOut: 'Вы вышли',
    signInHint: 'Войдите для синхронизации настроек',
    agronomist: 'Агроном', aboutTagline: 'Мониторинг сельскохозяйственных полей',
    fieldAdded: 'Поле добавлено', fieldDeleted: 'Поле удалено',
    noteAdded: 'Заметка добавлена', selectFieldPrompt: 'Выберите поле',
    minPoints: 'Добавьте минимум 3 точки',
    geolocateUnavailable: 'Геолокация недоступна',
    geolocateFailed: 'Не удалось получить местоположение',
    weatherLoadError: 'Ошибка загрузки погоды',
    loginSubtitle: 'Мониторинг сельскохозяйственных полей',
  },
  en: {
    map: 'Map', fields: 'Fields', weather: 'Weather', notes: 'Notes', profile: 'Profile',
    allFields: 'All fields', season2026: 'Season 2026',
    ndviTab: 'NDVI', seasonsTab: 'Seasons',
    addFields: 'Add field', satellite: 'Satellite', streets: 'Map',
    signInGoogle: 'Sign in with Google', signInEmail: 'Sign in with Email',
    continueGuest: 'Continue as Guest',
    select: 'Measure', draw: 'Draw', undo: 'Undo',
    finishBoundary: 'Finish field boundary',
    finishShort: 'Finish',
    drawHint: 'Tap on map to add points',
    noGroups: 'No groups', satelliteImage: 'Satellite image',
    noFieldsYet: 'No fields yet — tap + to map your first one',
    back: 'Back', delete: 'Delete',
    newField: 'New field', fieldName: 'Field name', crop: 'Crop',
    fieldColor: 'Color', save: 'Save', cancel: 'Cancel',
    noCrop: 'No crop', area: 'Area', perimeter: 'Perimeter',
    created: 'Created', seasonHistory: 'Season history',
    addEvent: 'Add event', eventType: 'Event type',
    date: 'Date', note: 'Note', add: 'Add',
    photos: 'Photos', addPhoto: 'Photo',
    sowing: 'Sowing', harvest: 'Harvest', watering: 'Watering', spraying: 'Spraying',
    cultivation: 'Cultivation', disking: 'Disking',
    all: 'All', noNotesYet: 'Nothing here yet — your notes will show up',
    addNote: 'Add note', newNote: 'New note',
    field: 'Field', selectField: 'Select field...',
    safeSpray: '✅ Safe to spray', unsafeSpray: '❌ Not recommended',
    wind: 'Wind', rain: 'Rain', humidity: 'Humidity',
    noWeatherData: 'No fields to show weather for',
    deleteConfirm: 'Delete this field?',
    ha: 'ha', km: 'km', acres: 'acres',
    signIn: 'Sign in', signOut: 'Sign out',
    appSettings: 'App settings',
    units: 'Units', theme: 'Theme', notifications: 'Notifications',
    themeDark: 'Dark', themeLight: 'Light',
    aboutApp: 'About',
    searchPlace: 'Search place', searchPlaceholder: 'City, country...',
    noSearchResults: 'No results found', searching: 'Searching...',
    searchError: 'Network error. Check your connection.',
    searchMinChars: 'Enter at least 2 characters',
    version: 'Version', language: 'Language',
    langEn: 'English', langRu: 'Russian',
    signedIn: 'Signed in', signedOut: 'Signed out',
    signInHint: 'Sign in to save settings',
    agronomist: 'Agronomist', aboutTagline: 'Agricultural field monitoring',
    fieldAdded: 'Field added', fieldDeleted: 'Field deleted',
    noteAdded: 'Note added', selectFieldPrompt: 'Select a field',
    minPoints: 'Add at least 3 points',
    geolocateUnavailable: 'Geolocation unavailable',
    geolocateFailed: 'Could not get location',
    weatherLoadError: 'Failed to load weather',
    loginSubtitle: 'Agricultural field monitoring',
  }
};

let lang = 'en';

// Получить перевод
function t(key) { return translations[lang][key] || key; }
// Применить переводы
function applyTranslations() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) el.textContent = translations[lang][key];
  });
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.placeholder = t('searchPlaceholder');
  const loginSub = document.getElementById('login-subtitle');
  if (loginSub) loginSub.innerHTML = `${t('loginSubtitle')}<br>v${APP_VERSION}`;
  const ndviScaleEl = document.querySelector('[data-i18n-ndvi-scale]');
  if (ndviScaleEl) ndviScaleEl.textContent = lang === 'ru' ? 'Шкала NDVI' : 'NDVI Scale';
  const ndviLoEl = document.querySelector('[data-i18n-ndvi-lo]');
  if (ndviLoEl) ndviLoEl.textContent = lang === 'ru' ? '−1 Нет вег.' : '−1 No veg.';
  const ndviHiEl = document.querySelector('[data-i18n-ndvi-hi]');
  if (ndviHiEl) ndviHiEl.textContent = lang === 'ru' ? '+1 Высокая' : '+1 Dense';
  const ndviTitleEl = document.querySelector('[data-i18n-ndvi-title]');
  if (ndviTitleEl) ndviTitleEl.textContent = lang === 'ru' ? 'NDVI — Вегетационный индекс' : 'NDVI — Vegetation Index';
  const ndviDescEl = document.querySelector('[data-i18n-ndvi-desc]');
  if (ndviDescEl) ndviDescEl.innerHTML = lang === 'ru'
    ? '16-дневный композит, разрешение 500 м/пкс. Данные обновляются каждые ~8 дней. Значение NDVI: <span style="color:#ef5350;">0–0.2</span> нет/мало растительности, <span style="color:#FFA500;">0.2–0.5</span> умеренная, <span style="color:#4CAF50;">0.5–1.0</span> густая.'
    : '16-day composite, 500m/px resolution. Data updated every ~8 days. NDVI value: <span style="color:#ef5350;">0–0.2</span> bare/sparse, <span style="color:#FFA500;">0.2–0.5</span> moderate, <span style="color:#4CAF50;">0.5–1.0</span> dense.';
  const ndviNfEl = document.querySelector('[data-i18n-ndvi-nf]');
  if (ndviNfEl) ndviNfEl.innerHTML = lang === 'ru' ? 'Нет полей для анализа.<br>Нарисуйте поле на карте.' : 'No fields to analyze.<br>Draw a field on the map.';

  // Задача 3: i18n для строк бейджа источника NDVI
  const ndviSrcTitleEl = document.querySelector('[data-i18n-ndvi-src-title]');
  if (ndviSrcTitleEl) ndviSrcTitleEl.textContent = lang === 'ru' ? 'NASA GIBS MODIS Terra NDVI' : 'NASA GIBS MODIS Terra NDVI';
  const ndviSrcModisEl = document.querySelector('[data-i18n-ndvi-src-modis]');
  if (ndviSrcModisEl) ndviSrcModisEl.textContent = lang === 'ru' ? 'MODIS 500м · 16 дн. · не реальное время' : 'MODIS 500m · 16-day · not real-time';
  const ndviSentinelTipEl = document.querySelector('[data-i18n-ndvi-sentinel-tip]');
  if (ndviSentinelTipEl) ndviSentinelTipEl.textContent = lang === 'ru'
    ? '💡 Для точности ~10м подключите Sentinel Hub API в настройках (бесплатно до 30 000 пикселей/мес)'
    : '💡 For ~10m accuracy, connect Sentinel Hub API in settings (free up to 30,000 pixels/month)';

  // Задача 4: placeholder поля в Погоде
  const weatherFieldPlaceholder = document.getElementById('weather-field-placeholder');
  if (weatherFieldPlaceholder) weatherFieldPlaceholder.textContent = lang === 'ru' ? '— Выберите поле —' : '— Select a field —';

  // Модалка итогов заезда трактора (Задача 2: разделение сохранения/удаления)
  const sumTitleEl = document.querySelector('[data-i18n-summary-title]');
  if (sumTitleEl) sumTitleEl.textContent = lang === 'ru' ? 'Заезд завершён' : 'Run complete';
  const sumAreaLabelEl = document.querySelector('[data-i18n-summary-area-label]');
  if (sumAreaLabelEl) sumAreaLabelEl.textContent = lang === 'ru' ? 'Обработанная площадь' : 'Area covered';
  const sumDistLabelEl = document.querySelector('[data-i18n-summary-dist-label]');
  if (sumDistLabelEl) sumDistLabelEl.textContent = lang === 'ru' ? 'Дистанция' : 'Distance';
  const sumTimeLabelEl = document.querySelector('[data-i18n-summary-time-label]');
  if (sumTimeLabelEl) sumTimeLabelEl.textContent = lang === 'ru' ? 'Время работы' : 'Work time';
  const sumPickFieldEl = document.querySelector('[data-i18n-summary-pick-field]');
  if (sumPickFieldEl) sumPickFieldEl.textContent = lang === 'ru' ? 'Свободный заезд — выберите поле для сохранения:' : 'Free drive — choose a field to save to:';
  const sumSaveEl = document.querySelector('[data-i18n-summary-save]');
  if (sumSaveEl) sumSaveEl.textContent = lang === 'ru' ? 'Сохранить в историю поля' : 'Save to field history';
  const sumDiscardEl = document.querySelector('[data-i18n-summary-discard]');
  if (sumDiscardEl) sumDiscardEl.textContent = lang === 'ru' ? 'Удалить без сохранения' : 'Discard without saving';
  // Update weather no-field text dynamically
  const wnoFieldText = document.getElementById('weather-no-field-text');
  if (wnoFieldText) wnoFieldText.innerHTML = lang === 'ru'
    ? 'Выберите или нарисуйте поле,<br>чтобы увидеть прогноз погоды'
    : 'Select or draw a field first<br>to see the weather forecast';
  // Weather city mode: Russian localization of buttons/labels
  const cityInput = document.getElementById('weather-city-input');
  if (cityInput) cityInput.placeholder = lang === 'ru' ? 'Поиск города или места...' : 'Search city or location...';
  const favAddLabel = document.getElementById('weather-fav-add-label');
  if (favAddLabel) favAddLabel.textContent = lang === 'ru' ? 'Добавить город' : 'Add current city';
  const favLabel = document.querySelector('.weather-fav-label > span');
  if (favLabel) favLabel.textContent = lang === 'ru' ? '⭐ Избранные места' : '⭐ Favourite places';
  const favEmpty = document.getElementById('weather-fav-empty');
  if (favEmpty && !favEmpty.dataset.hasCity) favEmpty.textContent = lang === 'ru' ? 'Добавьте первый избранный город' : 'Add your first favourite city';
}
function setLang(l) {
  if (l !== 'en' && l !== 'ru') return;
  lang = l;
  localStorage.setItem(STORAGE_PREFIX + '-lang', l);
  const settings = loadSettings();
  settings.language = l;
  saveSettings(settings);
  applyTranslations();
  renderFieldsList();
  renderNotesList();
  renderProfile();
  populateCropSelect(document.getElementById('new-field-crop'));
  if (activeTab === 'weather') loadWeather();
  updateDrawArea();
}
// ════════════════════════════════════════════════════
// ХРАНИЛИЩЕ ДАННЫХ (localStorage)
// ════════════════════════════════════════════════════
function loadFields() {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + '-fields');
    return JSON.parse(data || '[]');
  } catch { return []; }
}
let saveFields = function(fields) {
  localStorage.setItem(STORAGE_PREFIX + '-fields', JSON.stringify(fields));
};

// ════════════════════════════════════════════════════
// АВТОРИЗАЦИЯ (localStorage, без сервера)
// ════════════════════════════════════════════════════
const DEFAULT_USER = { name: 'Агроном Иван', nameEn: 'Agronomist Ivan' };

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + '-auth');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveAuth(auth) {
  if (auth) localStorage.setItem(STORAGE_PREFIX + '-auth', JSON.stringify(auth));
  else localStorage.removeItem(STORAGE_PREFIX + '-auth');
}
function isLoggedIn() { return !!loadAuth()?.loggedIn; }
function getUserName() {
  const auth = loadAuth();
  if (!auth) return '';
  return lang === 'en' ? (auth.nameEn || auth.name) : auth.name;
}
function logoutUser() {
  saveAuth(null);
  renderProfile();
  showToast(t('signedOut'));
}
// ════════════════════════════════════════════════════
// НАСТРОЙКИ ПРИЛОЖЕНИЯ
// ════════════════════════════════════════════════════
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + '-settings');
    const defaults = { units: 'ha', theme: 'dark', notifications: true, language: 'en' };
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch { return { units: 'ha', theme: 'dark', notifications: true, language: 'en' }; }
}
function initLanguage() {
  const stored = localStorage.getItem(STORAGE_PREFIX + '-lang');
  const settings = loadSettings();
  if (stored === 'en' || stored === 'ru') lang = stored;
  else if (settings.language === 'ru' || settings.language === 'en') lang = settings.language;
  else lang = 'en';
}
let saveSettings = function(settings) {
  localStorage.setItem(STORAGE_PREFIX + '-settings', JSON.stringify(settings));
};
function getAreaUnit() {
  const s = loadSettings();
  return s.units === 'acres' ? t('acres') : t('ha');
}
function formatArea(ha) {
  const s = loadSettings();
  if (s.units === 'acres') {
    return (parseFloat(ha) * 2.47105).toFixed(2) + ' ' + t('acres');
  }
  return parseFloat(ha).toFixed(2) + ' ' + t('ha');
}
function formatAreaShort(ha) {
  const s = loadSettings();
  if (s.units === 'acres') {
    return (parseFloat(ha) * 2.47105).toFixed(2);
  }
  return parseFloat(ha) % 1 === 0 ? parseFloat(ha).toString() : parseFloat(ha).toFixed(1);
}
function generateId() {
  return 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
// ════════════════════════════════════════════════════
// ЦВЕТОВОЙ ПИКЕР
// ════════════════════════════════════════════════════
function renderColorPicker(containerId, currentColor, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  FIELD_COLORS.forEach(color => {
    const dot = document.createElement('div');
    dot.className = `color-dot ${color === currentColor ? 'selected' : ''}`;
    dot.style.background = color;
    dot.addEventListener('click', () => {
      container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      onChange(color);
    });
    container.appendChild(dot);
  });
}
// ════════════════════════════════════════════════════
// НАВИГАЦИЯ ПО ТАБАМ
// FIX v1.9: переписана функция switchTab — корректное скрытие/показ экранов
// ════════════════════════════════════════════════════
let activeTab = 'map';
function switchTab(tab) {
  // FIX 2.5 Проблема 4: закрываем fb-auth-modal если он открыт
  const fbModal = document.getElementById('fb-auth-modal');
  if (fbModal && fbModal.style.display !== 'none') {
    fbModal.style.display = 'none';
  }
  // FIX: Close any open modal (e.g. season manager) when switching tabs
  closeAllModals();
  // FIX v1.8 R2: always close field detail screen when switching tabs —
  // otherwise detail screen (z-index:600) stays visible on top of target tab
  const detailScreen = document.getElementById('screen-field-detail');
  if (detailScreen && detailScreen.classList.contains('open')) {
    detailScreen.classList.remove('open');
    currentFieldId = null;
    // Don't call renderFieldsList here — switchTab will do it if tab==='fields'
  }

  // FIX v1.9: при уходе с карты — принудительно завершаем измерение
  if (tab !== 'map' && (isDrawing || document.getElementById('draw-mode-ui')?.classList.contains('active'))) {
    // FIX v1.9: выключаем режим измерения без переключения обратно на карту
    isDrawing = false;
    currentDrawPoints = [];
    if (typeof clearRubberBand === 'function') clearRubberBand();
    if (typeof clearTempDrawLayers === 'function') clearTempDrawLayers();
    if (typeof hideIntersectError === 'function') hideIntersectError();
    // скрыть draw UI
    const drawUi = document.getElementById('draw-mode-ui');
    if (drawUi) drawUi.classList.remove('active');
    const screenMap = document.getElementById('screen-map');
    if (screenMap) screenMap.classList.remove('draw-active');
    const addBtn = document.getElementById('btn-add-field-map');
    if (addBtn) addBtn.style.display = '';
    const drawHint = document.getElementById('draw-hint');
    if (drawHint) drawHint.classList.remove('visible');
  }

  // FIX 1.8: скрываем все экраны через display:none, кроме screen-map —
  // карта всегда остаётся в DOM (Leaflet требует видимого контейнера),
  // но прячем поверх через visibility + pointer-events
  const allScreenIds = ['map', 'fields', 'weather', 'notes', 'profile'];

  allScreenIds.forEach(id => {
    const el = document.getElementById('screen-' + id);
    if (!el) return;
    if (id === 'map') {
      // FIX 1.8: карта не скрывается через display:none — это ломает Leaflet
      if (tab === 'map') {
        el.style.visibility = 'visible';
        el.style.pointerEvents = 'auto';
        el.style.zIndex = '';
        el.classList.add('active');
      } else {
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '-1';
        el.classList.remove('active');
      }
    } else {
      // FIX v1.8: explicitly hide all non-map screens with display:none
      el.classList.remove('active');
      el.style.display = 'none';
    }
  });

  // снимаем active у всех таб-кнопок
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  // FIX v1.8: показываем нужный экран — явно восстанавливаем display
  if (tab !== 'map') {
    const targetScreen = document.getElementById('screen-' + tab);
    if (targetScreen) {
      targetScreen.style.display = 'flex'; // FIX v1.8: override the display:none
      targetScreen.classList.add('active');
    }
  }
  const targetTab = document.getElementById('tab-' + tab);
  if (targetTab) targetTab.classList.add('active');
  activeTab = tab;

  if (tab === 'fields') {
    renderFieldsList();
    setFieldsSubTab(currentFieldsSubTab || 'list');
  }
  if (tab === 'weather') {
    // FIX v2.6 пункт 2: обновляем метки вкладок погоды до текущего языка при первом открытии
    const fieldLbl = document.getElementById('weather-mode-field-label');
    const cityLbl  = document.getElementById('weather-mode-city-label');
    const cityInp  = document.getElementById('weather-city-input');
    if (fieldLbl) fieldLbl.textContent = lang === 'ru' ? 'По полю'  : 'By Field';
    if (cityLbl)  cityLbl.textContent  = lang === 'ru' ? 'По городу': 'By City';
    if (cityInp)  cityInp.placeholder  = lang === 'ru' ? 'Поиск города или места...' : 'Search city or location...';
    populateWeatherFieldSelect();
    // FIX v1.9: render saved favourites on tab open
    renderFavouriteCities();
    loadWeather();
  }
  if (tab === 'notes') renderNotesList();
  if (tab === 'profile') renderProfile();

  // обновляем размер карты при возврате
  if (tab === 'map') {
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
        updateMapLabels();
        // FIX: если был выбран OSM слой — убедиться что он создан и добавлен
        if (currentLayer === 'osm') {
          _ensureOsmLayer();
          if (!map.hasLayer(osmLayer)) osmLayer.addTo(map);
          osmLayer.redraw();
        }
      }
    }, 150);
  }
}
function updateSetting(key, value) {
  const settings = loadSettings();
  if (key === 'notifications') settings.notifications = !!value;
  else if (key === 'language') setLang(value);
  else settings[key] = value;
  saveSettings(settings);
  if (key === 'theme') applyTheme(settings.theme);
  if (key === 'units') {
    renderFieldsList();
    if (typeof currentFieldId !== 'undefined' && currentFieldId) openFieldDetail(currentFieldId);
  }
}
function applyTheme(theme) {
  // FIX v1.8: toggle light/dark class on html element for CSS selectors
  if (theme === 'light') {
    document.documentElement.classList.add('light-theme');
    document.documentElement.classList.remove('dark-theme');
    document.documentElement.style.setProperty('--bg', '#f0f4f8');
    document.documentElement.style.setProperty('--bg2', '#ffffff');
    document.documentElement.style.setProperty('--bg3', '#e8eef4');
    document.documentElement.style.setProperty('--card', 'rgba(255,255,255,0.98)');
    document.documentElement.style.setProperty('--text', '#1a2332');
    document.documentElement.style.setProperty('--text2', '#4a5e72');
    document.documentElement.style.setProperty('--text3', '#7a8fa0');
    document.documentElement.style.setProperty('--border', 'rgba(0,0,0,0.12)');
    document.documentElement.style.setProperty('--shadow', '0 2px 12px rgba(0,0,0,0.12)');
  } else {
    document.documentElement.classList.add('dark-theme');
    document.documentElement.classList.remove('light-theme');
    document.documentElement.style.setProperty('--bg', '#0f1923');
    document.documentElement.style.setProperty('--bg2', '#162231');
    document.documentElement.style.setProperty('--bg3', '#1e2f42');
    document.documentElement.style.setProperty('--card', 'rgba(22, 34, 49, 0.92)');
    document.documentElement.style.setProperty('--text', '#ffffff');
    document.documentElement.style.setProperty('--text2', '#8fa8c0');
    document.documentElement.style.setProperty('--text3', '#4a6580');
    document.documentElement.style.setProperty('--border', 'rgba(255,255,255,0.08)');
    document.documentElement.style.setProperty('--shadow', '0 8px 32px rgba(0,0,0,0.4)');
  }
}
// ════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ════════════════════════════════════════════════════
function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
  document.body.classList.remove('modal-open');
  openModalId = null;
}
function openModal(id) {
  closeAllModals();
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.classList.add('modal-open');
  openModalId = id;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  if (!document.querySelector('.modal-overlay.open')) {
    document.body.classList.remove('modal-open');
    openModalId = null;
  }
}
// Toast уведомление
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = msg;
  el.classList.add('show');
  if (typeof lucide !== 'undefined') lucide.createIcons();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}
// Init season label on load
window.addEventListener('load', () => { setTimeout(updateSeasonLabel, 100); });

let _appStarted = false; // FIX 2.5: guard against double-init
function startApp() {
  if (_appStarted) return; // уже запущено — пропускаем
  _appStarted = true;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').classList.add('visible');
  initLanguage();
  const settings = loadSettings();
  applyTranslations();
  applyTheme(settings.theme);
  initMap();
  renderFieldsList();
  updateSeasonLabel();
  // Reset draw state safely after map is ready
  isDrawing = false;
  currentDrawPoints = [];

  const tabBar = document.getElementById('tab-bar');
  if (tabBar && tractor3DActive) {
    tabBar.style.display = 'none';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
// ════════════════════════════════════════════════════
// v2.6 FAST INIT: splash progress + надёжный запуск
// ════════════════════════════════════════════════════

function setSplashProgress(pct, statusText) {
  const bar = document.getElementById('splash-progress-bar');
  const pctEl = document.getElementById('splash-pct');
  const statusEl = document.getElementById('splash-status');
  if (bar) bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (statusEl && statusText) statusEl.textContent = statusText;
}
function hideSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash || splash.classList.contains('hidden')) return;
  splash.classList.add('fade-out');
  setTimeout(() => {
    splash.classList.add('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 420);
}
(function startWithSplash() {
  setSplashProgress(10, lang === 'ru' ? 'Загрузка...' : 'Loading...');

  // Шаг 1: ждём Firebase SDK (polling 50мс, max 8с)
  // type="module" выполняется после обычных script-тегов,
  // поэтому SDK может быть уже готов (из кэша) или появится чуть позже.
  var sdkAttempts = 0;
  var sdkMax = 160; // 160 * 50ms = 8s
  function waitForSdk() {
    sdkAttempts++;
    var pct = Math.min(10 + Math.round(sdkAttempts / sdkMax * 25), 35);
    setSplashProgress(pct, lang === 'ru' ? 'Загрузка SDK...' : 'Loading SDK...');

    if (window._firebaseSdkReady && window._fbModular) {
      // SDK готов
      setSplashProgress(40, lang === 'ru' ? 'Подключение к Firebase...' : 'Connecting to Firebase...');
      initFirebase();
      setSplashProgress(60, lang === 'ru' ? 'Проверка сессии...' : 'Checking session...');
      waitForAuth();
      return;
    }
    if (sdkAttempts >= sdkMax) {
      // SDK не загрузился — показываем login screen без Firebase
      console.warn('[Hectar] Firebase SDK не загрузился. Работаем offline.');
      setSplashProgress(100, lang === 'ru' ? 'Режим офлайн' : 'Offline mode');
      setTimeout(hideSplash, 400);
      return;
    }
    setTimeout(waitForSdk, 50);
  }

  // Шаг 2: ждём onAuthStateChanged (Firebase читает сессию из памяти браузера)
  // Обычно < 500мс. Max 5с страховка.
  function waitForAuth() {
    var authAttempts = 0;
    var authMax = 100; // 100 * 50ms = 5s
    var authResolved = false;

    // Слушаем первый ответ
    if (fbAuth && window._fbFns) {
      var unsub = window._fbFns.onAuthStateChanged(fbAuth, function(user) {
        if (authResolved) return;
        authResolved = true;
        try { unsub(); } catch(e) {}
        onAuthKnown(user);
      });
    }

    // Polling как страховка (если onAuthStateChanged не сработал)
    function authPoll() {
      if (authResolved) return;
      authAttempts++;
      var pct = Math.min(60 + Math.round(authAttempts / authMax * 35), 95);
      setSplashProgress(pct, lang === 'ru' ? 'Проверка сессии...' : 'Checking session...');
      if (authAttempts >= authMax) {
        if (!authResolved) {
          authResolved = true;
          onAuthKnown(null);
        }
      } else {
        setTimeout(authPoll, 50);
      }
    }
    setTimeout(authPoll, 50);
  }

  function onAuthKnown(user) {
    setSplashProgress(100, user
      ? (lang === 'ru' ? 'Добро пожаловать!' : 'Welcome!')
      : (lang === 'ru' ? 'Готово!' : 'Ready!'));
    setTimeout(hideSplash, 300);
  }

  // Запуск
  setTimeout(waitForSdk, 30);
})();

/*
════════════════════════════════════════════════════
ШАГИ НАСТРОЙКИ FIREBASE (сделайте это после открытия файла):

1. Перейдите на https://console.firebase.google.com/
2. Нажмите "Создать проект" → введите имя (напр. "hectar-app")
3. В проекте: "Добавить приложение" → выберите "</>" (Веб)
4. Имя: "Hectar Web" → нажмите "Зарегистрировать"
5. Скопируйте объект firebaseConfig из появившегося кода
6. Вставьте значения в переменную FIREBASE_CONFIG в начале блока JS выше
   (замените "YOUR_API_KEY", "YOUR_PROJECT_ID" и т.д.)

7. В Firebase Console:
   - Перейдите в Authentication → Sign-in method
   - Включите "Email/password" и "Google"

8. Перейдите в Firestore Database:
   - Нажмите "Создать базу данных"
   - Выберите "Начать в тестовом режиме" (затем настройте правила безопасности)

9. Правила Firestore (вставьте в вкладке Rules):
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }

10. Сохраните HTML файл и откройте снова — Firebase Auth будет работать!
════════════════════════════════════════════════════
*/
// ════════════════════════════════════════════════════
// SERVICE WORKER — offline caching (point 5)
// FIX (iOS Safari): navigator.serviceWorker.register() c blob: URL
// ненадёжен/блокируется в WebKit на iOS — из-за этого офлайн-режим
// PWA не работал на iPhone/iPad, хотя manifest/apple-mobile-web-app
// теги обещали полноценный PWA-опыт. Теперь основной путь — реальный
// same-origin файл sw.js (см. sw.js рядом с index.html), который
// регистрируется как обычный скрипт и работает во всех браузерах,
// включая Safari. Blob-подход оставлен ТОЛЬКО как запасной вариант на
// случай, если sw.js почему-то недоступен по сети (например, кто-то
// раздаёт один index.html без остальных файлов) — но он специально
// пропускается на iOS, где всё равно не сработает, чтобы не оставлять
// молчаливо проваленную регистрацию.
// ════════════════════════════════════════════════════
(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS reports as Mac

  // Основной путь: реальный same-origin sw.js — работает везде, включая iOS.
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then(function (reg) {
      console.log('[Hectar SW] Registered (sw.js), scope:', reg.scope);
    })
    .catch(function (err) {
      console.warn('[Hectar SW] sw.js registration failed:', err && err.message);
      // На iOS Blob-регистрация тоже не работает — нет смысла пробовать,
      // это только производило бы ещё одну тихую ошибку в консоли.
      if (isIOS) {
        console.warn('[Hectar SW] Skipping blob fallback on iOS (unsupported).');
        return;
      }
      registerInlineSWFallback();
    });

  // Запасной путь для не-iOS браузеров, если sw.js недоступен по сети
  // (например, файл не был задеплоен вместе с остальным проектом).
  function registerInlineSWFallback() {
    const SW_VERSION = 'hectar-v' + APP_VERSION;

    const swCode = `
const CACHE_NAME = '${SW_VERSION}';

// On install: cache the page itself
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache the SW registration origin (the HTML page)
      return cache.addAll([
        self.registration.scope
      ]).catch(function() {});
    })
  );
});

// On activate: delete old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// On fetch: cache-first for navigation, network-first with cache fallback for assets
self.addEventListener('fetch', function(event) {
  var req = event.request;
  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Navigation requests (the HTML page itself) — cache-first
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(req).then(function(cached) {
        var networkFetch = fetch(req).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(req, clone); });
          }
          return response;
        }).catch(function() { return cached; });
        return cached || networkFetch;
      })
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts) — network-first, cache as fallback
  var url = req.url;
  var isAsset = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot|gif|webp)(\?|$)/.test(url)
             || url.includes('unpkg.com')
             || url.includes('cdnjs.cloudflare.com')
             || url.includes('cdn.jsdelivr.net')
             || url.includes('gstatic.com/firebasejs');

  if (isAsset) {
    event.respondWith(
      fetch(req).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(req, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match(req);
      })
    );
  }
});
`;

    try {
      var blob = new Blob([swCode], { type: 'application/javascript' });
      var swUrl = URL.createObjectURL(blob);
      navigator.serviceWorker.register(swUrl, { scope: '/' })
        .then(function(reg) {
          console.log('[Hectar SW] Registered (blob fallback), scope:', reg.scope);
        })
        .catch(function(err) {
          // Blob-URL scope restriction on some browsers — try without explicit scope
          navigator.serviceWorker.register(swUrl)
            .then(function(reg) { console.log('[Hectar SW] Registered (blob fallback, no scope):', reg.scope); })
            .catch(function(e) { console.warn('[Hectar SW] Blob fallback registration failed:', e.message); });
        });
    } catch(e) {
      console.warn('[Hectar SW] Could not create SW blob:', e.message);
    }
  }
})();
(function() {
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    var now = Date.now();
    if (now - lastTouchEnd < 300) {
      // Второй тап слишком быстро — предотвращаем zoom/задержку Safari
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
})();














function openAddMenuModal() {
  const m = document.getElementById('modal-add-menu');
  if (m) m.classList.add('open');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
function closeAddMenuModal() {
  const m = document.getElementById('modal-add-menu');
  if (m) m.classList.remove('open');
}
// FIX: Auto-initialize Lucide SVG icons whenever DOM updates
let _lucideDebounce = null;
function refreshLucideIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}
const lucideObserver = new MutationObserver((mutations) => {
  if (typeof lucide !== 'undefined') {
    if (_lucideDebounce) clearTimeout(_lucideDebounce);
    _lucideDebounce = setTimeout(() => {
      lucide.createIcons();
    }, 50);
  }
});
lucideObserver.observe(document.body, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', refreshLucideIcons);
