// ════════════════════════════════════════════════════
// HECTAR — FIELDS — список полей, карточка поля, история сезона, фото
// Файл сгенерирован автоматическим разбиением script.js
// См. PROJECT-MAP.md для описания структуры проекта
// ════════════════════════════════════════════════════

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
    const sowDate = field.sowingDate ? new Date(field.sowingDate).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' }) : '—';

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
// FIX: getVegetationStage() был удалён в v1.8 ("removed fake getVegetationStage"),
// но вызовы функции остались в renderFieldDetailHTML() и updateFieldSowingDate().
// Из-за этого при рендере карточки поля падала ошибка "getVegetationStage is not defined",
// весь innerHTML не обновлялся — отсюда "дата посева не сохраняется" (на самом деле
// сохранялась, просто карточка не перерисовывалась) и "стадия вегетации не работает".
// Ниже — простой расчёт стадии по числу дней с даты посева и культуре.
const CROP_GROWTH_STAGES = {
  // [дней_с_посева_до, ключ_стадии] — берём первую подходящую по возрастанию
  default: [
    [10, 'germination'],
    [30, 'seedling'],
    [60, 'vegetative'],
    [90, 'flowering'],
    [120, 'fruiting'],
    [Infinity, 'maturity']
  ],
  wheat:    [[10, 'germination'], [25, 'seedling'], [55, 'vegetative'], [75, 'flowering'], [110, 'fruiting'], [Infinity, 'maturity']],
  barley:   [[8, 'germination'],  [22, 'seedling'], [50, 'vegetative'], [70, 'flowering'], [100, 'fruiting'], [Infinity, 'maturity']],
  corn:     [[10, 'germination'], [30, 'seedling'], [65, 'vegetative'], [85, 'flowering'], [130, 'fruiting'], [Infinity, 'maturity']],
  sunflower:[[10, 'germination'], [28, 'seedling'], [60, 'vegetative'], [85, 'flowering'], [115, 'fruiting'], [Infinity, 'maturity']],
  soybean:  [[8, 'germination'],  [25, 'seedling'], [55, 'vegetative'], [80, 'flowering'], [115, 'fruiting'], [Infinity, 'maturity']],
  potato:   [[15, 'germination'], [35, 'seedling'], [60, 'vegetative'], [80, 'flowering'], [110, 'fruiting'], [Infinity, 'maturity']],
  rapeseed: [[10, 'germination'], [30, 'seedling'], [60, 'vegetative'], [90, 'flowering'], [120, 'fruiting'], [Infinity, 'maturity']]
};

const VEGETATION_STAGE_LABELS = {
  germination: { ru: '🌱 Прорастание', en: '🌱 Germination' },
  seedling:    { ru: '🌿 Всходы',      en: '🌿 Seedling' },
  vegetative:  { ru: '🌾 Вегетация',   en: '🌾 Vegetative' },
  flowering:   { ru: '🌸 Цветение',    en: '🌸 Flowering' },
  fruiting:    { ru: '🌽 Налив/плодоношение', en: '🌽 Fruiting' },
  maturity:    { ru: '🌾 Созревание',  en: '🌾 Maturity' },
  none:        { ru: '— нет данных',  en: '— no data' },
  harvested:   { ru: '✅ Убрано',      en: '✅ Harvested' }
};

function getVegetationStage(field) {
  const isRu = lang === 'ru';
  if (!field || !field.sowingDate) {
    return VEGETATION_STAGE_LABELS.none[isRu ? 'ru' : 'en'];
  }

  // Если после посева было событие уборки — считаем убранным
  const harvestEvents = (field.season || []).filter(ev => ev.type === 'harvest' && ev.date >= field.sowingDate);
  if (harvestEvents.length > 0) {
    return VEGETATION_STAGE_LABELS.harvested[isRu ? 'ru' : 'en'];
  }

  const sowDate = new Date(field.sowingDate + 'T00:00:00');
  if (isNaN(sowDate.getTime())) {
    return VEGETATION_STAGE_LABELS.none[isRu ? 'ru' : 'en'];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSince = Math.floor((today - sowDate) / (1000 * 60 * 60 * 24));

  if (daysSince < 0) {
    // Дата посева в будущем
    return VEGETATION_STAGE_LABELS.none[isRu ? 'ru' : 'en'];
  }

  const cropId = resolveCropId(field.crop);
  const table = CROP_GROWTH_STAGES[cropId] || CROP_GROWTH_STAGES.default;
  const stageEntry = table.find(([maxDays]) => daysSince <= maxDays);
  const stageKey = stageEntry ? stageEntry[1] : 'maturity';

  return VEGETATION_STAGE_LABELS[stageKey][isRu ? 'ru' : 'en'];
}

function renderFieldDetailHTML(field) {
  const fieldCropId = resolveCropId(field.crop);
  const eventTypeLabel = { sowing: t('sowing'), harvest: t('harvest'), watering: t('watering'), spraying: t('spraying'), cultivation: t('cultivation'), disking: t('disking'),
    // FIX v3.0 п.7 (карточка поля не показывает заезды трактора): раньше
    // здесь были только "обычные" типы работ (sowing/harvest/watering/
    // spraying/cultivation/disking). Заезд на 3D-тракторе сохраняется через
    // saveTractorSummary() в tractor-3d.js с type, равным выбранной в кабине
    // операции — а там список операций шире: fertilizing/tillage/other тоже
    // возможны (см. opTitle{} в tractor-3d.js). Для фермера это означало, что
    // такое событие в карточке поля подписывалось "как есть" (сырым английским
    // словом вроде "fertilizing"), потому что eventTypeLabel[ev.type] не
    // находил перевод. Добавляем недостающие переводы, чтобы подпись всегда
    // была на выбранном языке независимо от того, из какой операции создано
    // событие.
    fertilizing: lang === 'ru' ? 'Внесение удобрений' : 'Fertilizing',
    tillage: lang === 'ru' ? 'Вспашка' : 'Tillage',
    other: lang === 'ru' ? 'Обработка' : 'Operation'
  };

  const ndvi = estimateFieldNdvi(field);
  const health = getHealthStatus(ndvi);
  const ndviColor = getNdviColor(ndvi);
  const sowDate = field.sowingDate || '—';
  // FIX v1.8: removed auto-computed nextTreatDate (was +14 days fake calc)

  // FIX v1.8 R2: season events with edit/delete buttons
  // FIX v3.0 п.7 (заезд трактора выглядел как безликая заметка): раньше
  // карточка события рендерила только тип/дату/заметку для ЛЮБОГО события
  // сезона — площадь, дистанция, ширина захвата и сама пометка "это заезд
  // трактора" (isTractorRun/areaHa/distKm/widthMeters), которые
  // saveTractorSummary() в tractor-3d.js кладёт в запись, никак не
  // отображались. Фермер открывал историю поля и видел заезд на тракторе
  // такой же строчкой, как обычная текстовая заметка — без цифр, которые он
  // явно проехал и ради которых нажимал "Сохранить в историю поля". Плюс
  // css-класс `event-dot ${ev.type}` для новых типов (fertilizing/tillage/
  // other) не имеет стиля в style.css, поэтому точка-маркер события была бы
  // пустой/невидимой. Добавлена отдельная ветка рендера: для isTractorRun
  // используется эмодзи 🚜 вместо цветной точки и отдельная строка со
  // статистикой "2.40 га · 3.10 км · захват 6м" под текстом заметки — в той
  // же палитре HUD 3D-режима (#00e676 акцент), которая уже используется в
  // остальном интерфейсе заезда (см. spawnTractorMarkerAt() в tractor-3d.js).
  const seasonHTML = (field.season || []).map((ev, idx) => {
    const isTractorRun = ev.isTractorRun === true;
    const dotOrIcon = isTractorRun
      ? `<div class="event-dot" style="display:flex;align-items:center;justify-content:center;background:#162231;border:1px solid #00e676;font-size:11px;line-height:1;">🚜</div>`
      : `<div class="event-dot ${ev.type}"></div>`;
    const statsLine = isTractorRun
      ? `<div class="event-note" style="color:#00e676;">${
          [
            (typeof ev.areaHa === 'number') ? `${ev.areaHa.toFixed(2)} ${lang==='ru'?'га':'ha'}` : null,
            (typeof ev.distKm === 'number') ? `${ev.distKm.toFixed(2)} ${lang==='ru'?'км':'km'}` : null,
            ev.widthMeters ? `${lang==='ru'?'захват':'width'} ${ev.widthMeters}${lang==='ru'?'м':'m'}` : null
          ].filter(Boolean).join(' · ')
        }</div>`
      : '';
    return `
    <div class="event-item" data-event-index="${idx}">
      ${dotOrIcon}
      <div class="event-info">
        <div class="event-type">${isTractorRun ? (lang==='ru'?'🚜 Заезд трактора':'🚜 Tractor run') + ' — ' + (eventTypeLabel[ev.type] || ev.type) : (eventTypeLabel[ev.type] || ev.type)}</div>
        <div class="event-date">${ev.date}</div>
        ${ev.note ? `<div class="event-note">${escapeHtml(ev.note)}</div>` : ''}
        ${statsLine}
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
  `;
  }).join('');

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

  // FIX v3.0 п.7 (редактирование стирало данные заезда трактора): раньше
  // "Сохранить" в модалке события ВСЕГДА пересоздавало объект события заново
  // только с полями type/date/note (плюс crop для посева) — если фермер
  // открывал на редактирование заезд трактора (у него тоже есть кнопка-
  // карандаш в общем списке событий) и просто менял дату или текст заметки,
  // из записи бесследно пропадали areaHa/distKm/durationMin/durationFormatted/
  // widthMeters/title и сам флаг isTractorRun — заезд, который фермер реально
  // проехал и сохранил из 3D-режима, превращался в обычную пустую заметку без
  // возможности восстановить площадь/дистанцию. Исправлено: если
  // редактируемая запись была заездом трактора (проверяем по исходному
  // объекту f.season[editingEventIndex], а не по event, который мы только
  // что создали заново), переносим эти поля в обновлённый объект.
  if (editingEventIndex !== null && editingEventIndex >= 0 && editingEventIndex < f.season.length && f.season[editingEventIndex].isTractorRun) {
    const prevRun = f.season[editingEventIndex];
    event.isTractorRun = true;
    event.areaHa = prevRun.areaHa;
    event.distKm = prevRun.distKm;
    event.durationMin = prevRun.durationMin;
    event.durationFormatted = prevRun.durationFormatted;
    event.widthMeters = prevRun.widthMeters;
    event.title = prevRun.title;
  }

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
