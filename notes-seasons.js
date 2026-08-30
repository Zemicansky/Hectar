// ════════════════════════════════════════════════════
// HECTAR — NOTES & SEASONS — заметки и управление сезонами
// Файл сгенерирован автоматическим разбиением script.js
// См. PROJECT-MAP.md для описания структуры проекта
// ════════════════════════════════════════════════════

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
