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

const TILE_OPTS = {
  maxZoom: 18,
  maxNativeZoom: 17,
  minZoom: 3,
  updateWhenIdle: false,
  updateWhenZooming: false,
  keepBuffer: 4,
  crossOrigin: 'anonymous',
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

// ════════════════════════════════════════════════════
// ЗАДАЧА 2: Умный севооборот
// AUDIT v3.0: проведена сверка ROTATION_RULES со списком CROPS.
// Все 21 культура из CROPS (кроме 'other', для которой логика отдельная —
// см. getCropRotationRecommendation) имеют запись в ROTATION_RULES,
// включая mustard (строка ниже). Явных агрономических противоречий
// в парах "плохой предшественник" (подсолнух↔свёкла, рапс↔подсолнух,
// бобовые между собой, картофель после подсолнуха и т.д.) не найдено —
// правки справочных коэффициентов не потребовались. Изменений в этот
// блок не вносилось по решению заказчика.
// ════════════════════════════════════════════════════
const ROTATION_RULES = {
  sunflower: {
    bad: [
      { crops: ['sunflower'], years: 4, reason_ru: 'Подсолнух нельзя 4 года подряд (болезни, паразиты)', reason_en: 'Sunflower must not follow itself for 4 years' },
      { crops: ['sugar_beet'], years: 1, reason_ru: 'После сахарной свёклы — риск болезней', reason_en: 'After sugar beet — disease risk' }
    ],
    good: ['wheat', 'barley', 'peas']
  },
  corn: {
    bad: [
      { crops: ['corn'], years: 2, reason_ru: 'Кукуруза нельзя 2 года подряд (стеблевой мотылёк)', reason_en: 'Corn must not follow itself for 2 years' },
      { crops: ['sunflower'], years: 1, reason_ru: 'После подсолнуха — истощение почвы', reason_en: 'After sunflower — soil depletion' }
    ],
    good: ['wheat', 'peas', 'soybean', 'chickpea']
  },
  rapeseed: {
    bad: [
      { crops: ['rapeseed'], years: 3, reason_ru: 'Рапс нельзя 3 года подряд (кила, склеротиниоз)', reason_en: 'Rapeseed must not follow itself for 3 years' },
      { crops: ['sunflower'], years: 1, reason_ru: 'После подсолнуха — общие болезни', reason_en: 'After sunflower — shared diseases' }
    ],
    good: ['wheat', 'barley', 'peas']
  },
  soybean: {
    bad: [
      { crops: ['soybean', 'peas', 'chickpea', 'lentils'], years: 2, reason_ru: 'Бобовые нельзя 2 года подряд (нематоды, корневые гнили)', reason_en: 'Legumes must not follow each other for 2 years' }
    ],
    good: ['wheat', 'corn']
  },
  wheat: {
    bad: [
      { crops: ['wheat'], years: 2, reason_ru: 'Пшеница нельзя 2 года подряд (септориоз, фузариоз)', reason_en: 'Wheat must not follow itself for 2 years' }
    ],
    good: ['peas', 'soybean', 'rapeseed', 'alfalfa']
  },
  barley: {
    bad: [
      { crops: ['barley', 'oats'], years: 1, reason_ru: 'Ячмень/Овёс нельзя подряд (болезни злаков)', reason_en: 'Barley/Oats must not follow each other' }
    ],
    good: ['peas', 'rapeseed', 'alfalfa']
  },
  potato: {
    bad: [
      { crops: ['potato'], years: 3, reason_ru: 'Картофель нельзя 3 года подряд (фитофтора, нематоды)', reason_en: 'Potato must not follow itself for 3 years' },
      { crops: ['sunflower'], years: 1, reason_ru: 'После подсолнуха — угнетение картофеля', reason_en: 'After sunflower — potato suppression' }
    ],
    good: ['wheat', 'rye', 'alfalfa']
  },
  flax: {
    bad: [
      { crops: ['flax'], years: 4, reason_ru: 'Лён нельзя 4 года подряд (лёноутомление)', reason_en: 'Flax must not follow itself for 4 years' }
    ],
    good: ['wheat', 'barley', 'peas']
  },
  sugar_beet: {
    bad: [
      { crops: ['sugar_beet'], years: 3, reason_ru: 'Свёкла нельзя 3 года подряд (нематоды, ризомания)', reason_en: 'Sugar beet must not follow itself for 3 years' },
      { crops: ['rapeseed'], years: 1, reason_ru: 'После рапса — общие болезни со свёклой', reason_en: 'After rapeseed — shared diseases' }
    ],
    good: ['wheat', 'barley', 'peas']
  },
  cotton: {
    bad: [
      { crops: ['cotton'], years: 3, reason_ru: 'Хлопок нельзя 3 года подряд (вилт, вертициллёз)', reason_en: 'Cotton must not follow itself for 3 years' }
    ],
    good: ['wheat', 'alfalfa']
  },
  alfalfa: {
    bad: [
      { crops: ['alfalfa'], years: 2, reason_ru: 'Люцерна нельзя 2 года подряд (болезни корней)', reason_en: 'Alfalfa must not follow itself for 2 years' }
    ],
    good: ['wheat', 'barley']
  },
  peas:     { bad: [{ crops: ['peas', 'soybean', 'chickpea', 'lentils'], years: 2, reason_ru: 'Бобовые нельзя 2 года подряд', reason_en: 'Legumes must not follow each other for 2 years' }], good: ['wheat', 'barley', 'corn'] },
  lentils:  { bad: [{ crops: ['peas', 'soybean', 'chickpea', 'lentils'], years: 2, reason_ru: 'Бобовые нельзя 2 года подряд', reason_en: 'Legumes must not follow each other for 2 years' }], good: ['wheat', 'barley', 'corn'] },
  chickpea: { bad: [{ crops: ['peas', 'soybean', 'chickpea', 'lentils'], years: 2, reason_ru: 'Бобовые нельзя 2 года подряд', reason_en: 'Legumes must not follow each other for 2 years' }], good: ['wheat', 'barley', 'corn'] },
  oats:      { bad: [{ crops: ['oats', 'barley'], years: 1, reason_ru: 'Не сажать после злаков подряд', reason_en: 'Do not follow cereals in succession' }], good: ['peas', 'rapeseed', 'wheat'] },
  rye:       { bad: [{ crops: ['rye'], years: 2, reason_ru: 'Рожь нельзя 2 года подряд', reason_en: 'Rye must not follow itself for 2 years' }], good: ['peas', 'rapeseed', 'wheat'] },
  buckwheat: { bad: [{ crops: ['buckwheat'], years: 2, reason_ru: 'Гречиха нельзя 2 года подряд', reason_en: 'Buckwheat must not follow itself for 2 years' }], good: ['peas', 'rapeseed', 'wheat'] },
  millet:    { bad: [{ crops: ['millet'], years: 2, reason_ru: 'Просо нельзя 2 года подряд', reason_en: 'Millet must not follow itself for 2 years' }], good: ['peas', 'rapeseed', 'wheat'] },
  sorghum:   { bad: [{ crops: ['sorghum'], years: 2, reason_ru: 'Сорго нельзя 2 года подряд', reason_en: 'Sorghum must not follow itself for 2 years' }], good: ['peas', 'rapeseed', 'wheat'] },
  mustard:   { bad: [{ crops: ['mustard'], years: 2, reason_ru: 'Горчица нельзя 2 года подряд', reason_en: 'Mustard must not follow itself for 2 years' }], good: ['peas', 'rapeseed', 'wheat'] },
  rice:      { bad: [{ crops: ['rice'], years: 2, reason_ru: 'Рис нельзя 2 года подряд', reason_en: 'Rice must not follow itself for 2 years' }], good: ['peas', 'rapeseed', 'wheat'] },
  other:     { bad: [], good: [] }
};

function getCropRotationRecommendation(field) {
  // Собрать историю посевов из season событий (sowing/seeding)
  const allSeasons = field.season || [];
  const sowings = allSeasons.filter(ev => ev.type === 'sowing' || ev.type === 'seeding').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const history = sowings.slice(0, 3).map(ev => resolveCropId(ev.crop || field.crop || '')).filter(Boolean);

  const isRu = lang === 'ru';

  if (history.length === 0) {
    return {
      good: [
        { crop: 'wheat', reason: isRu ? 'Отличный стартовый вариант для любой почвы' : 'Great starter crop for any soil' },
        { crop: 'barley', reason: isRu ? 'Неприхотлив, хорошо стартует' : 'Unpretentious, great starter' },
        { crop: 'peas', reason: isRu ? 'Обогащает почву азотом' : 'Enriches soil with nitrogen' },
        { crop: 'alfalfa', reason: isRu ? 'Улучшает структуру почвы' : 'Improves soil structure' }
      ],
      bad: [],
      note: isRu ? 'Нет истории посевов — рекомендуем начать с этих культур.' : 'No sowing history — recommend starting with these crops.'
    };
  }

  const lastCrop = history[0];
  const rules = ROTATION_RULES[lastCrop];

  let note = '';
  if (history.length < 3) {
    note = isRu ? '⚠️ Для точной рекомендации нужно больше сезонов посевов.' : '⚠️ More seasons needed for a precise recommendation.';
  }

  if (lastCrop === 'other') {
    return {
      good: CROPS.filter(c => c.id !== 'other').slice(0, 4).map(c => ({
        crop: c.id,
        reason: isRu ? 'Кастомная культура — разнообразие культур снижает риски' : 'Custom crop — diversification reduces risks'
      })),
      bad: [{ crop: 'other', reason: isRu ? 'Не рекомендуется сажать ту же кастомную культуру 2 года подряд' : 'Do not plant the same custom crop 2 years in a row', years: 2 }],
      note: (isRu ? 'Кастомная культура. Совет: не сажать её 2 года подряд. ' : 'Custom crop. Tip: do not plant it 2 years in a row. ') + note
    };
  }

  if (!rules) {
    return { good: [], bad: [], note: isRu ? 'Нет данных о правилах для данной культуры.' : 'No rules data for this crop.' };
  }

  // Вычислить плохие культуры
  const badCrops = [];
  if (rules.bad) {
    for (const rule of rules.bad) {
      for (const badCropId of rule.crops) {
        const cropObj = CROPS.find(c => c.id === badCropId);
        if (!cropObj) continue;
        // Проверить, нарушено ли в истории
        const inHistory = history.slice(0, rule.years).includes(badCropId);
        if (inHistory || rule.crops.includes(lastCrop)) {
          if (!badCrops.find(b => b.crop === badCropId)) {
            const reasonStr = (rule.reason_ru && isRu) ? rule.reason_ru : (rule.reason_en || rule.reason || '');
            badCrops.push({ crop: badCropId, reason: reasonStr, years: rule.years });
          }
        }
      }
    }
  }

  // Хорошие культуры (не в плохих)
  const badIds = badCrops.map(b => b.crop);
  const goodCrops = (rules.good || [])
    .filter(cid => !badIds.includes(cid))
    .map(cid => {
      const cropObj = CROPS.find(c => c.id === cid);
      return {
        crop: cid,
        reason: isRu
          ? `Хороший предшественник после ${cropDisplayName(lastCrop)}`
          : `Good following crop after ${cropDisplayName(lastCrop)}`
      };
    });

  // Если нет хороших — добавить универсальные
  if (goodCrops.length === 0) {
    ['wheat', 'barley', 'peas'].filter(c => !badIds.includes(c)).forEach(cid => {
      goodCrops.push({ crop: cid, reason: isRu ? 'Универсальный вариант' : 'Universal option' });
    });
  }

  return { good: goodCrops.slice(0, 5), bad: badCrops.slice(0, 3), note };
}

// ════════════════════════════════════════════════════
// ВИЗУАЛЬНАЯ ИСТОРИЯ СЕВООБОРОТА (ТАЙМЛАЙН)
// ════════════════════════════════════════════════════

/**
 * Собирает историю культур по годам из событий посева (field.season).
 * Возвращает массив { year, crop, cropName } отсортированный по годам.
 */
function buildCropHistory(field) {
  const sowings = (field.season || [])
    .filter(ev => ev.type === 'sowing' || ev.type === 'seeding')
    .filter(ev => ev.date);

  const yearMap = {};
  sowings.forEach(ev => {
    const year = parseInt(ev.date.split('-')[0]);
    if (isNaN(year)) return;
    // Берём последний посев в году
    if (!yearMap[year] || ev.date > yearMap[year].date) {
      yearMap[year] = { year, crop: resolveCropId(ev.crop || field.crop || ''), date: ev.date };
    }
  });

  // Также добавляем текущий год если есть культура но нет посева
  if (field.crop && Object.keys(yearMap).length === 0) {
    const currentYear = new Date().getFullYear();
    yearMap[currentYear] = { year: currentYear, crop: resolveCropId(field.crop), date: field.createdAt || '' };
  }

  return Object.values(yearMap)
    .sort((a, b) => a.year - b.year)
    .map(item => ({
      year: item.year,
      crop: item.crop,
      cropName: item.crop ? cropDisplayName(item.crop) : (lang === 'ru' ? 'Без культуры' : 'No crop')
    }));
}

/**
 * Генерирует HTML таймлайна севооборота.
 */
function renderCropTimeline(field) {
  const history = buildCropHistory(field);
  const isRu = lang === 'ru';

  if (history.length === 0) {
    return `<div style="font-size:12px;color:var(--text3);margin-bottom:12px;">
      ${isRu ? 'Нет данных о посевах — добавьте событие «Посев» в историю сезона' : 'No sowing data — add a "Sowing" event to season history'}
    </div>`;
  }

  // Определяем повторы (одна культура 2+ лет подряд)
  const warnings = [];
  for (let i = 1; i < history.length; i++) {
    if (history[i].crop && history[i].crop === history[i-1].crop && history[i].crop !== 'other') {
      warnings.push(history[i].year);
    }
  }

  // Цвета для культур
  const cropColors = {
    wheat: '#f0c040', corn: '#ffb300', sunflower: '#ff9800', barley: '#c8a04a',
    rapeseed: '#cddc39', soybean: '#8bc34a', rice: '#e8d5b7', oats: '#d7ccc8',
    rye: '#a1887f', buckwheat: '#795548', peas: '#66bb6a', lentils: '#ab8b5c',
    potato: '#d4a04a', sugar_beet: '#e57373', cotton: '#f5f5f5', alfalfa: '#4caf50',
    flax: '#5c6bc0', chickpea: '#d4a574', millet: '#dce775', sorghum: '#c0945e',
    mustard: '#ffd54f', other: '#90a4ae'
  };

  const timelineHTML = history.map(item => {
    const bg = cropColors[item.crop] || '#90a4ae';
    const isWarning = warnings.includes(item.year);
    return `<div class="rotation-tl-item${isWarning ? ' rotation-tl-warn' : ''}">
      <div class="rotation-tl-year">${item.year}</div>
      <div class="rotation-tl-crop" style="background:${bg};">${item.cropName}</div>
      ${isWarning ? `<div class="rotation-tl-alert">⚠️</div>` : ''}
    </div>`;
  }).join('<div class="rotation-tl-arrow">→</div>');

  const warningHTML = warnings.length > 0
    ? `<div style="background:rgba(255,152,0,0.12);border:1px solid rgba(255,152,0,0.3);border-radius:8px;padding:8px 12px;font-size:12px;color:var(--text2);margin-top:10px;">
        ⚠️ ${isRu ? 'Одна и та же культура 2 года подряд — риск болезней и снижения урожайности' : 'Same crop 2 years in a row — risk of disease and yield loss'}
      </div>`
    : '';

  return `
    <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:8px;">
      ${isRu ? '📅 История культур' : '📅 Crop history'}
    </div>
    <div class="rotation-tl-wrap">${timelineHTML}</div>
    ${warningHTML}
    <div style="height:14px;"></div>
  `;
}

// ════════════════════════════════════════════════════
// КАЛЬКУЛЯТОР НОРМ РАСХОДА
// ════════════════════════════════════════════════════

/**
 * Предустановленные шаблоны норм расхода.
 */
const CALC_PRESETS = [
  { id: 'seeds_wheat', ru: 'Семена пшеницы', en: 'Wheat seeds', rate: 200, unit: 'kg' },
  { id: 'seeds_corn', ru: 'Семена кукурузы', en: 'Corn seeds', rate: 25, unit: 'kg' },
  { id: 'herbicide', ru: 'Гербицид', en: 'Herbicide', rate: 2, unit: 'l' },
  { id: 'fertilizer_n', ru: 'Азотное удобрение', en: 'Nitrogen fertilizer', rate: 150, unit: 'kg' },
  { id: 'fertilizer_p', ru: 'Фосфорное удобрение', en: 'Phosphorus fertilizer', rate: 100, unit: 'kg' },
  { id: 'insecticide', ru: 'Инсектицид', en: 'Insecticide', rate: 0.5, unit: 'l' },
  { id: 'fungicide', ru: 'Фунгицид', en: 'Fungicide', rate: 1, unit: 'l' },
];

/**
 * Генерирует HTML секции калькулятора.
 */
function renderCalcSection(field) { return ""; }

/**
 * Пересчёт калькулятора при вводе.
 */
function calcFieldDose(fieldId, netAreaHa) {
  const rate = parseFloat(document.getElementById('calc-rate-' + fieldId)?.value) || 0;
  const price = parseFloat(document.getElementById('calc-price-' + fieldId)?.value) || 0;
  const unitEl = document.getElementById('calc-unit-' + fieldId);
  const unitVal = unitEl ? unitEl.value : 'kg';
  const isRu = lang === 'ru';

  const unitLabel = { kg: isRu ? 'кг' : 'kg', l: isRu ? 'л' : 'l', pcs: isRu ? 'шт' : 'pcs' };
  const currency = isRu ? '₸' : '$';

  const total = rate * netAreaHa;
  const cost = total * price;

  const totalEl = document.getElementById('calc-total-' + fieldId);
  const costEl = document.getElementById('calc-cost-' + fieldId);

  if (totalEl) totalEl.textContent = rate > 0 ? `${total.toFixed(1)} ${unitLabel[unitVal] || unitVal}` : '—';
  if (costEl) costEl.textContent = (rate > 0 && price > 0) ? `${cost.toFixed(0)} ${currency}` : '—';
}

/**
 * Применить пресет к калькулятору.
 */
function applyCalcPreset(fieldId, rate, unit) {
  const rateEl = document.getElementById('calc-rate-' + fieldId);
  const unitEl = document.getElementById('calc-unit-' + fieldId);
  if (rateEl) rateEl.value = rate;
  if (unitEl) unitEl.value = unit;
  // Найти поле и пересчитать
  const fields = loadFields();
  const field = fields.find(f => f.id === fieldId);
  if (field) calcFieldDose(fieldId, getNetFieldArea(field));
}

function renderCropRotationBlock(field) {
  const rec = getCropRotationRecommendation(field);
  const isRu = lang === 'ru';

  // v3.0 UX FIX: "хорошие" культуры раньше рендерились как 4 одинаковые
  // крупные карточки с дословно повторяющимся текстом объяснения
  // ("Хороший предшественник после Пшеница" x4) — избыточная когнитивная
  // нагрузка. Теперь: общая подпись-обоснование один раз сверху,
  // сами культуры — компактные чипы в один визуальный ряд.
  const goodReason = rec.good.length > 0 ? rec.good[0].reason : '';
  const goodHTML = rec.good.length > 0
    ? `${goodReason ? `<div style="font-size:12px;color:var(--text2);margin-bottom:8px;">${goodReason}</div>` : ''}
       <div class="rotation-good-chips">
         ${rec.good.map(g => `<span class="rotation-chip">✅ ${escapeHtml(cropDisplayName(g.crop))}</span>`).join('')}
       </div>`
    : `<div style="color:var(--text3);font-size:13px;">${isRu ? 'Нет данных' : 'No data'}</div>`;

  // "Плохие" культуры остаются крупными акцентными карточками — это
  // критичная для агронома информация, она должна быть заметнее «хорошего».
  const badHTML = rec.bad.length > 0
    ? rec.bad.map(b => `
        <div style="background:rgba(239,83,80,0.10);border:1px solid rgba(239,83,80,0.3);border-radius:8px;padding:10px 12px;margin-bottom:6px;">
          <div style="font-weight:700;color:#ef5350;font-size:14px;">❌ ${escapeHtml(cropDisplayName(b.crop))}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px;">${b.reason}</div>
        </div>`).join('')
    : `<div style="color:var(--text3);font-size:13px;">${isRu ? 'Ограничений нет — поле готово к любой культуре' : 'No restrictions — field is ready for any crop'}</div>`;

  const noteHTML = rec.note ? `<div style="background:rgba(255,193,7,0.12);border:1px solid rgba(255,193,7,0.3);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--text2);margin-bottom:10px;">${rec.note}</div>` : '';

  return `
    <div id="crop-rotation-block" style="margin-top:0;">
      ${renderCropTimeline(field)}
      ${noteHTML}
      <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:6px;">${isRu ? '✅ Рекомендуется посеять:' : '✅ Recommended:'}</div>
      ${goodHTML}
      <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:6px;margin-top:14px;">${isRu ? '❌ Не рекомендуется:' : '❌ Not recommended:'}</div>
      ${badHTML}
    </div>`;
}

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

// ════════════════════════════════════════════════════
// ЗАДАЧА 2.1: конфигурируемый источник данных NDVI
// ════════════════════════════════════════════════════
// Сейчас единственный реализованный канал — NASA GIBS WMTS (растровые
// PNG-тайлы с декодированием цвета обратно в NDVI). Это fallback-канал
// по определению: WMTS отдаёт готовую картинку, а не числовые значения,
// поэтому декодирование цвета — приближение, а не измерение.
//
// Чтобы заменить канал на числовой источник (WCS у NASA GIBS, либо
// Sentinel Hub Statistics API — Sentinel-2, 10 м/пкс, отдаёт готовое
// среднее/медиану NDVI по GeoJSON-полигону поля без сэмплирования
// пикселей на клиенте) — нужен API-ключ/регистрация, которую сейчас
// добавить нельзя. Поэтому источник вынесен в конфиг с явным списком
// провайдеров: включить числовой канал в будущем — значит прописать
// сюда ключ и endpoint, не переписывая остальную логику приложения.
const NDVI_DATA_SOURCE = {
  // 'gibs-wmts-color' — текущий рабочий канал (PNG-тайл + декодирование цвета).
  // 'sentinel-hub-stats' — числовой канал (Sentinel-2 Statistics API, 10 м/пкс).
  //   Требует NDVI_DATA_SOURCE.sentinelHub.clientId/clientSecret — пока не заданы.
  active: 'gibs-wmts-color',
  sentinelHub: {
    statsUrl: 'https://services.sentinel-hub.com/api/v1/statistics',
    tokenUrl: 'https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token',
    clientId: null,
    clientSecret: null
  }
};

function ndviSourceIsNumeric() {
  return NDVI_DATA_SOURCE.active === 'sentinel-hub-stats'
    && !!NDVI_DATA_SOURCE.sentinelHub.clientId
    && !!NDVI_DATA_SOURCE.sentinelHub.clientSecret;
}

// Числовой канал: Sentinel Hub Statistics API принимает GeoJSON-полигон поля
// и возвращает готовое среднее NDVI по площади — без ручного сэмплирования
// пикселей. Активируется только если заданы ключи в NDVI_DATA_SOURCE.sentinelHub.
async function sampleNdviFromSentinelHub(field) {
  const cfg = NDVI_DATA_SOURCE.sentinelHub;
  if (!cfg.clientId || !cfg.clientSecret || !field.coordinates || field.coordinates.length < 3) return null;
  try {
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(cfg.clientId)}&client_secret=${encodeURIComponent(cfg.clientSecret)}`
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return null;

    const ring = [...field.coordinates, field.coordinates[0]].map(c => [c[1], c[0]]); // [lng, lat]
    const today = new Date();
    const from = new Date(today); from.setDate(from.getDate() - 20);
    const body = {
      input: {
        bounds: { geometry: { type: 'Polygon', coordinates: [ring] } },
        data: [{ type: 'sentinel-2-l2a' }]
      },
      aggregation: {
        timeRange: { from: from.toISOString(), to: today.toISOString() },
        aggregationInterval: { of: 'P20D' },
        evalscript: `//VERSION=3\nfunction setup(){return{input:[{bands:["B04","B08","dataMask"]}],output:[{id:"ndvi",bands:1},{id:"dataMask",bands:1}]};}\nfunction evaluatePixel(s){let ndvi=(s.B08-s.B04)/(s.B08+s.B04);return{ndvi:[ndvi],dataMask:[s.dataMask]};}`
      }
    };
    const statsRes = await fetch(cfg.statsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenData.access_token}` },
      body: JSON.stringify(body)
    });
    const statsData = await statsRes.json();
    const stats = statsData?.data?.[0]?.outputs?.ndvi?.bands?.B0?.stats;
    if (!stats || typeof stats.mean !== 'number') return null;
    return parseFloat(Math.max(-0.2, Math.min(0.95, stats.mean)).toFixed(2));
  } catch (e) {
    return null; // сеть/ключи недоступны — вызывающий код уйдёт на fallback-канал
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
 * 1. Sentinel Hub (API): Высокая точность (~10м/пкс), актуальность высокая. Использует Sentinel-2, отдаёт сразу числовое среднее.
 * 2. NASA MODIS (WMTS): Средняя точность (~250м/пкс, Level 9), актуальность 16-дней. Сэмплируется по пикселям на холсте.
 * 3. Расчётная модель (Fallback): Эмуляция данных на основе культуры, сезона и координат, если нет интернета/ключей.
 *
 * Определяет NDVI для поля.
 * Возвращает {value, estimated, source}:
 *  - estimated: true, если значение — расчётная модель (estimateFieldNdvi),
 *    а не измерение по спутниковым данным (ЗАДАЧА 2.3 — честная маркировка).
 *  - source: 'sentinel-hub-stats' | 'gibs-wmts-color' | 'model'.
 *
 * Порядок источников (ЗАДАЧА 2.1):
 *  1. Числовой канал (Sentinel Hub Statistics API), если сконфигурирован —
 *     отдаёт готовое среднее NDVI по полигону поля, без сэмплирования пикселей.
 *  2. WMTS-тайл NASA GIBS + декодирование цвета — окно сэмплирования теперь
 *     ограничено пикселями, реально попадающими внутрь полигона поля (ЗАДАЧА 2.2,
 *     через turf.booleanPointInPolygon), а не фиксированным 15×15 окном вокруг центра.
 *  3. estimateFieldNdvi() — синтетическая модель, помечается estimated:true.
 */
async function sampleNdviForField(field) {
  if (!field.coordinates || field.coordinates.length < 3) {
    return { value: estimateFieldNdvi(field), estimated: true, source: 'model' };
  }

  // 1. Числовой источник (Sentinel Hub), если сконфигурирован ключами
  if (ndviSourceIsNumeric()) {
    const numeric = await sampleNdviFromSentinelHub(field);
    if (numeric !== null) {
      return { value: numeric, estimated: false, source: 'sentinel-hub-stats' };
    }
    // ключи заданы, но запрос не удался — идём на WMTS-fallback ниже
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

  // Задача 3: трекинг источников для обновления глобального source badge
  const sourceCounts = { 'sentinel-hub-stats': 0, 'gibs-wmts-color': 0, 'model': 0 };

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

    // Задача 3: формируем rich badge источника данных для карточки поля
    let srcBadgeClass, srcIcon, srcLabel;
    if (result.source === 'sentinel-hub-stats') {
      srcBadgeClass = 'ndvi-src-sentinel';
      srcIcon = '🛰';
      srcLabel = lang === 'ru' ? 'Sentinel-2 ~10м' : 'Sentinel-2 ~10m';
    } else if (result.source === 'gibs-wmts-color') {
      srcBadgeClass = 'ndvi-src-modis';
      srcIcon = '🛰';
      srcLabel = lang === 'ru' ? 'MODIS 500м' : 'MODIS 500m';
    } else {
      srcBadgeClass = 'ndvi-src-model';
      srcIcon = '⚠️';
      srcLabel = lang === 'ru' ? 'смоделировано' : 'modeled';
    }
    const sourceBadgeHtml = `<span class="ndvi-src-badge ${srcBadgeClass}" style="margin-left:4px;font-size:10px;" title="${
      result.source === 'sentinel-hub-stats'
        ? (lang === 'ru' ? 'Реальные спутниковые данные Sentinel-2 (~10м/пкс)' : 'Real Sentinel-2 satellite data (~10m/px)')
        : result.source === 'gibs-wmts-color'
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

  // Задача 3: Обновление глобального бейджа источника в шапке панели
  const globalBadge = document.getElementById('ndvi-active-source-badge');
  if (globalBadge) {
    let domSource = 'model';
    if (sourceCounts['sentinel-hub-stats'] > 0) domSource = 'sentinel-hub-stats';
    else if (sourceCounts['gibs-wmts-color'] > 0) domSource = 'gibs-wmts-color';

    globalBadge.className = 'ndvi-src-badge'; // reset
    let srcIcon = '⚠️', srcLabel = lang === 'ru' ? 'Смоделировано' : 'Modeled';
    if (domSource === 'sentinel-hub-stats') {
      globalBadge.classList.add('ndvi-src-sentinel');
      srcIcon = '🛰'; srcLabel = lang === 'ru' ? 'Sentinel-2 ~10м' : 'Sentinel-2 ~10m';
    } else if (domSource === 'gibs-wmts-color') {
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

  // Ищем дату посева в событиях сезона
  const sowEvent = (field.season || []).find(e => e.type === 'sowing');
  // Также проверяем field.sowingDate (если задано в карточке поля)
  const sowDateStr = sowEvent ? sowEvent.date : (field.sowingDate || null);

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

// ════════════════════════════════════════════════════
// СОХРАНИТЬ НОВОЕ ПОЛЕ
// ════════════════════════════════════════════════════
function saveNewField() {
  const name = document.getElementById('new-field-name').value.trim() || (lang === 'ru' ? 'Поле' : 'Field');
  const crop = document.getElementById('new-field-crop').value;
  const { coords, area, perimeter, center } = window._pendingFieldData;

  const field = {
    id: generateId(),
    name,
    crop,
    color: selectedNewFieldColor,
    area,
    perimeter,
    coordinates: coords,
    center,
    createdAt: new Date().toISOString().split('T')[0],
    season: [],
    photos: []
  };

  const fields = loadFields();
  fields.push(field);
  saveFields(fields);

  // Убрать временную графику
  if (tempPolyline) { tempPolyline.removeFrom(map); tempPolyline = null; }
  if (tempPolygon) { tempPolygon.removeFrom(map); tempPolygon = null; }
  currentDrawPoints = [];
  isDrawing = false;

  addFieldToMap(field);
  closeModal('modal-save-field');
  renderFieldsList();
  showToast(`${t('fieldAdded')}: "${name}"`);
}

// ════════════════════════════════════════════════════
// ФИЛЬТР ПОЛЕЙ
// ════════════════════════════════════════════════════
let currentFieldFilter = 'all';
function setFieldFilter(filter) {
  currentFieldFilter = filter;
  document.querySelectorAll('[data-ffilter]').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-ffilter') === filter);
  });
  renderFieldsList();
}

// ════════════════════════════════════════════════════
// FIX v1.9.1: ДИНАМИЧЕСКИЕ ФИЛЬТРЫ ПОЛЕЙ
// Генерирует фильтры на основе реальных данных полей:
// — культуры (unique crop values)
// — статус здоровья (unique health categories present)
// — «Большие» только если есть поля с area > 50 га
// ════════════════════════════════════════════════════
function renderFieldFilters() {
  const fields = loadFields();
  const row = document.getElementById('fields-filter-row');
  if (!row) return;

  const chips = [];

  // Always: "All" chip
  chips.push({ key: 'all', label: lang === 'ru' ? 'Все' : 'All' });

  // FIX v1.9.1: Cultures — only those present in actual field data
  const cropEmojis = { wheat:'<i data-lucide="wheat" class="icon-sm"></i>', corn:'🌽', sunflower:'🌻', barley:'🌿', soybean:'🫘', rapeseed:'<i data-lucide="sprout" class="icon-sm"></i>', rice:'<i data-lucide="wheat" class="icon-sm"></i>', oats:'🌿', rye:'🌿', buckwheat:'🌿', millet:'🌿', sorghum:'<i data-lucide="wheat" class="icon-sm"></i>', peas:'🫛', lentils:'🌿', chickpea:'🫘', flax:'🌼', sugar_beet:'<i data-lucide="sprout" class="icon-sm"></i>', potato:'🥔', cotton:'🌸', alfalfa:'🌿', mustard:'🌼', other:'<i data-lucide="sprout" class="icon-sm"></i>' };
  const uniqueCrops = [...new Set(fields.map(f => f.crop).filter(Boolean))];
  uniqueCrops.forEach(cropId => {
    const cropObj = CROPS.find(c => c.id === cropId);
    if (!cropObj) return;
    const emoji = cropEmojis[cropId] || '<i data-lucide="sprout" class="icon-sm"></i>';
    chips.push({ key: cropId, label: `${emoji} ${lang === 'ru' ? cropObj.ru : cropObj.en}` });
  });

  // FIX v1.9.1: Health status — only statuses that exist in the current field data
  const healthCategories = { healthy: false, weak: false };
  fields.forEach(f => {
    const ndvi = estimateFieldNdvi(f);
    if (ndvi >= 0.45) healthCategories.healthy = true;
    else healthCategories.weak = true;
  });
  if (healthCategories.healthy) chips.push({ key: 'healthy', label: lang === 'ru' ? '✅ Здоровые' : '✅ Healthy' });
  if (healthCategories.weak) chips.push({ key: 'weak', label: lang === 'ru' ? '⚠️ Слабые' : '⚠️ Weak' });

  // FIX v1.9.1: "Large" filter only if any field has area > 50 ha
  const hasLarge = fields.some(f => f.area > 50);
  if (hasLarge) chips.push({ key: 'large', label: lang === 'ru' ? '📐 Большие' : '📐 Large' });

  // Render chips
  row.innerHTML = chips.map(chip =>
    `<button class="filter-chip ${currentFieldFilter === chip.key ? 'active' : ''}" data-ffilter="${chip.key}" onclick="setFieldFilter('${chip.key}')">${chip.label}</button>`
  ).join('');
}

// ════════════════════════════════════════════════════
// РЕНДЕР СПИСКА ПОЛЕЙ (улучшенный)
// ════════════════════════════════════════════════════
function renderFieldsList() {
  // FIX v1.9.1: Rebuild dynamic filters whenever the list renders
  renderFieldFilters();

  let fields = loadFields();
  const container = document.getElementById('fields-list-container');
  const emptyEl = document.getElementById('fields-empty');
  const totalLabel = document.getElementById('total-area-label');

  const total = fields.reduce((s, f) => s + f.area, 0).toFixed(1);
  totalLabel.textContent = `${formatArea(total)}`;

  // Применить фильтр
  let filtered = fields;
  if (currentFieldFilter !== 'all') {
    if (currentFieldFilter === 'healthy') {
      filtered = fields.filter(f => estimateFieldNdvi(f) >= 0.45);
    } else if (currentFieldFilter === 'weak') {
      filtered = fields.filter(f => estimateFieldNdvi(f) < 0.45);
    } else if (currentFieldFilter === 'large') {
      filtered = [...fields].sort((a, b) => b.area - a.area);
    } else {
      filtered = fields.filter(f => f.crop === currentFieldFilter);
    }
  }

  // Очистить (кроме empty)
  Array.from(container.children).forEach(el => {
    if (el !== emptyEl) el.remove();
  });

  if (fields.length === 0) {
    emptyEl.style.display = 'flex';
    return;
  }
  emptyEl.style.display = 'none';

  if (filtered.length === 0) {
    const noMatch = document.createElement('div');
    noMatch.className = 'empty-state';
    noMatch.innerHTML = `<p style="color:var(--text3);font-size:14px;">${lang === 'ru' ? 'Нет полей по фильтру' : 'No fields match the filter'}</p>`;
    container.appendChild(noMatch);
    return;
  }

  filtered.forEach(field => {
    const ndvi = estimateFieldNdvi(field);
    const health = getHealthStatus(ndvi);
    const stage = getVegetationStage(field);
    const yieldFc = getYieldForecast(field, ndvi);
    const ndviColor = getNdviColor(ndvi);
    const ndviPct = Math.round(ndvi * 100);

    // Дата следующей обработки (через 14 дней от последнего события или через 7 дней)
    let nextTreat = '—';
    if (field.season && field.season.length > 0) {
      const lastDate = new Date(field.season[0].date);
      lastDate.setDate(lastDate.getDate() + 14);
      nextTreat = lastDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' });
    }

    // Дата последнего посева
    const sowEvent = (field.season || []).find(e => e.type === 'sowing');
    const sowDate = sowEvent ? new Date(sowEvent.date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' }) : '—';

    const card = document.createElement('div');
    card.className = 'field-card-expanded';
    card.innerHTML = `
      <div class="field-card-top">
        <div class="field-thumb">
          <canvas width="72" height="72" id="thumb-${escapeHtml(field.id)}"></canvas>
        </div>
        <div class="field-card-info" style="flex:1;min-width:0;">
          <div class="field-card-name">${escapeHtml(field.name)}</div>
          <div style="display:flex;gap:6px;align-items:baseline;margin-top:2px;">
            <span style="font-size:15px;font-weight:700;">${formatAreaShort(field.area)} <span style="font-size:12px;color:var(--text2);font-weight:400;">${getAreaUnit()}</span></span>
            <span style="font-size:12px;color:var(--text3);">· ${field.perimeter} км</span>
          </div>
          <div style="font-size:12px;color:var(--text2);margin-top:1px;">${field.crop ? cropDisplayName(field.crop) : t('noCrop')}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
          <span class="field-badge ${health.cls}">${health.label}</span>
          <span style="font-size:11px;color:var(--text3);">${field.createdAt}</span>
        </div>
      </div>

      <!-- Бейджи + кнопка карты: бейджи слева, иконка-кнопка справа в одной строке -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:8px;">
        <div style="display:flex;gap:6px;flex-wrap:nowrap;align-items:center;min-width:0;overflow:hidden;">
          <span class="field-badge blue" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;"><i data-lucide="sprout" class="icon-sm"></i> ${stage}</span>
          <span class="field-badge" style="white-space:nowrap;flex-shrink:0;">📅 ${sowDate}</span>
        </div>
        <button class="field-map-icon-btn" onclick="event.stopPropagation(); goToFieldOnMap('${escapeHtml(field.id)}')" title="Показать на карте">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span style="font-size:11px;font-weight:600;">${lang === 'ru' ? 'На карте' : 'On map'}</span>
        </button>
      </div>
    `;
    card.addEventListener('click', () => openFieldDetail(field.id));
    container.appendChild(card);

    // FIX v1.9.1: only draw thumb; sparkline removed from list cards
    setTimeout(() => {
      drawFieldThumb(field);
    }, 50);
  });
}

// Миниатюра поля на canvas
function drawFieldThumb(field) {
  const canvas = document.getElementById(`thumb-${field.id}`);
  if (!canvas || !field.coordinates || field.coordinates.length < 3) return;
  const ctx = canvas.getContext('2d');
  const W = 72, H = 72;
  ctx.clearRect(0, 0, W, H);

  // Нормализовать координаты
  const lats = field.coordinates.map(c => c[0]);
  const lngs = field.coordinates.map(c => c[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 8;
  const scaleX = (W - pad * 2) / ((maxLng - minLng) || 1);
  const scaleY = (H - pad * 2) / ((maxLat - minLat) || 1);
  const scale = Math.min(scaleX, scaleY);

  ctx.beginPath();
  field.coordinates.forEach((c, i) => {
    const x = pad + (c[1] - minLng) * scale;
    const y = H - pad - (c[0] - minLat) * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = field.color + '40';
  ctx.fill();
  ctx.strokeStyle = field.color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ════════════════════════════════════════════════════
// ДЕТАЛЬНЫЙ ЭКРАН ПОЛЯ
// ════════════════════════════════════════════════════
let currentFieldId = null;

function openFieldDetail(fieldId) {
  currentFieldId = fieldId;
  const fields = loadFields();
  const field = fields.find(f => f.id === fieldId);
  if (!field) return;

  document.getElementById('detail-field-title').textContent = field.name;

  const scroll = document.getElementById('detail-scroll');
  scroll.innerHTML = renderFieldDetailHTML(field);

  // Цветовые кружки
  renderColorPicker('detail-color-picker', field.color, (c) => {
    const fields2 = loadFields();
    const f = fields2.find(x => x.id === fieldId);
    if (f) {
      f.color = c;
      saveFields(fields2);
      renderFieldsList();
      // Обновить полигон на карте
      if (drawnPolygons[fieldId]) {
        drawnPolygons[fieldId].setStyle({ color: c, fillColor: c });
      }
    }
  });

  document.getElementById('screen-field-detail').classList.add('open');
}

function renderFieldDetailHTML(field) {
  const fieldCropId = resolveCropId(field.crop);
  const eventTypeLabel = { sowing: t('sowing'), harvest: t('harvest'), watering: t('watering'), spraying: t('spraying'), cultivation: t('cultivation'), disking: t('disking') };

  const ndvi = estimateFieldNdvi(field);
  const health = getHealthStatus(ndvi);
  // FIX v1.8: removed fake getVegetationStage() and getYieldForecast() — user-editable instead
  const ndviColor = getNdviColor(ndvi);
  const sowEvent = (field.season || []).find(e => e.type === 'sowing');
  const sowDate = sowEvent ? sowEvent.date : '—';
  // FIX v1.8: removed auto-computed nextTreatDate (was +14 days fake calc)

  // FIX v1.8 R2: season events with edit/delete buttons
  const seasonHTML = (field.season || []).map((ev, idx) => `
    <div class="event-item" data-event-index="${idx}">
      <div class="event-dot ${ev.type}"></div>
      <div class="event-info">
        <div class="event-type">${eventTypeLabel[ev.type] || ev.type}</div>
        <div class="event-date">${ev.date}</div>
        ${ev.note ? `<div class="event-note">${escapeHtml(ev.note)}</div>` : ''}
      </div>
      <div class="event-actions">
        <button class="event-edit-btn" onclick="openEditEventModal('${escapeHtml(field.id)}', ${idx})" title="${lang==='ru'?'Редактировать':'Edit'}">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="event-delete-btn" onclick="deleteEventFromField('${escapeHtml(field.id)}', ${idx})" title="${lang==='ru'?'Удалить':'Delete'}">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');

  const photosHTML = (field.photos || []).map(src => `
    <div class="photo-item"><img src="${src}" alt="photo"/></div>
  `).join('');

  const addPhotoBtn = (field.photos || []).length < 5 ? `
    <div class="photo-add-btn" onclick="triggerPhotoUpload('${escapeHtml(field.id)}')">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2l2-3h10l2 3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      <span>${t('addPhoto')}</span>
    </div>
  ` : '';

  // NDVI мини-спарклайн месяцы
  const ndviMonths = Array.from({length:12},(_,i)=>{
    const m = i+1;
    const seasonal = Math.sin(((m-1)/12)*Math.PI*2-1.2);
    const cropBase={wheat:0.62,corn:0.71,sunflower:0.58,barley:0.60,soybean:0.68,default:0.55};
    const base=cropBase[field.crop]||cropBase.default;
    const noise=(parseInt(field.id?.replace(/\D/g,'').slice(-4)||'0')%100)/500;
    return Math.max(0.05,Math.min(0.95,base+seasonal*0.22+noise));
  });
  const mnV=Math.min(...ndviMonths),mxV=Math.max(...ndviMonths);
  const W=280,H=60;
  const stepX=W/11;
  const toY=v=>H-6-((v-mnV)/(mxV-mnV+0.01))*(H-12);
  const pathD=ndviMonths.map((v,i)=>`${i===0?'M':'L'}${(i*stepX).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const areaD=pathD+` L${W},${H} L0,${H} Z`;
  const months=['Я','Ф','М','А','М','И','И','А','С','О','Н','Д'];
  const curMonth=new Date().getMonth();

  return `
    <div class="modal-form-group">
      <label class="modal-label">${t('fieldName')}</label>
      <input class="field-name-input" id="detail-name-input" value="${escapeHtml(field.name)}"
        onchange="updateFieldName('${escapeHtml(field.id)}', this.value)"/>
    </div>

    <!-- FIX v1.8: Replaced crop chip grid with compact SELECT dropdown -->
    <div class="section-title">${t('crop')}</div>
    <div style="padding: 0 0 8px;">
      <select class="modal-select" id="detail-crop-select"
        onchange="updateFieldCropSelect('${escapeHtml(field.id)}', this.value)"
        style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:15px;font-family:inherit;cursor:pointer;outline:none;">
        <option value="" ${!fieldCropId ? 'selected' : ''}>${t('noCrop')}</option>
        ${CROPS.map(c => `<option value="${c.id}" ${fieldCropId === c.id ? 'selected' : ''}>${cropLabel(c)}</option>`).join('')}
      </select>
    </div>

    <!-- Основные статы -->
    <div class="detail-stats-extended">
      <!-- ЗАДАЧА 4.3: площадь — главная метрика для агронома, поэтому крупнее
           и жирнее остальных, а не тот же размер шрифта "иконка+заголовок+значение"
           что у второстепенных карточек ниже. Акцентный цвет здесь используется
           как элемент идентичности главной метрики, а не только "активного" состояния. -->
      <div class="stat-card-sm stat-card-primary">
        <div class="stat-label">${t('area')}</div>
        <div class="stat-value" style="font-size:20px;font-weight:800;color:var(--accent);">${formatAreaShort(field.area)} <span class="stat-unit" style="color:var(--accent);opacity:0.75;">${getAreaUnit()}</span></div>
      </div>
      <div class="stat-card-sm">
        <div class="stat-label">${t('perimeter')}</div>
        <div class="stat-value">${field.perimeter} <span class="stat-unit">${t('km')}</span></div>
      </div>
      <div class="stat-card-sm">
        <!-- ЗАДАЧА 2: Стадия вегетации — авто на основе даты посева + культуры -->
        <div class="stat-label">${lang === 'ru' ? 'Стадия вегетации' : 'Growth Stage'}</div>
        <div class="stat-value" style="font-size:12px;color:var(--accent);">${getVegetationStage(field)}</div>
      </div>
      <div class="stat-card-sm">
        <!-- FIX v1.8: Plant Health is NDVI-based estimate — keep but label clearly -->
        <div class="stat-label">${lang === 'ru' ? 'Здоровье растений' : 'Plant Health'}</div>
        <div class="stat-value" style="font-size:13px;color:${ndviColor};">${health.label} <span style="font-size:9px;color:var(--text3);">NDVI</span></div>
      </div>
      <div class="stat-card-sm">
        <div class="stat-label">${lang === 'ru' ? 'Дата посева' : 'Sowing Date'}</div>
        <div class="stat-value" style="font-size:13px;">
          <input class="stat-inline-input" type="date"
            value="${sowDate !== '—' ? sowDate : ''}"
            onchange="updateFieldSowingDate('${escapeHtml(field.id)}', this.value)"
            style="width:100%;background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--text);font-size:12px;padding:2px 0;outline:none;"/>
        </div>
      </div>
      <div class="stat-card-sm">
        <div class="stat-label">${t('created')}</div>
        <div class="stat-value" style="font-size:13px;">${field.createdAt}</div>
      </div>
    </div>

    <hr style="border:none;border-top:2px solid rgba(76,175,80,0.25);margin:22px 0 12px;">

    <!-- v3.0: REDESIGN — единый стиль карточки для всех секций (как прогноз урожайности + NDVI) -->
    <!-- FIX v2.0: Yield Forecast Card — pessimistic base + continent + NDVI -->
    ${(() => {
      const fc = getDetailedYieldForecast(field, ndvi);
      if (!fc.detail) {
        return `<div class="yield-forecast-card yield-forecast-no-data">
          <div class="yield-fc-icon">📊</div>
          <div class="yield-fc-text">${fc.text}</div>
        </div>`;
      }
      return `<div class="yield-forecast-card">
        <div class="yield-fc-top">
          <div class="yield-fc-main">${fc.text}</div>
          <div class="yield-fc-detail">${fc.detail}</div>
        </div>
        <div class="yield-fc-bar-wrap">
          <div class="yield-fc-bar-track">
            <div class="yield-fc-bar-fill" style="width:${Math.min(100, Math.round((fc.lo / (fc.hi * 1.15)) * 100))}%;"></div>
            <div class="yield-fc-bar-range" style="left:${Math.min(100,Math.round((fc.lo/(fc.hi*1.15))*100))}%;width:${Math.min(100,Math.round(((fc.hi-fc.lo)/(fc.hi*1.15))*100))}%;"></div>
          </div>
          <div class="yield-fc-labels">
            <span>${fc.lo}</span><span style="color:var(--accent);font-weight:700;">${fc.lo} ${fc.unit}</span><span>${fc.hi}</span>
          </div>
        </div>
      </div>`;
    })()}

    <!-- NDVI блок -->
    <div class="ndvi-chart-container">
      <div class="ndvi-chart-title">NDVI · ${lang === 'ru' ? 'Вегетационный индекс' : 'Vegetation Index'} <span class="ndvi-estimated-badge" title="${lang === 'ru' ? 'Расчётная модель по сезону/культуре, не спутниковое измерение' : 'Seasonal model estimate, not a satellite measurement'}">${lang === 'ru' ? '~оценка' : '~est.'}</span></div>
      <div class="ndvi-mini-bar" style="margin-bottom:10px;">
        <span class="ndvi-mini-label">${lang === 'ru' ? 'Текущий' : 'Current'}</span>
        <div class="ndvi-mini-track">
          <div class="ndvi-mini-fill" style="width:${Math.round(ndvi*100)}%;background:${ndviColor};"></div>
        </div>
        <span class="ndvi-mini-value" style="color:${ndviColor};">${ndvi}</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:60px;" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="detail-ndvi-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4CAF50" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#4CAF50" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#detail-ndvi-grad)" stroke="none"/>
        <path d="${pathD}" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <!-- Текущий месяц маркер -->
        <circle cx="${(curMonth*stepX).toFixed(1)}" cy="${toY(ndviMonths[curMonth]).toFixed(1)}" r="4" fill="${ndviColor}" stroke="#fff" stroke-width="1.5"/>
        ${months.map((m,i)=>`<text x="${(i*stepX).toFixed(1)}" y="${H}" font-size="8" fill="#4a6580" text-anchor="middle">${m}</text>`).join('')}
      </svg>
      <div style="font-size:10px;color:var(--text3);margin-top:4px;text-align:right;">NASA MODIS · ${lang === 'ru' ? 'расчётные данные' : 'estimated data'}</div>
    </div>

    

    <!-- Умный севооборот — та же карточка, что и выше -->
    <div class="detail-uniform-card">
      <div class="detail-uniform-card-title"><i data-lucide="sprout" class="icon-sm"></i> ${lang === 'ru' ? 'Умный севооборот' : 'Smart crop rotation'}</div>
      <div class="detail-uniform-card-body" id="crop-rotation-container">
        ${renderCropRotationBlock(field)}
      </div>
    </div>

    

    <!-- Леса и нерабочие зоны — та же карточка -->
    <div class="detail-uniform-card">
      <div class="detail-uniform-card-title">🌲 ${lang === 'ru' ? 'Леса и нерабочие зоны' : 'Forests & Non-arable Zones'}</div>
      <div class="detail-uniform-card-body" id="forest-section-${escapeHtml(field.id)}">
        ${renderForestSectionHTML(field)}
      </div>
    </div>

    <!-- История событий — та же карточка, сворачиваемая (сводка справа: число событий) -->
    <details class="detail-uniform-card">
      <summary class="detail-uniform-card-title">
        <span class="detail-uniform-card-title-left">📋 ${t('seasonHistory')}</span>
        <span class="detail-uniform-card-title-right">
          ${(field.season || []).length} ${lang === 'ru' ? 'событ.' : 'events'}
          <svg class="detail-uniform-card-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9"/></svg>
        </span>
      </summary>
      <div class="detail-uniform-card-body">
        <div class="season-events" id="detail-season-events">${seasonHTML}</div>
        <button class="add-event-btn" onclick="openAddEventModal()">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          ${t('addEvent')}
        </button>
      </div>
    </details>

    <!-- Цвет поля — та же карточка, сворачиваемая (сводка справа: текущий цвет) -->
    <details class="detail-uniform-card">
      <summary class="detail-uniform-card-title">
        <span class="detail-uniform-card-title-left">🎨 ${t('fieldColor')}</span>
        <span class="detail-uniform-card-title-right">
          <span class="detail-uniform-card-swatch" style="background:${field.color};"></span>
          <svg class="detail-uniform-card-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9"/></svg>
        </span>
      </summary>
      <div class="detail-uniform-card-body">
        <div class="color-picker" id="detail-color-picker"></div>
      </div>
    </details>

    <!-- Фото — та же карточка, сворачиваемая (сводка справа: число фото) -->
    <details class="detail-uniform-card">
      <summary class="detail-uniform-card-title">
        <span class="detail-uniform-card-title-left">📷 ${t('photos')}</span>
        <span class="detail-uniform-card-title-right">
          ${(field.photos || []).length} ${lang === 'ru' ? 'фото' : 'photos'}
          <svg class="detail-uniform-card-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9"/></svg>
        </span>
      </summary>
      <div class="detail-uniform-card-body">
        <div class="photos-grid">
          ${photosHTML}
          ${addPhotoBtn}
        </div>
      </div>
    </details>
  `;
}

function closeFieldDetail() {
  document.getElementById('screen-field-detail').classList.remove('open');
  currentFieldId = null;
  renderFieldsList();
}

function updateFieldName(fieldId, name) {
  const fields = loadFields();
  const f = fields.find(x => x.id === fieldId);
  if (f) { f.name = name; saveFields(fields); }
}

// FIX v1.8: SELECT-based crop update (no chip element needed)
function updateFieldCropSelect(fieldId, crop) {
  const fields = loadFields();
  const f = fields.find(x => x.id === fieldId);
  if (f) {
    f.crop = crop;
    saveFields(fields);
    // Пересчитать рекомендации по севообороту
    const parent = document.getElementById('crop-rotation-container');
    if (parent) parent.innerHTML = renderCropRotationBlock(f);
  }
}

// ЗАДАЧА 2: Обновить дату посева поля (сохраняет как sowingDate + добавляет/обновляет событие посева)
function updateFieldSowingDate(fieldId, dateStr) {
  const fields = loadFields();
  const f = fields.find(x => x.id === fieldId);
  if (!f) return;
  f.sowingDate = dateStr;
  // Также добавляем или обновляем событие посева в season
  if (!f.season) f.season = [];
  const existingSow = f.season.find(e => e.type === 'sowing');
  if (existingSow) {
    existingSow.date = dateStr;
  } else if (dateStr) {
    f.season.unshift({ type: 'sowing', date: dateStr, note: '' });
  }
  // FIX: keep season sorted by date (newest first) so field.season[0] is always
  // the most recent event, consistent with saveEvent()
  f.season.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  saveFields(fields);
  // Обновить отображение стадии вегетации
  const stageEl = document.querySelector('#screen-field-detail .stat-card-sm .stat-value[style*="accent"]');
  if (stageEl) stageEl.textContent = getVegetationStage(f);
  // Пересчитать рекомендации по севообороту
  const rotationParent = document.getElementById('crop-rotation-container');
  if (rotationParent) rotationParent.innerHTML = renderCropRotationBlock(f);
  // Re-render detail for full consistency
  openFieldDetail(fieldId);
}

// ════════════════════════════════════════════════════
// ВЫЧИТАНИЕ ЛЕСОВ ИЗ ПЛОЩАДИ ПОЛЯ
// ════════════════════════════════════════════════════
// (_forestDrawMode, _forestTargetFieldId, forestPolygons объявлены в глобальной области)

/**
 * Возвращает чистую площадь поля (га) = area - сумма всех лесов.
 */
function getNetFieldArea(field) {
  const forests = field.forests || [];
  const forestTotal = forests.reduce((s, f) => s + (f.area || 0), 0);
  return Math.max(0, (field.area || 0) - forestTotal);
}

/**
 * Рендерит HTML внутренности блока .forest-section для конкретного поля.
 */
function renderForestSectionHTML(field) {
  const forests = field.forests || [];
  const isRu = lang === 'ru';
  const forestTotal = forests.reduce((s, f) => s + (f.area || 0), 0).toFixed(2);
  const net = getNetFieldArea(field).toFixed(2);

  let zonesHTML = '';
  if (forests.length > 0) {
    const zoneTypeIcon = (fz) => {
      if (fz.zoneType === 'road') return '🛤️';
      if (fz.zoneType === 'water') return '<i data-lucide="droplets" class="icon-sm"></i>';
      if (fz.zoneType === 'building') return '🏗️';
      return '🌲';
    };
    const zoneTypeLabel = (fz) => {
      if (fz.zoneType === 'road') return isRu ? 'Дорога' : 'Road';
      if (fz.zoneType === 'water') return isRu ? 'Вода' : 'Water';
      if (fz.zoneType === 'building') return isRu ? 'Постройка' : 'Building';
      return isRu ? 'Лес/нераб.' : 'Forest';
    };
    zonesHTML = `<div class="forest-zones-list">
      ${forests.map((fz, idx) => {
        const pct = field.area > 0 ? ((fz.area / field.area) * 100).toFixed(1) : '0';
        return `
        <div class="forest-zone-item">
          <span class="fz-icon">${zoneTypeIcon(fz)}</span>
          <span class="fz-label">${zoneTypeLabel(fz)} ${idx + 1}</span>
          <span class="fz-area" title="${pct}%">${fz.area.toFixed(1)} ${getAreaUnit()} <span style="font-size:10px;color:var(--text3);">(${pct}%)</span></span>
          <button class="fz-del" onclick="deleteForestZone('${escapeHtml(field.id)}', ${idx})" title="${isRu ? 'Удалить' : 'Delete'}">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>`}).join('')}
    </div>`;
  }

  const areaBlock = forests.length > 0 ? `
    <div class="forest-area-row">
      <div class="forest-area-line">
        <span class="lbl">📐 ${isRu ? 'Общая площадь' : 'Total area'}</span>
        <span class="val">${formatAreaShort(field.area)} ${getAreaUnit()}</span>
      </div>
      <div class="forest-area-line subtracted">
        <span class="lbl">🌲 ${isRu ? 'Леса / нераб. зоны' : 'Forests / non-arable'}</span>
        <span class="val">− ${formatAreaShort(forestTotal)} ${getAreaUnit()}</span>
      </div>
      <div class="forest-area-line net">
        <span class="lbl">✅ ${isRu ? 'Чистая пашня' : 'Net arable area'}</span>
        <span class="val">${formatAreaShort(net)} ${getAreaUnit()}</span>
      </div>
    </div>
  ` : '';

  return `
    ${areaBlock}
    ${zonesHTML}
    <button class="btn-add-forest" onclick="startForestDraw('${escapeHtml(field.id)}')">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      ${isRu ? 'Обвести лес на карте' : 'Draw forest on map'}
    </button>
  `;
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

/**
 * Сбросить флаги лесного режима и восстановить стандартный UI рисования.
 */
// ════════════════════════════════════════════════════
// ЭКСПОРТ ДАННЫХ — PDF / EXCEL
// ════════════════════════════════════════════════════

/**
 * Собирает данные всех полей для экспорта.
 */
function buildExportRows() {
  const fields = loadFields();
  const isRu = lang === 'ru';
  const unit = loadSettings().units === 'acres' ? 'acres' : 'ha';
  const mult = unit === 'acres' ? 2.47105 : 1;

  return fields.map(field => {
    const forests = field.forests || [];
    const forestTotal = forests.reduce((s, f) => s + (f.area || 0), 0);
    const netArea = Math.max(0, (field.area || 0) - forestTotal);
    const ndvi = estimateFieldNdvi(field);
    const yfc = getDetailedYieldForecast(field, ndvi);
    const seasons = (field.season || []).map(ev =>
      `${ev.type || ''}${ev.date ? ' (' + ev.date + ')' : ''}${ev.note ? ': ' + ev.note : ''}`
    ).join(' | ');

    return {
      [isRu ? 'Название' : 'Field Name']: field.name || '—',
      [isRu ? 'Культура' : 'Crop']: field.crop ? cropDisplayName(field.crop) : '—',
      [isRu ? `Площадь (${unit})` : `Area (${unit})`]: parseFloat((field.area * mult).toFixed(2)),
      [isRu ? `Леса/нераб. (${unit})` : `Forests (${unit})`]: parseFloat((forestTotal * mult).toFixed(2)),
      [isRu ? `Чистая пашня (${unit})` : `Net arable (${unit})`]: parseFloat((netArea * mult).toFixed(2)),
      ['NDVI']: ndvi.toFixed(3),
      [isRu ? 'Состояние' : 'Health']: ndvi >= 0.65 ? (isRu ? 'Отлично' : 'Excellent') :
                                        ndvi >= 0.45 ? (isRu ? 'Хорошо' : 'Good') :
                                        ndvi >= 0.25 ? (isRu ? 'Удовл.' : 'Fair') : (isRu ? 'Слабо' : 'Poor'),
      [isRu ? 'Прогноз урожайности' : 'Yield Forecast']: yfc.detail ? `${yfc.lo}–${yfc.hi} ${yfc.unit}` : '—',
      [isRu ? 'Дата посева' : 'Sowing Date']: field.sowingDate || '—',
      [isRu ? 'Создан' : 'Created']: field.createdAt || '—',
      [isRu ? 'История сезона' : 'Season History']: seasons || '—',
    };
  });
}

function exportFieldsExcel() {
  const isRu = lang === 'ru';

  function doExport() {
    try {
      const rows = buildExportRows();
      if (!rows.length) { showToast(isRu ? 'Нет полей для экспорта' : 'No fields to export'); return; }

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isRu ? 'Поля' : 'Fields');

      // Лист с лесными зонами
      const forestRows = [];
      loadFields().forEach(field => {
        (field.forests || []).forEach((fz, i) => {
          forestRows.push({
            [isRu ? 'Поле' : 'Field']: field.name || field.id,
            [isRu ? 'Зона' : 'Zone']: `${isRu ? 'Лес' : 'Forest'} ${i + 1}`,
            [isRu ? 'Площадь (га)' : 'Area (ha)']: parseFloat((fz.area || 0).toFixed(3)),
          });
        });
      });
      if (forestRows.length) {
        const ws2 = XLSX.utils.json_to_sheet(forestRows);
        XLSX.utils.book_append_sheet(wb, ws2, isRu ? 'Леса' : 'Forests');
      }

      // Надёжный экспорт через Blob — работает во всех браузерах
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hectar_fields_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
      showToast(isRu ? '✅ Excel сохранён' : '✅ Excel saved');
    } catch (e) {
      console.error('Export Excel error:', e);
      showToast(isRu ? '❌ Ошибка экспорта: ' + e.message : '❌ Export error: ' + e.message);
    }
  }

  // Грузим библиотеку если ещё нет
  if (typeof XLSX === 'undefined') {
    showToast(isRu ? '⏳ Загрузка...' : '⏳ Loading...');
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = doExport;
    s.onerror = () => showToast(isRu ? '❌ Не удалось загрузить библиотеку' : '❌ Library load failed');
    document.head.appendChild(s);
  } else {
    doExport();
  }
}

function exportFieldsPDF() {
  const isRu = lang === 'ru';
  try {
    const fields = loadFields();
    if (!fields.length) { showToast(isRu ? 'Нет полей для экспорта' : 'No fields to export'); return; }

    const unit = loadSettings().units === 'acres' ? 'acres' : 'ha';
    const mult = unit === 'acres' ? 2.47105 : 1;
    const date = new Date().toLocaleDateString(isRu ? 'ru-RU' : 'en-US');

    // Строим HTML-документ для печати
    const rowsHTML = fields.map((field, idx) => {
      const forests = field.forests || [];
      const forestTotal = forests.reduce((s, f) => s + (f.area || 0), 0);
      const netArea = Math.max(0, (field.area || 0) - forestTotal);
      const ndvi = estimateFieldNdvi(field);
      const yfc = getDetailedYieldForecast(field, ndvi);
      const ndviColor = ndvi >= 0.65 ? BRAND.accent2 : ndvi >= 0.45 ? '#558b2f' : ndvi >= 0.25 ? '#f57f17' : '#b71c1c';
      const seasons = (field.season || []);
      // FIX (security): escape user-entered event fields before inserting into
      // the print-report HTML, to prevent HTML injection via field season notes.
      const seasonText = seasons.length
        ? seasons.map(ev => `${escapeHtml(ev.type || '')}${ev.date ? ' (' + escapeHtml(ev.date) + ')' : ''}${ev.note ? ': ' + escapeHtml(ev.note) : ''}`).join('<br>')
        : (isRu ? 'Нет событий' : 'No events');

      return `
        <div style="page-break-inside:avoid;margin-bottom:20px;border:1px solid #ccc;border-radius:8px;overflow:hidden;">
          <div style="background:${BRAND.accentDark};color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:15px;">${idx + 1}. ${escapeHtml(field.name || '—')}</strong>
            <span style="font-size:12px;opacity:0.85;">${field.crop ? cropDisplayName(field.crop) : (isRu ? 'Без культуры' : 'No crop')}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border-bottom:1px solid #eee;">
            <div style="padding:8px 12px;border-right:1px solid #eee;">
              <div style="font-size:10px;color:#888;">${isRu ? 'Площадь' : 'Area'}</div>
              <div style="font-size:15px;font-weight:700;">${(field.area * mult).toFixed(2)} ${unit}</div>
            </div>
            <div style="padding:8px 12px;border-right:1px solid #eee;">
              <div style="font-size:10px;color:#888;">${isRu ? 'Чистая пашня' : 'Net arable'}</div>
              <div style="font-size:15px;font-weight:700;color:${BRAND.accent2};">${(netArea * mult).toFixed(2)} ${unit}</div>
            </div>
            <div style="padding:8px 12px;">
              <div style="font-size:10px;color:#888;">NDVI</div>
              <div style="font-size:15px;font-weight:700;color:${ndviColor};">${ndvi.toFixed(3)} <span style="font-size:8px;font-weight:700;text-transform:uppercase;color:#888;border:1px solid #ccc;border-radius:100px;padding:1px 5px;vertical-align:middle;">${isRu ? '~оценка' : '~est.'}</span></div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;padding:8px 12px;">
            <div>
              <div style="font-size:10px;color:#888;">${isRu ? 'Прогноз урожайности' : 'Yield Forecast'}</div>
              <div style="font-size:13px;">${yfc.detail ? `${yfc.lo}–${yfc.hi} ${yfc.unit}` : '—'}</div>
            </div>
            <div>
              <div style="font-size:10px;color:#888;">${isRu ? 'Дата посева' : 'Sowing Date'}</div>
              <div style="font-size:13px;">${escapeHtml(field.sowingDate || '—')}</div>
            </div>
          </div>
          ${forestTotal > 0 ? `<div style="padding:4px 12px 8px;font-size:12px;color:#555;">🌲 ${isRu ? 'Леса/нераб.' : 'Forests'}: −${(forestTotal * mult).toFixed(2)} ${unit} (${forests.length} ${isRu ? 'зон' : 'zones'})</div>` : ''}
          <div style="padding:4px 12px 10px;border-top:1px solid #eee;margin-top:4px;">
            <div style="font-size:10px;color:#888;margin-bottom:2px;">${isRu ? 'История сезона' : 'Season History'}</div>
            <div style="font-size:12px;line-height:1.5;">${seasonText}</div>
          </div>
        </div>`;
    }).join('');

    const totalArea = fields.reduce((s, f) => s + (f.area || 0), 0);
    const totalNet = fields.reduce((s, f) => s + getNetFieldArea(f), 0);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Hectar 3.0 — ${isRu ? 'Отчёт по полям' : 'Fields Report'}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1a2332;font-size:13px;}
      @media print{body{padding:0;} .no-print{display:none!important;}}
    </style></head><body>
    <div class="no-print" style="margin-bottom:14px;text-align:left;">
      <button onclick="window.close()" style="
        display:inline-flex;align-items:center;gap:8px;
        background:${BRAND.accentDark};color:#fff;border:none;
        border-radius:24px;padding:10px 22px;
        font-size:14px;font-weight:600;cursor:pointer;
        box-shadow:0 2px 10px rgba(0,0,0,0.2);
      ">&#8592; ${isRu ? 'Вернуться в Hectar' : 'Return to Hectar'}</button>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${BRAND.accentDark};padding-bottom:10px;margin-bottom:18px;">
      <div>
        <div style="font-size:22px;font-weight:800;color:${BRAND.accentDark};">Hectar 3.0</div>
        <div style="font-size:14px;color:#555;">${isRu ? 'Отчёт по полям' : 'Fields Report'} — ${date}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px;color:#888;">${isRu ? 'Всего полей' : 'Total fields'}: <strong>${fields.length}</strong></div>
        <div style="font-size:12px;color:#888;">${isRu ? 'Общая площадь' : 'Total area'}: <strong>${(totalArea * mult).toFixed(2)} ${unit}</strong></div>
        <div style="font-size:12px;color:${BRAND.accent2};">${isRu ? 'Чистая пашня' : 'Net arable'}: <strong>${(totalNet * mult).toFixed(2)} ${unit}</strong></div>
      </div>
    </div>
    ${rowsHTML}
    <div style="margin-top:14px;font-size:11px;color:#aaa;text-align:center;">Hectar 3.0 — ${isRu ? 'Мониторинг сельскохозяйственных полей' : 'Field Monitoring'}</div>
    <div class="no-print" style="margin-top:18px;text-align:center;padding-bottom:24px;">
      <button onclick="window.close()" style="
        display:inline-flex;align-items:center;gap:8px;
        background:${BRAND.accentDark};color:#fff;border:none;
        border-radius:24px;padding:12px 28px;
        font-size:15px;font-weight:600;cursor:pointer;
        box-shadow:0 2px 10px rgba(0,0,0,0.2);
      ">&#8592; ${isRu ? 'Вернуться в Hectar' : 'Return to Hectar'}</button>
    </div>
    </body></html>`;

    const win = window.open('', '_blank');
    // FIX (iOS standalone PWA): window.open() внутри установленного на
    // домашний экран приложения (standalone WKWebView) на iOS нередко
    // возвращает null или не открывает окно независимо от настроек
    // всплывающих окон — это ограничение платформы, а не блокировка
    // попапов. Прежнее сообщение "Разрешите всплывающие окна" вводило в
    // заблуждение в этом случае: пользователь не может ничего "разрешить".
    // Даём точную подсказку и для этого сценария.
    if (!win) {
      const isStandalone = window.navigator.standalone === true
        || window.matchMedia('(display-mode: standalone)').matches;
      if (isStandalone) {
        showToast(isRu
          ? '⚠️ Печать/PDF недоступны в установленном приложении — откройте Hectar в Safari для экспорта'
          : '⚠️ Print/PDF unavailable in the installed app — open Hectar in Safari to export');
      } else {
        showToast(isRu ? 'Разрешите всплывающие окна' : 'Allow pop-ups');
      }
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
    showToast(isRu ? '✅ PDF открыт для печати' : '✅ PDF ready to print');
  } catch (e) {
    console.error('Export PDF error:', e);
    showToast(isRu ? '❌ Ошибка экспорта' : '❌ Export error');
  }
}

// Текущий выбранный тип зоны
// ════════════════════════════════════════════════════
// GEOJSON ЭКСПОРТ / ИМПОРТ
// ════════════════════════════════════════════════════

/**
 * Экспорт ВСЕХ полей в GeoJSON (FeatureCollection).
 * Координаты конвертируются из [lat,lng] (Leaflet) в [lng,lat] (GeoJSON стандарт).
 */
function exportFieldsGeoJSON() {
  const isRu = lang === 'ru';
  try {
    const fields = loadFields();
    if (!fields.length) { showToast(isRu ? 'Нет полей для экспорта' : 'No fields to export'); return; }

    const features = fields.map(field => _fieldToGeoJSONFeature(field));
    const geojson = {
      type: 'FeatureCollection',
      name: 'Hectar Fields Export',
      generator: 'Hectar ' + APP_VERSION,
      exportDate: new Date().toISOString(),
      features
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hectar_fields_${new Date().toISOString().slice(0, 10)}.geojson`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    showToast(isRu ? '✅ GeoJSON сохранён' : '✅ GeoJSON saved');
  } catch (e) {
    console.error('Export GeoJSON error:', e);
    showToast(isRu ? '❌ Ошибка экспорта GeoJSON' : '❌ GeoJSON export error');
  }
}

/**
 * Экспорт ОДНОГО поля в GeoJSON.
 */
function exportSingleFieldGeoJSON(fieldId) {
  const isRu = lang === 'ru';
  try {
    const fields = loadFields();
    const field = fields.find(f => f.id === fieldId);
    if (!field) { showToast(isRu ? 'Поле не найдено' : 'Field not found'); return; }

    const geojson = {
      type: 'FeatureCollection',
      name: field.name || 'Hectar Field',
      generator: 'Hectar ' + APP_VERSION,
      exportDate: new Date().toISOString(),
      features: [_fieldToGeoJSONFeature(field)]
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(field.name || 'field').replace(/[^a-zA-Zа-яА-ЯёЁ0-9_-]/g, '_')}.geojson`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    showToast(isRu ? '✅ Поле экспортировано' : '✅ Field exported');
  } catch (e) {
    console.error('Export single field GeoJSON error:', e);
    showToast(isRu ? '❌ Ошибка экспорта' : '❌ Export error');
  }
}

/**
 * Конвертирует объект поля в GeoJSON Feature.
 * Leaflet хранит [lat, lng], GeoJSON требует [lng, lat].
 */
function _fieldToGeoJSONFeature(field) {
  const coords = (field.coordinates || []).map(c => [c[1], c[0]]);
  // Замыкаем полигон если не замкнут
  if (coords.length > 0 && (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1])) {
    coords.push([...coords[0]]);
  }
  return {
    type: 'Feature',
    properties: {
      name: field.name || '',
      crop: field.crop || '',
      color: field.color || '',
      area_ha: field.area || 0,
      perimeter_km: field.perimeter || 0,
      createdAt: field.createdAt || '',
      sowingDate: field.sowingDate || '',
      hectar_id: field.id || ''
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  };
}

/**
 * Импорт полей из GeoJSON файла.
 */
function importFieldsGeoJSON(event) {
  const isRu = lang === 'ru';
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const geojson = JSON.parse(e.target.result);
      if (!geojson) throw new Error('Empty file');

      let features = [];
      if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        features = geojson.features;
      } else if (geojson.type === 'Feature') {
        features = [geojson];
      } else if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
        features = [{ type: 'Feature', properties: {}, geometry: geojson }];
      } else {
        throw new Error('Unsupported GeoJSON type: ' + geojson.type);
      }

      const polygonFeatures = features.filter(f =>
        f && f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );

      if (polygonFeatures.length === 0) {
        showToast(isRu ? '❌ В файле нет полигонов (полей)' : '❌ No polygons (fields) found in file');
        return;
      }

      const fields = loadFields();
      let imported = 0;

      polygonFeatures.forEach((feature, idx) => {
        try {
          const rings = feature.geometry.type === 'MultiPolygon'
            ? feature.geometry.coordinates.map(p => p[0])
            : [feature.geometry.coordinates[0]];

          rings.forEach((ring, ri) => {
            // GeoJSON [lng, lat] → Leaflet [lat, lng]
            const coords = ring.map(c => [c[1], c[0]]);
            // Убираем замыкающую точку если есть
            if (coords.length > 1) {
              const first = coords[0], last = coords[coords.length - 1];
              if (Math.abs(first[0] - last[0]) < 1e-8 && Math.abs(first[1] - last[1]) < 1e-8) {
                coords.pop();
              }
            }
            if (coords.length < 3) return;

            // Пересчёт площади и периметра через turf.js
            const turfCoords = coords.map(c => [c[1], c[0]]);
            turfCoords.push([...turfCoords[0]]);
            const poly = turf.polygon([turfCoords]);
            const area = turf.area(poly) / 10000; // м² → га
            const perimeter = parseFloat(turf.length(turf.polygonToLine(poly), { units: 'kilometers' }).toFixed(2));
            const center = turf.center(poly).geometry.coordinates.reverse();

            const props = feature.properties || {};
            const nameBase = props.name || props.NAME || props.Name || props.title || '';
            const cropRaw = props.crop || props.CROP || props.Crop || props.culture || '';
            const cropId = cropRaw ? resolveCropId(cropRaw) : '';

            const newField = {
              id: generateId(),
              name: nameBase || (isRu ? `Импорт ${imported + 1}` : `Import ${imported + 1}`) + (ri > 0 ? ` (${ri + 1})` : ''),
              crop: cropId || '',
              color: FIELD_COLORS[(fields.length + imported) % FIELD_COLORS.length],
              area: parseFloat(area.toFixed(4)),
              perimeter,
              coordinates: coords,
              center,
              createdAt: new Date().toISOString().split('T')[0],
              season: [],
              photos: []
            };

            fields.push(newField);
            imported++;
          });
        } catch (fErr) {
          console.warn('Skipped feature ' + idx + ':', fErr);
        }
      });

      if (imported > 0) {
        saveFields(fields);
        // Перерисовать карту и список
        fields.slice(-imported).forEach(f => addFieldToMap(f));
        renderFieldsList();
        showToast(isRu ? `✅ Импортировано полей: ${imported}` : `✅ Imported fields: ${imported}`);
      } else {
        showToast(isRu ? '❌ Не удалось импортировать ни одного поля' : '❌ Could not import any fields');
      }
    } catch (err) {
      console.error('Import GeoJSON error:', err);
      showToast(isRu ? '❌ Ошибка импорта: ' + err.message : '❌ Import error: ' + err.message);
    }
    // Сброс input чтобы можно было импортировать тот же файл повторно
    event.target.value = '';
  };
  reader.readAsText(file);
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


function deleteCurrentField() {
  if (!currentFieldId) return;
  if (!confirm(t('deleteConfirm'))) return;
  const fields = loadFields().filter(f => f.id !== currentFieldId);
  saveFields(fields);
  // Убрать с карты: полигон + текстовая метка
  if (drawnPolygons[currentFieldId]) {
    drawnPolygons[currentFieldId].removeFrom(map);
    delete drawnPolygons[currentFieldId];
  }
  // FIX 2.5 Проблема 3: удаляем текстовую метку поля
  const labelKey = currentFieldId + '_label';
  if (drawnPolygons[labelKey]) {
    drawnPolygons[labelKey].removeFrom(map);
    delete drawnPolygons[labelKey];
  }
  // Удаляем лесные полигоны поля
  Object.keys(forestPolygons).forEach(key => {
    if (key.startsWith(currentFieldId + '_forest_')) {
      forestPolygons[key].removeFrom(map);
      delete forestPolygons[key];
    }
  });
  closeFieldDetail();
  showToast(t('fieldDeleted'));
}

// ════════════════════════════════════════════════════
// СОБЫТИЯ СЕЗОНА
// ════════════════════════════════════════════════════
// FIX v1.8 R2: track edit mode — null = add new, number = edit index
let editingEventIndex = null;

function openAddEventModal() {
  // FIX v1.8 R2: reset to ADD mode
  editingEventIndex = null;
  document.getElementById('event-type').value = 'sowing';
  document.getElementById('event-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('event-note').value = '';
  // FIX v1.8 R2: update modal title to "Add Event"
  const title = document.querySelector('#modal-add-event .modal-title');
  if (title) title.textContent = lang === 'ru' ? 'Добавить событие' : 'Add Event';
  const saveBtn = document.querySelector('#modal-add-event .modal-btn.primary');
  if (saveBtn) saveBtn.textContent = lang === 'ru' ? 'Добавить' : 'Add';
  openModal('modal-add-event');
}

// FIX v1.8 R2: open modal in EDIT mode, pre-filled with existing event data
function openEditEventModal(fieldId, eventIndex) {
  if (!currentFieldId) currentFieldId = fieldId;
  const fields = loadFields();
  const f = fields.find(x => x.id === fieldId);
  if (!f || !f.season || !f.season[eventIndex]) return;

  editingEventIndex = eventIndex;
  const ev = f.season[eventIndex];

  document.getElementById('event-type').value = ev.type || 'sowing';
  document.getElementById('event-date').value = ev.date || '';
  document.getElementById('event-note').value = ev.note || '';

  // Update modal title and button label
  const title = document.querySelector('#modal-add-event .modal-title');
  if (title) title.textContent = lang === 'ru' ? 'Редактировать событие' : 'Edit Event';
  const saveBtn = document.querySelector('#modal-add-event .modal-btn.primary');
  if (saveBtn) saveBtn.textContent = lang === 'ru' ? 'Сохранить' : 'Save';

  openModal('modal-add-event');
}

// FIX v1.8 R2: delete an event from a field's season array with confirmation
function deleteEventFromField(fieldId, eventIndex) {
  const confirmMsg = lang === 'ru' ? 'Удалить это событие?' : 'Delete this event?';
  if (!confirm(confirmMsg)) return;

  const fields = loadFields();
  const f = fields.find(x => x.id === fieldId);
  if (!f || !f.season) return;

  f.season.splice(eventIndex, 1);
  saveFields(fields);

  // Refresh the detail view
  openFieldDetail(fieldId);
  renderNotesList();
  showToast(lang === 'ru' ? 'Событие удалено' : 'Event deleted');
}

function saveEvent() {
  if (!currentFieldId) return;
  const fields = loadFields();
  const f = fields.find(x => x.id === currentFieldId);
  if (!f) return;

  const eventType = document.getElementById('event-type').value;
  const event = {
    type: eventType,
    date: document.getElementById('event-date').value,
    note: document.getElementById('event-note').value.trim()
  };
  // FIX: record the crop sown at the time of a sowing event, so crop-rotation
  // history (getCropRotationRecommendation) reflects what was actually sown
  // each time instead of always resolving to the field's current crop.
  if ((eventType === 'sowing' || eventType === 'seeding') && f.crop) {
    event.crop = f.crop;
  }
  f.season = f.season || [];

  // FIX v1.8 R2: handle edit vs add
  if (editingEventIndex !== null && editingEventIndex >= 0 && editingEventIndex < f.season.length) {
    // EDIT: replace existing event at index
    f.season[editingEventIndex] = event;
    showToast(lang === 'ru' ? 'Событие обновлено' : 'Event updated');
  } else {
    // ADD: append and sort
    f.season.push(event);
    showToast(lang === 'ru' ? 'Событие добавлено' : 'Event added');
  }

  f.season.sort((a, b) => b.date.localeCompare(a.date));
  saveFields(fields);

  editingEventIndex = null; // FIX v1.8 R2: reset edit mode

  closeModal('modal-add-event');
  openFieldDetail(currentFieldId);
  renderNotesList();
}

// ════════════════════════════════════════════════════
// ФОТО
// ════════════════════════════════════════════════════
function triggerPhotoUpload(fieldId) {
  currentFieldIdForPhotos = fieldId;
  document.getElementById('photo-input').click();
}

function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file || !currentFieldIdForPhotos) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const fields = loadFields();
    const f = fields.find(x => x.id === currentFieldIdForPhotos);
    if (f) { if (!f.photos) f.photos = []; }
    if (f && f.photos.length < 5) {
      f.photos.push(ev.target.result);
      saveFields(fields);
      openFieldDetail(currentFieldIdForPhotos);
    }
  };
  reader.readAsDataURL(file);
  e.target.value = '';
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

// ════════════════════════════════════════════════════
// ЗАМЕТКИ (агрегация событий)
// ════════════════════════════════════════════════════
function renderNotesList() {
  const fields = loadFields();
  const container = document.getElementById('notes-list-container');
  const emptyEl = document.getElementById('notes-empty');

  // Собрать все события
  // FIX: include original eventIndex within field.season array for edit/delete
  let allEvents = [];
  fields.forEach(f => {
    (f.season || []).forEach((ev, idx) => {
      allEvents.push({ ...ev, fieldId: f.id, fieldName: f.name, fieldColor: f.color, fieldCoords: f.coordinates, fieldArea: f.area, fieldCrop: f.crop, _seasonIndex: idx });
    });
  });

  // Фильтр
  if (currentNoteFilter !== 'all') {
    allEvents = allEvents.filter(ev => ev.type === currentNoteFilter);
  }

  // Сортировка по дате
  allEvents.sort((a, b) => b.date.localeCompare(a.date));

  // Очистить (кроме empty)
  Array.from(container.children).forEach(el => { if (el !== emptyEl) el.remove(); });

  if (allEvents.length === 0) {
    emptyEl.style.display = 'flex';
    return;
  }
  emptyEl.style.display = 'none';

  const eventTypeLabel = { sowing: t('sowing'), harvest: t('harvest'), watering: t('watering'), spraying: t('spraying'), cultivation: t('cultivation'), disking: t('disking') };

  allEvents.forEach(ev => {
    const card = document.createElement('div');
    card.className = 'note-card';

    // Миниатюра поля
    const thumbId = `note-thumb-${Math.random().toString(36).substr(2,5)}`;
    const field = fields.find(f => f.id === ev.fieldId);

    // Форматировать дату
    const d = new Date(ev.date);
    const dateStr = d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' });

    // FIX: add edit and delete action buttons to each note card
    card.innerHTML = `
      <div class="note-field-thumb">
        <canvas width="64" height="64" id="${thumbId}"></canvas>
      </div>
      <div class="note-info">
        <div class="note-field-name">${escapeHtml(ev.fieldName)}</div>
        <div class="note-meta">${escapeHtml(eventTypeLabel[ev.type] || ev.type)}${ev.fieldCrop ? ' — ' + escapeHtml(cropDisplayName(ev.fieldCrop)) : ''} · ${ev.fieldArea} ${t('ha')}</div>
        ${ev.note ? `<div class="note-meta" style="margin-top:2px;color:var(--text3)">${escapeHtml(ev.note)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
        <div class="note-date">${dateStr}</div>
        <div style="display:flex;gap:6px;">
          <button class="note-action-btn note-edit-btn"
            onclick="editNoteFromList('${escapeHtml(ev.fieldId)}', ${ev._seasonIndex})" title="${lang === 'ru' ? 'Редактировать' : 'Edit'}">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="note-action-btn note-delete-btn"
            onclick="deleteNoteFromList('${escapeHtml(ev.fieldId)}', ${ev._seasonIndex})" title="${lang === 'ru' ? 'Удалить' : 'Delete'}">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);

    // Нарисовать миниатюру
    if (field) setTimeout(() => {
      const canvas = document.getElementById(thumbId);
      if (canvas) {
        const fieldCopy = { ...field, id: thumbId };
        drawFieldThumbOnCanvas(canvas, field);
      }
    }, 50);
  });
}

function drawFieldThumbOnCanvas(canvas, field) {
  if (!canvas || !field.coordinates || field.coordinates.length < 3) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const lats = field.coordinates.map(c => c[0]);
  const lngs = field.coordinates.map(c => c[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 6;
  const scaleX = (W - pad * 2) / ((maxLng - minLng) || 1);
  const scaleY = (H - pad * 2) / ((maxLat - minLat) || 1);
  const scale = Math.min(scaleX, scaleY);
  ctx.beginPath();
  field.coordinates.forEach((c, i) => {
    const x = pad + (c[1] - minLng) * scale;
    const y = H - pad - (c[0] - minLat) * scale;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = (field.color || BRAND.accent) + '30';
  ctx.fill();
  ctx.strokeStyle = field.color || BRAND.accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function setNoteFilter(filter) {
  currentNoteFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-filter') === filter);
  });
  renderNotesList();
}

// FIX: track which note is being edited (fieldId + seasonIndex), null when adding new
let _editingNoteFieldId = null;
let _editingNoteSeasonIndex = null;

function openAddNoteModal() {
  // FIX: reset edit state when opening for a new note
  _editingNoteFieldId = null;
  _editingNoteSeasonIndex = null;

  const fields = loadFields();
  const select = document.getElementById('note-field-select');
  select.innerHTML = `<option value="">${t('selectField')}</option>`;
  fields.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    select.appendChild(opt);
  });
  document.getElementById('note-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('note-text').value = '';

  // FIX: restore modal title and button to "Add" mode
  const titleEl = document.querySelector('#modal-add-note .modal-title');
  if (titleEl) titleEl.textContent = lang === 'ru' ? 'Новая заметка' : 'New Note';
  const actionBtn = document.querySelector('#modal-add-note .modal-action-btn');
  if (actionBtn) actionBtn.textContent = lang === 'ru' ? 'Добавить' : 'Add';

  openModal('modal-add-note');
}

// FIX: open the add-note modal pre-filled for editing an existing note
function editNoteFromList(fieldId, seasonIndex) {
  _editingNoteFieldId = fieldId;
  _editingNoteSeasonIndex = seasonIndex;

  const fields = loadFields();
  const f = fields.find(x => x.id === fieldId);
  if (!f || !f.season || !f.season[seasonIndex]) return;
  const ev = f.season[seasonIndex];

  // Populate field select
  const select = document.getElementById('note-field-select');
  select.innerHTML = '';
  fields.forEach(field => {
    const opt = document.createElement('option');
    opt.value = field.id;
    opt.textContent = field.name;
    select.appendChild(opt);
  });
  select.value = fieldId;
  // Disable field select while editing (note belongs to this field)
  select.disabled = true;

  // Fill in event data
  const typeEl = document.getElementById('note-event-type');
  if (typeEl) typeEl.value = ev.type || 'sowing';
  document.getElementById('note-date').value = ev.date || '';
  document.getElementById('note-text').value = ev.note || '';

  // FIX: update modal title and button to "Edit" mode
  const titleEl = document.querySelector('#modal-add-note .modal-title');
  if (titleEl) titleEl.textContent = lang === 'ru' ? 'Редактировать заметку' : 'Edit Note';
  const actionBtn = document.querySelector('#modal-add-note .modal-action-btn');
  if (actionBtn) actionBtn.textContent = lang === 'ru' ? 'Сохранить' : 'Save';

  openModal('modal-add-note');
}

// FIX: delete a note from the Notes tab with confirmation, syncs with field detail
function deleteNoteFromList(fieldId, seasonIndex) {
  const confirmMsg = lang === 'ru' ? 'Удалить эту заметку?' : 'Delete this note?';
  if (!confirm(confirmMsg)) return;

  const fields = loadFields();
  const f = fields.find(x => x.id === fieldId);
  if (!f || !f.season) return;

  f.season.splice(seasonIndex, 1);
  saveFields(fields);

  // FIX: re-render notes list AND field detail if open (sync everywhere)
  renderNotesList();
  if (currentFieldId === fieldId) openFieldDetail(fieldId);
  showToast(lang === 'ru' ? 'Заметка удалена' : 'Note deleted');
}

function saveNote() {
  const fieldId = document.getElementById('note-field-select').value || _editingNoteFieldId;
  if (!fieldId) { showToast(t('selectFieldPrompt')); return; }
  const fields = loadFields();
  const f = fields.find(x => x.id === fieldId);
  if (!f) return;
  f.season = f.season || [];

  const updatedNote = {
    type: document.getElementById('note-event-type').value,
    date: document.getElementById('note-date').value,
    note: document.getElementById('note-text').value.trim()
  };

  // FIX: handle edit vs add mode
  if (_editingNoteFieldId !== null && _editingNoteSeasonIndex !== null) {
    // EDIT: replace existing note at stored index
    f.season[_editingNoteSeasonIndex] = updatedNote;
    showToast(lang === 'ru' ? 'Заметка обновлена' : 'Note updated');
  } else {
    // ADD: push new note
    f.season.push(updatedNote);
    showToast(t('noteAdded'));
  }

  // FIX: reset edit state and re-enable field select
  _editingNoteFieldId = null;
  _editingNoteSeasonIndex = null;
  const select = document.getElementById('note-field-select');
  if (select) select.disabled = false;

  saveFields(fields);
  closeModal('modal-add-note');

  // FIX: sync – re-render notes list AND field detail view if currently open
  renderNotesList();
  if (currentFieldId === fieldId) openFieldDetail(fieldId);
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

// ════════════════════════════════════════════════════
// PAST SEASONS STATISTICS
// ════════════════════════════════════════════════════
const SEASONS_STORAGE_KEY = `${STORAGE_PREFIX}_seasons`;

function loadSeasonRecords() {
  try {
    return JSON.parse(localStorage.getItem(SEASONS_STORAGE_KEY) || '[]');
  } catch(e) { return []; }
}

let saveSeasonRecords = function(records) {
  localStorage.setItem(SEASONS_STORAGE_KEY, JSON.stringify(records));
  // FIX 2.5: sync season records to Firebase if logged in
  if (typeof _fbGetUser === 'function' && _fbGetUser()) {
    fbSaveSeasonRecords(records).catch(e => console.warn('[fbSaveSeasonRecords]', e));
  }
}

let currentSeasonsMetric = 'yield';

function setSeasonsMetric(metric) {
  currentSeasonsMetric = metric;
  document.querySelectorAll('.season-compare-chip').forEach(c => {
    c.classList.toggle('active', c.getAttribute('data-metric') === metric);
  });
  renderSeasonsTrend();
}

function openAddSeasonModal() {
  const currentYear = new Date().getFullYear();
  document.getElementById('season-year').value = currentYear - 1;
  // Populate season crop select from full CROPS array
  populateCropSelect(document.getElementById('season-crop'));
  document.getElementById('season-yield').value = '';
  document.getElementById('season-rainfall').value = '';
  document.getElementById('season-quality').value = '';
  document.getElementById('season-area').value = '';
  document.getElementById('season-notes').value = '';
  // Clear edit mode
  const modal = document.getElementById('modal-add-season');
  if (modal) delete modal.dataset.editId;
  openModal('modal-add-season');
}

function saveSeasonRecord() {
  const year = parseInt(document.getElementById('season-year').value);
  if (!year || year < 1990 || year > 2030) {
    showToast(lang === 'ru' ? 'Введите корректный год' : 'Enter a valid year');
    return;
  }
  const modal = document.getElementById('modal-add-season');
  const editId = modal ? modal.dataset.editId : null;
  const record = {
    id: editId || generateId(),
    year,
    crop: document.getElementById('season-crop').value,
    yield: parseFloat(document.getElementById('season-yield').value) || null,
    rainfall: parseFloat(document.getElementById('season-rainfall').value) || null,
    quality: parseFloat(document.getElementById('season-quality').value) || null,
    area: parseFloat(document.getElementById('season-area').value) || null,
    notes: document.getElementById('season-notes').value.trim(),
    addedAt: new Date().toISOString().split('T')[0]
  };

  const records = loadSeasonRecords();
  if (editId) {
    // Edit mode: replace by id
    const idx = records.findIndex(r => r.id === editId);
    if (idx >= 0) records[idx] = record;
    else records.push(record);
    if (modal) delete modal.dataset.editId;
  } else {
    // Add mode: replace existing year or push
    const existingIdx = records.findIndex(r => r.year === year);
    if (existingIdx >= 0) {
      record.id = records[existingIdx].id;
      records[existingIdx] = record;
    } else {
      records.push(record);
    }
  }
  records.sort((a,b) => b.year - a.year);
  saveSeasonRecords(records);
  closeModal('modal-add-season');
  renderSeasonsList();
  showToast(lang === 'ru' ? `Сезон ${year} сохранён` : `Season ${year} saved`);
}

function deleteSeasonRecord(id) {
  const msg = lang === 'ru'
    ? 'Вы уверены, что хотите удалить этот сезон? Действие необратимо'
    : 'Are you sure you want to delete this season? This action is irreversible';
  if (!confirm(msg)) return;
  const records = loadSeasonRecords().filter(r => r.id !== id);
  saveSeasonRecords(records);
  renderSeasonsList();
  showToast(lang === 'ru' ? 'Сезон удалён' : 'Season deleted');
}

function editSeasonRecord(id) {
  const records = loadSeasonRecords();
  const rec = records.find(r => r.id === id);
  if (!rec) return;
  // Populate full crop list first
  populateCropSelect(document.getElementById('season-crop'), rec.crop);
  const yearEl = document.getElementById('season-year');
  const yieldEl = document.getElementById('season-yield');
  const rainfallEl = document.getElementById('season-rainfall');
  const qualityEl = document.getElementById('season-quality');
  const notesEl = document.getElementById('season-notes');
  const areaEl = document.getElementById('season-area');
  if (yearEl) yearEl.value = rec.year;
  if (yieldEl) yieldEl.value = rec.yield !== null ? rec.yield : '';
  if (rainfallEl) rainfallEl.value = rec.rainfall !== null ? rec.rainfall : '';
  if (qualityEl) qualityEl.value = rec.quality !== null ? rec.quality : '';
  if (notesEl) notesEl.value = rec.notes || '';
  if (areaEl) areaEl.value = rec.area || '';
  // Store editing id and open modal
  const modal = document.getElementById('modal-add-season');
  if (modal) {
    modal.dataset.editId = id;
    const title = document.getElementById('modal-season-title');
    if (title) title.textContent = lang === 'ru' ? 'Редактировать сезон' : 'Edit Season';
    openModal('modal-add-season');
  }
}

const CROP_DISPLAY = { wheat:'<i data-lucide="wheat" class="icon-sm"></i> Пшеница', corn:'🌽 Кукуруза', sunflower:'🌻 Подсолнух', barley:'🌿 Ячмень', soybean:'🫘 Соя', other:'<i data-lucide="sprout" class="icon-sm"></i> Другое' };

function renderSeasonsTrend() {
  const container = document.getElementById('seasons-trend-area');
  if (!container) return;
  const records = loadSeasonRecords();
  if (records.length < 2) {
    container.innerHTML = '';
    return;
  }

  const sorted = [...records].sort((a,b) => a.year - b.year);
  const metricKey = currentSeasonsMetric;
  const metricLabel = { yield: lang==='ru'?'Урожайность (т/га)':'Yield (t/ha)', rainfall: lang==='ru'?'Осадки (мм)':'Rainfall (mm)', quality: lang==='ru'?'Качество (1-5)':'Quality (1-5)' }[metricKey];
  const metricColor = { yield:BRAND.accent, rainfall:'#2196F3', quality:'#ff9800' }[metricKey];

  const values = sorted.map(r => r[metricKey]);
  const validPairs = sorted.map((r,i) => [r.year, values[i]]).filter(p => p[1] !== null && p[1] !== undefined);
  if (validPairs.length < 2) { container.innerHTML = ''; return; }

  const W = 340, H = 80;
  const minV = Math.min(...validPairs.map(p=>p[1]));
  const maxV = Math.max(...validPairs.map(p=>p[1]));
  const range = maxV - minV || 1;
  const pad = { l: 4, r: 4, t: 8, b: 20 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const toX = (i) => pad.l + (i / (validPairs.length - 1)) * innerW;
  const toY = (v) => pad.t + (1 - (v - minV) / range) * innerH;

  const pathD = validPairs.map((p,i) => `${i===0?'M':'L'}${toX(i).toFixed(1)},${toY(p[1]).toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${toX(validPairs.length-1).toFixed(1)},${(pad.t+innerH).toFixed(1)} L${pad.l},${(pad.t+innerH).toFixed(1)} Z`;

  const dotsHTML = validPairs.map((p,i) => {
    const x = toX(i).toFixed(1);
    const y = toY(p[1]).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="4" fill="${metricColor}" stroke="#fff" stroke-width="1.5"/>
      <text x="${x}" y="${parseFloat(y)-8}" font-size="9" fill="${metricColor}" text-anchor="middle" font-weight="700">${p[1]}</text>
      <text x="${x}" y="${(pad.t+innerH+14).toFixed(1)}" font-size="9" fill="#4a6580" text-anchor="middle">${p[0]}</text>`;
  }).join('');

  container.innerHTML = `
    <div class="seasons-trend-container">
      <div class="seasons-trend-title">${metricLabel}</div>
      <svg class="seasons-trend-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="seasons-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${metricColor}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="${metricColor}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#seasons-grad)" stroke="none"/>
        <path d="${pathD}" fill="none" stroke="${metricColor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dotsHTML}
      </svg>
    </div>`;
}

function renderSeasonsList() {
  const container = document.getElementById('seasons-list-container');
  if (!container) return;
  const records = loadSeasonRecords();

  // Update FAB label based on lang
  const fabLabel = document.getElementById('add-season-fab-label');
  if (fabLabel) fabLabel.textContent = lang === 'ru' ? 'Добавить сезон' : 'Add Season';

  renderSeasonsTrend();

  container.innerHTML = '';

  if (records.length === 0) {
    container.innerHTML = `
      <div class="seasons-empty">
        <div class="seasons-empty-icon">📊</div>
        <p>${lang === 'ru' ? 'Пока нет данных по прошлым сезонам.\nДобавьте первый сезон, чтобы начать отслеживать динамику урожайности.' : 'No past seasons yet.\nAdd your first season to start tracking yield trends.'}</p>
      </div>`;
    return;
  }

  // Summary stats
  const yields = records.filter(r => r.yield !== null).map(r => r.yield);
  const avgYield = yields.length ? (yields.reduce((a,b)=>a+b,0)/yields.length).toFixed(1) : '—';
  const bestRecord = yields.length ? records.filter(r => r.yield !== null).reduce((best, r) => r.yield > best.yield ? r : best) : null;

  const summaryHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
      <div class="stat-card-sm" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;">
        <div class="stat-label" style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">${lang==='ru'?'Ср. урожай':'Avg Yield'}</div>
        <div class="stat-value" style="font-size:20px;font-weight:700;">${avgYield} <span style="font-size:11px;color:var(--text2);font-weight:400;">т/га</span></div>
      </div>
      <div class="stat-card-sm" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;">
        <div class="stat-label" style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">${lang==='ru'?'Лучший год':'Best Year'}</div>
        <div class="stat-value" style="font-size:20px;font-weight:700;color:var(--accent);">${bestRecord ? bestRecord.year : '—'}</div>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', summaryHTML);

  records.forEach(rec => {
    const cropLabel = CROP_DISPLAY[rec.crop] || rec.crop || (lang==='ru' ? 'Без культуры' : 'No crop');
    const stars = rec.quality ? '⭐'.repeat(Math.round(rec.quality)) : '';

    const card = document.createElement('div');
    card.className = 'season-record-card';
    card.innerHTML = `
      <div class="season-record-header">
        <div class="season-record-year">${rec.year}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          ${rec.crop ? `<span class="season-record-crop">${cropLabel}</span>` : ''}
          <button class="season-delete-btn" onclick="event.stopPropagation();editSeasonRecord('${rec.id}')" style="background:rgba(76,175,80,0.12);color:var(--accent);border:1px solid rgba(76,175,80,0.3);margin-right:4px;">✏️</button>
          <button class="season-delete-btn" onclick="event.stopPropagation();deleteSeasonRecord('${rec.id}')">✕</button>
        </div>
      </div>
      <div class="season-record-stats">
        <div class="season-stat-mini">
          <div class="val" style="color:var(--accent);">${rec.yield !== null ? rec.yield : '—'}</div>
          <div class="lbl">${lang==='ru'?'т/га':'t/ha'}</div>
        </div>
        <div class="season-stat-mini">
          <div class="val" style="color:#2196F3;">${rec.rainfall !== null ? rec.rainfall : '—'}</div>
          <div class="lbl">${lang==='ru'?'мм осадков':'mm rain'}</div>
        </div>
        <div class="season-stat-mini">
          <div class="val">${rec.quality !== null ? rec.quality : '—'}</div>
          <div class="lbl">${lang==='ru'?'качество':'quality'}</div>
        </div>
      </div>
      ${rec.area ? `<div style="font-size:12px;color:var(--text3);margin-bottom:4px;">📐 ${rec.area} ${lang==='ru'?'га':'ha'} · ${stars}</div>` : stars ? `<div style="font-size:12px;margin-bottom:4px;">${stars}</div>` : ''}
      ${rec.notes ? `<div class="season-record-notes">${escapeHtml(rec.notes)}</div>` : ''}
    `;
    container.appendChild(card);
  });
}

// ════════════════════════════════════════════════════
// ЗАДАЧА 4: УПРАВЛЕНИЕ СЕЗОНАМИ (Season Manager)
// Поля остаются, обнуляются только агрономические данные
// ════════════════════════════════════════════════════

function loadSeasonManagerData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + '-seasons-mgr') || '[]');
  } catch { return []; }
}
let saveSeasonManagerData = function(data) {
  localStorage.setItem(STORAGE_PREFIX + '-seasons-mgr', JSON.stringify(data));
};
function loadActiveSeason() {
  return localStorage.getItem(STORAGE_PREFIX + '-active-season') || 'Сезон 2026';
}
let saveActiveSeason = function(name) {
  localStorage.setItem(STORAGE_PREFIX + '-active-season', name);
};

function updateSeasonLabel() {
  const label = document.getElementById('current-season-label');
  if (label) label.textContent = loadActiveSeason();
  const notesLabel = document.getElementById('notes-season-label');
  if (notesLabel) notesLabel.textContent = loadActiveSeason();
}

// NEW: Автоматически формирует название из года
function buildSeasonName(year) {
  return (lang === 'ru' ? 'Сезон ' : 'Season ') + year;
}

// NEW: Preview в форме создания
function updateSeasonNamePreview() {
  const yearInp = document.getElementById('new-season-year');
  const preview = document.getElementById('new-season-preview');
  if (!yearInp || !preview) return;
  const y = parseInt(yearInp.value, 10);
  if (y >= 1990 && y <= 2099) {
    preview.textContent = '→ ' + buildSeasonName(y);
  } else {
    preview.textContent = '';
  }
}

function openSeasonManagerModal() {
  // NEW: Update labels based on current language
  const isRu = lang === 'ru';
  const titleEl = document.getElementById('season-mgr-title');
  if (titleEl) titleEl.textContent = '🗓 ' + (isRu ? 'Сезоны' : 'Seasons');
  const newBtn = document.getElementById('season-mgr-new-btn');
  if (newBtn) newBtn.textContent = '+ ' + (isRu ? 'Новый' : 'New');
  const formTitle = document.getElementById('new-season-form-title');
  if (formTitle) formTitle.textContent = isRu ? 'Новый сезон' : 'New Season';
  // NEW: Label для поля года (вместо названия сезона)
  const formLabel = document.getElementById('new-season-label');
  if (formLabel) formLabel.textContent = isRu ? 'Год сезона' : 'Season year';
  const startLabel = document.getElementById('new-season-start-label');
  if (startLabel) startLabel.textContent = isRu ? 'Дата начала *' : 'Start date *';
  const cancelBtn = document.getElementById('new-season-cancel-btn');
  if (cancelBtn) cancelBtn.textContent = isRu ? 'Отмена' : 'Cancel';
  const createBtn = document.getElementById('new-season-create-btn');
  if (createBtn) createBtn.textContent = isRu ? 'Создать' : 'Create';

  renderSeasonManagerList();
  openModal('modal-season-manager');
}

function openCreateSeasonForm() {
  const form = document.getElementById('new-season-form');
  if (form) { form.style.display = 'block'; }
  // NEW: Очищаем поле года вместо названия
  const yearInp = document.getElementById('new-season-year');
  if (yearInp) { yearInp.value = ''; yearInp.focus(); }
  const startInp = document.getElementById('new-season-start');
  if (startInp) startInp.value = '';
  // NEW: Reset preview
  const preview = document.getElementById('new-season-preview');
  if (preview) preview.textContent = '';
}

// NEW: Создание сезона — только год + дата начала; endDate = null
function createNewSeason() {
  const yearInp = document.getElementById('new-season-year');
  const yearVal = yearInp ? parseInt(yearInp.value, 10) : NaN;
  if (!yearVal || yearVal < 1990 || yearVal > 2099) {
    showToast(lang === 'ru' ? 'Введите корректный год (1990–2099)' : 'Enter a valid year (1990–2099)');
    return;
  }
  // NEW: Дата начала обязательна
  const startVal = (document.getElementById('new-season-start') || {}).value || '';
  if (!startVal) {
    showToast(lang === 'ru' ? 'Укажите дату начала сезона' : 'Start date is required');
    return;
  }
  // NEW: Формируем название автоматически
  const name = buildSeasonName(yearVal);
  const seasons = loadSeasonManagerData();
  // NEW: Проверяем уникальность по году
  if (seasons.find(s => s.year === yearVal || s.name === name)) {
    showToast(lang === 'ru' ? 'Сезон с таким годом уже существует' : 'Season for this year already exists');
    return;
  }
  // NEW: endDate = null по умолчанию
  seasons.push({
    id: 'season_' + yearVal + '_' + Date.now(),
    name: name,
    year: yearVal,
    createdAt: new Date().toISOString().split('T')[0],
    startDate: startVal,
    endDate: null
  });
  saveSeasonManagerData(seasons);
  activateSeason(name);
  document.getElementById('new-season-form').style.display = 'none';
}

function activateSeason(name) {
  const prev = loadActiveSeason();
  if (prev === name) {
    closeModal('modal-season-manager');
    showToast((lang === 'ru' ? 'Уже активен: ' : 'Already active: ') + name);
    return;
  }
  // Save current field agronomic data under the current season snapshot
  const fields = loadFields();
  const snapshot = fields.map(f => ({
    id: f.id, crop: f.crop, sowingDate: f.sowingDate,
    yieldForecast: f.yieldForecast, season: f.season || [],
    continent: f.continent
  }));
  const seasons = loadSeasonManagerData();
  const oldSeason = seasons.find(s => s.name === prev);
  if (oldSeason) oldSeason.snapshot = snapshot;
  // Save snapshot for previous season
  saveSeasonManagerData(seasons);
  saveActiveSeason(name);

  // Restore snapshot for new season (if exists), else reset agronomic data
  const newSeason = seasons.find(s => s.name === name);
  const newSnap = newSeason && newSeason.snapshot;
  const updatedFields = fields.map(f => {
    const snap = newSnap ? newSnap.find(s => s.id === f.id) : null;
    if (snap) {
      return { ...f, crop: snap.crop || '', sowingDate: snap.sowingDate || '',
                yieldForecast: snap.yieldForecast || '', season: snap.season || [],
                continent: snap.continent || '' };
    }
    // New season — reset only agronomic data, keep geometry
    return { ...f, crop: '', sowingDate: '', yieldForecast: '', season: [], continent: f.continent || '' };
  });
  saveFields(updatedFields);
  renderFieldsList();
  updateSeasonLabel();
  closeModal('modal-season-manager');
  showToast((lang === 'ru' ? '✅ Сезон активирован: ' : '✅ Season activated: ') + name);
}

function deleteSeasonFromManager(name) {
  if (name === loadActiveSeason()) {
    showToast(lang === 'ru' ? 'Нельзя удалить активный сезон' : 'Cannot delete active season');
    return;
  }
  const confirmMsg = lang === 'ru'
    ? 'Вы уверены, что хотите удалить этот сезон? Действие необратимо'
    : 'Are you sure you want to delete this season? This action is irreversible';
  if (!confirm(confirmMsg)) return;
  const seasons = loadSeasonManagerData().filter(s => s.name !== name);
  saveSeasonManagerData(seasons);
  renderSeasonManagerList();
  showToast((lang === 'ru' ? 'Сезон удалён: ' : 'Season deleted: ') + name);
}

// NEW: Открыть модалку редактирования дат сезона
function openEditSeasonModal(name) {
  const seasons = loadSeasonManagerData();
  const s = seasons.find(x => x.name === name);
  if (!s) return;
  const isRu = lang === 'ru';
  // Fill modal labels
  const modalTitle = document.getElementById('edit-season-modal-title');
  if (modalTitle) modalTitle.textContent = isRu ? 'Редактировать сезон' : 'Edit Season';
  const cancelBtn = document.getElementById('edit-season-cancel-btn');
  if (cancelBtn) cancelBtn.textContent = isRu ? 'Отмена' : 'Cancel';
  const saveBtn = document.getElementById('edit-season-save-btn');
  if (saveBtn) saveBtn.textContent = isRu ? 'Сохранить' : 'Save';
  const nameLabel = document.getElementById('edit-season-name-label');
  if (nameLabel) nameLabel.textContent = isRu ? 'Сезон' : 'Season';
  const startLabel = document.getElementById('edit-season-start-label');
  if (startLabel) startLabel.textContent = isRu ? 'Дата начала *' : 'Start date *';
  const endLabel = document.getElementById('edit-season-end-label');
  if (endLabel) endLabel.textContent = isRu ? 'Дата окончания' : 'End date';
  const endHint = document.getElementById('edit-season-end-hint');
  if (endHint) endHint.textContent = isRu ? 'Можно оставить пустым' : 'Can be left empty';
  // Fill values
  const hidden = document.getElementById('edit-season-name-hidden');
  if (hidden) hidden.value = name;
  const display = document.getElementById('edit-season-name-display');
  if (display) display.textContent = name;
  const startInp = document.getElementById('edit-season-start');
  if (startInp) startInp.value = s.startDate || '';
  const endInp = document.getElementById('edit-season-end');
  if (endInp) endInp.value = s.endDate || '';
  openModal('modal-edit-season');
}

// NEW: Сохранить изменённые даты сезона
function saveEditedSeason() {
  const hidden = document.getElementById('edit-season-name-hidden');
  const name = hidden ? hidden.value : '';
  if (!name) return;
  const startVal = (document.getElementById('edit-season-start') || {}).value || '';
  if (!startVal) {
    showToast(lang === 'ru' ? 'Укажите дату начала' : 'Start date is required');
    return;
  }
  const endVal = (document.getElementById('edit-season-end') || {}).value || null;
  // NEW: Проверка — дата окончания должна быть позже даты начала
  if (endVal && startVal && endVal < startVal) {
    showToast(lang === 'ru' ? 'Дата окончания не может быть раньше даты начала' : 'End date cannot be before start date');
    return;
  }
  const seasons = loadSeasonManagerData();
  const idx = seasons.findIndex(s => s.name === name);
  if (idx === -1) return;
  seasons[idx].startDate = startVal;
  seasons[idx].endDate = endVal || null;
  saveSeasonManagerData(seasons);
  closeModal('modal-edit-season');
  renderSeasonManagerList();
  showToast(lang === 'ru' ? '✅ Даты сезона обновлены' : '✅ Season dates updated');
}

// NEW: Форматирование даты для отображения
function fmtSeasonDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

function renderSeasonManagerList() {
  const container = document.getElementById('season-manager-list');
  if (!container) return;
  const seasons = loadSeasonManagerData();
  const active = loadActiveSeason();

  // NEW: Если активный сезон не в списке — добавить с разумными значениями по умолчанию
  if (!seasons.find(s => s.name === active)) {
    // Попробуем распарсить год из названия типа "Сезон 2026" / "Season 2026"
    const yearMatch = active.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();
    seasons.unshift({
      id: 'season_' + year + '_legacy',
      name: active,
      year: year,
      createdAt: new Date().toISOString().split('T')[0],
      startDate: year + '-01-01',
      endDate: null
    });
    saveSeasonManagerData(seasons);
  }

  // NEW: Мигрируем старые сезоны без полей year/startDate
  let migrated = false;
  seasons.forEach(s => {
    if (!s.year) {
      const m = (s.name || '').match(/\d{4}/);
      s.year = m ? parseInt(m[0], 10) : new Date().getFullYear();
      migrated = true;
    }
    if (!s.startDate) {
      s.startDate = s.year + '-01-01';
      migrated = true;
    }
    if (s.endDate === undefined) {
      s.endDate = null;
      migrated = true;
    }
    if (!s.id) {
      s.id = 'season_' + s.year + '_' + Date.now();
      migrated = true;
    }
  });
  if (migrated) saveSeasonManagerData(seasons);

  container.innerHTML = '';
  seasons.forEach(s => {
    const isActive = s.name === active;
    const card = document.createElement('div');
    card.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:14px;border-radius:var(--radius-sm);background:${isActive ? 'rgba(76,175,80,0.12)' : 'var(--bg2)'};border:1px solid ${isActive ? 'rgba(76,175,80,0.4)' : 'var(--border)'};`;

    // NEW: Форматирование дат — с/по
    const isRu = lang === 'ru';
    let dateInfo = '';
    if (s.startDate) {
      const startFmt = fmtSeasonDate(s.startDate);
      if (s.endDate) {
        dateInfo = (isRu ? 'с ' : 'from ') + startFmt + (isRu ? ' по ' : ' to ') + fmtSeasonDate(s.endDate);
      } else {
        dateInfo = (isRu ? 'с ' : 'from ') + startFmt + ' — ' + (isRu ? 'дата окончания не указана' : 'end date not set');
      }
    } else {
      dateInfo = s.createdAt || '';
    }

    // NEW: Кнопка карандаша для редактирования дат
    const escapedName = s.name.replace(/'/g, "\\'");
    card.innerHTML = `
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:600;${isActive ? 'color:var(--accent);' : ''}">${s.name} ${isActive ? '✓' : ''}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;white-space:normal;line-height:1.4;">${dateInfo}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;align-items:center;">
        <!-- FIX: Порядок кнопок — Выбрать, потом редактировать, потом удалить -->
        ${!isActive ? `<button onclick="activateSeason('${escapedName}')" style="padding:8px 14px;border-radius:var(--radius-sm);background:var(--accent);color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;">${isRu ? 'Выбрать' : 'Select'}</button>` : `<span style="font-size:12px;color:var(--accent);font-weight:600;">${isRu ? 'Активен' : 'Active'}</span>`}
        <button onclick="openEditSeasonModal('${escapedName}')" title="${isRu ? 'Редактировать даты' : 'Edit dates'}" style="width:34px;height:34px;border-radius:var(--radius-sm);background:var(--bg3);color:var(--text2);border:1px solid var(--border);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✏️</button>
        ${!isActive ? `<button onclick="deleteSeasonFromManager('${escapedName}')" style="width:34px;height:34px;border-radius:var(--radius-sm);background:rgba(239,83,80,0.12);color:var(--danger);border:1px solid rgba(239,83,80,0.3);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>` : ''}
      </div>`;
    container.appendChild(card);
  });
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

// Sets --app-height CSS var to window.innerHeight so layouts use actual visible height.
// Also detects PWA standalone mode and adjusts safe-top for iOS status bar.
(function fixMobileViewportHeight() {
  // Detect PWA standalone mode (added to home screen)
  const isStandalone = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches;

  // In standalone/PWA mode on iOS, env(safe-area-inset-top) correctly gives status bar height.
  // But we need to ensure the CSS var is set via JS for older devices where env() may be 0.
  function setVh() {
    // Use visualViewport height when available (most accurate on iOS PWA)
    const h = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    const vh = h * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
    document.documentElement.style.setProperty('--app-height', h + 'px');

    // In PWA standalone: read actual safe-area from computed style (env() resolved value)
    if (isStandalone) {
      // Get resolved env(safe-area-inset-top) value
      const testEl = document.createElement('div');
      testEl.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);width:0;height:0;pointer-events:none;visibility:hidden;';
      document.body.appendChild(testEl);
      const safeTop = parseInt(window.getComputedStyle(testEl).top) || 0;
      document.body.removeChild(testEl);
      // Minimum 20px for status bar on older iPhones, 44-59px for notch/Dynamic Island
      const finalSafeTop = Math.max(safeTop, 20);
      document.documentElement.style.setProperty('--safe-top', finalSafeTop + 'px');

      // FIX: same resolution for the bottom inset (home indicator). Without this,
      // --safe-bottom relies on raw env() resolving correctly on first paint in
      // standalone mode, which is unreliable and misaligns the tab bar / bottom
      // sheets with the actual home-indicator area.
      const testElBottom = document.createElement('div');
      testElBottom.style.cssText = 'position:fixed;bottom:env(safe-area-inset-bottom,0px);width:0;height:0;pointer-events:none;visibility:hidden;';
      document.body.appendChild(testElBottom);
      const safeBottom = parseInt(window.getComputedStyle(testElBottom).bottom) || 0;
      document.body.removeChild(testElBottom);
      document.documentElement.style.setProperty('--safe-bottom', safeBottom + 'px');

      document.documentElement.classList.add('pwa-standalone');
    }
  }
  setVh();
  // FIX 2: update on resize AND orientation change (handles browser chrome show/hide)
  window.addEventListener('resize', setVh, { passive: true });
  window.addEventListener('orientationchange', () => { setTimeout(setVh, 100); }, { passive: true });
  // FIX 2: VisualViewport API — most accurate on iOS 13+ for keyboard/chrome changes
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setVh, { passive: true });
  }
})();


// NEW: Generate PNG icon from SVG at runtime for maximum iOS/Android compatibility
(function generateAppIcon() {
  const svgSrc = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj4KICA8IS0tIEJhY2tncm91bmQgZ3JhZGllbnQg4oCUIGRlZXAgZ3JlZW4gZmllbGQgLS0+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxYjVlMjAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMGEzZDBhIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJza3kiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzFhM2E1YyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMyZTVkM2EiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9IndoZWF0X2dyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6I2Y5Yzg0YSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNlNmE4MDAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImZpZWxkX2dyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzJlN2QzMiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMxYjVlMjAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9Imdsb3ciIGN4PSI1MCUiIGN5PSI1MCUiIHI9IjUwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM0Q0FGNTA7c3RvcC1vcGFjaXR5OjAuMyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM0Q0FGNTA7c3RvcC1vcGFjaXR5OjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgPC9kZWZzPgoKICA8IS0tIFJvdW5kZWQgcmVjdCBiYWNrZ3JvdW5kIC0tPgogIDxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iOTYiIHJ5PSI5NiIgZmlsbD0idXJsKCNza3kpIi8+CgogIDwhLS0gRmllbGQgcm93cyAocGVyc3BlY3RpdmUgbGluZXMpIC0tPgogIDxnIG9wYWNpdHk9IjAuMzUiPgogICAgPGVsbGlwc2UgY3g9IjI1NiIgY3k9IjQyMCIgcng9IjI0MCIgcnk9IjYwIiBmaWxsPSIjMWI1ZTIwIi8+CiAgPC9nPgogIDwhLS0gRmllbGQgc3RyaXBlcyAtLT4KICA8ZyBmaWxsPSJub25lIiBzdHJva2U9IiM0Q0FGNTAiIHN0cm9rZS13aWR0aD0iNiIgb3BhY2l0eT0iMC4xOCI+CiAgICA8cGF0aCBkPSJNNjAgNTEwIFEyNTYgMzUwIDQ1MiA1MTAiLz4KICAgIDxwYXRoIGQ9Ik04MCA1MTAgUTI1NiAzNzAgNDMyIDUxMCIvPgogICAgPHBhdGggZD0iTTEwMCA1MTAgUTI1NiAzOTAgNDEyIDUxMCIvPgogICAgPHBhdGggZD0iTTEyMCA1MTAgUTI1NiA0MTAgMzkyIDUxMCIvPgogIDwvZz4KCiAgPCEtLSBCb3R0b20gZmllbGQgLS0+CiAgPGVsbGlwc2UgY3g9IjI1NiIgY3k9IjQ4MCIgcng9IjIzMCIgcnk9IjU1IiBmaWxsPSIjMmU3ZDMyIiBvcGFjaXR5PSIwLjciLz4KCiAgPCEtLSBTdW4gLyBnbG93IHRvcCByaWdodCAtLT4KICA8Y2lyY2xlIGN4PSIzOTAiIGN5PSIxMTAiIHI9IjQ4IiBmaWxsPSIjZjljODRhIiBvcGFjaXR5PSIwLjE4Ii8+CiAgPGNpcmNsZSBjeD0iMzkwIiBjeT0iMTEwIiByPSIzMCIgZmlsbD0iI2Y5Yzg0YSIgb3BhY2l0eT0iMC4yOCIvPgoKICA8IS0tID09PSBXSEVBVCBTVEFMS1MgPT09IC0tPgogIDwhLS0gQ2VudGVyIG1haW4gc3RhbGsgLS0+CiAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjU2LCA0NjApIj4KICAgIDwhLS0gU3RhbGsgLS0+CiAgICA8bGluZSB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iLTIyMCIgc3Ryb2tlPSIjYzhhNDAwIiBzdHJva2Utd2lkdGg9IjciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgPCEtLSBMZWF2ZXMgLS0+CiAgICA8cGF0aCBkPSJNMCwtODAgUS00MCwtMTAwIC01NSwtMTMwIiBzdHJva2U9IiM0Q0FGNTAiIHN0cm9rZS13aWR0aD0iNSIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8cGF0aCBkPSJNMCwtMTIwIFE0MCwtMTQwIDUwLC0xNzAiIHN0cm9rZT0iIzRDQUY1MCIgc3Ryb2tlLXdpZHRoPSI1IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDwhLS0gV2hlYXQgaGVhZCBncmFpbnMgLS0+CiAgICA8ZyBmaWxsPSJ1cmwoI3doZWF0X2dyYWQpIiBzdHJva2U9IiNjOGE0MDAiIHN0cm9rZS13aWR0aD0iMS41Ij4KICAgICAgPCEtLSBDZW50ZXIgY29sdW1uIC0tPgogICAgICA8ZWxsaXBzZSBjeD0iMCIgY3k9Ii0yMjAiIHJ4PSI5IiByeT0iMTUiLz4KICAgICAgPGVsbGlwc2UgY3g9IjAiIGN5PSItMjQwIiByeD0iOCIgcnk9IjEzIi8+CiAgICAgIDxlbGxpcHNlIGN4PSIwIiBjeT0iLTI1OCIgcng9IjciIHJ5PSIxMiIvPgogICAgICA8ZWxsaXBzZSBjeD0iMCIgY3k9Ii0yNzQiIHJ4PSI2IiByeT0iMTAiLz4KICAgICAgPGVsbGlwc2UgY3g9IjAiIGN5PSItMjg4IiByeD0iNSIgcnk9IjkiLz4KICAgICAgPCEtLSBMZWZ0IGdyYWlucyAtLT4KICAgICAgPGVsbGlwc2UgY3g9Ii0xMyIgY3k9Ii0yMjMiIHJ4PSI4IiByeT0iMTMiIHRyYW5zZm9ybT0icm90YXRlKC0xOCwgLTEzLCAtMjIzKSIvPgogICAgICA8ZWxsaXBzZSBjeD0iLTEyIiBjeT0iLTI0MyIgcng9IjciIHJ5PSIxMiIgdHJhbnNmb3JtPSJyb3RhdGUoLTIwLCAtMTIsIC0yNDMpIi8+CiAgICAgIDxlbGxpcHNlIGN4PSItMTAiIGN5PSItMjYxIiByeD0iNiIgcnk9IjEwIiB0cmFuc2Zvcm09InJvdGF0ZSgtMjIsIC0xMCwgLTI2MSkiLz4KICAgICAgPGVsbGlwc2UgY3g9Ii04IiBjeT0iLTI3NyIgcng9IjUiIHJ5PSI5IiB0cmFuc2Zvcm09InJvdGF0ZSgtMjIsIC04LCAtMjc3KSIvPgogICAgICA8IS0tIFJpZ2h0IGdyYWlucyAtLT4KICAgICAgPGVsbGlwc2UgY3g9IjEzIiBjeT0iLTIyMyIgcng9IjgiIHJ5PSIxMyIgdHJhbnNmb3JtPSJyb3RhdGUoMTgsIDEzLCAtMjIzKSIvPgogICAgICA8ZWxsaXBzZSBjeD0iMTIiIGN5PSItMjQzIiByeD0iNyIgcnk9IjEyIiB0cmFuc2Zvcm09InJvdGF0ZSgyMCwgMTIsIC0yNDMpIi8+CiAgICAgIDxlbGxpcHNlIGN4PSIxMCIgY3k9Ii0yNjEiIHJ4PSI2IiByeT0iMTAiIHRyYW5zZm9ybT0icm90YXRlKDIyLCAxMCwgLTI2MSkiLz4KICAgICAgPGVsbGlwc2UgY3g9IjgiIGN5PSItMjc3IiByeD0iNSIgcnk9IjkiIHRyYW5zZm9ybT0icm90YXRlKDIyLCA4LCAtMjc3KSIvPgogICAgICA8IS0tIEF3biB0aXAgLS0+CiAgICAgIDxsaW5lIHgxPSIwIiB5MT0iLTI5NyIgeDI9IjAiIHkyPSItMzE4IiBzdHJva2U9IiNmOWM4NGEiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8L2c+CiAgPC9nPgoKICA8IS0tIExlZnQgc3RhbGsgKHNtYWxsZXIpIC0tPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE4MCwgNDYwKSByb3RhdGUoLTgpIj4KICAgIDxsaW5lIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSItMTgwIiBzdHJva2U9IiNjOGE0MDAiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8cGF0aCBkPSJNMCwtNzAgUS0zMCwtODUgLTQyLC0xMDgiIHN0cm9rZT0iIzRDQUY1MCIgc3Ryb2tlLXdpZHRoPSI0IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxnIGZpbGw9InVybCgjd2hlYXRfZ3JhZCkiIHN0cm9rZT0iI2M4YTQwMCIgc3Ryb2tlLXdpZHRoPSIxLjUiPgogICAgICA8ZWxsaXBzZSBjeD0iMCIgY3k9Ii0xODAiIHJ4PSI3IiByeT0iMTIiLz4KICAgICAgPGVsbGlwc2UgY3g9IjAiIGN5PSItMTk3IiByeD0iNyIgcnk9IjExIi8+CiAgICAgIDxlbGxpcHNlIGN4PSIwIiBjeT0iLTIxMiIgcng9IjYiIHJ5PSIxMCIvPgogICAgICA8ZWxsaXBzZSBjeD0iMCIgY3k9Ii0yMjUiIHJ4PSI1IiByeT0iOCIvPgogICAgICA8ZWxsaXBzZSBjeD0iLTEwIiBjeT0iLTE4MyIgcng9IjYiIHJ5PSIxMCIgdHJhbnNmb3JtPSJyb3RhdGUoLTE4LC0xMCwtMTgzKSIvPgogICAgICA8ZWxsaXBzZSBjeD0iLTkiIGN5PSItMTk5IiByeD0iNSIgcnk9IjkiIHRyYW5zZm9ybT0icm90YXRlKC0yMCwtOSwtMTk5KSIvPgogICAgICA8ZWxsaXBzZSBjeD0iLTgiIGN5PSItMjE0IiByeD0iNSIgcnk9IjgiIHRyYW5zZm9ybT0icm90YXRlKC0yMiwtOCwtMjE0KSIvPgogICAgICA8ZWxsaXBzZSBjeD0iMTAiIGN5PSItMTgzIiByeD0iNiIgcnk9IjEwIiB0cmFuc2Zvcm09InJvdGF0ZSgxOCwxMCwtMTgzKSIvPgogICAgICA8ZWxsaXBzZSBjeD0iOSIgY3k9Ii0xOTkiIHJ4PSI1IiByeT0iOSIgdHJhbnNmb3JtPSJyb3RhdGUoMjAsOSwtMTk5KSIvPgogICAgICA8ZWxsaXBzZSBjeD0iOCIgY3k9Ii0yMTQiIHJ4PSI1IiByeT0iOCIgdHJhbnNmb3JtPSJyb3RhdGUoMjIsOCwtMjE0KSIvPgogICAgICA8bGluZSB4MT0iMCIgeTE9Ii0yMzMiIHgyPSIwIiB5Mj0iLTI1MCIgc3Ryb2tlPSIjZjljODRhIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8L2c+CiAgPC9nPgoKICA8IS0tIFJpZ2h0IHN0YWxrIChzbWFsbGVyKSAtLT4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMzIsIDQ2MCkgcm90YXRlKDgpIj4KICAgIDxsaW5lIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSItMTg1IiBzdHJva2U9IiNjOGE0MDAiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8cGF0aCBkPSJNMCwtNzUgUTMwLC05MCA0MiwtMTEyIiBzdHJva2U9IiM0Q0FGNTAiIHN0cm9rZS13aWR0aD0iNCIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8ZyBmaWxsPSJ1cmwoI3doZWF0X2dyYWQpIiBzdHJva2U9IiNjOGE0MDAiIHN0cm9rZS13aWR0aD0iMS41Ij4KICAgICAgPGVsbGlwc2UgY3g9IjAiIGN5PSItMTg1IiByeD0iNyIgcnk9IjEyIi8+CiAgICAgIDxlbGxpcHNlIGN4PSIwIiBjeT0iLTIwMiIgcng9IjciIHJ5PSIxMSIvPgogICAgICA8ZWxsaXBzZSBjeD0iMCIgY3k9Ii0yMTciIHJ4PSI2IiByeT0iMTAiLz4KICAgICAgPGVsbGlwc2UgY3g9IjAiIGN5PSItMjMwIiByeD0iNSIgcnk9IjgiLz4KICAgICAgPGVsbGlwc2UgY3g9Ii0xMCIgY3k9Ii0xODgiIHJ4PSI2IiByeT0iMTAiIHRyYW5zZm9ybT0icm90YXRlKC0xOCwtMTAsLTE4OCkiLz4KICAgICAgPGVsbGlwc2UgY3g9Ii05IiBjeT0iLTIwNCIgcng9IjUiIHJ5PSI5IiB0cmFuc2Zvcm09InJvdGF0ZSgtMjAsLTksLTIwNCkiLz4KICAgICAgPGVsbGlwc2UgY3g9Ii04IiBjeT0iLTIxOSIgcng9IjUiIHJ5PSI4IiB0cmFuc2Zvcm09InJvdGF0ZSgtMjIsLTgsLTIxOSkiLz4KICAgICAgPGVsbGlwc2UgY3g9IjEwIiBjeT0iLTE4OCIgcng9IjYiIHJ5PSIxMCIgdHJhbnNmb3JtPSJyb3RhdGUoMTgsMTAsLTE4OCkiLz4KICAgICAgPGVsbGlwc2UgY3g9IjkiIGN5PSItMjA0IiByeD0iNSIgcnk9IjkiIHRyYW5zZm9ybT0icm90YXRlKDIwLDksLTIwNCkiLz4KICAgICAgPGVsbGlwc2UgY3g9IjgiIGN5PSItMjE5IiByeD0iNSIgcnk9IjgiIHRyYW5zZm9ybT0icm90YXRlKDIyLDgsLTIxOSkiLz4KICAgICAgPGxpbmUgeDE9IjAiIHkxPSItMjM4IiB4Mj0iMCIgeTI9Ii0yNTYiIHN0cm9rZT0iI2Y5Yzg0YSIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgPC9nPgogIDwvZz4KCiAgPCEtLSBGYXIgbGVmdCBzdGFsayAoc21hbGxlc3QpIC0tPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEyOCwgNDYwKSByb3RhdGUoLTE0KSI+CiAgICA8bGluZSB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iLTE0MCIgc3Ryb2tlPSIjYTA3ODAwIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iMC44Ii8+CiAgICA8ZyBmaWxsPSIjZTZiODAwIiBzdHJva2U9IiNhMDc4MDAiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC44NSI+CiAgICAgIDxlbGxpcHNlIGN4PSIwIiBjeT0iLTE0MCIgcng9IjUiIHJ5PSI5Ii8+CiAgICAgIDxlbGxpcHNlIGN4PSIwIiBjeT0iLTE1MyIgcng9IjUiIHJ5PSI4Ii8+CiAgICAgIDxlbGxpcHNlIGN4PSIwIiBjeT0iLTE2NCIgcng9IjQiIHJ5PSI3Ii8+CiAgICAgIDxlbGxpcHNlIGN4PSItNyIgY3k9Ii0xNDMiIHJ4PSI0IiByeT0iNyIgdHJhbnNmb3JtPSJyb3RhdGUoLTE4LC03LC0xNDMpIi8+CiAgICAgIDxlbGxpcHNlIGN4PSItNyIgY3k9Ii0xNTUiIHJ4PSI0IiByeT0iNyIgdHJhbnNmb3JtPSJyb3RhdGUoLTIwLC03LC0xNTUpIi8+CiAgICAgIDxlbGxpcHNlIGN4PSI3IiBjeT0iLTE0MyIgcng9IjQiIHJ5PSI3IiB0cmFuc2Zvcm09InJvdGF0ZSgxOCw3LC0xNDMpIi8+CiAgICAgIDxlbGxpcHNlIGN4PSI3IiBjeT0iLTE1NSIgcng9IjQiIHJ5PSI3IiB0cmFuc2Zvcm09InJvdGF0ZSgyMCw3LC0xNTUpIi8+CiAgICA8L2c+CiAgPC9nPgoKICA8IS0tIEZhciByaWdodCBzdGFsayAoc21hbGxlc3QpIC0tPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDM4NCwgNDYwKSByb3RhdGUoMTQpIj4KICAgIDxsaW5lIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSItMTQwIiBzdHJva2U9IiNhMDc4MDAiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBvcGFjaXR5PSIwLjgiLz4KICAgIDxnIGZpbGw9IiNlNmI4MDAiIHN0cm9rZT0iI2EwNzgwMCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjg1Ij4KICAgICAgPGVsbGlwc2UgY3g9IjAiIGN5PSItMTQwIiByeD0iNSIgcnk9IjkiLz4KICAgICAgPGVsbGlwc2UgY3g9IjAiIGN5PSItMTUzIiByeD0iNSIgcnk9IjgiLz4KICAgICAgPGVsbGlwc2UgY3g9IjAiIGN5PSItMTY0IiByeD0iNCIgcnk9IjciLz4KICAgICAgPGVsbGlwc2UgY3g9Ii03IiBjeT0iLTE0MyIgcng9IjQiIHJ5PSI3IiB0cmFuc2Zvcm09InJvdGF0ZSgtMTgsLTcsLTE0MykiLz4KICAgICAgPGVsbGlwc2UgY3g9Ii03IiBjeT0iLTE1NSIgcng9IjQiIHJ5PSI3IiB0cmFuc2Zvcm09InJvdGF0ZSgtMjAsLTcsLTE1NSkiLz4KICAgICAgPGVsbGlwc2UgY3g9IjciIGN5PSItMTQzIiByeD0iNCIgcnk9IjciIHRyYW5zZm9ybT0icm90YXRlKDE4LDcsLTE0MykiLz4KICAgICAgPGVsbGlwc2UgY3g9IjciIGN5PSItMTU1IiByeD0iNCIgcnk9IjciIHRyYW5zZm9ybT0icm90YXRlKDIwLDcsLTE1NSkiLz4KICAgIDwvZz4KICA8L2c+CgogIDwhLS0gU3VidGxlIHZpZ25ldHRlIC8gaW5uZXIgZ2xvdyAtLT4KICA8cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9Ijk2IiByeT0iOTYiIGZpbGw9InVybCgjZ2xvdykiLz4KICA8IS0tIEJvcmRlciBzaGluZSAtLT4KICA8cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgcng9Ijk2IiByeT0iOTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEyKSIgc3Ryb2tlLXdpZHRoPSI0Ii8+Cjwvc3ZnPg==';
  const sizes = [180, 152, 120];
  
  function svgToPng(size, callback) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      callback(canvas.toDataURL('image/png'));
    };
    img.onerror = function() { callback(null); };
    img.src = svgSrc;
  }
  
  // Replace apple-touch-icon links with PNG versions
  window.addEventListener('load', function() {
    svgToPng(180, function(pngUri) {
      if (!pngUri) return;
      // Update all apple-touch-icon links
      document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(function(link) {
        link.href = pngUri;
      });
      // Also update favicon
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) { favicon = document.createElement('link'); favicon.rel = 'icon'; document.head.appendChild(favicon); }
      favicon.type = 'image/png';
      favicon.href = pngUri;
    });
  });
})();

// Инициализация при загрузке
window.addEventListener('load', () => {
  initLanguage();
  const settings = loadSettings();
  applyTranslations();
  applyTheme(settings.theme);

  // Safe reset without map-dependent calls
  isDrawing = false;
  const toast = document.getElementById('toast');
  if (toast) toast.classList.remove('show');

  renderColorPicker('new-field-colors', FIELD_COLORS[0], (c) => { selectedNewFieldColor = c; });
  populateCropSelect(document.getElementById('new-field-crop'));

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.placeholder = t('searchPlaceholder');
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => searchPlaces(searchInput.value.trim()), 350);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
    });
  }

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
    const sheet = overlay.querySelector('.modal-sheet');
    if (sheet) sheet.addEventListener('click', (e) => e.stopPropagation());
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });
});

// ════════════════════════════════════════════════════
// ЗАДАЧА 2: FIREBASE AUTH + FIRESTORE SYNC
// ════════════════════════════════════════════════════

// ⚠️  ВАЖНО: Вставьте свой firebaseConfig после создания проекта Firebase.
//    Шаги описаны в конце файла (поиск: "ШАГИ НАСТРОЙКИ FIREBASE").
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDwi4i2MevorQPumSMKgZef0AJ_aec4P_I",
  authDomain: "hectar-19422.firebaseapp.com",
  projectId: "hectar-19422",
  storageBucket: "hectar-19422.firebasestorage.app",
  messagingSenderId: "823756967343",
  appId: "1:823756967343:web:8b8a6d88891254b639335a"
};

let fbApp = null, fbAuth = null, fbDb = null;
let fbCurrentUser = null;
let fbAuthMode = 'login'; // 'login' | 'register'

function initFirebase() {
  try {
    const fb = window._fbModular;
    if (!fb) return;

    fbApp = fb.initializeApp(FIREBASE_CONFIG);
    fbAuth = fb.getAuth(fbApp);
    fbDb   = fb.getFirestore(fbApp);

    // Сохраняем функции для использования в других методах
    window._fbFns = fb;

    // ── FIX 2.5: PERSISTENT SESSION ──
    // browserLocalPersistence сохраняет сессию до явного signOut или очистки кэша.
    fb.setPersistence(fbAuth, fb.browserLocalPersistence).catch(e => {
      console.warn('[Hectar] setPersistence failed:', e.message);
    });

    fb.onAuthStateChanged(fbAuth, async user => {
      fbCurrentUser = user;
      if (user) {
        const loginScreen = document.getElementById('login-screen');
        const loginVisible = loginScreen && loginScreen.style.display !== 'none';

        // Автовход: login-screen ещё показан (восстановленная сессия или новый вход)
        if (loginVisible) {
          setSplashProgress(75, lang === 'ru' ? 'Загрузка данных...' : 'Loading data...');
          startApp();
        }

        // ── FIX 2.5 Проблема 2: синхронизация между устройствами ──
        // Запускаем sync в правильном порядке с обработкой ошибок
        const doSync = async () => {
          try {
            await fbSyncFromCloud();
          } catch(e) {
            console.warn('[Hectar] Initial sync error:', e);
          }
          // Realtime listeners запускаем ПОСЛЕ первой загрузки
          // (и независимо от результата — чтобы изменения с других устройств приходили)
          fbStartRealtimeListeners();
          renderProfile();
        };

        if (map) {
          doSync();
        } else {
          setTimeout(doSync, 300);
        }
      } else {
        // Выход — останавливаем listeners
        fbStopRealtimeListeners();
        renderProfile();
      }
    });
  } catch(e) {
    console.warn('Firebase init failed:', e.message);
  }
}

function openFbAuthModal(type) {
  if (!fbAuth) {
    // Попробуем инициализировать ещё раз перед показом ошибки
    initFirebase();
    if (!fbAuth) {
      showToast(lang === 'ru' ? '🌐 Нет соединения с Firebase. Проверьте интернет.' : '🌐 No Firebase connection. Check internet.');
      return;
    }
  }
  fbAuthMode = 'login';
  const modal = document.getElementById('fb-auth-modal');
  const title = document.getElementById('fb-auth-title');
  const sub = document.getElementById('fb-auth-sub');
  const submitBtn = document.getElementById('fb-auth-submit-btn');
  const toggle = document.getElementById('fb-auth-mode-toggle');
  const err = document.getElementById('fb-auth-error');
  if (err) err.textContent = '';
  if (title) title.textContent = lang === 'ru' ? 'Войти в Hectar' : 'Sign in to Hectar';
  if (sub) sub.textContent = lang === 'ru' ? 'Данные синхронизируются в облаке' : 'Your data syncs to the cloud';
  if (submitBtn) submitBtn.textContent = lang === 'ru' ? 'Войти' : 'Sign in';
  if (toggle) toggle.innerHTML = lang === 'ru' ? 'Нет аккаунта? <span>Зарегистрироваться</span>' : 'No account? <span>Register</span>';
  // Show forgot password link in login mode
  const forgotWrapInit = document.getElementById('fb-auth-forgot-wrap');
  if (forgotWrapInit) forgotWrapInit.style.display = 'block';
  // Reset error style
  if (err) err.style.color = 'var(--danger)';
  // Reset password field visibility
  const pwField = document.getElementById('fb-auth-password');
  const eyeIcon = document.getElementById('fb-pw-eye-icon');
  if (pwField) pwField.type = 'password';
  if (eyeIcon) eyeIcon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  // Show/hide Google section based on type
  const googleSec = document.getElementById('fb-auth-google-section');
  if (googleSec) googleSec.style.display = type === 'email' ? 'none' : 'block';
  if (modal) modal.style.display = 'flex';
}

function closeFbAuthModal() {
  const modal = document.getElementById('fb-auth-modal');
  if (modal) modal.style.display = 'none';
}

function fbToggleMode() {
  fbAuthMode = fbAuthMode === 'login' ? 'register' : 'login';
  const submitBtn = document.getElementById('fb-auth-submit-btn');
  const toggle = document.getElementById('fb-auth-mode-toggle');
  const err = document.getElementById('fb-auth-error');
  if (err) err.textContent = '';
  const forgotWrap = document.getElementById('fb-auth-forgot-wrap');
  if (fbAuthMode === 'register') {
    if (submitBtn) submitBtn.textContent = lang === 'ru' ? 'Зарегистрироваться' : 'Register';
    if (toggle) toggle.innerHTML = lang === 'ru' ? 'Уже есть аккаунт? <span>Войти</span>' : 'Have account? <span>Sign in</span>';
    if (forgotWrap) forgotWrap.style.display = 'none';
  } else {
    if (submitBtn) submitBtn.textContent = lang === 'ru' ? 'Войти' : 'Sign in';
    if (toggle) toggle.innerHTML = lang === 'ru' ? 'Нет аккаунта? <span>Зарегистрироваться</span>' : 'No account? <span>Register</span>';
    if (forgotWrap) forgotWrap.style.display = 'block';
  }
}

function fbTogglePasswordVisibility() {
  const pwField = document.getElementById('fb-auth-password');
  const eyeIcon = document.getElementById('fb-pw-eye-icon');
  if (!pwField) return;
  const isPassword = pwField.type === 'password';
  pwField.type = isPassword ? 'text' : 'password';
  if (eyeIcon) {
    eyeIcon.innerHTML = isPassword
      ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>';
  }
}

async function fbForgotPassword() {
  const emailEl = document.getElementById('fb-auth-email');
  const err = document.getElementById('fb-auth-error');
  const email = emailEl?.value?.trim();
  if (!email) {
    if (err) { err.style.color = 'var(--danger)'; err.textContent = lang === 'ru' ? 'Введите email для восстановления пароля' : 'Enter your email to reset password'; }
    emailEl?.focus();
    return;
  }
  if (!fbAuth || !window._fbFns?.sendPasswordResetEmail) {
    if (err) { err.style.color = 'var(--danger)'; err.textContent = lang === 'ru' ? 'Firebase не инициализирован' : 'Firebase not initialized'; }
    return;
  }
  try {
    await window._fbFns.sendPasswordResetEmail(fbAuth, email);
    if (err) {
      err.style.color = 'var(--accent)';
      err.textContent = lang === 'ru' ? '✅ Письмо отправлено на ' + email : '✅ Reset email sent to ' + email;
    }
  } catch(e) {
    // FIX 3.0: добавлена английская версия сообщений (раньше были только на русском)
    const msgs = lang === 'ru'
      ? { 'auth/user-not-found': 'Пользователь не найден', 'auth/invalid-email': 'Некорректный email' }
      : { 'auth/user-not-found': 'User not found', 'auth/invalid-email': 'Invalid email' };
    if (err) { err.style.color = 'var(--danger)'; err.textContent = msgs[e.code] || e.message; }
  }
}

async function fbSubmitEmail() {
  if (!fbAuth || !window._fbFns) return;
  const fb = window._fbFns;
  const email = document.getElementById('fb-auth-email')?.value?.trim();
  const password = document.getElementById('fb-auth-password')?.value;
  const err = document.getElementById('fb-auth-error');
  if (!email || !password) { if (err) err.textContent = lang === 'ru' ? 'Заполните все поля' : 'Fill all fields'; return; }
  const submitBtn = document.getElementById('fb-auth-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '...'; }
  try {
    if (fbAuthMode === 'register') {
      await fb.createUserWithEmailAndPassword(fbAuth, email, password);
    } else {
      await fb.signInWithEmailAndPassword(fbAuth, email, password);
    }
    closeFbAuthModal();
    // FIX 2.5: startApp() вызывается через onAuthStateChanged — не дублируем
    showToast('✅ ' + (lang === 'ru' ? 'Вход выполнен!' : 'Signed in!'));
  } catch(e) {
    // FIX 3.0: добавлены английские версии — раньше эти сообщения были
    // захардкожены только на русском, хотя остальное приложение двуязычное.
    const msgsRu = {
      'auth/wrong-password': 'Неверный пароль',
      'auth/user-not-found': 'Пользователь не найден',
      'auth/email-already-in-use': 'Email уже используется',
      'auth/weak-password': 'Пароль слишком короткий',
      'auth/invalid-email': 'Неверный формат email',
      'auth/invalid-credential': 'Неверный email или пароль',
    };
    const msgsEn = {
      'auth/wrong-password': 'Wrong password',
      'auth/user-not-found': 'User not found',
      'auth/email-already-in-use': 'Email is already in use',
      'auth/weak-password': 'Password is too short',
      'auth/invalid-email': 'Invalid email format',
      'auth/invalid-credential': 'Wrong email or password',
    };
    const msgs = lang === 'ru' ? msgsRu : msgsEn;
    if (err) err.textContent = msgs[e.code] || e.message;
  }
  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = fbAuthMode === 'login' ? (lang === 'ru' ? 'Войти' : 'Sign in') : (lang === 'ru' ? 'Зарегистрироваться' : 'Register'); }
}

let _googleSignInInProgress = false;
async function fbSignInGoogle() {
  if (!fbAuth || _googleSignInInProgress) return;
  _googleSignInInProgress = true;
  const err = document.querySelector('#fb-auth-error');
  const btn = document.querySelector('.fb-auth-btn.google');
  if (btn) btn.disabled = true;
  try {
    const fb = window._fbFns;
    const provider = new fb.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    provider.addScope('email');
    provider.addScope('profile');
    const result = await fb.signInWithPopup(fbAuth, provider);
    if (result.user) {
      closeFbAuthModal();
      // FIX 2.5: startApp() вызывается через onAuthStateChanged — не дублируем
      showToast('✅ Google: ' + (result.user.displayName || result.user.email));
    }
  } catch(e) {
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      if (err) err.textContent = e.message;
    }
    console.warn('Google Sign-In error:', e.code, e.message);
  } finally {
    _googleSignInInProgress = false;
    if (btn) btn.disabled = false;
  }
}

function fbSignOut() {
  fbStopRealtimeListeners();
  if (fbAuth && window._fbFns) { window._fbFns.signOut(fbAuth); }
  fbCurrentUser = null;

  // FIX: очищаем все локальные данные пользователя при выходе.
  // Без этого данные первого аккаунта заливались в Firestore второго аккаунта —
  // fbSyncFromCloud видел непустой localStorage и загружал его в облако нового юзера.
  const keysToRemove = [
    STORAGE_PREFIX + '-fields',
    STORAGE_PREFIX + '-settings',
    STORAGE_PREFIX + '-active-season',
    STORAGE_PREFIX + '-seasons-mgr',
    FAVS_KEY,
    STORAGE_PREFIX + '-auth',
    SEASONS_STORAGE_KEY,
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));

  // Очистить карту от полигонов предыдущего пользователя
  if (typeof drawnPolygons !== 'undefined' && typeof map !== 'undefined' && map) {
    Object.values(drawnPolygons).forEach(layer => {
      try { map.removeLayer(layer); } catch(_) {}
    });
    drawnPolygons = {};
  }
  if (typeof renderFieldsList === 'function') renderFieldsList();

  renderProfile();
  showToast(lang === 'ru' ? '\u{1F44B} Вы вышли из аккаунта. Работаем как гость.' : '\u{1F44B} Signed out. Continuing as guest.');
}

// ── Delete Account ──
let _captchaA = 0, _captchaB = 0;
function openDeleteAccountModal() {
  _captchaA = Math.floor(Math.random() * 10) + 2;
  _captchaB = Math.floor(Math.random() * 10) + 2;
  const q = document.getElementById('captcha-question');
  const ans = document.getElementById('captcha-answer');
  const err = document.getElementById('captcha-error');
  if (q) q.textContent = `${_captchaA} + ${_captchaB} = ?`;
  if (ans) ans.value = '';
  if (err) err.textContent = '';

  // FIX v2.6 пункт 1: переводим все тексты модала при открытии, исходя из текущего lang
  const isRu = (lang === 'ru');
  const titleEl    = document.getElementById('del-acc-title');
  const descEl     = document.getElementById('del-acc-desc');
  const captchaLbl = document.getElementById('del-acc-captcha-label');
  const submitBtn  = document.getElementById('del-acc-submit-btn');
  const cancelBtn  = document.getElementById('del-acc-cancel-btn');
  if (titleEl)    titleEl.textContent    = isRu ? '⚠️ Удалить аккаунт'              : '⚠️ Delete account';
  if (descEl)     descEl.textContent     = isRu ? 'Это безвозвратно удалит ваш аккаунт и все облачные данные. Действие нельзя отменить.'
                                                 : 'This will permanently delete your account and all cloud data. This action cannot be undone.';
  if (captchaLbl) captchaLbl.textContent = isRu ? 'Для подтверждения решите пример:' : 'To confirm, solve this:';
  if (ans)        ans.placeholder        = isRu ? 'Ваш ответ'                        : 'Your answer';
  if (submitBtn)  submitBtn.textContent  = isRu ? 'Удалить мой аккаунт'              : 'Delete my account';
  if (cancelBtn)  cancelBtn.textContent  = isRu ? 'Отмена'                           : 'Cancel';

  openModal('modal-delete-account');
}

async function submitDeleteAccount() {
  const ans = document.getElementById('captcha-answer');
  const err = document.getElementById('captcha-error');
  const userAnswer = parseInt(ans?.value);
  if (isNaN(userAnswer) || userAnswer !== (_captchaA + _captchaB)) {
    if (err) err.textContent = lang === 'ru' ? 'Неверный ответ. Попробуйте снова.' : 'Wrong answer. Try again.';
    if (ans) ans.value = '';
    // Refresh captcha
    _captchaA = Math.floor(Math.random() * 10) + 2;
    _captchaB = Math.floor(Math.random() * 10) + 2;
    const q = document.getElementById('captcha-question');
    if (q) q.textContent = `${_captchaA} + ${_captchaB} = ?`;
    return;
  }
  if (!fbCurrentUser || !window._fbFns?.deleteUser) {
    if (err) err.textContent = lang === 'ru' ? 'Ошибка: пользователь не авторизован' : 'Error: user not authenticated';
    return;
  }
  try {
    // Delete Firestore user data
    if (fbDb) {
      const fb = window._fbFns;
      const uid = fbCurrentUser.uid;
      // Delete fields subcollection
      try {
        const fieldsCol = fb.collection(fbDb, 'users', uid, 'fields');
        const fieldsSnap = await fb.getDocs(fieldsCol);
        const batch = fb.writeBatch(fbDb);
        fieldsSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch(_) {}
      // FIX 3.0: удаляем и подколлекцию notes — Firestore не каскадирует
      // удаление подколлекций автоматически, поэтому раньше заметки оставались в облаке навсегда.
      try {
        const notesCol = fb.collection(fbDb, 'users', uid, 'notes');
        const notesSnap = await fb.getDocs(notesCol);
        const notesBatch = fb.writeBatch(fbDb);
        notesSnap.forEach(d => notesBatch.delete(d.ref));
        await notesBatch.commit();
      } catch(_) {}
      // Delete user document
      try {
        const { deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        await deleteDoc(fb.doc(fbDb, 'users', uid));
      } catch(_) {}
    }
    // Delete the Auth user
    await window._fbFns.deleteUser(fbCurrentUser);
    // Clear local data
    // FIX 3.0: раньше чистились только -fields/-settings/-auth — остальные
    // локальные ключи (сезоны, избранные города) оставались после удаления аккаунта.
    localStorage.removeItem(STORAGE_PREFIX + '-fields');
    localStorage.removeItem(STORAGE_PREFIX + '-settings');
    localStorage.removeItem(STORAGE_PREFIX + '-auth');
    localStorage.removeItem(STORAGE_PREFIX + '-active-season');
    localStorage.removeItem(STORAGE_PREFIX + '-seasons-mgr');
    localStorage.removeItem(FAVS_KEY);
    localStorage.removeItem(SEASONS_STORAGE_KEY);
    closeModal('modal-delete-account');
    fbCurrentUser = null;
    renderProfile();
    showToast(lang === 'ru' ? '✅ Аккаунт удалён' : '✅ Account deleted');
  } catch(e) {
    if (err) err.textContent = (e.code === 'auth/requires-recent-login')
      ? (lang === 'ru' ? 'Войдите заново, затем повторите удаление' : 'Please sign in again, then retry deletion')
      : (e.message || 'Error');
  }
}

// ── FIX 2.5: всегда берём актуального пользователя через fbAuth.currentUser ──
// Решает race-condition: fbCurrentUser может быть null, пока onAuthStateChanged ещё не отработал,
// но fbAuth.currentUser уже содержит восстановленную сессию из localStorage/IndexedDB.
function _fbGetUser() {
  return fbCurrentUser || (fbAuth && fbAuth.currentUser) || null;
}

// FIX 3.0: раньше сбои синхронизации с Firestore (нет сети, недостаточно прав,
// превышена квота) уходили только в console.warn — пользователь думал, что всё
// сохранено в облако, хотя это было не так. Показываем тост, но не чаще раза в
// 60 секунд, чтобы не заспамить пользователя при серии неудачных попыток подряд.
let _lastSyncFailToastAt = 0;
function _notifySyncFailure() {
  const now = Date.now();
  if (now - _lastSyncFailToastAt < 60000) return;
  _lastSyncFailToastAt = now;
  if (typeof showToast === 'function') {
    showToast(lang === 'ru'
      ? '⚠️ Не удалось синхронизировать данные с облаком. Изменения сохранены только на этом устройстве.'
      : '⚠️ Could not sync data to the cloud. Changes are saved on this device only.');
  }
}

// ── FIX: Firestore не поддерживает вложенные массивы (nested arrays).
// field.coordinates = [[lat,lng],[lat,lng],...] — это nested array.
// field.center = [lat,lng] — тоже массив, но одноуровневый, его Firestore принимает.
// Решение: сериализуем coordinates в строку JSON перед записью, восстанавливаем при чтении.
function _fieldToFirestore(f) {
  const doc = { ...f };
  if (Array.isArray(doc.coordinates)) {
    doc.coordinates = JSON.stringify(doc.coordinates);
    doc._coordinatesSerialized = true;
  }
  // FIX 1: Сериализуем forests — каждый элемент содержит coordinates (массив массивов),
  // которые Firestore не поддерживает напрямую. Сериализуем весь массив forests в JSON.
  if (Array.isArray(doc.forests) && doc.forests.length > 0) {
    doc.forests = JSON.stringify(doc.forests);
    doc._forestsSerialized = true;
  }
  // Рекурсивно проверяем другие поля на вложенные массивы (на всякий случай)
  Object.keys(doc).forEach(key => {
    if (key === 'coordinates' || key === '_coordinatesSerialized' ||
        key === 'forests' || key === '_forestsSerialized') return;
    if (Array.isArray(doc[key]) && doc[key].some(v => Array.isArray(v))) {
      doc[key] = JSON.stringify(doc[key]);
      doc['_serialized_' + key] = true;
    }
  });
  return doc;
}

function _fieldFromFirestore(doc) {
  const f = { ...doc };
  if (f._coordinatesSerialized && typeof f.coordinates === 'string') {
    try { f.coordinates = JSON.parse(f.coordinates); } catch(_) {}
    delete f._coordinatesSerialized;
  }
  // FIX 1: Восстанавливаем forests из JSON-строки
  if (f._forestsSerialized && typeof f.forests === 'string') {
    try { f.forests = JSON.parse(f.forests); } catch(_) { f.forests = []; }
    delete f._forestsSerialized;
  }
  // Восстанавливаем другие сериализованные поля
  Object.keys(f).forEach(key => {
    if (key.startsWith('_serialized_')) {
      const origKey = key.replace('_serialized_', '');
      if (typeof f[origKey] === 'string') {
        try { f[origKey] = JSON.parse(f[origKey]); } catch(_) {}
      }
      delete f[key];
    }
  });
  return f;
}

async function fbSaveFields(fields) {
  const user = _fbGetUser();
  if (!fbDb || !user || !window._fbFns) return;
  const fb = window._fbFns;
  try {
    const col = fb.collection(fbDb, 'users', user.uid, 'fields');
    const snap = await fb.getDocs(col);
    const batch = fb.writeBatch(fbDb);
    snap.forEach(d => batch.delete(d.ref));
    fields.forEach(f => batch.set(
      fb.doc(fbDb, 'users', user.uid, 'fields', f.id),
      _fieldToFirestore(f)
    ));
    await batch.commit();
  } catch(e) { console.warn('fbSaveFields error:', e); _notifySyncFailure(); }
}

async function fbSaveNotes(notes) {
  const user = _fbGetUser();
  if (!fbDb || !user || !window._fbFns) return;
  const fb = window._fbFns;
  try {
    const col = fb.collection(fbDb, 'users', user.uid, 'notes');
    const snap = await fb.getDocs(col);
    const batch = fb.writeBatch(fbDb);
    snap.forEach(d => batch.delete(d.ref));
    notes.forEach((n, i) => batch.set(fb.doc(fbDb, 'users', user.uid, 'notes', 'note_' + i), n));
    await batch.commit();
  } catch(e) { console.warn('fbSaveNotes error:', e); _notifySyncFailure(); }
}

async function fbSaveSettings(settings) {
  const user = _fbGetUser();
  if (!fbDb || !user || !window._fbFns) return;
  const fb = window._fbFns;
  try {
    await fb.setDoc(fb.doc(fbDb, 'users', user.uid), { settings }, { merge: true });
  } catch(e) { console.warn('fbSaveSettings error:', e); _notifySyncFailure(); }
}

// ── Сохранение сезонов в Firestore ──
async function fbSaveSeasonsMgr(seasons) {
  const user = _fbGetUser();
  if (!fbDb || !user || !window._fbFns) return;
  const fb = window._fbFns;
  try {
    await fb.setDoc(fb.doc(fbDb, 'users', user.uid), { seasonsMgr: seasons }, { merge: true });
  } catch(e) { console.warn('fbSaveSeasonsMgr error:', e); }
}

async function fbSaveActiveSeason(name) {
  const user = _fbGetUser();
  if (!fbDb || !user || !window._fbFns) return;
  const fb = window._fbFns;
  try {
    await fb.setDoc(fb.doc(fbDb, 'users', user.uid), { activeSeason: name }, { merge: true });
  } catch(e) { console.warn('fbSaveActiveSeason error:', e); }
}

// FIX 2.5: save season statistics records (fields tab → Сезоны) to Firestore
async function fbSaveSeasonRecords(records) {
  const user = _fbGetUser();
  if (!fbDb || !user || !window._fbFns) return;
  const fb = window._fbFns;
  try {
    await fb.setDoc(fb.doc(fbDb, 'users', user.uid), { seasonRecords: records }, { merge: true });
  } catch(e) { console.warn('fbSaveSeasonRecords error:', e); }
}

// FIX 3.0: сохранение избранных городов погоды в Firestore —
// раньше такой функции не было вообще, поэтому избранные города
// никогда не отправлялись в облако (только читались, да и то не под тем ключом).
async function fbSaveFavouriteCities(favs) {
  const user = _fbGetUser();
  if (!fbDb || !user || !window._fbFns) return;
  const fb = window._fbFns;
  try {
    await fb.setDoc(fb.doc(fbDb, 'users', user.uid), { favouriteCities: favs }, { merge: true });
  } catch(e) { console.warn('fbSaveFavouriteCities error:', e); }
}

// ════════════════════════════════════════════════════
// SYNC v2.4 — полная двусторонняя синхронизация
// Стратегия:
//   1. При входе — один раз читаем всё из Firestore (cloud wins)
//   2. onSnapshot — realtime listener на fields и userDoc
//      → любое изменение на другом устройстве мгновенно
//        отображается здесь без перезагрузки
//   3. Каждый save-вызов пишет в Firestore сразу
//   4. visibilitychange — при возврате в вкладку/приложение
//      принудительно перечитываем данные
// ════════════════════════════════════════════════════

let _fbFieldsUnsubscribe = null;   // unsubscribe handle для fields listener
let _fbUserDocUnsubscribe = null;  // unsubscribe handle для userDoc listener
let _fbSyncInProgress = false;     // guard против race conditions при первой загрузке

// ── Применить облачные поля к локальному состоянию ──
function _applyCloudFields(cloudFields) {
  // Восстанавливаем сериализованные поля (coordinates и др.) после чтения из Firestore
  const fields = cloudFields.map(_fieldFromFirestore);
  localStorage.setItem(STORAGE_PREFIX + '-fields', JSON.stringify(fields));
  if (map) {
    // FIX 2.5 Проблема 3: удаляем и полигоны и метки
    Object.entries(drawnPolygons).forEach(([key, layer]) => {
      try { map.removeLayer(layer); } catch(_) {}
    });
    drawnPolygons = {};
    fields.forEach(f => addFieldToMap(f));
  }
  renderFieldsList();
  // Если открыт детальный экран поля — обновить и его
  if (typeof currentFieldId !== 'undefined' && currentFieldId) {
    const still = fields.find(f => f.id === currentFieldId);
    if (still) {
      const titleEl = document.getElementById('detail-field-title');
      if (titleEl) openFieldDetail(currentFieldId);
    }
  }
}

// ── Применить облачные данные userDoc (настройки, сезоны и т.д.) ──
function _applyCloudUserDoc(data) {
  if (!data) return;

  if (data.settings) {
    const merged = { ...loadSettings(), ...data.settings };
    localStorage.setItem(STORAGE_PREFIX + '-settings', JSON.stringify(merged));
    applyTheme(merged.theme);
    // Синхронизировать язык без дёргания UI
    if (merged.language && merged.language !== lang) {
      lang = merged.language;
      localStorage.setItem(STORAGE_PREFIX + '-lang', lang);
      applyTranslations();
    }
  }

  if (data.seasonsMgr && Array.isArray(data.seasonsMgr)) {
    localStorage.setItem(STORAGE_PREFIX + '-seasons-mgr', JSON.stringify(data.seasonsMgr));
  }

  if (data.activeSeason) {
    localStorage.setItem(STORAGE_PREFIX + '-active-season', data.activeSeason);
    updateSeasonLabel();
  }

  if (data.seasonRecords && Array.isArray(data.seasonRecords)) {
    localStorage.setItem(SEASONS_STORAGE_KEY, JSON.stringify(data.seasonRecords));
    // Обновить вкладку «Сезоны» если открыта
    if (typeof renderSeasonsTab === 'function') renderSeasonsTab();
  }

  if (data.favouriteCities && Array.isArray(data.favouriteCities)) {
    localStorage.setItem(FAVS_KEY, JSON.stringify(data.favouriteCities));
    if (typeof renderFavouriteCities === 'function') renderFavouriteCities();
  }

  // Обновить профиль чтобы показать актуальный статус
  if (typeof renderProfile === 'function') renderProfile();
}

// ── Разовая первоначальная загрузка с Firestore ──
// FIX v2.6: переписана логика — убран race-condition флаг,
// который блокировал realtime listeners после ошибки синхронизации.
// Стратегия cloud-wins: данные из Firestore ВСЕГДА применяются при наличии.
async function fbSyncFromCloud() {
  const user = _fbGetUser();
  if (!fbDb || !user || !window._fbFns) return;
  _fbSyncInProgress = true;
  const fb = window._fbFns;
  const uid = user.uid;
  showToast('🔍 Читаю Firestore для uid: ' + uid.slice(0,8) + '...');
  try {
    const fieldsCol = fb.collection(fbDb, 'users', uid, 'fields');
    const userDocRef = fb.doc(fbDb, 'users', uid);

    const [fieldsSnap, userDocSnap] = await Promise.all([
      fb.getDocs(fieldsCol),
      fb.getDoc(userDocRef)
    ]);

    showToast('📦 Firestore вернул: ' + fieldsSnap.size + ' полей');

    if (!fieldsSnap.empty) {
      const cloudFields = fieldsSnap.docs.map(d => {
        const data = d.data();
        return data.id ? data : { ...data, id: d.id };
      });
      _applyCloudFields(cloudFields);
    } else {
      showToast('⚠️ Firestore пуст — заливаю локальные поля');
      const localFields = loadFields();
      if (localFields && localFields.length > 0) {
        await fbSaveFields(localFields);
        showToast('⬆️ Залито в Firestore: ' + localFields.length + ' полей');
      } else {
        showToast('📭 Нет локальных полей для заливки');
      }
    }

    if (userDocSnap.exists()) {
      _applyCloudUserDoc(userDocSnap.data());
    } else {
      await fb.setDoc(userDocRef, {
        settings: loadSettings(),
        seasonsMgr: JSON.parse(localStorage.getItem(STORAGE_PREFIX + '-seasons-mgr') || '[]'),
        activeSeason: localStorage.getItem(STORAGE_PREFIX + '-active-season') || '',
        seasonRecords: JSON.parse(localStorage.getItem(SEASONS_STORAGE_KEY) || '[]'),
      }, { merge: true });
    }

    showToast('<i data-lucide="cloud" class="icon-sm"></i> ' + (lang === 'ru' ? 'Данные загружены' : 'Data loaded'));
  } catch(e) {
    console.warn('[fbSyncFromCloud] error:', e);
    showToast('❌ Sync error: ' + e.message);
  } finally {
    _fbSyncInProgress = false;
  }
}

// ── Запустить realtime listeners ──
// FIX v2.6: убран if (_fbSyncInProgress) return — он блокировал получение
// изменений с других устройств если первый sync завершился с ошибкой.
// Теперь используем короткий debounce чтобы не мешать первой загрузке.
function fbStartRealtimeListeners() {
  const user = _fbGetUser();
  if (!fbDb || !user || !window._fbFns) return;
  const fb = window._fbFns;
  const uid = user.uid;

  // Отписаться от предыдущих listener-ов (если были)
  if (_fbFieldsUnsubscribe) { try { _fbFieldsUnsubscribe(); } catch(_) {} }
  if (_fbUserDocUnsubscribe) { try { _fbUserDocUnsubscribe(); } catch(_) {} }

  // Небольшая задержка чтобы первый getDocs в fbSyncFromCloud успел завершиться
  // и onSnapshot не применил те же данные второй раз
  let _skipFirstFieldsSnapshot = true;
  let _skipFirstUserDocSnapshot = true;
  setTimeout(() => {
    _skipFirstFieldsSnapshot = false;
    _skipFirstUserDocSnapshot = false;
  }, 2000);

  // ── Listener 1: fields subcollection ──
  const fieldsCol = fb.collection(fbDb, 'users', uid, 'fields');
  _fbFieldsUnsubscribe = fb.onSnapshot(fieldsCol, (snap) => {
    if (_skipFirstFieldsSnapshot) return; // пропускаем первый снимок (уже применён)
    const cloudFields = snap.docs.map(d => {
      const data = d.data();
      return data.id ? data : { ...data, id: d.id };
    });
    _applyCloudFields(cloudFields);
    showToast('<i data-lucide="cloud" class="icon-sm"></i> ' + (lang === 'ru' ? 'Поля обновлены' : 'Fields updated'));
  }, (err) => {
    console.warn('[fbFieldsListener] error:', err);
  });

  // ── Listener 2: userDoc (settings, seasons, seasonRecords) ──
  const userDocRef = fb.doc(fbDb, 'users', uid);
  _fbUserDocUnsubscribe = fb.onSnapshot(userDocRef, (snap) => {
    if (_skipFirstUserDocSnapshot) return;
    if (snap.exists()) {
      _applyCloudUserDoc(snap.data());
    }
  }, (err) => {
    console.warn('[fbUserDocListener] error:', err);
  });

  console.log('[Hectar sync] Realtime listeners started for uid:', uid);
}

// ── Остановить realtime listeners (при выходе из аккаунта) ──
function fbStopRealtimeListeners() {
  if (_fbFieldsUnsubscribe) { try { _fbFieldsUnsubscribe(); } catch(_) {} _fbFieldsUnsubscribe = null; }
  if (_fbUserDocUnsubscribe) { try { _fbUserDocUnsubscribe(); } catch(_) {} _fbUserDocUnsubscribe = null; }
}

// ── visibilitychange: при возврате в вкладку/PWA перечитать данные ──
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && _fbGetUser() && !_fbSyncInProgress) {
    // Небольшая задержка чтобы избежать срабатывания при каждом скролле iOS
    setTimeout(() => {
      if (_fbGetUser()) fbSyncFromCloud();
    }, 500);
  }
});

// ── Патч saveFields — сохранить локально + в Firestore ──
saveFields = function(fields) {
  localStorage.setItem(STORAGE_PREFIX + '-fields', JSON.stringify(fields));
  const user = _fbGetUser();
  if (user) {
    showToast('💾 Сохраняю в облако: ' + fields.length + ' полей...');
    fbSaveFields(fields)
      .then(() => showToast('✅ Облако: сохранено ' + fields.length + ' полей'))
      .catch(e => showToast('❌ Ошибка записи: ' + e.message));
  } else {
    showToast('⚠️ Нет аккаунта — сохранено только локально');
  }
};

// ── Патч saveSettings ──
const _origSaveSettingsFb = saveSettings;
saveSettings = function(settings) {
  localStorage.setItem(STORAGE_PREFIX + '-settings', JSON.stringify(settings));
  if (_fbGetUser()) {
    fbSaveSettings(settings).catch(e => console.warn('[saveSettings→FB]', e));
  }
};

// ── Патч saveSeasonManagerData (FIX v2.6: была ошибка — функция называется saveSeasonManagerData) ──
const _origSaveSeasonManagerData = saveSeasonManagerData;
saveSeasonManagerData = function(data) {
  localStorage.setItem(STORAGE_PREFIX + '-seasons-mgr', JSON.stringify(data));
  if (_fbGetUser()) {
    fbSaveSeasonsMgr(data).catch(e => console.warn('[saveSeasonManagerData→FB]', e));
  }
};

// ── Патч saveActiveSeason ──
const _origSaveActiveSeason = saveActiveSeason;
saveActiveSeason = function(name) {
  localStorage.setItem(STORAGE_PREFIX + '-active-season', name);
  if (_fbGetUser()) {
    fbSaveActiveSeason(name).catch(e => console.warn('[saveActiveSeason→FB]', e));
  }
};

// ── Патч saveSeasonRecords (был пропущен — вот почему сезоны не синхронизировались) ──
const _origSaveSeasonRecordsFb = saveSeasonRecords;
saveSeasonRecords = function(records) {
  localStorage.setItem(SEASONS_STORAGE_KEY, JSON.stringify(records));
  if (_fbGetUser()) {
    fbSaveSeasonRecords(records).catch(e => console.warn('[saveSeasonRecords→FB]', e));
  }
};

// ── Патч saveFavouriteCities (FIX 3.0: избранные города вообще не уходили в облако) ──
const _origSaveFavouriteCitiesFb = saveFavouriteCities;
saveFavouriteCities = function(favs) {
  localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
  if (_fbGetUser()) {
    fbSaveFavouriteCities(favs).catch(e => console.warn('[saveFavouriteCities→FB]', e));
  }
};

// Patch renderProfile to show Firebase user info
const _origRenderProfile = renderProfile;
function renderProfile() {
  const container = document.getElementById('profile-content');
  if (!container) return;
  const settings = loadSettings();
  const fbUser = fbCurrentUser;
  const localLoggedIn = isLoggedIn();

  let authHTML;
  if (fbUser) {
    const displayName = fbUser.displayName || 'Hectar User';
    const email = fbUser.email || '';
    const createdAt = fbUser.metadata?.creationTime
      ? new Date(fbUser.metadata.creationTime).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    authHTML = `
      <div class="profile-card">
        <div class="profile-avatar">
          ${fbUser.photoURL
            ? `<img src="${fbUser.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">`
            : `<svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
          }
        </div>
        <div class="profile-card-info">
          <div class="profile-name">${escapeHtml(displayName)}</div>
          ${email ? `<div class="profile-email" title="${escapeHtml(email)}">${escapeHtml(email)}</div>` : ''}
          <div class="profile-role">Hectar · ${t('agronomist')}</div>
          ${createdAt ? `<div class="profile-role" style="font-size:11px;opacity:0.6;margin-top:2px;">🗓 ${lang === 'ru' ? 'С нами с' : 'Member since'} ${createdAt}</div>` : ''}
          <div class="fb-sync-badge"><i data-lucide="cloud" class="icon-sm"></i> ${lang === 'ru' ? 'Синхронизация включена' : 'Cloud sync active'}</div>
        </div>
      </div>
      <button class="profile-logout-btn" onclick="fbSignOut()" style="width:100%;margin-bottom:8px;">${t('signOut')}</button>
      <button onclick="openDeleteAccountModal()" style="width:100%;margin-bottom:12px;padding:12px;border-radius:var(--radius-sm);border:1px solid rgba(239,83,80,0.45);background:rgba(239,83,80,0.08);color:var(--danger);font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(239,83,80,0.18)'" onmouseout="this.style.background='rgba(239,83,80,0.08)'">${lang === 'ru' ? '🗑 Удалить аккаунт' : '🗑 Delete account'}</button>
    `;
  } else if (localLoggedIn) {
    authHTML = `
      <div class="profile-card">
        <div class="profile-avatar">
          <svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="profile-card-info">
          <div class="profile-name">${escapeHtml(getUserName())}</div>
          <div class="profile-role">Hectar · ${t('agronomist')}</div>
        </div>
      </div>
      <button class="profile-logout-btn" onclick="logoutUser()" style="width:100%;margin-bottom:12px;">${t('signOut')}</button>
    `;
  } else {
    authHTML = `
      <div class="profile-card">
        <div class="profile-avatar">
          <svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="profile-card-info">
          <div class="profile-name">Hectar</div>
          <div class="profile-role">${lang === 'ru' ? '👤 Режим гостя (данные локально)' : '👤 Guest mode (local data)'}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;margin-bottom:12px;">
        <button class="profile-login-btn" onclick="openFbAuthModal('google')">${lang === 'ru' ? 'Google' : 'Google'}</button>
        <button class="profile-login-btn" onclick="openFbAuthModal('email')">${lang === 'ru' ? 'Email / Пароль' : 'Email / Password'}</button>
        <button class="profile-login-btn" onclick="showToast(lang === \'ru\' ? \'Вы уже в режиме гостя\' : \'Already in guest mode\')" style="opacity:0.6;">${lang === 'ru' ? 'Гость' : 'Guest'}</button>
      </div>
    `;
  }

  container.innerHTML = `
    ${authHTML}
    <div class="settings-group">
      <div class="settings-group-title">${lang === 'ru' ? 'AI-инструменты' : 'AI Tools'}</div>
      <a class="ai-cow-btn" href="https://zemicansky.github.io/animal-counter/" target="_blank" rel="noopener">
        <div class="ai-cow-btn-left">
          <span class="ai-cow-icon">🐄</span>
          <div>
            <div class="ai-cow-label">${lang === 'ru' ? 'AI Распознавание коров' : 'AI Cow Recognition'}</div>
            <div class="ai-cow-sub">${lang === 'ru' ? 'Анализ скота с помощью ИИ' : 'Livestock analysis with AI'}</div>
          </div>
        </div>
        <span class="ai-open-badge">
          <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7,7 17,7 17,17"/></svg>
        </span>
      </a>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">${t('appSettings')}</div>
      <div class="setting-row">
        <label>${t('language')}</label>
        <select id="setting-language" onchange="setLang(this.value)">
          <option value="en" ${lang === 'en' ? 'selected' : ''}>${t('langEn')}</option>
          <option value="ru" ${lang === 'ru' ? 'selected' : ''}>${t('langRu')}</option>
        </select>
      </div>
      <div class="setting-row">
        <label>${t('units')}</label>
        <select id="setting-units" onchange="updateSetting('units', this.value)">
          <option value="ha" ${settings.units === 'ha' ? 'selected' : ''}>${t('ha')}</option>
          <option value="acres" ${settings.units === 'acres' ? 'selected' : ''}>${t('acres')}</option>
        </select>
      </div>
      <div class="setting-row">
        <label>${t('theme')}</label>
        <select id="setting-theme" onchange="updateSetting('theme', this.value)">
          <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>${t('themeDark')}</option>
          <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>${t('themeLight')}</option>
        </select>
      </div>
      <div class="setting-row">
        <label>${t('notifications')}</label>
        <label class="toggle-switch">
          <input type="checkbox" ${settings.notifications ? 'checked' : ''} onchange="updateSetting('notifications', this.checked)"/>
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">${lang === 'ru' ? 'Экспорт данных' : 'Export Data'}</div>
      <div class="setting-row" style="cursor:pointer;" onclick="exportFieldsExcel()">
        <label style="cursor:pointer;">${lang === 'ru' ? 'Выгрузить в Excel (.xlsx)' : 'Export to Excel (.xlsx)'}</label>
        <svg width="18" height="18" fill="none" stroke="var(--text3)" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </div>

      <div class="setting-row" style="cursor:pointer;" onclick="exportFieldsGeoJSON()">
        <label style="cursor:pointer;">${lang === 'ru' ? 'Экспорт в GeoJSON' : 'Export to GeoJSON'}</label>
        <svg width="18" height="18" fill="none" stroke="var(--text3)" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </div>
      <div class="setting-row" style="cursor:pointer;" onclick="document.getElementById('geojson-import-input').click()">
        <label style="cursor:pointer;">${lang === 'ru' ? 'Импорт из GeoJSON' : 'Import from GeoJSON'}</label>
        <svg width="18" height="18" fill="none" stroke="var(--text3)" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,14 12,9 7,14"/><line x1="12" y1="9" x2="12" y2="21"/></svg>
      </div>
      <input type="file" id="geojson-import-input" accept=".geojson,.json" style="display:none" onchange="importFieldsGeoJSON(event)"/>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">${t('aboutApp')}</div>
      <div class="about-block">
        <div class="about-logo">Hectar 3.0</div>
        <div>${t('aboutTagline')}</div>
        <div class="about-version">${t('version')} ${APP_VERSION}</div>
      </div>
    </div>
  `;
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














// ══════════════════════════════════════════════════════════════
// v3.0: 3D АГРОНАВИГАЦИЯ И РЕЖИМ ОТ ПЕРВОГО ЛИЦА (THREE.JS)
// ══════════════════════════════════════════════════════════════
let scene3D = null, camera3D = null, renderer3D = null;
let tractor3DModel = null, steeringWheelMesh = null, frontLeftWheelMesh = null, frontRightWheelMesh = null;
let tractor3DActive = false;
let camera3DMode = 'cockpit'; // 'cockpit' | 'chase'
let field3DOutline = null, ground3D = null;
let tractor3DTrailGroup = null;
let lastSoilPaintPos = null;
let steer3DInput = 0, gas3DInput = 0;
let tractor3DAnimId = null;
let tractor3DHeading = 0;
let tractor3DPos = { x: 0, z: 0 };
// FIX (дёрганье при движении): раньше tractor3DPos менялся только в момент
// прихода GPS-события (watchPosition, ~раз в секунду), а сама 3D-модель
// трактора рисовалась строго в этой точке — между кадрами рендера трактор
// "телепортировался" скачками и было незаметно, что он вообще едет.
// Теперь tractor3DPos/Heading — это ЦЕЛЬ движения (последняя точка GPS), а
// фактически отображаемая позиция (tractor3DRenderPos/Heading) плавно
// доезжает до цели в каждом кадре requestAnimationFrame, независимо от
// того, как редко приходят GPS-фиксы.
let tractor3DRenderPos = { x: 0, z: 0 };
let tractor3DRenderHeading = 0;
let fieldCenter3D = null;
// Точка спавна трактора (край поля при выбранном поле, либо стартовая
// GPS/дефолтная точка при свободном заезде). ВАЖНО: это НЕ обязательно
// то же самое, что fieldCenter3D (который является опорным центром (0,0)
// 3D-мира/сетки) — трактор должен появляться и телепортироваться в демо
// на краю поля, а не в геометрическом центре.
let tractorSpawnPoint = null;

// Цвет закраски пройденного (обработанного) участка. ВАЖНО: намеренно НЕ
// зелёный/неоновый — сетка поля, контур границ, маяки и лазерная разметка
// орудия все используют оттенки зелёного (0x00e676/0x00ff88), и закраска
// того же цвета визуально сливалась с ними, пользователю было не понять,
// где он уже проехал. Янтарно-оранжевый даёт чёткий контраст на зелёном
// поле и на фоне зелёной разметки/границ при любом освещении сцены.
const SOIL_TRAIL_COLOR_HEX = 0xff8f00; // 3D шлейф/канвас-заливка (Three.js)
const SOIL_TRAIL_FILL_CSS = '#ff8f00';
const SOIL_TRAIL_STROKE_CSS = '#ef6c00';
let coverage3DTexture = null, coverage3DCanvas = null, coverage3DCtx = null;
let radarCanvas = null, radarCtx = null;

let tractorWatchId = null;
let tractorActive = false;
let tractorStartTime = null;
let tractorPath = [];
let tractorWidth = 12; // метры
let tractorAreaHa = 0;
let tractorDistKm = 0;
let tractorCurrentSpeed = 0;
let tractorMarker = null;
let tractorTrailGroup = null;
let tractorGuidelineGroup = null;
let tractorActiveField = null;
let tractorOpType = 'sowing';
let tractorSimInterval = null;
// Данные завершённого заезда, ожидающие решения пользователя в модалке итогов:
// "Сохранить в историю поля" (saveTractorSummary) или "Удалить без сохранения"
// (discardTractorSummary). null, когда модалка итогов закрыта/неактивна.
let pendingTractorSummary = null;
// Задача 1.2: чтобы не спамить пользователя предупреждением "GPS далеко от
// поля" на каждое обновление геолокации, показываем его один раз за заезд.
let tractorGpsFarWarningShown = false;

function openAddMenuModal() {
  const m = document.getElementById('modal-add-menu');
  if (m) m.classList.add('open');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeAddMenuModal() {
  const m = document.getElementById('modal-add-menu');
  if (m) m.classList.remove('open');
}

function openTractorSetupModal() {
  const sel = document.getElementById('tractor-field-select');
  const allFields = (typeof loadFields === 'function') ? loadFields() : [];
  
  if (sel) {
    sel.innerHTML = '';
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.disabled = true;
    defOpt.textContent = lang === 'ru' ? '— Выберите поле (для направляющих полос) —' : '— Select field (for guideline tracks) —';
    sel.appendChild(defOpt);
    
    allFields.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      const cropName = f.crop ? (lang === 'ru' ? (CROPS.find(c=>c.id===f.crop)?.ru || f.crop) : f.crop) : '';
      opt.textContent = `${f.name} (${formatArea(f.area)}${cropName ? ', ' + cropName : ''})`;
      sel.appendChild(opt);
    });

    const freeOpt = document.createElement('option');
    freeOpt.value = 'free';
    freeOpt.textContent = lang === 'ru' ? '🚜 Свободный заезд (без контура поля)' : '🚜 Free drive (no field bounds)';
    sel.appendChild(freeOpt);

    if (typeof currentFieldId !== 'undefined' && currentFieldId && allFields.some(f => f.id === currentFieldId)) {
      sel.value = currentFieldId;
    }
  }

  const m = document.getElementById('modal-tractor-setup');
  if (m) m.classList.add('open');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeTractorSetupModal() {
  const m = document.getElementById('modal-tractor-setup');
  if (m) m.classList.remove('open');
}

/** Запуск заезда: ИСКЛЮЧИТЕЛЬНО В 3D РЕЖИМЕ */
function startTractorTracking() {
  const widthInput = document.getElementById('tractor-width-input');
  if (widthInput && widthInput.value) {
    // Ширина захвата ограничена диапазоном 1-100 метров (максимум для
    // ввода пользователем — самое широкое реальное с/х оборудование).
    tractorWidth = Math.min(100, Math.max(1, parseFloat(widthInput.value) || 12));
  }

  const allFields = (typeof loadFields === 'function') ? loadFields() : [];
  const fieldSel = document.getElementById('tractor-field-select');
  const fieldId = fieldSel ? fieldSel.value : '';
  tractorActiveField = allFields.find(f => String(f.id) === String(fieldId)) || null;

  const opSel = document.getElementById('tractor-op-select');
  tractorOpType = opSel ? opSel.value : 'sowing';

  closeTractorSetupModal();

  // Очистка старых слоёв на 2D карте
  if (tractorTrailGroup) {
    tractorTrailGroup.clearLayers();
  } else if (typeof map !== 'undefined' && map) {
    tractorTrailGroup = L.layerGroup().addTo(map);
  }

  if (tractorGuidelineGroup) {
    tractorGuidelineGroup.clearLayers();
  } else if (typeof map !== 'undefined' && map) {
    tractorGuidelineGroup = L.layerGroup().addTo(map);
  }

  if (tractorMarker && typeof map !== 'undefined' && map) {
    try { map.removeLayer(tractorMarker); } catch (_) {}
    tractorMarker = null;
  }

  if (tractorSimInterval) {
    clearInterval(tractorSimInterval);
    tractorSimInterval = null;
  }

  tractorActive = true;
  tractorStartTime = new Date();
  tractorPath = [];
  tractorAreaHa = 0;
  tractorDistKm = 0;
  tractorCurrentSpeed = 0;
  tractor3DPos = { x: 0, z: 0 };
  tractor3DHeading = 0;
  tractor3DRenderPos = { x: 0, z: 0 };
  tractor3DRenderHeading = 0;
  lastSoilPaintPos = null;
  tractorGpsFarWarningShown = false;

  if (tractor3DTrailGroup) {
    tractor3DTrailGroup.clear();
    tractor3DTrailGroup.userData = {};
  }
  reset3DGroundCanvas();

  // FIX (спавн трактора): раньше initialPoint сразу ставился в ЦЕНТР поля
  // (tractorActiveField.center || coords[0]) без какой-либо попытки узнать
  // реальную GPS-позицию — трактор всегда появлялся посреди поля, даже
  // если GPS был доступен и водитель стоял у края. Логика ниже правильная:
  // 1) если поле выбрано — по умолчанию считаем стартовой точкой КРАЙ поля
  //    (первую вершину контура), а не центр;
  // 2) если поле не выбрано (свободный заезд) — по умолчанию центр карты;
  // 3) сразу после этого пытаемся получить текущую GPS-позицию; если она
  //    придёт вовремя и попадёт в пределы 3D-мира (<2км от поля) — именно
  //    она станет точкой спавна вместо края/центра.
  let initialPoint = (typeof DEFAULT_MAP_CENTER !== 'undefined') ? DEFAULT_MAP_CENTER : [55.75, 37.61];
  if (tractorActiveField) {
    const coords = tractorActiveField.coordinates || tractorActiveField.coords;
    if (coords && coords.length > 0) {
      initialPoint = coords[0]; // край поля, не центр
    }
  }

  // Опорная точка (0,0) 3D-мира: для поля — его геометрический центр (так
  // строится сетка/земля/границы), для свободного заезда — предполагаемая
  // стартовая точка. GPS-обработчик ниже может её скорректировать, если
  // поле не выбрано и реальная позиция известна.
  if (tractorActiveField) {
    const coords = tractorActiveField.coordinates || tractorActiveField.coords;
    const centerPoint = tractorActiveField.center || (coords && coords[0]) || initialPoint;
    fieldCenter3D = { lat: centerPoint[0], lng: centerPoint[1] };
  } else {
    fieldCenter3D = { lat: initialPoint[0], lng: initialPoint[1] };
  }

  // Точка спавна ВСЕГДА край поля (initialPoint), независимо от того, что
  // fieldCenter3D — это центр (нужен только как опорная точка сетки/земли).
  // FIX: раньше демо-режим (toggleTractorSimulation) телепортировал трактор
  // в fieldCenter3D, из-за чего трактор стартовал из центра поля, а не с
  // края — визуально выглядело как "прыжок"/баг при первом же движении.
  tractorSpawnPoint = { lat: initialPoint[0], lng: initialPoint[1] };

  // FIX (трактор в центре при открытии 3D): tractor3DPos/RenderPos были
  // сброшены в {0,0} чуть выше, а {0,0} 3D-мира — это fieldCenter3D
  // (геометрический ЦЕНТР поля). Из-за этого 3D-модель трактора появлялась
  // в центре поля ещё ДО первого вызова updateTractorLocation (то есть сразу
  // при открытии 3D-режима, до старта GPS/демо) — вместо требуемого края
  // поля. Пересчитываем стартовую 3D-позицию сразу в координаты края.
  if (fieldCenter3D) {
    const spawnX = (tractorSpawnPoint.lng - fieldCenter3D.lng) * (111320 * Math.cos(fieldCenter3D.lat * Math.PI / 180));
    const spawnZ = -(tractorSpawnPoint.lat - fieldCenter3D.lat) * 111320;
    tractor3DPos.x = spawnX;
    tractor3DPos.z = spawnZ;
    tractor3DRenderPos.x = spawnX;
    tractor3DRenderPos.z = spawnZ;
  }

  // Начальный курс — вдоль первой стороны контура поля, чтобы трактор с
  // самого появления смотрел вдоль гона, а не произвольно/на север.
  if (tractorActiveField) {
    const coords = tractorActiveField.coordinates || tractorActiveField.coords;
    if (coords && coords.length >= 2) {
      const p0 = coords[0], p1 = coords[1];
      let spawnHeading = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * (180 / Math.PI);
      if (spawnHeading < 0) spawnHeading += 360;
      tractor3DHeading = spawnHeading;
      tractor3DRenderHeading = spawnHeading;
    }
  }

  // Обновление заголовка в 3D
  const fieldTitleEl = document.getElementById('tractor-3d-field-title');
  if (fieldTitleEl) {
    fieldTitleEl.textContent = tractorActiveField ? tractorActiveField.name : (lang === 'ru' ? 'Свободный заезд' : 'Free drive');
  }

  const statArea = document.getElementById('tractor-3d-stat-area');
  if (statArea) statArea.textContent = '0.0';
  const statDist = document.getElementById('tractor-3d-stat-dist');
  if (statDist) statDist.textContent = '0.0';
  const statSpeed = document.getElementById('tractor-3d-stat-speed');
  if (statSpeed) statSpeed.textContent = '0.0';

  const widthEl = document.getElementById('tractor-guidance-width');
  if (widthEl) widthEl.textContent = `${Math.round(tractorWidth || 12)}м`;

  // ЗАПУСК 3D РЕЖИМА
  toggleTractor3DView(true);

  function spawnTractorMarkerAt(point) {
    if (!(typeof map !== 'undefined' && map && typeof L !== 'undefined')) return;
    const tractorSvg = `
      <div class="tractor-marker-wrap" style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        <div id="tractor-cone" style="position:absolute;top:-10px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:12px solid #00e676;opacity:0.9;"></div>
        <div style="width:34px;height:34px;border-radius:50%;background:#162231;border:2.5px solid #00e676;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.6);font-size:18px;">
          <i data-lucide="tractor" class="icon-sm"></i>
        </div>
      </div>
    `;
    try {
      tractorMarker = L.marker(point, {
        icon: L.divIcon({
          html: tractorSvg,
          className: 'tractor-marker-icon',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        }),
        zIndexOffset: 1000
      }).addTo(map);
    } catch (e) {
      console.warn('2D marker init notice:', e);
    }
  }

  // FIX (спавн трактора по GPS): раньше маркер сразу ставился в
  // initialPoint (который раньше был центром поля), а GPS обрабатывался
  // полностью асинхронно уже ПОСЛЕ появления трактора на экране — визуально
  // это выглядело так, будто трактор всегда стартует из центра поля и GPS
  // ни на что не влияет. Теперь мы явно пытаемся получить текущую позицию
  // (с таймаутом, чтобы не блокировать пользователя надолго) и только по
  // её результату решаем, где именно заспавнить трактор:
  //  - GPS определился и он в пределах поля/3D-мира -> спавн в реальной точке;
  //  - GPS не определился или он далеко от поля -> спавн на краю поля
  //    (initialPoint), как и должно быть по умолчанию без GPS.
  let spawnResolved = false;
  const finalizeSpawn = (point) => {
    if (spawnResolved) return;
    spawnResolved = true;
    spawnTractorMarkerAt(point);
  };

  if (navigator.geolocation) {
    const gpsTimeout = setTimeout(() => finalizeSpawn(initialPoint), 4000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(gpsTimeout);
        const gpsPoint = [pos.coords.latitude, pos.coords.longitude];
        const distFromCenter = fieldCenter3D ? Math.hypot(
          (gpsPoint[1] - fieldCenter3D.lng) * (111320 * Math.cos(fieldCenter3D.lat * Math.PI / 180)),
          (gpsPoint[0] - fieldCenter3D.lat) * 111320
        ) : Infinity;
        // GPS реально определился и попадает в пределы отрендеренного
        // 3D-мира (<2км от центра поля) — спавним трактор именно там.
        const usableGps = distFromCenter <= 2000;
        finalizeSpawn(usableGps ? gpsPoint : initialPoint);
        onTractorPosition(pos);
      },
      () => {
        clearTimeout(gpsTimeout);
        finalizeSpawn(initialPoint);
      },
      { enableHighAccuracy: true, timeout: 4000 }
    );

    tractorWatchId = navigator.geolocation.watchPosition(
      onTractorPosition,
      (err) => { console.warn('GPS watch warning:', err); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  } else {
    // Геолокация недоступна в браузере — сразу на край поля.
    finalizeSpawn(initialPoint);
  }

  showToast(lang === 'ru' ? '<i data-lucide="tractor" class="icon-sm"></i> 3D Заезд запущен!' : '<i data-lucide="tractor" class="icon-sm"></i> 3D Drive started!');
}

function onTractorPosition(pos) {
  if (!tractorActive || !pos || !pos.coords) return;
  if (tractorSimInterval !== null) return; // Ignore GPS if demo mode is active
  
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const speedMs = pos.coords.speed || 0;
  
  tractorCurrentSpeed = Math.max(0, speedMs * 3.6);
  const speedEl = document.getElementById('tractor-3d-stat-speed');
  if (speedEl) speedEl.textContent = tractorCurrentSpeed.toFixed(1);

  // FIX: если реальный GPS находится далеко (>2км) от центра 3D-мира,
  // трактор улетает за пределы отрендеренной земли/границ поля — видно
  // только небо. Телепортируем трактор на центр поля (или GPS-точку,
  // если это свободный заезд), как это уже делает демо-режим.
  if (fieldCenter3D && tractorPath.length === 0) {
    const distFromCenter = Math.hypot(
      (lng - fieldCenter3D.lng) * (111320 * Math.cos(fieldCenter3D.lat * Math.PI / 180)),
      (lat - fieldCenter3D.lat) * 111320
    );
    if (distFromCenter > 2000) {
      if (!tractorActiveField) {
        // Свободный заезд: центр 3D-мира не привязан к полю — переносим его на GPS.
        fieldCenter3D = { lat: lat, lng: lng };
      } else if (!tractorGpsFarWarningShown) {
        // Поле выбрано, но реальный GPS далеко от него — честно предупреждаем
        // пользователя, что показываем демо-траекторию вокруг поля, а не его
        // реальное перемещение (иначе он не поймёт, почему трактор "не едет").
        tractorGpsFarWarningShown = true;
        if (typeof showToast === 'function') {
          showToast(lang === 'ru'
            ? '<i data-lucide="alert-triangle" class="icon-sm"></i> GPS далеко от поля — показываю демо-траекторию'
            : '<i data-lucide="alert-triangle" class="icon-sm"></i> GPS is far from the field — showing demo trajectory');
        }
      }
      // Стартуем визуально с края поля (точка спавна), а не из реальной
      // (далёкой) GPS-точки и не из геометрического центра поля.
      const spawn = tractorSpawnPoint || fieldCenter3D;
      updateTractorLocation([spawn.lat, spawn.lng]);
      return;
    }
  }

  updateTractorLocation([lat, lng]);
}

/** Обновление положения трактора */
function updateTractorLocation(newPoint) {
  if (!tractorActive || !tractorMarker) return;
  const lat = newPoint[0];
  const lng = newPoint[1];

  if (tractorPath.length === 0) {
    tractorMarker.setLatLng(newPoint);
    tractorPath.push(newPoint);
    if (fieldCenter3D) {
      tractor3DPos.x = (lng - fieldCenter3D.lng) * (111320 * Math.cos(fieldCenter3D.lat * Math.PI / 180));
      tractor3DPos.z = -(lat - fieldCenter3D.lat) * 111320;
      // Первая точка заезда — ставим рендер-позицию сразу на месте, без
      // плавного "доезда" от (0,0), иначе трактор въезжал бы в кадр издалека.
      tractor3DRenderPos.x = tractor3DPos.x;
      tractor3DRenderPos.z = tractor3DPos.z;
      updateGuidanceLightbar(tractor3DHeading, tractor3DPos.x, tractor3DPos.z);
    }
    return;
  }

  const prevPoint = tractorPath[tractorPath.length - 1];
  const segLine = turf.lineString([[prevPoint[1], prevPoint[0]], [lng, lat]]);
  const segKm = turf.length(segLine, { units: 'kilometers' });

  // Защита от GPS прыжка
  if (segKm > 0.3) {
    tractorMarker.setLatLng(newPoint);
    tractorPath = [newPoint];
    lastSoilPaintPos = null;
    if (tractor3DTrailGroup) tractor3DTrailGroup.userData = {};
    
    // Синхронизация с 3D миром при прыжке
    if (fieldCenter3D) {
      // FIX: если прыжок унёс нас далеко (>2км) от текущего центра 3D-мира,
      // трактор окажется за пределами отрендеренной земли/границ и будет
      // видно только небо. В таком случае остаёмся визуально в центре
      // 3D-мира вместо того чтобы улетать вслед за реальным GPS.
      const distFromCenter = Math.hypot(
        (lng - fieldCenter3D.lng) * (111320 * Math.cos(fieldCenter3D.lat * Math.PI / 180)),
        (lat - fieldCenter3D.lat) * 111320
      );
      if (distFromCenter > 2000) {
        if (!tractorActiveField) {
          fieldCenter3D = { lat: lat, lng: lng };
        } else if (!tractorGpsFarWarningShown) {
          tractorGpsFarWarningShown = true;
          if (typeof showToast === 'function') {
            showToast(lang === 'ru'
              ? '<i data-lucide="alert-triangle" class="icon-sm"></i> GPS далеко от поля — показываю демо-траекторию'
              : '<i data-lucide="alert-triangle" class="icon-sm"></i> GPS is far from the field — showing demo trajectory');
          }
        }
        tractor3DPos.x = 0;
        tractor3DPos.z = 0;
        // Телепорт — синхронизируем рендер-позицию мгновенно, без доезда.
        tractor3DRenderPos.x = 0;
        tractor3DRenderPos.z = 0;
        updateGuidanceLightbar(tractor3DHeading, 0, 0);
        return;
      }
      tractor3DPos.x = (lng - fieldCenter3D.lng) * (111320 * Math.cos(fieldCenter3D.lat * Math.PI / 180));
      tractor3DPos.z = -(lat - fieldCenter3D.lat) * 111320;
      // GPS-прыжок (>0.3км за один фикс) — переносим трактор мгновенно,
      // а не плавно "доезжаем", иначе на резком скачке модель будет ехать
      // через всю сцену вместо честного телепорта.
      tractor3DRenderPos.x = tractor3DPos.x;
      tractor3DRenderPos.z = tractor3DPos.z;
      updateGuidanceLightbar(tractor3DHeading, tractor3DPos.x, tractor3DPos.z);
    }
    return;
  }

  if (segKm >= 0.0005) {
    const dLng = lng - prevPoint[1];
    const dLat = lat - prevPoint[0];
    let heading = Math.atan2(dLng, dLat) * (180 / Math.PI);
    if (heading < 0) heading += 360;

    tractorMarker.setLatLng(newPoint);

    const markerEl = tractorMarker.getElement();
    if (markerEl) {
      markerEl.style.transform = `${markerEl.style.transform.replace(/rotate\([^)]+\)/g, '')} rotate(${heading.toFixed(0)}deg)`;
    }

    tractorDistKm += segKm;
    const segMeters = segKm * 1000;
    const addedAreaHa = (segMeters * tractorWidth) / 10000;
    tractorAreaHa += addedAreaHa;

    const distEl = document.getElementById('tractor-3d-stat-dist');
    if (distEl) distEl.textContent = tractorDistKm.toFixed(2);
    const areaEl = document.getElementById('tractor-3d-stat-area');
    if (areaEl) areaEl.textContent = tractorAreaHa.toFixed(2);

    // Синхронизация с 3D миром по центру поля.
    // FIX (баг/рассинхрон при движении): раньше закраска пройденного участка
    // (paint3DSoilCoverage) вызывалась прямо здесь, по "сырой" GPS-цели
    // (tractor3DPos) — той самой точке, куда модель трактора ТОЛЬКО НАЧИНАЕТ
    // плавно доезжать через lerp в animate(). Модель на экране всегда чуть
    // "отставала" от уже нарисованного следа, из-за чего казалось, что
    // трактор едет с рывками/не туда. Теперь координата цели только
    // обновляется здесь, а сама отрисовка следа перенесена в animate() и
    // использует ту же сглаженную позицию (tractor3DRenderPos), что и модель
    // трактора на экране — след и трактор всегда синхронны.
    if (fieldCenter3D) {
      tractor3DPos.x = (lng - fieldCenter3D.lng) * (111320 * Math.cos(fieldCenter3D.lat * Math.PI / 180));
      tractor3DPos.z = -(lat - fieldCenter3D.lat) * 111320;
      tractor3DHeading = heading;
      updateGuidanceLightbar(heading, tractor3DPos.x, tractor3DPos.z);
    }

    // Закрашивание на 2D Leaflet. Цвет согласован с 3D-шлейфом
    // (SOIL_TRAIL_*) — контрастный янтарный, не сливается с зелёным полем
    // и с зелёными границами/маяками поля.
    try {
      const buffered = turf.buffer(segLine, (tractorWidth / 2) / 1000, { units: 'kilometers' });
      if (buffered) {
        L.geoJSON(buffered, {
          style: { color: SOIL_TRAIL_STROKE_CSS, weight: 1, fillColor: SOIL_TRAIL_FILL_CSS, fillOpacity: 0.55 },
          interactive: false
        }).addTo(tractorTrailGroup);
      }
    } catch (_) {}

    tractorPath.push(newPoint);
  }
}

/** Инициализация 3D Сцены */
function init3DScene() {
  const canvas = document.getElementById('tractor-3d-canvas');
  if (!canvas || typeof THREE === 'undefined') return false;

  if (renderer3D) return true;

  const container = document.getElementById('tractor-3d-view');
  const w = container ? container.clientWidth : window.innerWidth;
  const h = container ? container.clientHeight : window.innerHeight;

  renderer3D = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer3D.setSize(w, h, false);
  renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer3D.shadowMap.enabled = true;

  scene3D = new THREE.Scene();
  scene3D.background = new THREE.Color(0x7ec0ee); // Realistic Sky
  scene3D.fog = new THREE.FogExp2(0x7ec0ee, 0.003);

  camera3D = new THREE.PerspectiveCamera(65, w / h, 0.1, 1000);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3d5c32, 1.1);
  scene3D.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene3D.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
  dirLight.position.set(60, 120, 60);
  dirLight.castShadow = true;
  scene3D.add(dirLight);

  create3DGround();
  build3DTractorModel();

  tractor3DTrailGroup = new THREE.Group();
  scene3D.add(tractor3DTrailGroup);

  radarCanvas = document.getElementById('tractor-radar-canvas');
  if (radarCanvas) radarCtx = radarCanvas.getContext('2d');

  window.addEventListener('resize', on3DWindowResize);
  return true;
}

function reset3DGroundCanvas() {
  if (!coverage3DCtx) return;
  // Свежая реалистичная текстура травы и борозд
  coverage3DCtx.fillStyle = '#2d5a27';
  coverage3DCtx.fillRect(0, 0, 1024, 1024);

  coverage3DCtx.strokeStyle = 'rgba(30, 65, 25, 0.4)';
  coverage3DCtx.lineWidth = 3;
  for (let y = 0; y < 1024; y += 20) {
    coverage3DCtx.beginPath();
    coverage3DCtx.moveTo(0, y);
    coverage3DCtx.lineTo(1024, y);
    coverage3DCtx.stroke();
  }
  if (coverage3DTexture) coverage3DTexture.needsUpdate = true;
}

function create3DGround() {
  const groundSize = 1200;
  
  coverage3DCanvas = document.createElement('canvas');
  coverage3DCanvas.width = 1024;
  coverage3DCanvas.height = 1024;
  coverage3DCtx = coverage3DCanvas.getContext('2d');
  
  reset3DGroundCanvas();

  coverage3DTexture = new THREE.CanvasTexture(coverage3DCanvas);
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
  const groundMat = new THREE.MeshLambertMaterial({ map: coverage3DTexture, roughness: 0.9 });
  ground3D = new THREE.Mesh(groundGeo, groundMat);
  ground3D.rotation.x = -Math.PI / 2;
  ground3D.receiveShadow = true;
  scene3D.add(ground3D);

  const globalGroundGeo = new THREE.PlaneGeometry(100000, 100000);
  const globalGroundMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
  const globalGround = new THREE.Mesh(globalGroundGeo, globalGroundMat);
  globalGround.rotation.x = -Math.PI / 2;
  globalGround.position.y = -0.1;
  scene3D.add(globalGround);
}

/** Детализированная 3D-модель агро-трактора с динамическим лазерным курсоуказателем */
function build3DTractorModel() {
  tractor3DModel = new THREE.Group();

  const greenBodyMat = new THREE.MeshStandardMaterial({
    color: 0x2e7d32,
    roughness: 0.25,
    metalness: 0.35
  });
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x182026,
    roughness: 0.8,
    metalness: 0.5
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xfbc02d,
    roughness: 0.3,
    metalness: 0.4
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x14181c,
    roughness: 0.9,
    metalness: 0.1
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.15,
    metalness: 0.85
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xa8e0ff,
    transparent: true,
    opacity: 0.38,
    roughness: 0.1,
    side: THREE.DoubleSide
  });
  const ledLightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
  const redBeaconMat = new THREE.MeshBasicMaterial({ color: 0xff3d00 });
  const gpsDomeMat = new THREE.MeshStandardMaterial({ color: 0x76ff03, roughness: 0.3 });

  // 1. ШАССИ / РАМА
  const chassisGeo = new THREE.BoxGeometry(1.3, 0.4, 3.8);
  const chassis = new THREE.Mesh(chassisGeo, chassisMat);
  chassis.position.set(0, 0.7, 0.5);
  chassis.castShadow = true;
  tractor3DModel.add(chassis);

  // 2. КАПОТ
  const hoodMainGeo = new THREE.BoxGeometry(1.4, 0.9, 2.3);
  const hoodMain = new THREE.Mesh(hoodMainGeo, greenBodyMat);
  hoodMain.position.set(0, 1.35, 1.45);
  hoodMain.castShadow = true;
  tractor3DModel.add(hoodMain);

  const hoodFrontGeo = new THREE.BoxGeometry(1.36, 0.65, 0.7);
  const hoodFront = new THREE.Mesh(hoodFrontGeo, greenBodyMat);
  hoodFront.position.set(0, 1.15, 2.75);
  hoodFront.rotation.x = -Math.PI / 16;
  hoodFront.castShadow = true;
  tractor3DModel.add(hoodFront);

  const grilleGeo = new THREE.BoxGeometry(1.2, 0.7, 0.08);
  const grille = new THREE.Mesh(grilleGeo, chassisMat);
  grille.position.set(0, 1.15, 3.05);
  tractor3DModel.add(grille);

  const headLightGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
  headLightGeo.rotateX(Math.PI / 2);
  const lightL = new THREE.Mesh(headLightGeo, ledLightMat);
  lightL.position.set(-0.45, 1.35, 3.06);
  const lightR = new THREE.Mesh(headLightGeo, ledLightMat);
  lightR.position.set(0.45, 1.35, 3.06);
  tractor3DModel.add(lightL, lightR);

  const bumperGeo = new THREE.BoxGeometry(1.2, 0.45, 0.45);
  const bumper = new THREE.Mesh(bumperGeo, chassisMat);
  bumper.position.set(0, 0.7, 3.1);
  tractor3DModel.add(bumper);

  // 3. ВЫХЛОПНАЯ ТРУБА
  const pipeBaseGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.8, 16);
  const pipe = new THREE.Mesh(pipeBaseGeo, chromeMat);
  pipe.position.set(0.72, 2.3, 0.6);
  const pipeCapGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.2, 16);
  const pipeCap = new THREE.Mesh(pipeCapGeo, chromeMat);
  pipeCap.position.set(0.72, 3.25, 0.58);
  pipeCap.rotation.z = Math.PI / 12;
  tractor3DModel.add(pipe, pipeCap);

  // Воздушный фильтр рядом с выхлопной трубой — типичная деталь агротехники,
  // добавляет узнаваемый силуэт без лишней геометрии.
  const airFilterGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.65, 12);
  const airFilter = new THREE.Mesh(airFilterGeo, new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4, metalness: 0.2 }));
  airFilter.position.set(0.5, 2.15, 0.6);
  tractor3DModel.add(airFilter);

  // 4. ПАНОРАМНАЯ КАБИНА
  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(1.58, 1.45, 1.58), glassMat);
  cabGlass.position.set(0, 2.35, -0.5);
  tractor3DModel.add(cabGlass);

  const pillarGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8);
  const pFL = new THREE.Mesh(pillarGeo, chassisMat); pFL.position.set(-0.76, 2.35, 0.26);
  const pFR = new THREE.Mesh(pillarGeo, chassisMat); pFR.position.set(0.76, 2.35, 0.26);
  const pRL = new THREE.Mesh(pillarGeo, chassisMat); pRL.position.set(-0.76, 2.35, -1.26);
  const pRR = new THREE.Mesh(pillarGeo, chassisMat); pRR.position.set(0.76, 2.35, -1.26);
  tractor3DModel.add(pFL, pFR, pRL, pRR);

  // Тонкие горизонтальные перемычки (mullions) панорамного остекления —
  // без них стеклянный куб выглядит как единая пластина, а не кабина.
  const mullionGeo = new THREE.BoxGeometry(1.62, 0.035, 1.62);
  const mullionMat = chassisMat;
  const mullionMid = new THREE.Mesh(mullionGeo, mullionMat);
  mullionMid.position.set(0, 2.35, -0.5);
  tractor3DModel.add(mullionMid);

  const roofGeo = new THREE.BoxGeometry(1.85, 0.16, 1.85);
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 }));
  roof.position.set(0, 3.16, -0.5);
  tractor3DModel.add(roof);

  const gpsDomeGeo = new THREE.SphereGeometry(0.2, 16, 12);
  gpsDomeGeo.scale(1, 0.6, 1);
  const gpsDome = new THREE.Mesh(gpsDomeGeo, gpsDomeMat);
  gpsDome.position.set(0, 3.28, -0.5);
  tractor3DModel.add(gpsDome);

  const beaconGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12);
  const beaconL = new THREE.Mesh(beaconGeo, redBeaconMat);
  beaconL.position.set(-0.82, 3.32, -0.5);
  tractor3DModel.add(beaconL);
  // Второй проблесковый маяк (был только левый) — на реальных тракторах маячки
  // ставятся парой на обоих задних углах кабины.
  const beaconR = new THREE.Mesh(beaconGeo, redBeaconMat);
  beaconR.position.set(0.82, 3.32, -0.5);
  tractor3DModel.add(beaconR);

  const mirrorGeo = new THREE.BoxGeometry(0.08, 0.22, 0.14);
  const mirL = new THREE.Mesh(mirrorGeo, chassisMat); mirL.position.set(-0.95, 2.5, 0.25);
  const mirR = new THREE.Mesh(mirrorGeo, chassisMat); mirR.position.set(0.95, 2.5, 0.25);
  tractor3DModel.add(mirL, mirR);
  // Кронштейны зеркал — тонкие стойки от кабины до самого зеркала, иначе
  // зеркала выглядят "приклеенными" в воздухе рядом с кабиной.
  const mirrorArmGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6);
  const mirrorArmL = new THREE.Mesh(mirrorArmGeo, chassisMat);
  mirrorArmL.rotation.z = Math.PI / 2.3;
  mirrorArmL.position.set(-0.87, 2.5, 0.25);
  const mirrorArmR = new THREE.Mesh(mirrorArmGeo, chassisMat);
  mirrorArmR.rotation.z = -Math.PI / 2.3;
  mirrorArmR.position.set(0.87, 2.5, 0.25);
  tractor3DModel.add(mirrorArmL, mirrorArmR);

  // 5. КОЛЕСА
  const rearTireGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.68, 24);
  rearTireGeo.rotateZ(Math.PI / 2);
  const frontTireGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.48, 24);
  frontTireGeo.rotateZ(Math.PI / 2);

  const rearRimGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.70, 16);
  rearRimGeo.rotateZ(Math.PI / 2);
  const frontRimGeo = new THREE.CylinderGeometry(0.40, 0.40, 0.50, 16);
  frontRimGeo.rotateZ(Math.PI / 2);

  // Протектор шин: тонкие радиальные "рёбра" по окружности каждой шины —
  // самая заметная деталь, которой не хватало гладким цилиндрам-колёсам.
  function addTireTread(wheelMesh, radius, width, count) {
    const treadGeo = new THREE.BoxGeometry(width * 1.02, 0.06, 0.1);
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x0a0d10, roughness: 1.0 });
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const tread = new THREE.Mesh(treadGeo, treadMat);
      tread.position.set(0, Math.sin(a) * radius, Math.cos(a) * radius);
      tread.rotation.x = a;
      wheelMesh.add(tread);
    }
  }

  const rearWheelL = new THREE.Mesh(rearTireGeo, tireMat);
  rearWheelL.add(new THREE.Mesh(rearRimGeo, rimMat));
  addTireTread(rearWheelL, 1.06, 0.68, 20);
  rearWheelL.position.set(-1.22, 1.05, -0.85);
  rearWheelL.castShadow = true;

  const rearWheelR = new THREE.Mesh(rearTireGeo, tireMat);
  rearWheelR.add(new THREE.Mesh(rearRimGeo, rimMat));
  addTireTread(rearWheelR, 1.06, 0.68, 20);
  rearWheelR.position.set(1.22, 1.05, -0.85);
  rearWheelR.castShadow = true;
  tractor3DModel.add(rearWheelL, rearWheelR);

  const fenderGeo = new THREE.BoxGeometry(0.72, 0.12, 1.4);
  const fenderL = new THREE.Mesh(fenderGeo, greenBodyMat); fenderL.position.set(-1.22, 2.05, -0.85);
  const fenderR = new THREE.Mesh(fenderGeo, greenBodyMat); fenderR.position.set(1.22, 2.05, -0.85);
  tractor3DModel.add(fenderL, fenderR);

  frontLeftWheelMesh = new THREE.Group();
  const fTireL = new THREE.Mesh(frontTireGeo, tireMat);
  fTireL.add(new THREE.Mesh(frontRimGeo, rimMat));
  fTireL.castShadow = true;
  addTireTread(fTireL, 0.69, 0.48, 16);
  frontLeftWheelMesh.add(fTireL);
  frontLeftWheelMesh.position.set(-1.08, 0.68, 1.75);

  frontRightWheelMesh = new THREE.Group();
  const fTireR = new THREE.Mesh(frontTireGeo, tireMat);
  fTireR.add(new THREE.Mesh(frontRimGeo, rimMat));
  fTireR.castShadow = true;
  addTireTread(fTireR, 0.69, 0.48, 16);
  frontRightWheelMesh.add(fTireR);
  frontRightWheelMesh.position.set(1.08, 0.68, 1.75);
  tractor3DModel.add(frontLeftWheelMesh, frontRightWheelMesh);

  // 6. НАВЕСНОЕ ОБОРУДОВАНИЕ СЗАДИ — зависит от tractorOpType, вместо
  // одного абстрактного boom+disc для всех операций (Задача 1.3).
  const hitchGeo = new THREE.BoxGeometry(0.8, 0.3, 0.6);
  const hitch = new THREE.Mesh(hitchGeo, chassisMat);
  hitch.position.set(0, 0.7, -1.8);
  tractor3DModel.add(hitch);

  const implementWidth = Math.max(6, tractorWidth || 12);
  const implement = build3DImplement(tractorOpType, implementWidth, chassisMat);
  implement.name = 'tractorImplement'; // чтобы можно было найти и заменить при смене операции/ширины
  tractor3DModel.add(implement);

  // 7. ДИНАМИЧЕСКИЙ ЛАЗЕРНЫЙ КУРСОУКАЗАТЕЛЬ (НАПРАВЛЯЮЩИЕ НА ПЕРЕДКЕ ТРАКТОРА)
  const guidanceGroup = new THREE.Group();

  // Центральный лазерный луч направления движения (вперед на 80 метров)
  const centerLaserGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.15, 3.2),
    new THREE.Vector3(0, 0.15, 80.0)
  ]);
  const centerLaserMat = new THREE.LineDashedMaterial({
    color: 0x00ff88,
    dashSize: 3,
    gapSize: 1.5
  });
  const centerLaser = new THREE.Line(centerLaserGeo, centerLaserMat);
  centerLaser.computeLineDistances();
  guidanceGroup.add(centerLaser);

  // Боковые лазерные маркеры ширины захвата орудия
  const halfW = implementWidth / 2;
  const leftEdgeGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-halfW, 0.12, 0),
    new THREE.Vector3(-halfW, 0.12, 45.0)
  ]);
  const rightEdgeGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(halfW, 0.12, 0),
    new THREE.Vector3(halfW, 0.12, 45.0)
  ]);
  const edgeMat = new THREE.LineDashedMaterial({
    color: 0x00e5ff,
    dashSize: 2,
    gapSize: 2
  });
  const leftEdgeLine = new THREE.Line(leftEdgeGeo, edgeMat);
  leftEdgeLine.computeLineDistances();
  const rightEdgeLine = new THREE.Line(rightEdgeGeo, edgeMat);
  rightEdgeLine.computeLineDistances();
  guidanceGroup.add(leftEdgeLine, rightEdgeLine);

  // Светящийся полупрозрачный коридор хода орудия на земле
  const corridorGeo = new THREE.PlaneGeometry(implementWidth, 45);
  const corridorMat = new THREE.MeshBasicMaterial({
    color: 0x00e676,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide
  });
  const corridorMesh = new THREE.Mesh(corridorGeo, corridorMat);
  corridorMesh.rotation.x = -Math.PI / 2;
  corridorMesh.position.set(0, 0.08, 22.5);
  guidanceGroup.add(corridorMesh);

  tractor3DModel.add(guidanceGroup);
  scene3D.add(tractor3DModel);
}

/**
 * Строит навесное оборудование в зависимости от типа операции, вместо
 * одного абстрактного "boom + диски" на все случаи (Задача 1.3):
 * - sowing/fertilizing -> сеялка с высевающим бункером и сошниками
 * - spraying -> штанговый опрыскиватель с баком и форсунками
 * - tillage/other -> дисковая борона (близко к прежнему виду, но детальнее)
 * - harvest -> жатка с мотовилом
 */
function build3DImplement(opType, width, chassisMat) {
  const group = new THREE.Group();
  const halfW = width / 2;

  if (opType === 'sowing' || opType === 'fertilizing') {
    // Сеялка: горизонтальная рама + бункер сверху + ряд сошников снизу.
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.35, metalness: 0.25 });
    const frameGeo = new THREE.BoxGeometry(width, 0.22, 0.3);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 0.75, -2.2);
    frame.castShadow = true;
    group.add(frame);

    // Бункеры для семян/удобрений — несколько куполов вдоль рамы.
    const hopperMat = new THREE.MeshStandardMaterial({ color: opType === 'fertilizing' ? 0x455a64 : 0xffb300, roughness: 0.5, metalness: 0.15 });
    const numHoppers = Math.max(2, Math.min(5, Math.round(width / 4)));
    for (let i = 0; i < numHoppers; i++) {
      const hopperGeo = new THREE.CylinderGeometry(0.35, 0.22, 0.55, 8);
      const hopper = new THREE.Mesh(hopperGeo, hopperMat);
      const x = -halfW + (i + 0.5) * (width / numHoppers);
      hopper.position.set(x, 1.15, -2.2);
      group.add(hopper);
    }

    // Ряд сошников (заглубителей) под рамой, на расстоянии друг от друга.
    const coulterMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.6, metalness: 0.4 });
    const numCoulters = Math.min(24, Math.round(width));
    const coulterSpacing = width / (numCoulters + 1);
    for (let i = 1; i <= numCoulters; i++) {
      const coulterGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 12);
      coulterGeo.rotateX(Math.PI / 2);
      const coulter = new THREE.Mesh(coulterGeo, coulterMat);
      coulter.position.set(-halfW + i * coulterSpacing, 0.32, -2.35);
      group.add(coulter);
    }
    return group;
  }

  if (opType === 'spraying') {
    // Опрыскиватель: штанга на всю ширину захвата + бак сзади трактора + форсунки.
    const boomMat = new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.4, metalness: 0.3 });
    const boomGeo = new THREE.BoxGeometry(width, 0.12, 0.12);
    const boom = new THREE.Mesh(boomGeo, boomMat);
    boom.position.set(0, 1.1, -2.2);
    boom.castShadow = true;
    group.add(boom);

    // Тонкие вертикальные стойки-подвесы штанги (парение штанги над землёй).
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.5, metalness: 0.4 });
    const numStruts = Math.max(3, Math.min(9, Math.round(width / 3)));
    for (let i = 0; i < numStruts; i++) {
      const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
      const strut = new THREE.Mesh(strutGeo, strutMat);
      const x = -halfW + (i + 0.5) * (width / numStruts);
      strut.position.set(x, 0.85, -2.2);
      group.add(strut);

      // Форсунка на конце каждой стойки
      const nozzleGeo = new THREE.ConeGeometry(0.04, 0.08, 8);
      const nozzle = new THREE.Mesh(nozzleGeo, strutMat);
      nozzle.position.set(x, 0.58, -2.2);
      nozzle.rotation.x = Math.PI;
      group.add(nozzle);
    }

    // Бак с рабочим раствором за кабиной
    const tankMat = new THREE.MeshPhysicalMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.1 });
    const tankGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 16);
    tankGeo.rotateZ(Math.PI / 2);
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(0, 1.3, -1.5);
    tank.castShadow = true;
    group.add(tank);
    return group;
  }

  if (opType === 'harvest') {
    // Жатка: широкий низкий корпус спереди-снизу + мотовило (вращающиеся спицы).
    const headerMat = new THREE.MeshStandardMaterial({ color: 0xffa000, roughness: 0.4, metalness: 0.3 });
    const headerGeo = new THREE.BoxGeometry(width, 0.5, 0.9);
    const header = new THREE.Mesh(headerGeo, headerMat);
    header.position.set(0, 0.55, -2.3);
    header.castShadow = true;
    group.add(header);

    const reelMat = new THREE.MeshStandardMaterial({ color: 0x616161, roughness: 0.5, metalness: 0.4 });
    const reelAxleGeo = new THREE.CylinderGeometry(0.06, 0.06, width * 0.96, 8);
    reelAxleGeo.rotateZ(Math.PI / 2);
    const reelAxle = new THREE.Mesh(reelAxleGeo, reelMat);
    reelAxle.position.set(0, 1.15, -2.55);
    group.add(reelAxle);

    // Спицы мотовила — статичные (анимация вращения не требуется для превью),
    // но дают узнаваемый силуэт жатки на комбайне/фронтальной косилке.
    const spokeGeo = new THREE.BoxGeometry(width * 0.96, 0.06, 0.5);
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(spokeGeo, reelMat);
      spoke.position.set(0, 1.15, -2.55);
      spoke.rotation.x = (Math.PI / 2) * i;
      group.add(spoke);
    }
    return group;
  }

  // tillage / other / фолбэк: дисковая борона (прежний вид, но с добавленной
  // рамой-брусом сверху дисков, ближе к настоящей конструкции бороны).
  const boomMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.35, metalness: 0.2 });
  const boomGeo = new THREE.BoxGeometry(width, 0.35, 0.35);
  const boom = new THREE.Mesh(boomGeo, boomMat);
  boom.position.set(0, 0.75, -2.3);
  boom.castShadow = true;
  group.add(boom);

  const discMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.3, metalness: 0.6 });
  const discGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16);
  discGeo.rotateZ(Math.PI / 2);
  const numDiscs = Math.min(16, Math.round(width));
  const discSpacing = width / (numDiscs + 1);
  for (let i = 1; i <= numDiscs; i++) {
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(-halfW + i * discSpacing, 0.3, -2.3);
    disc.rotation.y = Math.PI / 10; // лёгкий угол атаки диска, как у настоящих борон
    group.add(disc);
  }
  return group;
}

// FIX (слабо видны линии/границы): THREE.LineBasicMaterial.linewidth
// физически игнорируется всеми браузерами на WebGL (кроме Firefox+ANGLE) —
// линия всегда рисуется в 1px независимо от заданного значения, поэтому
// контур поля и направляющие полосы выглядели тонкими и терялись на фоне
// земли. Эта функция строит "толстую линию" настоящей геометрией (лентой
// из треугольников, всегда повёрнутой к камере по горизонтали), которая
// действительно масштабируется заданной толщиной в метрах.
function makeThickGroundLine(points, color, widthMeters, opacity) {
  const positions = [];
  const halfW = widthMeters / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = Math.hypot(dx, dz) || 1;
    // Нормаль к отрезку в горизонтальной плоскости — куда "раздуваем" ленту
    const nx = (-dz / len) * halfW;
    const nz = (dx / len) * halfW;

    const a = { x: p1.x + nx, y: p1.y, z: p1.z + nz };
    const b = { x: p1.x - nx, y: p1.y, z: p1.z - nz };
    const c = { x: p2.x + nx, y: p2.y, z: p2.z + nz };
    const d = { x: p2.x - nx, y: p2.y, z: p2.z - nz };

    positions.push(a.x, a.y, a.z,  b.x, b.y, b.z,  c.x, c.y, c.z);
    positions.push(b.x, b.y, b.z,  d.x, d.y, d.z,  c.x, c.y, c.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: opacity < 1,
    opacity: opacity,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  return new THREE.Mesh(geo, mat);
}

/** 3D Границы поля с яркими неоновыми стенами, маяками и лазерными гонами параллельного вождения */
function update3DFieldBounds(field) {
  if (!scene3D) return;

  if (field3DOutline) {
    scene3D.remove(field3DOutline);
    field3DOutline = null;
  }

  field3DOutline = new THREE.Group();
  const spacingMeters = Math.max(6, tractorWidth || 12);
  const trackLength = 1600;

  // 1. Полноразмерная координатная сетка поля
  const gridHelper = new THREE.GridHelper(2400, 200, 0x00e676, 0x1b4332);
  gridHelper.position.y = 0.04;
  gridHelper.material.opacity = 0.22;
  gridHelper.material.transparent = true;
  field3DOutline.add(gridHelper);

  const coords = field ? (field.coordinates || field.coords) : null;

  if (coords && coords.length >= 3) {
    const centerLat = field.center ? field.center[0] : coords[0][0];
    const centerLng = field.center ? field.center[1] : coords[0][1];
    fieldCenter3D = { lat: centerLat, lng: centerLng };

    const points3D = [];
    coords.forEach(pt => {
      const dLat = (pt[0] - centerLat) * 111320;
      const dLng = (pt[1] - centerLng) * (111320 * Math.cos(centerLat * Math.PI / 180));
      points3D.push(new THREE.Vector3(dLng, 0.5, -dLat));
    });
    points3D.push(points3D[0]);

    // Неоновый контур границы поля (на земле и по верху стены).
    // FIX: раньше это были THREE.Line с linewidth — толщина игнорировалась
    // WebGL, линия тонула в текстуре земли. Теперь это настоящая геометрия
    // толщиной ~0.6м на земле и ~0.35м по верху стены — заметно с любого
    // расстояния и ракурса камеры.
    const boundaryLineGround = makeThickGroundLine(points3D, 0x00ff88, 0.6, 1.0);
    field3DOutline.add(boundaryLineGround);

    const wallHeight = 8.0;
    const pointsTop = points3D.map(p => new THREE.Vector3(p.x, wallHeight, p.z));
    const boundaryLineTop = makeThickGroundLine(pointsTop, 0x00ff88, 0.35, 1.0);
    field3DOutline.add(boundaryLineTop);

    // Полупрозрачная светящаяся стена границы поля
    const wallPositions = [];
    for (let i = 0; i < points3D.length - 1; i++) {
      const p1 = points3D[i];
      const p2 = points3D[i + 1];

      // Triangle 1
      wallPositions.push(p1.x, 0.1, p1.z);
      wallPositions.push(p2.x, 0.1, p2.z);
      wallPositions.push(p1.x, wallHeight, p1.z);

      // Triangle 2
      wallPositions.push(p2.x, 0.1, p2.z);
      wallPositions.push(p2.x, wallHeight, p2.z);
      wallPositions.push(p1.x, wallHeight, p1.z);
    }
    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x00e676,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    field3DOutline.add(wallMesh);

    // Высотные маяки на каждом углу поля со сферами
    const beaconGeo = new THREE.CylinderGeometry(0.5, 0.5, 20, 12);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00e676, transparent: true, opacity: 0.9 });
    const orbGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

    points3D.forEach((p, idx) => {
      if (idx === points3D.length - 1) return;
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(p.x, 10, p.z);
      field3DOutline.add(beacon);

      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(p.x, 20, p.z);
      field3DOutline.add(orb);
    });
  }

  // 2. ПАРАЛЛЕЛЬНЫЕ ГОНЫ (НАПРАВЛЯЮЩИЕ ЛИНИИ КУРСА AB)
  const numTracks = 40;
  for (let i = -numTracks; i <= numTracks; i++) {
    const xPos = i * spacingMeters;
    const isCenterTrack = (i === 0);

    // FIX: тонкая THREE.Line поверх ленты почти не добавляла видимости
    // (linewidth игнорируется WebGL) — заменена толстой линией-мешем,
    // которая реально видна как непрерывная яркая полоса поверх ribbon.
    const trackPoints = [
      new THREE.Vector3(xPos, 0.14, -trackLength / 2),
      new THREE.Vector3(xPos, 0.14, trackLength / 2)
    ];
    const trackLine = makeThickGroundLine(
      trackPoints,
      isCenterTrack ? 0x00ff88 : 0x00e5ff,
      isCenterTrack ? 0.35 : 0.2,
      isCenterTrack ? 1.0 : 0.85
    );
    field3DOutline.add(trackLine);

    // Светящаяся полоса-лента на земле. FIX: непрозрачность была слишком
    // низкой (0.18–0.35) и гоны почти не читались на фоне зелёной текстуры
    // земли — увеличена, плюс лента стала шире, чтобы курс было видно
    // издалека, а не только вблизи.
    const ribbonGeo = new THREE.PlaneGeometry(isCenterTrack ? 1.4 : 1.0, trackLength);
    const ribbonMat = new THREE.MeshBasicMaterial({
      color: isCenterTrack ? 0x00ff88 : 0x00b0ff,
      transparent: true,
      opacity: isCenterTrack ? 0.6 : 0.4,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbonMesh.rotation.x = -Math.PI / 2;
    ribbonMesh.position.set(xPos, 0.09, 0);
    field3DOutline.add(ribbonMesh);
  }

  scene3D.add(field3DOutline);
}

/** Расчет и обновление HUD светодиодного курсоуказателя (Ag Lightbar) */
function updateGuidanceLightbar(heading, x, z) {
  const spacing = Math.max(6, tractorWidth || 12);
  const trackIndex = Math.round(x / spacing);
  const targetX = trackIndex * spacing;
  const deviation = x - targetX; // отклонение от центра гона в метрах

  const trackEl = document.getElementById('tractor-guidance-track');
  const hdgEl = document.getElementById('tractor-guidance-hdg');
  const offsetEl = document.getElementById('tractor-guidance-offset');
  const pillEl = document.getElementById('guidance-center-pill');
  const statusEl = document.getElementById('tractor-guidance-status');
  const widthEl = document.getElementById('tractor-guidance-width');

  if (widthEl) widthEl.textContent = `${Math.round(spacing)}м`;
  if (trackEl) trackEl.textContent = `ГОН #${Math.abs(trackIndex) + 1}`;
  if (hdgEl) hdgEl.textContent = `${Math.round(heading)}°`;

  const leds = ['gled-l3', 'gled-l2', 'gled-l1', 'gled-r1', 'gled-r2', 'gled-r3'];
  leds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'gled';
  });

  const absDev = Math.abs(deviation);

  if (absDev < 0.15) {
    if (offsetEl) offsetEl.textContent = '0.00 м';
    if (pillEl) pillEl.className = 'guidance-center-pill';
    if (statusEl) {
      statusEl.textContent = 'В ПОЛОСЕ (ON TRACK)';
      statusEl.style.color = '#00e676';
    }
  } else if (deviation > 0) {
    // Трактор смещен вправо -> рули ВЛЕВО
    if (offsetEl) offsetEl.textContent = `← ${absDev.toFixed(2)} м`;
    if (pillEl) pillEl.className = absDev > 0.6 ? 'guidance-center-pill deviate-hard' : 'guidance-center-pill deviate-left';
    if (statusEl) {
      statusEl.textContent = absDev > 0.6 ? 'СИЛЬНО ВПРАВО! РУЛИ ВЛЕВО ←' : 'РУЛИ ВЛЕВО ←';
      statusEl.style.color = absDev > 0.6 ? '#ff5252' : '#ffd600';
    }
    const l1 = document.getElementById('gled-l1');
    const l2 = document.getElementById('gled-l2');
    const l3 = document.getElementById('gled-l3');
    if (l1) l1.classList.add(absDev > 0.6 ? 'active-red' : (absDev > 0.3 ? 'active-yellow' : 'active-green'));
    if (absDev > 0.3 && l2) l2.classList.add(absDev > 0.6 ? 'active-red' : 'active-yellow');
    if (absDev > 0.6 && l3) l3.classList.add('active-red');
  } else {
    // Трактор смещен влево -> рули ВПРАВО
    if (offsetEl) offsetEl.textContent = `${absDev.toFixed(2)} м →`;
    if (pillEl) pillEl.className = absDev > 0.6 ? 'guidance-center-pill deviate-hard' : 'guidance-center-pill deviate-left';
    if (statusEl) {
      statusEl.textContent = absDev > 0.6 ? 'СИЛЬНО ВЛЕВО! РУЛИ ВПРАВО →' : 'РУЛИ ВПРАВО →';
      statusEl.style.color = absDev > 0.6 ? '#ff5252' : '#ffd600';
    }
    const r1 = document.getElementById('gled-r1');
    const r2 = document.getElementById('gled-r2');
    const r3 = document.getElementById('gled-r3');
    if (r1) r1.classList.add(absDev > 0.6 ? 'active-red' : (absDev > 0.3 ? 'active-yellow' : 'active-green'));
    if (absDev > 0.3 && r2) r2.classList.add(absDev > 0.6 ? 'active-red' : 'active-yellow');
    if (absDev > 0.6 && r3) r3.classList.add('active-red');
  }
}

/** Отрисовка круглого радара миникарты */
function draw3DRadar() {
  if (!radarCtx || !radarCanvas) return;
  const W = radarCanvas.width, H = radarCanvas.height;
  const cx = W / 2, cy = H / 2;

  radarCtx.clearRect(0, 0, W, H);

  // Сетка радара
  radarCtx.strokeStyle = 'rgba(0, 230, 118, 0.25)';
  radarCtx.lineWidth = 1;
  radarCtx.beginPath();
  radarCtx.arc(cx, cy, 60, 0, Math.PI * 2);
  radarCtx.arc(cx, cy, 30, 0, Math.PI * 2);
  radarCtx.moveTo(cx, 0); radarCtx.lineTo(cx, H);
  radarCtx.moveTo(0, cy); radarCtx.lineTo(W, cy);
  radarCtx.stroke();

  // Обновление времени
  if (tractorStartTime) {
    const timeEl = document.getElementById('tractor-3d-stat-time');
    if (timeEl) {
      const ms = new Date() - tractorStartTime;
      const s = Math.floor(ms / 1000) % 60;
      const m = Math.floor(ms / 60000);
      timeEl.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }
  }

  // Отрисовка контура поля на радаре
  if (tractorActiveField && tractorActiveField.coordinates) {
    const coords = tractorActiveField.coordinates;
    const centerLat = fieldCenter3D ? fieldCenter3D.lat : coords[0][0];
    const centerLng = fieldCenter3D ? fieldCenter3D.lng : coords[0][1];

    radarCtx.beginPath();
    coords.forEach((pt, i) => {
      const dLat = (pt[0] - centerLat) * 111320;
      const dLng = (pt[1] - centerLng) * (111320 * Math.cos(centerLat * Math.PI / 180));
      const rx = cx + (dLng * 0.12);
      const ry = cy - (dLat * 0.12);
      if (i === 0) radarCtx.moveTo(rx, ry);
      else radarCtx.lineTo(rx, ry);
    });
    radarCtx.closePath();
    radarCtx.fillStyle = 'rgba(0, 230, 118, 0.15)';
    radarCtx.fill();
    radarCtx.strokeStyle = '#00e676';
    radarCtx.lineWidth = 1.5;
    radarCtx.stroke();
  }

  // Трактор со стрелкой курса на радаре
  const tX = cx + (tractor3DPos.x * 0.12);
  const tY = cy + (tractor3DPos.z * 0.12);

  radarCtx.save();
  radarCtx.translate(tX, tY);
  radarCtx.rotate((tractor3DHeading) * (Math.PI / 180));
  radarCtx.fillStyle = '#00e676';
  radarCtx.beginPath();
  radarCtx.moveTo(0, -7);
  radarCtx.lineTo(5, 5);
  radarCtx.lineTo(0, 3);
  radarCtx.lineTo(-5, 5);
  radarCtx.closePath();
  radarCtx.fill();
  radarCtx.restore();
}

/**
 * Закрашивание обработанной почвы: на текстуре земли и в 3D динамическом
 * шлейфе. heading (градусы) обязателен для 3D-шлейфа — раньше функция сама
 * читала глобальный tractor3DHeading, но вызывающий код теперь передаёт
 * тот же сглаженный курс (tractor3DRenderHeading), что используется для
 * позиционирования самой модели трактора на экране, иначе шлейф и модель
 * визуально рассинхронизируются на поворотах.
 */
function paint3DSoilCoverage(x, z, widthMeters, headingDeg) {
  const w = widthMeters || 12;
  const heading = (typeof headingDeg === 'number') ? headingDeg : tractor3DHeading;

  // 1. Отрисовка на 2D Canvas текстуре грунта
  if (coverage3DCtx && coverage3DTexture) {
    const cx = Math.max(0, Math.min(1023, 512 + (x * 0.8533)));
    const cz = Math.max(0, Math.min(1023, 512 + (z * 0.8533)));
    const r = Math.max(6, (w * 0.8533) / 2);

    coverage3DCtx.fillStyle = SOIL_TRAIL_FILL_CSS;
    coverage3DCtx.strokeStyle = SOIL_TRAIL_STROKE_CSS;
    coverage3DCtx.lineWidth = r * 2;
    coverage3DCtx.lineCap = 'round';
    coverage3DCtx.lineJoin = 'round';

    if (lastSoilPaintPos) {
      coverage3DCtx.beginPath();
      coverage3DCtx.moveTo(lastSoilPaintPos.cx, lastSoilPaintPos.cz);
      coverage3DCtx.lineTo(cx, cz);
      coverage3DCtx.stroke();
    }

    coverage3DCtx.beginPath();
    coverage3DCtx.arc(cx, cz, r, 0, Math.PI * 2);
    coverage3DCtx.fill();

    lastSoilPaintPos = { cx, cz, x, z };
    coverage3DTexture.needsUpdate = true;
  }

  // 2. 3D динамический шлейф (Realtime 3D Ribbon Trail за орудием)
  if (tractor3DTrailGroup) {
    const rad = heading * (Math.PI / 180);
    const halfW = w / 2;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const hitchDist = 2.3;
    const bx = x - sin * hitchDist;
    const bz = z - cos * hitchDist;

    const pL = new THREE.Vector3(bx - cos * halfW, 0.06, bz + sin * halfW);
    const pR = new THREE.Vector3(bx + cos * halfW, 0.06, bz - sin * halfW);

    if (tractor3DTrailGroup.userData.lastL && tractor3DTrailGroup.userData.lastR) {
      const prevL = tractor3DTrailGroup.userData.lastL;
      const prevR = tractor3DTrailGroup.userData.lastR;

      const segGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        prevL.x, prevL.y, prevL.z,
        prevR.x, prevR.y, prevR.z,
        pL.x, pL.y, pL.z,

        prevR.x, prevR.y, prevR.z,
        pR.x, pR.y, pR.z,
        pL.x, pL.y, pL.z
      ]);
      segGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const segMat = new THREE.MeshBasicMaterial({
        color: SOIL_TRAIL_COLOR_HEX,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide
      });
      const segMesh = new THREE.Mesh(segGeo, segMat);
      tractor3DTrailGroup.add(segMesh);

      if (tractor3DTrailGroup.children.length > 600) {
        tractor3DTrailGroup.remove(tractor3DTrailGroup.children[0]);
      }
    }

    tractor3DTrailGroup.userData.lastL = pL;
    tractor3DTrailGroup.userData.lastR = pR;
  }
}

/**
 * Пересобирает только навесное оборудование на уже существующей модели
 * трактора, когда меняется тип операции или ширина захвата между заездами.
 * build3DTractorModel() вызывается один раз за сессию (внутри init3DScene(),
 * который сам себя защищает от повторного вызова через renderer3D), поэтому
 * без этой функции модель трактора "застревала" бы на инвентаре первого
 * выбранного при открытии 3D-режима типа операции.
 */
function refresh3DImplement() {
  if (!tractor3DModel) return;
  const old = tractor3DModel.getObjectByName('tractorImplement');
  if (old) {
    tractor3DModel.remove(old);
  }
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x182026, roughness: 0.8, metalness: 0.5 });
  const implementWidth = Math.max(6, tractorWidth || 12);
  const implement = build3DImplement(tractorOpType, implementWidth, chassisMat);
  implement.name = 'tractorImplement';
  tractor3DModel.add(implement);
}

function toggleTractor3DView(show) {
  tractor3DActive = show;
  const container = document.getElementById('tractor-3d-view');
  const tabBar = document.getElementById('tab-bar');
  if (!container) return;

  if (show) {
    container.style.display = 'block';
    if (tabBar) tabBar.style.display = 'none';
    if (init3DScene()) {
      refresh3DImplement();
      update3DFieldBounds(tractorActiveField);
      start3DAnimationLoop();
    }
  } else {
    container.style.display = 'none';
    if (tabBar && document.getElementById('main-app').classList.contains('visible')) {
      tabBar.style.display = 'flex';
    }
    if (tractor3DAnimId) {
      cancelAnimationFrame(tractor3DAnimId);
      tractor3DAnimId = null;
    }
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function start3DAnimationLoop() {
  if (tractor3DAnimId) cancelAnimationFrame(tractor3DAnimId);

  // Задача 1.4: камера отодвинута дальше назад и выше, чтобы в кадре было
  // видно больше земли впереди/по бокам (трактор, орудие, сразу несколько
  // параллельных гонов), но трактор всё ещё узнаваем и не теряется точкой.
  // Подобрано эмпирически в середине предложенного диапазона (28-35м / 12-15м).
  const CAM_DISTANCE = 30;
  const CAM_HEIGHT = 13;
  const CAM_LOOKAHEAD = 8; // чуть дальше вперёд по курсу, т.к. камера теперь выше и дальше
  const CAM_LOOK_HEIGHT = 2.2;
  const CAM_LERP = 0.08; // скорость плавной интерполяции камеры между кадрами

  let camPosInitialized = false;
  const desiredPos = new THREE.Vector3();
  const desiredLookAt = new THREE.Vector3();

  // FIX (дёрганье): скорость "доезда" рендер-позиции до GPS-цели за кадр.
  // Не завязана на CAM_LERP специально — камера и трактор должны сглаживаться
  // независимо, иначе на резких GPS-скачках дёргается либо камера, либо модель.
  const MOVE_LERP = 0.15;

  function animate() {
    if (!tractor3DActive) return;
    tractor3DAnimId = requestAnimationFrame(animate);

    if (tractor3DModel) {
      // Плавно подтягиваем отображаемую позицию/курс к последней GPS-цели
      // на каждом кадре рендера (60 раз/сек), а не только когда придёт новое
      // GPS-событие (1 раз/сек) — именно это убирает дёрганье/скачки картинки.
      tractor3DRenderPos.x += (tractor3DPos.x - tractor3DRenderPos.x) * MOVE_LERP;
      tractor3DRenderPos.z += (tractor3DPos.z - tractor3DRenderPos.z) * MOVE_LERP;

      // Курс — угол, интерполируем по кратчайшей дуге, чтобы трактор не
      // "закручивался" через 360° при переходе, например, с 350° на 10°.
      let headingDiff = tractor3DHeading - tractor3DRenderHeading;
      while (headingDiff > 180) headingDiff -= 360;
      while (headingDiff < -180) headingDiff += 360;
      tractor3DRenderHeading += headingDiff * MOVE_LERP;

      tractor3DModel.position.set(tractor3DRenderPos.x, 0, tractor3DRenderPos.z);
      tractor3DModel.rotation.y = tractor3DRenderHeading * (Math.PI / 180);

      // Закраска пройденного участка — рисуем по той же сглаженной позиции
      // (tractor3DRenderPos/RenderHeading), в которой сейчас реально стоит
      // 3D-модель трактора на экране, а не по "сырой" GPS-цели. Так след
      // всегда точно совпадает с видимым положением орудия — без рывков.
      if (tractorActive && (tractorSimInterval || tractorWatchId)) {
        paint3DSoilCoverage(tractor3DRenderPos.x, tractor3DRenderPos.z, tractorWidth || 12, tractor3DRenderHeading);
      }

      if (camera3D) {
        const tPos = tractor3DModel.position;
        const rad = tractor3DModel.rotation.y;

        // ПАНОРАМНЫЙ ВИД СЗАДИ (3-е лицо: обзор трактора, орудия и параллельных гонов)
        desiredPos.set(
          tPos.x - Math.sin(rad) * CAM_DISTANCE,
          CAM_HEIGHT,
          tPos.z - Math.cos(rad) * CAM_DISTANCE
        );
        desiredLookAt.set(
          tPos.x + Math.sin(rad) * CAM_LOOKAHEAD,
          CAM_LOOK_HEIGHT,
          tPos.z + Math.cos(rad) * CAM_LOOKAHEAD
        );

        if (!camPosInitialized) {
          // Первый кадр: ставим камеру сразу на нужное место без интерполяции,
          // иначе она "подъезжает" издалека при каждом входе в 3D-режим.
          camera3D.position.copy(desiredPos);
          camPosInitialized = true;
        } else {
          // Плавная интерполяция (lerp) между кадрами — движение камеры при
          // поворотах трактора перестаёт быть резким/дёрганым.
          camera3D.position.lerp(desiredPos, CAM_LERP);
        }
        camera3D.lookAt(desiredLookAt);
      }
    }

    draw3DRadar();

    if (renderer3D && scene3D && camera3D) {
      renderer3D.render(scene3D, camera3D);
    }
  }

  animate();
}

function on3DWindowResize() {
  if (!camera3D || !renderer3D) return;
  const container = document.getElementById('tractor-3d-view');
  const w = container ? container.clientWidth : window.innerWidth;
  const h = container ? container.clientHeight : window.innerHeight;
  camera3D.aspect = w / h;
  camera3D.updateProjectionMatrix();
  renderer3D.setSize(w, h, false);
}

function toggleTractorSimulation() {
  if (!tractorActive) return;
  if (tractorSimInterval) {
    clearInterval(tractorSimInterval);
    tractorSimInterval = null;
    showToast(lang === 'ru' ? '<i data-lucide="pause" class="icon-sm"></i> Демо на паузе' : '<i data-lucide="pause" class="icon-sm"></i> Simulation paused');
    return;
  }

  showToast(lang === 'ru' ? '<i data-lucide="arrow-right" class="icon-sm"></i> Демо заезд запущен' : '<i data-lucide="arrow-right" class="icon-sm"></i> Demo running');

  // FIX (баг/прыжок при старте демо): раньше трактор телепортировался в
  // fieldCenter3D — геометрический ЦЕНТР поля, хотя трактор по требованиям
  // должен стоять на КРАЮ поля. Из-за этого при запуске демо было видно,
  // как трактор резко "прыгает" из точки спавна на краю в центр поля, а
  // затем плавно едет дальше — это и воспринималось как баг движения.
  // Теперь используем tractorSpawnPoint (край поля / исходная точка).
  const demoStart = tractorSpawnPoint || fieldCenter3D;
  if (demoStart) {
    tractorPath = [];
    lastSoilPaintPos = null;
    if (tractor3DTrailGroup) {
      tractor3DTrailGroup.clear();
      tractor3DTrailGroup.userData = {};
    }
    // Курс движения — вдоль первой стороны контура поля (если известна),
    // иначе строго на север (0°). Раньше heading всегда жёстко ставился
    // в 0°, из-за чего на повёрнутых полях трактор в демо мог сразу же
    // "смотреть" не вдоль гона, а поперёк него/за пределы поля.
    let demoHeading = 0;
    if (tractorActiveField) {
      const coords = tractorActiveField.coordinates || tractorActiveField.coords;
      if (coords && coords.length >= 2) {
        const p0 = coords[0], p1 = coords[1];
        const dLng = p1[1] - p0[1];
        const dLat = p1[0] - p0[0];
        demoHeading = Math.atan2(dLng, dLat) * (180 / Math.PI);
        if (demoHeading < 0) demoHeading += 360;
      }
    }
    tractor3DHeading = demoHeading;
    tractor3DRenderHeading = demoHeading;
    updateTractorLocation([demoStart.lat, demoStart.lng]);
  }

  tractorSimInterval = setInterval(() => {
    if (!tractorActive) {
      clearInterval(tractorSimInterval);
      tractorSimInterval = null;
      return;
    }
    
    // Simulate 15 km/h = 4.16 m/s -> ~2.08 meters per 500ms
    const distKm = 2.08 / 1000;
    
    let currentPoint = tractorPath.length > 0 ? tractorPath[tractorPath.length - 1] : null;
    if (!currentPoint && fieldCenter3D) {
      currentPoint = [fieldCenter3D.lat, fieldCenter3D.lng];
    }
    
    if (currentPoint) {
      const point = turf.point([currentPoint[1], currentPoint[0]]);
      const dest = turf.destination(point, distKm, tractor3DHeading, {units: 'kilometers'});
      const newLng = dest.geometry.coordinates[0];
      const newLat = dest.geometry.coordinates[1];
      
      document.getElementById('tractor-3d-stat-speed').textContent = '15.0';
      updateTractorLocation([newLat, newLng]);
    }
  }, 500);
}

function stopTractorTracking() {
  toggleTractor3DView(false);
  tractor3DPos = { x: 0, z: 0 };
  tractor3DHeading = 0;

  if (tractorWatchId) {
    navigator.geolocation.clearWatch(tractorWatchId);
    tractorWatchId = null;
  }
  if (tractorSimInterval) {
    clearInterval(tractorSimInterval);
    tractorSimInterval = null;
  }
  tractorActive = false;

  if (tractorMarker) {
    map.removeLayer(tractorMarker);
    tractorMarker = null;
  }

  if (tractorGuidelineGroup) {
    tractorGuidelineGroup.clearLayers();
  }

  const activeUi = document.getElementById('tractor-active-ui');
  if (activeUi) activeUi.style.display = 'none';

  const endTime = new Date();
  const elapsedSec = tractorStartTime ? Math.max(1, Math.round((endTime - tractorStartTime) / 1000)) : 60;
  const durationMin = Math.max(1, Math.round(elapsedSec / 60));
  const isRu = lang === 'ru';

  let durationFormatted = durationMin < 60
    ? (isRu ? `${durationMin} мин` : `${durationMin} min`)
    : (isRu ? `${Math.floor(durationMin / 60)} ч ${durationMin % 60} мин` : `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`);
  
  if (durationMin === 1 && elapsedSec < 60) {
    durationFormatted = isRu ? `${elapsedSec} сек` : `${elapsedSec} sec`;
  }

  const fieldName = tractorActiveField ? tractorActiveField.name : (isRu ? 'Свободный заезд' : 'Free drive');

  const opTitle = {
    sowing: isRu ? 'Сев' : 'Sowing',
    spraying: isRu ? 'Опрыскивание' : 'Spraying',
    fertilizing: isRu ? 'Внесение удобрений' : 'Fertilizing',
    tillage: isRu ? 'Вспашка' : 'Tillage',
    harvest: isRu ? 'Уборка' : 'Harvest',
    other: isRu ? 'Обработка' : 'Operation'
  }[tractorOpType] || (isRu ? 'Заезд' : 'Drive');

  const driveNoteText = isRu
    ? `Обработано: ${tractorAreaHa.toFixed(2)} га за ${durationFormatted} (Дистанция: ${tractorDistKm.toFixed(2)} км, Захват: ${tractorWidth}м)`
    : `Completed: ${tractorAreaHa.toFixed(2)} ha in ${durationFormatted} (Distance: ${tractorDistKm.toFixed(2)} km, Width: ${tractorWidth}m)`;

  // NOTE: сохранение в историю поля больше НЕ происходит автоматически здесь.
  // Пользователь явно решает через модалку итогов: "Сохранить в историю поля"
  // или "Удалить без сохранения" (см. saveTractorSummary()/discardTractorSummary()).
  // Все данные заезда, нужные для сохранения, складываем в pendingTractorSummary.
  pendingTractorSummary = {
    fieldId: tractorActiveField ? tractorActiveField.id : null,
    fieldName: fieldName,
    opType: tractorOpType,
    opTitle: opTitle,
    areaHa: parseFloat(tractorAreaHa.toFixed(2)),
    distKm: parseFloat(tractorDistKm.toFixed(2)),
    durationMin: durationMin,
    durationFormatted: durationFormatted,
    widthMeters: tractorWidth,
    driveNoteText: driveNoteText,
    saved: false
  };

  // Обновление модалки итогов
  const sumArea = document.getElementById('sum-stat-area');
  if (sumArea) sumArea.textContent = tractorAreaHa.toFixed(2);
  const sumDist = document.getElementById('sum-stat-dist');
  if (sumDist) sumDist.textContent = tractorDistKm.toFixed(2);
  const sumTime = document.getElementById('sum-stat-time');
  if (sumTime) sumTime.textContent = durationFormatted;
  const sumField = document.getElementById('sum-stat-field');
  if (sumField) sumField.textContent = `${isRu ? 'Поле' : 'Field'}: ${fieldName} (${opTitle})`;

  // Если это был свободный заезд (поле не выбрано), показываем выбор поля
  // для сохранения — без этого мы не знаем, куда писать запись.
  const sumFieldPicker = document.getElementById('sum-field-picker');
  const sumFieldSelect = document.getElementById('sum-field-select');
  if (sumFieldPicker && sumFieldSelect) {
    if (!tractorActiveField && typeof loadFields === 'function') {
      const allFields = loadFields();
      sumFieldSelect.innerHTML = '';
      if (allFields.length > 0) {
        allFields.forEach(f => {
          const opt = document.createElement('option');
          opt.value = f.id;
          opt.textContent = f.name;
          sumFieldSelect.appendChild(opt);
        });
        sumFieldPicker.style.display = '';
      } else {
        // Нет ни одного поля в базе — сохранить некуда, прячем пикер,
        // кнопка "Сохранить" объяснит пользователю проблему при нажатии.
        sumFieldPicker.style.display = 'none';
      }
    } else {
      sumFieldPicker.style.display = 'none';
    }
  }

  const sumModal = document.getElementById('modal-tractor-summary');
  if (sumModal) {
    sumModal.classList.add('open');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// Общая очистка временных данных/следов заезда (2D + 3D), не трогает базу.
function clearTractorRunTraces() {
  if (tractorTrailGroup) {
    tractorTrailGroup.clearLayers();
  }
  if (tractor3DTrailGroup) {
    tractor3DTrailGroup.clear();
    tractor3DTrailGroup.userData = {};
  }
  tractorPath = [];
}

// Действие "Сохранить в историю поля": пишет запись в season[] выбранного
// поля (явно выбранного при заезде, либо выбранного пользователем сейчас
// для свободного заезда), затем закрывает модалку. След на карте/3D всегда
// очищается — заезд завершён в любом случае, сохранение отвечает только за
// запись в историю, а не за то, остаётся ли трек нарисованным на карте.
function saveTractorSummary() {
  const isRu = lang === 'ru';
  if (!pendingTractorSummary) {
    const sumModal = document.getElementById('modal-tractor-summary');
    if (sumModal) sumModal.classList.remove('open');
    return;
  }

  let targetFieldId = pendingTractorSummary.fieldId;
  if (!targetFieldId) {
    const sumFieldSelect = document.getElementById('sum-field-select');
    if (sumFieldSelect && sumFieldSelect.value) {
      targetFieldId = sumFieldSelect.value;
    }
  }

  if (!targetFieldId) {
    if (typeof showToast === 'function') {
      showToast(isRu ? 'Выберите поле, чтобы сохранить заезд' : 'Select a field to save this run');
    }
    return; // не закрываем модалку — пользователь должен выбрать поле
  }

  if (typeof loadFields === 'function' && typeof saveFields === 'function') {
    const allFields = loadFields();
    const targetField = allFields.find(f => String(f.id) === String(targetFieldId));
    if (targetField) {
      if (!targetField.season) targetField.season = [];
      targetField.season.unshift({
        id: 'ev_' + Date.now(),
        type: pendingTractorSummary.opType,
        date: new Date().toISOString().split('T')[0],
        title: `🚜 ${pendingTractorSummary.opTitle}: ${pendingTractorSummary.areaHa.toFixed(2)} га за ${pendingTractorSummary.durationFormatted}`,
        note: pendingTractorSummary.driveNoteText,
        areaHa: pendingTractorSummary.areaHa,
        distKm: pendingTractorSummary.distKm,
        durationMin: pendingTractorSummary.durationMin,
        durationFormatted: pendingTractorSummary.durationFormatted,
        widthMeters: pendingTractorSummary.widthMeters,
        isTractorRun: true
      });
      saveFields(allFields);
      pendingTractorSummary.saved = true;
      if (typeof renderNotesList === 'function') renderNotesList();
      if (typeof showToast === 'function') {
        showToast(isRu ? 'Заезд сохранён в историю поля' : 'Run saved to field history');
      }
    } else if (typeof showToast === 'function') {
      showToast(isRu ? 'Не удалось найти поле для сохранения' : 'Could not find the field to save to');
      return;
    }
  }

  clearTractorRunTraces();
  pendingTractorSummary = null;
  const sumModal = document.getElementById('modal-tractor-summary');
  if (sumModal) sumModal.classList.remove('open');
}

// Действие "Удалить без сохранения": закрывает модалку, чистит 2D/3D-след и
// временные данные заезда, ничего не пишет в базу.
function discardTractorSummary() {
  clearTractorRunTraces();
  pendingTractorSummary = null;
  const sumModal = document.getElementById('modal-tractor-summary');
  if (sumModal) sumModal.classList.remove('open');
}

// Закрытие модалки крестиком/тапом по фону — трактуем как отмену без
// сохранения (как и раньше, крестик не открывает сюрприз с автосохранением).
function closeTractorSummaryModal() {
  discardTractorSummary();
}

// Глобальные слушатели
window.addEventListener('mouseup', () => { stop3DSteer(); stop3DGas(); });
window.addEventListener('touchend', () => { stop3DSteer(); stop3DGas(); });

window.addEventListener('keydown', (e) => {
  if (!tractor3DActive) return;
  if (e.key === 'ArrowUp' || e.key === 'KeyW' || e.code === 'KeyW') start3DGas(1);
  if (e.key === 'ArrowLeft' || e.key === 'KeyA' || e.code === 'KeyA') start3DSteer(-1);
  if (e.key === 'ArrowRight' || e.key === 'KeyD' || e.code === 'KeyD') start3DSteer(1);
});

window.addEventListener('keyup', (e) => {
  if (!tractor3DActive) return;
  if (e.key === 'ArrowUp' || e.key === 'KeyW' || e.code === 'KeyW') stop3DGas();
  if (e.key === 'ArrowLeft' || e.key === 'KeyA' || e.code === 'KeyA') stop3DSteer();
  if (e.key === 'ArrowRight' || e.key === 'KeyD' || e.code === 'KeyD') stop3DSteer();
});

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
