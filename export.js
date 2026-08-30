// ════════════════════════════════════════════════════
// HECTAR — EXPORT — экспорт/импорт Excel, PDF, GeoJSON
// Файл сгенерирован автоматическим разбиением script.js
// См. PROJECT-MAP.md для описания структуры проекта
// ════════════════════════════════════════════════════

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
