// ════════════════════════════════════════════════════
// HECTAR — TRACTOR 3D — 3D-визуализация трактора, GPS-трекинг, физика
// Файл сгенерирован автоматическим разбиением script.js
// См. PROJECT-MAP.md для описания структуры проекта
// ════════════════════════════════════════════════════

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
const vehicleState = { x: 0, z: 0, heading: 0, speed: 0, steerRate: 0 };
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
// где он уже проехал. Земляной коричневый даёт чёткий контраст на зелёном
// поле и на фоне зелёной разметки/границ при любом освещении сцены, и
// визуально читается как "вспаханная/обработанная почва".
const SOIL_TRAIL_COLOR_HEX = 0x6d4c26; // 3D шлейф/канвас-заливка (Three.js)
const SOIL_TRAIL_FILL_CSS = '#6d4c26';
const SOIL_TRAIL_STROKE_CSS = '#4e3620';
let coverage3DTexture = null, coverage3DCanvas = null, coverage3DCtx = null;
let radarCanvas = null, radarCtx = null;

let tractorWatchId = null;
let tractorActive = false;
let tractorStartTime = null;
let tractorPath = [];
let tractorWidth = 12; // метры
let tractorAreaHa = 0;
// FIX (фермерский аудит — учёт перекрытий): раньше tractorAreaHa просто
// накапливалась как distance × width на каждом шаге (см. vehicleApplyGpsFix
// и vehiclePhysicsTick), без проверки, не обрабатывался ли этот участок уже
// раньше в этом же заезде. Разворот в конце гона, объезд препятствия,
// повторный заход — и отчёт показывал площадь БОЛЬШЕ реального поля,
// а эта цифра уходит в историю поля, расход СЗР/удобрений, отчётность.
// Теперь реальная площадь считается через объединение (turf.union) всех
// пройденных полос покрытия — повторный проход по тому же месту площадь
// больше не увеличивает. tractorCoverageUnion хранит текущий накопленный
// полигон покрытия; пересчитывается асинхронно (см. recomputeCoverageArea).
let tractorCoverageUnion = null;
let _coverageRecomputePending = false;
let tractorDistKm = 0;
let tractorCurrentSpeed = 0;
let tractorMarker = null;
let tractorTrailGroup = null;
let tractorGuidelineGroup = null;
let tractorActiveField = null;
let tractorOpType = 'sowing';
let tractorSimInterval = null;

// FIX v3.0 п.Б3: нумерация гонов от точки старта, а не от центра поля (x=0).
// Устанавливается при первом движении вперёд; сбрасывается при stopTractorTracking.
let tractor3DBaseTrackX = null;
// FIX (баг): опорная Z-координата точки старта гона — раньше сохранялась
// только X, из-за чего HUD guidance (updateGuidanceLightbar) не мог
// корректно перейти в повёрнутую систему координат гонов при развёрнутом
// поле (см. tractorTrackHeadingDeg ниже). Устанавливается синхронно с
// tractor3DBaseTrackX в тех же местах.
let tractor3DBaseTrackZ = null;
// Курс гонов (градусы) — курс первой стороны контура выбранного поля,
// тот же угол, на который повёрнута группа направляющих линий trackGroup
// в update3DFieldBounds(). Раньше существовал только как локальная
// переменная trackHeadingDeg внутри update3DFieldBounds() и нигде не
// сохранялся — из-за этого updateGuidanceLightbar() считал отклонение от
// гона по абсолютной мировой оси X, а не по перпендикуляру к реально
// нарисованным (повёрнутым) направляющим линиям. На развёрнутом поле HUD
// "В ПОЛОСЕ / РУЛИ ВЛЕВО/ВПРАВО" мог полностью расходиться с тем, что
// водитель видел на экране.
let tractorTrackHeadingDeg = 0;

// FIX v3.0 п.Б4: непрерывное плавное управление D-pad.
// _3dGasActive: +1 вперёд / -1 назад / 0 стоп.
// _3dSteerActive: +1 вправо / -1 влево / 0 прямо.
// _lastFrameTime: метка времени последнего кадра для расчёта dt (с).
let _3dGasActive = 0, _3dSteerActive = 0, _lastFrameTime = 0;

// FIX v3.0 п.Б1: пороги качества рисования следа.
// MIN_PAINT_STEP — минимальное смещение (м) перед добавлением новой точки ribbon,
//   чтобы не спамить сотнями микросегментов на стоянке.
// MAX_PAINT_JUMP — максимальная длина одного ribbon-сегмента (м); если трактор
//   «прыгнул» дальше (GPS-скачок / телепорт), разбиваем прыжок на промежуточные
//   шаги интерполяцией — иначе получается одна гигантская лента через всё поле.
const MIN_PAINT_STEP = 0.4;  // метры
const MAX_PAINT_JUMP = 4.0;  // метры
// Данные завершённого заезда, ожидающие решения пользователя в модалке итогов:
// "Сохранить в историю поля" (saveTractorSummary) или "Удалить без сохранения"
// (discardTractorSummary). null, когда модалка итогов закрыта/неактивна.
let pendingTractorSummary = null;
// Задача 1.2: чтобы не спамить пользователя предупреждением "GPS далеко от
// поля" на каждое обновление геолокации, показываем его один раз за заезд.
let tractorGpsFarWarningShown = false;

// FIX (п.5/2 — телепорт из центра, мерцание камеры): время последнего GPS
// фикса, чтобы оценивать правдоподобную скорость сегмента и отличать
// реальный переезд от шумового скачка (см. updateTractorLocation).
let tractorLastFixAt = null;
// Флаг: следующий кадр animate() должен мгновенно "телепортировать" камеру
// на новую позицию вместо плавного lerp — иначе честный телепорт трактора
// (например, после длительной паузы) заставляет камеру лететь через всю
// сцену за несколько кадров, что выглядит как мерцание/дёрганье (п.2).
let tractorTeleportPending = false;

function openTractorSetupModal() {
  const sel = document.getElementById('tractor-field-select');
  const allFields = (typeof loadFields === 'function') ? loadFields() : [];
  
  if (sel) {
    sel.innerHTML = '';
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.disabled = true;
    defOpt.selected = true;
    defOpt.textContent = lang === 'ru' ? '— Выберите поле (для направляющих полос) —' : '— Select field (for guideline tracks) —';
    sel.appendChild(defOpt);
    
    allFields.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      const cropName = f.crop ? (lang === 'ru' ? (CROPS.find(c=>c.id===f.crop)?.ru || f.crop) : f.crop) : '';
      opt.textContent = `${f.name} (${formatArea(f.area)}${cropName ? ', ' + cropName : ''})`;
      sel.appendChild(opt);
    });

    // REMOVED (фермерский аудит): опция "Свободный заезд (без контура поля)"
    // убрана. Заезд без выбранного поля не строил границы/направляющие линии
    // на 3D-сцене (см. update3DFieldBounds()) и заставлял выбирать поле уже
    // ПОСЛЕ заезда в модалке итогов — на практике фермер либо работает на
    // конкретном участке, либо это тест техники, который не должен попадать
    // в агрономическую историю поля.

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
    // FIX v3.0 п.1+п.2: ширина захвата жёстко ограничена диапазоном 1-100 м
    // (это по-прежнему ограничитель ВВОДА, а не характеристика какого-то
    // конкретного оборудования — верхняя граница разумного диапазона для
    // с/х техники). parseFloat + округление до 0.1м страхует от "точности
    // оборудования" — рваных значений вроде 11.999999999998, которые могли
    // накапливаться из-за плавающей запятой при повторных пересчётах ниже
    // по коду (addedAreaHa, buffer и т.д.).
    const raw = parseFloat(widthInput.value);
    const clamped = Math.min(100, Math.max(1, isNaN(raw) ? 12 : raw));
    tractorWidth = Math.round(clamped * 10) / 10;
    widthInput.value = tractorWidth; // отражаем фактически применённое значение обратно в поле
  }

  const allFields = (typeof loadFields === 'function') ? loadFields() : [];
  const fieldSel = document.getElementById('tractor-field-select');
  const fieldId = fieldSel ? fieldSel.value : '';
  tractorActiveField = allFields.find(f => String(f.id) === String(fieldId)) || null;

  // REMOVED (фермерский аудит): "свободный заезд" убран — поле теперь
  // обязательно. Без него update3DFieldBounds() не строит ни границы поля,
  // ни направляющие линии курса, ориентированные по реальной стороне
  // участка — водитель ехал буквально вслепую, без разметки.
  if (!tractorActiveField) {
    if (typeof showToast === 'function') {
      showToast(lang === 'ru'
        ? '<i data-lucide="alert-triangle" class="icon-sm"></i> Выберите поле — без него нет границ и направляющих линий'
        : '<i data-lucide="alert-triangle" class="icon-sm"></i> Select a field — no boundaries/guide lines without it');
    }
    return;
  }

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

  // FIX: tractorSimInterval — булев флаг (true/false/null), а не ID
  // таймера — clearInterval() на нём был мёртвым кодом (no-op). Оставлено
  // только реальное действие — сброс флага.
  tractorSimInterval = null;

  tractorActive = true;
  tractorStartTime = new Date();
  tractorPath = [];
  tractorAreaHa = 0;
  tractorCoverageUnion = null; // сброс union-полигона покрытия для нового заезда
  tractorDistKm = 0;
  tractorCurrentSpeed = 0;
  tractor3DPos = { x: 0, z: 0 };
  tractor3DHeading = 0;
  tractor3DRenderPos = { x: 0, z: 0 };
  tractor3DRenderHeading = 0;
  lastSoilPaintPos = null;
  tractorGpsFarWarningShown = false;
  tractorLastFixAt = null;
  tractorTeleportPending = false;
  _gpsRawHistory = []; // сброс сглаживания GPS от предыдущего заезда
  updateGpsAccuracyHud(null); // сброс индикатора точности GPS от предыдущего заезда
  // Сброс инерции ручного управления от предыдущего заезда — иначе новый
  // заезд мог бы "унаследовать" остаточную скорость/руление, если человек
  // завершил предыдущий не отпустив кнопку D-pad.
  _3dGasActive = 0; _3dSteerActive = 0;
  _manualCurSpeed = 0; _manualCurSteerRate = 0; _manualLastSyncAt = 0;

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
// Обновляет индикатор точности GPS на HUD во время заезда. Пороги:
// <=3м — отличный сигнал (открытое поле, хорошая антенна), <=8м — рабочий
// сигнал (обычный смартфон в кабине), >8м — предупреждаем: с такой
// погрешностью направляющие линии/статистика заезда ненадёжны, особенно
// на узких орудиях (несколько метров захвата).
function updateGpsAccuracyHud(accuracyMeters) {
  const el = document.getElementById('tractor-3d-stat-accuracy');
  if (!el) return;
  if (typeof accuracyMeters !== 'number' || !isFinite(accuracyMeters)) {
    el.textContent = '—';
    el.style.color = '#fff';
    return;
  }
  const rounded = Math.round(accuracyMeters);
  el.textContent = `±${rounded}м`;
  if (accuracyMeters <= 3) {
    el.style.color = '#00e676'; // отличный сигнал
  } else if (accuracyMeters <= 8) {
    el.style.color = '#ffd600'; // рабочий, но не идеальный
  } else {
    el.style.color = '#ff5252'; // ненадёжно — предупреждаем цветом
  }
}
function onTractorPosition(pos) {
  if (!tractorActive || !pos || !pos.coords) return;
  // FIX (пауза демо блокирует реальный GPS/руки): tractorSimInterval — это
  // булев флаг (true = демо едет, false = демо на паузе, null = демо не
  // запускалось), а не ID таймера, несмотря на название. Старая проверка
  // "!== null" считала демо активным и при true, и при false — то есть
  // после постановки демо на паузу реальный GPS всё ещё игнорировался, и
  // трактор "зависал": ни демо не едет, ни GPS/руки не берут управление.
  // Игнорировать GPS нужно только пока демо реально едет (=== true).
  if (tractorSimInterval === true) return; // Ignore GPS only while demo is actually running
  
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const speedMs = pos.coords.speed || 0;
  
  tractorCurrentSpeed = Math.max(0, speedMs * 3.6);
  const speedEl = document.getElementById('tractor-3d-stat-speed');
  if (speedEl) speedEl.textContent = tractorCurrentSpeed.toFixed(1);

  // ДОБАВЛЕНО (фермерский аудит): показываем точность сигнала в реальном
  // времени, а не только по кнопке "найти меня".
  updateGpsAccuracyHud(pos.coords.accuracy);

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
// FIX (рывки при движении на реальном GPS): сырые координаты от
// navigator.geolocation регулярно "дрожат" на несколько метров между
// соседними фиксами даже когда трактор стоит или едет по прямой — это
// нормальный шум датчика, не реальное перемещение. Раньше каждая сырая
// точка сразу шла в vehicleApplyGpsFix(), из-за чего трактор на экране
// подёргивался туда-обратно. Усредняем последние GPS_SMOOTH_WINDOW точек
// перед использованием — гасит дрожание, не съедая реальное движение
// (окно короткое, задержка на глаз незаметна).
const GPS_SMOOTH_WINDOW = 3;
let _gpsRawHistory = [];

// Пересчитывает реально покрытую площадь (с учётом перекрытий) из
// накопленного union-полигона покрытия и обновляет tractorAreaHa/UI.
// Вызывается асинхронно (не в каждом кадре/GPS-фиксе) — turf.union на
// большом количестве сегментов не бесплатен, а точность до пары сотых
// га фермеру для оперативного HUD не критична.
function recomputeCoverageArea(newSegmentPolygon) {
  if (!newSegmentPolygon) return;
  try {
    tractorCoverageUnion = tractorCoverageUnion
      ? turf.union(turf.featureCollection([tractorCoverageUnion, newSegmentPolygon]))
      : newSegmentPolygon;
    const areaM2 = turf.area(tractorCoverageUnion);
    tractorAreaHa = areaM2 / 10000;
    const aEl = document.getElementById('tractor-3d-stat-area');
    if (aEl) aEl.textContent = tractorAreaHa.toFixed(2);
    const areaElS = document.getElementById('tractor-3d-stat-area');
    if (areaElS) areaElS.textContent = tractorAreaHa.toFixed(2);
  } catch (_) {
    // union может изредка падать на вырожденной геометрии (самопересечение
    // после буфера почти нулевой длины сегмента) — просто пропускаем этот
    // сегмент, накопленная площадь остаётся прежней, а не ломается совсем.
  }
}
function vehicleApplyGpsFix(lat, lng, tsMs) {
  if (!tractorActive || !tractorMarker) return;

  _gpsRawHistory.push([lat, lng]);
  if (_gpsRawHistory.length > GPS_SMOOTH_WINDOW) _gpsRawHistory.shift();
  const smoothedLat = _gpsRawHistory.reduce((s, p) => s + p[0], 0) / _gpsRawHistory.length;
  const smoothedLng = _gpsRawHistory.reduce((s, p) => s + p[1], 0) / _gpsRawHistory.length;
  lat = smoothedLat;
  lng = smoothedLng;

  if (!fieldCenter3D) {
    fieldCenter3D = { lat: lat, lng: lng };
    vehicleState.x = 0;
    vehicleState.z = 0;
    vehicleState.heading = 0;
    tractor3DRenderPos.x = 0;
    tractor3DRenderPos.z = 0;
    tractor3DRenderHeading = 0;
    tractorMarker.setLatLng([lat, lng]);
    tractorPath.push([lat, lng]);
    return;
  }

  const newX = (lng - fieldCenter3D.lng) * (111320 * Math.cos(fieldCenter3D.lat * Math.PI / 180));
  const newZ = -(lat - fieldCenter3D.lat) * 111320;

  if (tractorPath.length === 0) {
    tractorMarker.setLatLng([lat, lng]);
    tractorPath.push([lat, lng]);
    vehicleState.x = newX;
    vehicleState.z = newZ;
    tractor3DRenderPos.x = vehicleState.x;
    tractor3DRenderPos.z = vehicleState.z;
    if (tractor3DBaseTrackX === null) { tractor3DBaseTrackX = vehicleState.x; tractor3DBaseTrackZ = vehicleState.z; }
    return;
  }

  const prevPoint = tractorPath[tractorPath.length - 1];
  const segKm = Math.hypot(newX - vehicleState.x, newZ - vehicleState.z) / 1000;
  const segMetersRaw = segKm * 1000;

  const dtFixSec = tractorLastFixAt ? Math.max(0.2, (tsMs - tractorLastFixAt) / 1000) : 1;
  tractorLastFixAt = tsMs;
  const impliedSpeedMs = segMetersRaw / dtFixSec;
  const MAX_PLAUSIBLE_SPEED_MS = 30;

  if (impliedSpeedMs > MAX_PLAUSIBLE_SPEED_MS) return;

  if (segKm > 0.3) {
    tractorMarker.setLatLng([lat, lng]);
    tractorPath.push([lat, lng]);
    tractorTeleportPending = true;
    
    const distFromCenter = Math.hypot(newX, newZ);
    if (distFromCenter > 2000) {
       if (!tractorActiveField) {
         fieldCenter3D = { lat: lat, lng: lng };
         vehicleState.x = 0; vehicleState.z = 0; tractor3DRenderPos.x = 0; tractor3DRenderPos.z = 0;
       } else if (!tractorGpsFarWarningShown) {
         tractorGpsFarWarningShown = true;
         if (typeof showToast === 'function') showToast('GPS is far from the field');
       }
       return;
    }
    vehicleState.x = newX;
    vehicleState.z = newZ;
    tractor3DRenderPos.x = vehicleState.x;
    tractor3DRenderPos.z = vehicleState.z;
    return;
  }

  if (segKm >= 0.0005) {
    const dLng = lng - prevPoint[1];
    const dLat = lat - prevPoint[0];
    let heading = Math.atan2(dLng, dLat) * (180 / Math.PI);
    if (heading < 0) heading += 360;

    tractorMarker.setLatLng([lat, lng]);
    const markerEl = tractorMarker.getElement();
    if (markerEl) markerEl.style.transform = `${markerEl.style.transform.replace(/rotate\([^)]+\)/g, '')} rotate(${heading.toFixed(0)}deg)`;

    tractorDistKm += segKm;
    const dEl = document.getElementById('tractor-3d-stat-dist');
    if (dEl) dEl.textContent = tractorDistKm.toFixed(2);

    // FIX (учёт перекрытий, реальный GPS): вместо суммирования
    // segMetersRaw*width (задваивало площадь при повторном проходе) строим
    // полигон-полосу этого сегмента и объединяем с уже накопленным
    // покрытием — реальная площадь считается из объединённой геометрии.
    try {
      const segLine = turf.lineString([[prevPoint[1], prevPoint[0]], [lng, lat]]);
      const segPoly = turf.buffer(segLine, (tractorWidth / 2) / 1000, { units: 'kilometers' });
      recomputeCoverageArea(segPoly);
    } catch (_) {}

    vehicleState.x = newX;
    vehicleState.z = newZ;
    vehicleState.heading = heading;
    
    tractorPath.push([lat, lng]);
  }
}
function updateTractorLocation(newPoint) {
  vehicleApplyGpsFix(newPoint[0], newPoint[1], Date.now());
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
  // FIX v3.0 п.Б1: фон = горизонтальный цвет купола неба.
  scene3D.background = new THREE.Color(0x87ceeb);
  // FIX v3.0 п.Б1: туман 0.003→0.0012 — горизонт виден ~600м вместо ~200м.
  scene3D.fog = new THREE.FogExp2(0x87ceeb, 0.0012);

  // FIX v3.0 п.Б1: FOV 65→60, far 1000→2000.
  camera3D = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);

  // FIX v3.0 п.Б1: купол неба — полусфера R=900м, BackSide. Даёт объёмное
  // небо с градиентом горизонт→зенит, видимое с любого угла камеры.
  (function createSkyDome() {
    const skyGeo = new THREE.SphereGeometry(900, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const positions = skyGeo.attributes.position;
    const colors = [];
    const zenith  = new THREE.Color(0x3a87c8);
    const horizon = new THREE.Color(0xc8e8f5);
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = Math.max(0, Math.min(1, y / 900));
      const c = horizon.clone().lerp(zenith, Math.pow(t, 0.6));
      colors.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const skyMat = new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.BackSide, depthWrite: false
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.renderOrder = -1;
    scene3D.add(sky);
  })();

  const hemiLight = new THREE.HemisphereLight(0xd0eaff, 0x3d5c32, 1.1);
  scene3D.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene3D.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.3);
  dirLight.position.set(80, 180, 80);
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

  // FIX v3.0 п.Б1: 500000x500000 закрывает горизонт; y=0 убирает щель
  // между плоскостями, из-за которой было видно 'прорыв' на горизонте.
  const globalGroundGeo = new THREE.PlaneGeometry(500000, 500000);
  const globalGroundMat = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
  const globalGround = new THREE.Mesh(globalGroundGeo, globalGroundMat);
  globalGround.rotation.x = -Math.PI / 2;
  globalGround.position.y = -0.05;
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

  // FIX v3.0 п.2 (дизайн): декоративная акцентная полоса и боковые жалюзи
  // на капоте — раньше капот был гладким однотонным блоком без деталей,
  // из-за чего трактор выглядел "заготовкой", а не готовой техникой.
  const accentStripeMat = new THREE.MeshStandardMaterial({ color: 0xfdd835, roughness: 0.3, metalness: 0.4 });
  const stripeGeo = new THREE.BoxGeometry(1.42, 0.09, 2.32);
  const stripe = new THREE.Mesh(stripeGeo, accentStripeMat);
  stripe.position.set(0, 1.0, 1.45);
  tractor3DModel.add(stripe);

  const louverMat = new THREE.MeshStandardMaterial({ color: 0x1b1f22, roughness: 0.6, metalness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const louverGeo = new THREE.BoxGeometry(0.02, 0.5, 0.55);
    const louverL = new THREE.Mesh(louverGeo, louverMat);
    louverL.position.set(-0.71, 1.4, 1.0 + i * 0.32);
    const louverR = new THREE.Mesh(louverGeo, louverMat);
    louverR.position.set(0.71, 1.4, 1.0 + i * 0.32);
    tractor3DModel.add(louverL, louverR);
  }

  // Эмблема-логотип на решётке — небольшой узнаваемый акцент спереди.
  const badgeGeo = new THREE.CircleGeometry(0.11, 20);
  const badgeMat = new THREE.MeshStandardMaterial({ color: 0xfdd835, roughness: 0.25, metalness: 0.6, side: THREE.DoubleSide });
  const badge = new THREE.Mesh(badgeGeo, badgeMat);
  badge.position.set(0, 1.15, 3.1);
  tractor3DModel.add(badge);

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

  // FIX v3.0 п.2 (дизайн): лестница-подножка сбоку от кабины — важная и
  // узнаваемая деталь силуэта реального трактора, раньше отсутствовала
  // полностью (кабина будто "висела в воздухе" без способа в неё попасть).
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.4, metalness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const stepGeo = new THREE.BoxGeometry(0.35, 0.03, 0.16);
    const step = new THREE.Mesh(stepGeo, stepMat);
    step.position.set(-0.85, 0.55 + i * 0.4, 0.7 - i * 0.1);
    tractor3DModel.add(step);
  }
  const handRailGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.3, 6);
  const handRail = new THREE.Mesh(handRailGeo, stepMat);
  handRail.rotation.z = Math.PI / 2.6;
  handRail.position.set(-0.92, 1.35, 0.55);
  tractor3DModel.add(handRail);

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

  // FIX v3.0 п.3 (масштаб 1:1): раньше здесь стоял Math.max(6, ...) —
  // физическая ширина 3D-модели оборудования никогда не могла быть меньше
  // 6м, даже если пользователь ввёл, например, 2м или 3м реальной ширины.
  // Из-за этого модель орудия не совпадала по масштабу с тем, что реально
  // будет закрашено на карте (закраска/площадь считаются по настоящему
  // tractorWidth, см. updateTractorLocation) — на глаз казалось, что орудие
  // шире, чем указано. Модель теперь строится ровно по tractorWidth
  // (1-100м, как и ограничено в UI), без искусственного минимума.
  const implementWidth = tractorWidth || 12;
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

    // FIX v3.0 п.2 (дизайн): диагональные тяги-подкосы от рамы к сцепке —
    // раньше рама держалась "в воздухе" без видимой конструкции крепления,
    // теперь силуэт читается как реальное навесное орудие.
    const braceMat = frameMat;
    const braceGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6);
    const braceL = new THREE.Mesh(braceGeo, braceMat);
    braceL.rotation.x = Math.PI / 3.4;
    braceL.position.set(-halfW * 0.35, 0.9, -1.6);
    const braceR = new THREE.Mesh(braceGeo, braceMat);
    braceR.rotation.x = Math.PI / 3.4;
    braceR.position.set(halfW * 0.35, 0.9, -1.6);
    group.add(braceL, braceR);

    // Бункеры для семян/удобрений — несколько куполов вдоль рамы, с
    // крышками-люками сверху (характерная деталь настоящих сеялок).
    const hopperMat = new THREE.MeshStandardMaterial({ color: opType === 'fertilizing' ? 0x455a64 : 0xffb300, roughness: 0.5, metalness: 0.15 });
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6, metalness: 0.3 });
    const numHoppers = Math.max(2, Math.min(5, Math.round(width / 4)));
    for (let i = 0; i < numHoppers; i++) {
      const hopperGeo = new THREE.CylinderGeometry(0.35, 0.22, 0.55, 8);
      const hopper = new THREE.Mesh(hopperGeo, hopperMat);
      const x = -halfW + (i + 0.5) * (width / numHoppers);
      hopper.position.set(x, 1.15, -2.2);
      group.add(hopper);

      const lidGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 12);
      const lid = new THREE.Mesh(lidGeo, lidMat);
      lid.position.set(x, 1.45, -2.2);
      group.add(lid);
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

    // Опорные колёса рамы по краям — держат раму на нужной высоте и делают
    // силуэт узнаваемым при взгляде сзади/сбоку, особенно на широких сеялках.
    const supportWheelMat = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.9 });
    [-halfW + 0.3, halfW - 0.3].forEach(x => {
      const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16);
      wGeo.rotateZ(Math.PI / 2);
      const wheel = new THREE.Mesh(wGeo, supportWheelMat);
      wheel.position.set(x, 0.3, -2.35);
      group.add(wheel);
    });
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

    // FIX v3.0 п.2 (дизайн): диагональные тросы-растяжки от вершины
    // Y-образной мачты к концам штанги — на реальных опрыскивателях именно
    // они держат широкую штангу от провисания, раньше штанга "висела в
    // воздухе" сама по себе без видимой опорной конструкции.
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5, metalness: 0.6 });
    const mastGeo = new THREE.CylinderGeometry(0.05, 0.07, 1.0, 8);
    const mast = new THREE.Mesh(mastGeo, cableMat);
    mast.position.set(0, 1.75, -2.15);
    group.add(mast);
    [-halfW, halfW].forEach(x => {
      const dist = Math.hypot(x, 0.65);
      const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, dist, 6);
      const cable = new THREE.Mesh(cableGeo, cableMat);
      cable.position.set(x / 2, 1.42, -2.2);
      cable.rotation.z = Math.atan2(0.65, Math.abs(x)) * (x > 0 ? -1 : 1);
      group.add(cable);
    });

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

    // Бак с рабочим раствором за кабиной, на раме-подставке.
    const tankMat = new THREE.MeshPhysicalMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.1 });
    const tankGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 16);
    tankGeo.rotateZ(Math.PI / 2);
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(0, 1.3, -1.5);
    tank.castShadow = true;
    group.add(tank);

    const tankCapMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.5, metalness: 0.3 });
    const tankCapGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.15, 12);
    const tankCap = new THREE.Mesh(tankCapGeo, tankCapMat);
    tankCap.position.set(0, 1.88, -1.5);
    group.add(tankCap);
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

    // FIX v3.0 п.2 (дизайн): режущий нож-полоса вдоль передней кромки
    // жатки — блестящая тонкая планка с "зубцами", раньше корпус жатки
    // выглядел просто как гладкий короб без рабочего края.
    const knifeMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.25, metalness: 0.8 });
    const knifeGeo = new THREE.BoxGeometry(width * 0.98, 0.08, 0.1);
    const knife = new THREE.Mesh(knifeGeo, knifeMat);
    knife.position.set(0, 0.32, -2.7);
    group.add(knife);

    // Боковые делители (носки) по краям жатки — характерная деталь,
    // разграничивающая скошенную и нескошенную полосу.
    const dividerMat = headerMat;
    [-halfW, halfW].forEach(x => {
      const divGeo = new THREE.ConeGeometry(0.12, 0.6, 8);
      const div = new THREE.Mesh(divGeo, dividerMat);
      div.rotation.z = Math.PI / 2;
      div.position.set(x, 0.4, -2.75);
      group.add(div);
    });

    const reelMat = new THREE.MeshStandardMaterial({ color: 0x616161, roughness: 0.5, metalness: 0.4 });
    const reelAxleGeo = new THREE.CylinderGeometry(0.06, 0.06, width * 0.96, 8);
    reelAxleGeo.rotateZ(Math.PI / 2);
    const reelAxle = new THREE.Mesh(reelAxleGeo, reelMat);
    reelAxle.position.set(0, 1.15, -2.55);
    group.add(reelAxle);

    // Опорные стойки мотовила по краям — соединяют ось мотовила с корпусом
    // жатки, раньше ось "плавала" в воздухе без видимого крепления.
    const reelArmMat = reelMat;
    [-halfW * 0.9, halfW * 0.9].forEach(x => {
      const armGeo = new THREE.BoxGeometry(0.08, 0.7, 0.15);
      const arm = new THREE.Mesh(armGeo, reelArmMat);
      arm.position.set(x, 0.85, -2.5);
      arm.rotation.x = -Math.PI / 10;
      group.add(arm);
    });

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

  // FIX v3.0 п.2 (дизайн): вторая продольная балка рамы + опорные колёса —
  // раньше борона была одним брусом с дисками "в воздухе", теперь у неё
  // есть настоящая рама-конструкция и колёса транспортировки по краям.
  const crossBraceMat = boomMat;
  const numBraces = Math.max(2, Math.min(6, Math.round(width / 6)));
  for (let i = 0; i <= numBraces; i++) {
    const braceGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6);
    const brace = new THREE.Mesh(braceGeo, crossBraceMat);
    brace.rotation.x = Math.PI / 2;
    brace.position.set(-halfW + i * (width / numBraces), 0.75, -2.05);
    group.add(brace);
  }

  const harrowWheelMat = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.9 });
  [-halfW + 0.35, halfW - 0.35].forEach(x => {
    const wGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 16);
    wGeo.rotateZ(Math.PI / 2);
    const wheel = new THREE.Mesh(wGeo, harrowWheelMat);
    wheel.position.set(x, 0.32, -2.3);
    group.add(wheel);
  });

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

  // FIX (не понятно куда ехать / разметка не совпадает с полем): раньше
  // параллельные гоны (курс AB, см. ниже "2. ПАРАЛЛЕЛЬНЫЕ ГОНЫ") всегда
  // строились вдоль фиксированной мировой оси Z, независимо от реальной
  // ориентации поля/стартового курса трактора. Если поле развёрнуто не
  // строго по оси (почти всегда так), направляющие линии шли по диагонали
  // к реальному краю поля — водитель видел разметку, но она не совпадала
  // с тем, куда физически нужно ехать вдоль границы поля. Курс гонов
  // теперь равен курсу первой стороны контура поля (тот же spawnHeading,
  // что и стартовое направление трактора в startTractorTracking()), а для
  // свободного заезда без поля — курсу трактора в момент открытия 3D-вида.
  let trackHeadingDeg = 0;
  if (coords && coords.length >= 2) {
    const p0 = coords[0], p1 = coords[1];
    trackHeadingDeg = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * (180 / Math.PI);
  } else if (typeof tractor3DRenderHeading === 'number') {
    trackHeadingDeg = tractor3DRenderHeading;
  }
  // FIX (баг): сохраняем в глобальную переменную, чтобы updateGuidanceLightbar()
  // мог считать отклонение от гона в ТОЙ ЖЕ повёрнутой системе координат,
  // что и визуальные направляющие линии ниже (trackGroup.rotation.y).
  tractorTrackHeadingDeg = trackHeadingDeg;
  const trackGroup = new THREE.Group();
  trackGroup.rotation.y = -trackHeadingDeg * (Math.PI / 180);
  field3DOutline.add(trackGroup);

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
    trackGroup.add(trackLine);

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
    trackGroup.add(ribbonMesh);
  }

  scene3D.add(field3DOutline);
}
/** Расчет и обновление HUD светодиодного курсоуказателя (Ag Lightbar) */
// FIX (баг): раньше отклонение от гона считалось по абсолютной мировой оси X
// (x - baseX), а визуальные направляющие линии в update3DFieldBounds() при
// этом рисуются повёрнутыми на курс поля (trackGroup.rotation.y). На поле,
// развёрнутом не строго по мировой оси Z (обычный случай), HUD "В ПОЛОСЕ /
// РУЛИ ВЛЕВО/ВПРАВО" мог полностью расходиться с тем, что водитель видел на
// экране. Теперь координаты трактора сначала переводятся в ту же повёрнутую
// систему координат гонов (обратный поворот на tractorTrackHeadingDeg), что
// и линии на сцене — отклонение считается вдоль локальной оси X этой
// системы, перпендикулярно направлению гонов, как и должно быть.
function updateGuidanceLightbar(heading, x, z) {
  const spacing = Math.max(6, tractorWidth || 12);
  // FIX v3.0 п.Б3: гон #1 = точка старта, а не центр поля (x=0).
  // tractor3DBaseTrackX/Z фиксируется при первом движении вперёд.
  const baseX = (tractor3DBaseTrackX !== null) ? tractor3DBaseTrackX : x;
  const baseZ = (tractor3DBaseTrackZ !== null) ? tractor3DBaseTrackZ : z;

  // Поворачиваем текущую позицию и опорную точку в локальную систему
  // координат гонов (та же ротация, что trackGroup.rotation.y в
  // update3DFieldBounds: группа повёрнута на -trackHeadingDeg, значит
  // мир -> локаль это поворот на +trackHeadingDeg).
  const rad = tractorTrackHeadingDeg * (Math.PI / 180);
  const cosT = Math.cos(rad), sinT = Math.sin(rad);
  const localX    = x * cosT - z * sinT;
  const baseLocalX = baseX * cosT - baseZ * sinT;

  const relX = localX - baseLocalX;
  const trackIndex = Math.round(relX / spacing);
  const targetLocalX = baseLocalX + trackIndex * spacing;
  const deviation = localX - targetLocalX; // отклонение от центра текущего гона (м), поперёк направления гонов

  const offsetEl = document.getElementById('tractor-guidance-offset');
  const pillEl = document.getElementById('guidance-center-pill');
  const statusEl = document.getElementById('tractor-guidance-status');
  // REDESIGN: стрелка теперь отдельная иконка внутри pill (лучше читается
  // и легче анимируется/переворачивается, чем текстовый символ ←/→).
  // Иконка живёт в стабильной обёртке (#guidance-offset-arrow-wrap), а не
  // напрямую как <i data-lucide>, потому что lucide.createIcons() заменяет
  // <i> на <svg> и класс/атрибут для повторного поиска элемента могут не
  // сохраниться идентично между кадрами — обёртка остаётся тем же <span>
  // всегда, и её innerHTML можно безопасно перезаписывать.
  const arrowWrap = document.getElementById('guidance-offset-arrow-wrap');

  // REDESIGN: индикаторы "ГОН"/"КУРС"/"ШИРИНА" убраны из HUD — соответствующие
  // DOM-элементы (#tractor-guidance-track/-hdg/-width) больше не существуют
  // в разметке, поэтому их текст здесь больше не обновляется. Остальная
  // логика функции (offset, светодиоды, статус-подсказка) не тронута.

  const leds = ['gled-l3', 'gled-l2', 'gled-l1', 'gled-r1', 'gled-r2', 'gled-r3'];
  leds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'gled';
  });

  const absDev = Math.abs(deviation);

  // Помогает "довернуть" стрелку без лишних DOM-мутаций, если direction
  // не поменялось между кадрами.
  function setArrow(dir) {
    if (!arrowWrap) return;
    const wantedIcon = dir === 'left' ? 'arrow-left' : (dir === 'right' ? 'arrow-right' : 'check');
    if (arrowWrap.getAttribute('data-current-icon') === wantedIcon) return;
    arrowWrap.setAttribute('data-current-icon', wantedIcon);
    arrowWrap.innerHTML = `<i data-lucide="${wantedIcon}" class="icon-sm"></i>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  if (absDev < 0.15) {
    if (offsetEl) offsetEl.textContent = '0.00';
    if (pillEl) pillEl.className = 'guidance-center-pill';
    setArrow('center');
    if (statusEl) {
      statusEl.textContent = 'В ПОЛОСЕ (ON TRACK)';
      statusEl.style.color = '#00e676';
    }
  } else if (deviation > 0) {
    // Трактор смещен вправо -> рули ВЛЕВО
    if (offsetEl) offsetEl.textContent = absDev.toFixed(2);
    setArrow('left');
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
    if (offsetEl) offsetEl.textContent = absDev.toFixed(2);
    setArrow('right');
    // FIX (баг): класс был скопирован из ветки "смещён вправо" (deviate-left)
    // и не заменён — пилюля показывала "влево", пока стрелка и текст статуса
    // уже говорили "рули вправо". Противоречивая подсказка водителю.
    if (pillEl) pillEl.className = absDev > 0.6 ? 'guidance-center-pill deviate-hard' : 'guidance-center-pill deviate-right';
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

// ── ЗАДАЧА 2: Оверлей карты поля по тапу на радар ──────────────────────
// Скрываем 3D view и показываем 2D карту Leaflet с плавающей плашкой возврата в 3D
let overlayMap = null;
let overlayPolyline = null;
// FIX (мини-карта не двигалась во время заезда): раньше overlayMap
// центрировалась и получала маркер один раз, в момент открытия
// (requestAnimationFrame внутри open3DFieldMapOverlay), а дальше никак не
// обновлялась, пока оверлей открыт — выглядело так, будто трактор на
// карте "не едет". Теперь, пока оверлей открыт, отдельный
// requestAnimationFrame-цикл (_overlayMapAnimId) каждый кадр подтягивает
// актуальную позицию/след трактора, используя ту же живую
// tractor3DRenderPos/RenderHeading, что и 3D-модель и радар.
let overlayTractorMarker = null;
let _overlayMapAnimId = null;
let _overlayMapOpen = false;

function _overlayMapTractorLatLng() {
  if (!fieldCenter3D) return null;
  const latOffset = tractor3DRenderPos.z / 111320;
  const lngOffset = tractor3DRenderPos.x / (111320 * Math.cos(fieldCenter3D.lat * Math.PI / 180));
  return [fieldCenter3D.lat - latOffset, fieldCenter3D.lng + lngOffset];
}

function _overlayMapTick() {
  if (!_overlayMapOpen || !overlayMap) { _overlayMapAnimId = null; return; }

  if (typeof tractorPath !== 'undefined' && tractorPath.length > 0 && overlayPolyline) {
    overlayPolyline.setLatLngs(tractorPath);
  }

  const ll = _overlayMapTractorLatLng();
  if (ll) {
    if (overlayTractorMarker) {
      overlayTractorMarker.setLatLng(ll);
      const el = overlayTractorMarker.getElement();
      // FIX (баг): += конкатенировал новый rotate() на каждый кадр
      // requestAnimationFrame (~60/сек), пока оверлей открыт — transform
      // рос неограниченно. Заменяем старое значение поворота, как это уже
      // сделано для основного 2D-маркера в vehicleApplyGpsFix().
      if (el) el.style.transform = `${el.style.transform.replace(/rotate\([^)]+\)/g, '')} rotate(${tractor3DRenderHeading.toFixed(0)}deg)`;
    }
    // Карта следует за трактором, но не дёргает зум/центр если пользователь
    // сам подвинул карту руками — проверяем, не задан ли флаг ручной панорамы.
    if (!overlayMap._userPanned) {
      overlayMap.panTo(ll, { animate: false });
    }
  }

  _overlayMapAnimId = requestAnimationFrame(_overlayMapTick);
}

function open3DFieldMapOverlay() {
  const container3D = document.getElementById('tractor-3d-view');
  if (container3D) container3D.style.display = 'none';
  const overlay = document.getElementById('tractor-field-map-overlay');
  if (overlay) overlay.style.display = 'flex';
  _overlayMapOpen = true;

  requestAnimationFrame(() => {
    if (!overlayMap) {
      overlayMap = L.map('tractor-field-map-overlay-canvas', {
        zoomControl: false,
        attributionControl: false
      });
      L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 22
      }).addTo(overlayMap);

      overlayPolyline = L.polyline([], {color: '#8D6E63', weight: 4}).addTo(overlayMap);

      // Пользователь начал сам двигать карту руками — перестаём
      // авто-центрировать, чтобы не выдёргивать её у него из-под пальца.
      overlayMap.on('dragstart', () => { overlayMap._userPanned = true; });

      overlayTractorMarker = L.marker([0, 0], {
        icon: L.divIcon({
          className: 'overlay-tractor-marker',
          html: '<div style="width:14px;height:14px;background:#00e676;border:2px solid #fff;border-radius:50% 50% 50% 0;box-shadow:0 0 6px rgba(0,230,118,0.8);"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        })
      }).addTo(overlayMap);
    }

    overlayMap._userPanned = false; // сбрасываем ручную панораму при каждом открытии
    try { overlayMap.invalidateSize(false); } catch(_) {}

    if (typeof tractorPath !== 'undefined' && tractorPath.length > 0) {
      overlayPolyline.setLatLngs(tractorPath);
    }

    const ll = _overlayMapTractorLatLng();
    if (ll) {
      overlayMap.setView(ll, 17);
      if (overlayTractorMarker) overlayTractorMarker.setLatLng(ll);
    }

    if (_overlayMapAnimId) cancelAnimationFrame(_overlayMapAnimId);
    _overlayMapAnimId = requestAnimationFrame(_overlayMapTick);
  });
}
function close3DFieldMapOverlay() {
  const overlay = document.getElementById('tractor-field-map-overlay');
  if (overlay) overlay.style.display = 'none';
  const container3D = document.getElementById('tractor-3d-view');
  if (container3D) container3D.style.display = 'block';
  _overlayMapOpen = false;
  if (_overlayMapAnimId) { cancelAnimationFrame(_overlayMapAnimId); _overlayMapAnimId = null; }
  // FIX (мерцание/рябь после возврата из вложенной 2D-карты в 3D): тот же
  // класс проблемы, что и с основным #map — Leaflet не знает, что контейнер
  // мини-карты был скрыт, поэтому дальнейшие открытия могут рисовать тайлы
  // некорректно, если размеры контейнера успели поменяться.
  if (overlayMap) {
    requestAnimationFrame(() => {
      try { overlayMap.invalidateSize(false); } catch (_) {}
    });
  }
}
// ── ЗАДАЧА 5: Кнопка геолокации ─────────────────────────────────────────
function locate3DGPS() {
  const btn = document.getElementById('btn-3d-gps-locate');
  if (btn) { btn.disabled = true; btn.classList.add('gps-loading'); }
  if (!navigator.geolocation) {
    showToast('GPS не поддерживается браузером');
    if (btn) { btn.disabled = false; btn.classList.remove('gps-loading'); }
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (btn) { btn.disabled = false; btn.classList.remove('gps-loading'); }
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      const acc = pos.coords.accuracy ? ' (±' + Math.round(pos.coords.accuracy) + 'м)' : '';
      showToast('GPS: ' + lat.toFixed(5) + ', ' + lng.toFixed(5) + acc);
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
      if (tractor3DActive && tractorActive) {
        updateTractorLocation([lat, lng]);
      } else if (typeof map !== 'undefined' && map) {
        map.setView([lat, lng], 16);
      }
    },
    (err) => {
      if (btn) { btn.disabled = false; btn.classList.remove('gps-loading'); }
      var msgs = {
        1: 'Нет разрешения на GPS. Проверьте настройки браузера.',
        2: 'GPS-сигнал не найден. Убедитесь, что GPS включён.',
        3: 'Таймаут GPS. Выйдите на открытое пространство и повторите.'
      };
      showToast(msgs[err.code] || 'Ошибка GPS: ' + err.message);
    },
    { timeout: 10000, maximumAge: 5000, enableHighAccuracy: true }
  );
}
function draw3DRadar() {
  if (!radarCtx || !radarCanvas) return;
  const W = radarCanvas.width, H = radarCanvas.height;
  const cx = W / 2, cy = H / 2;
  // REDESIGN: радар уменьшен с 140px до 64px (менее навязчивая миникарта,
  // как в референсных приложениях) — масштаб пересчитан пропорционально,
  // иначе поле/трактор оказались бы почти невидимы на новом холсте.
  const RADAR_SCALE = 0.12 * (W / 140);

  radarCtx.clearRect(0, 0, W, H);

  // Сетка радара
  radarCtx.strokeStyle = 'rgba(0, 230, 118, 0.25)';
  radarCtx.lineWidth = 1;
  radarCtx.beginPath();
  radarCtx.arc(cx, cy, H * 0.43, 0, Math.PI * 2);
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
      const rx = cx + (dLng * RADAR_SCALE);
      const ry = cy - (dLat * RADAR_SCALE);
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

  // FIX (радар не двигался): раньше стрелка рисовалась по tractor3DPos/
  // tractor3DHeading — эти переменные выставлялись ОДИН РАЗ при спавне
  // трактора и больше никогда не обновлялись ни в GPS-режиме, ни в ручном/
  // демо-режиме (обновлялась только tractor3DRenderPos/RenderHeading —
  // сглаженная позиция, которую использует сама 3D-модель). В итоге 3D
  // трактор ехал, а стрелка на радаре и центр оверлей-карты (см.
  // open3DFieldMapOverlay) стояли на месте. Используем ту же живую
  // позицию, что и 3D-модель.
  const tX = cx + (tractor3DRenderPos.x * RADAR_SCALE);
  const tY = cy + (tractor3DRenderPos.z * RADAR_SCALE);

  const arrowScale = W / 140; // пропорционально уменьшенному радару
  radarCtx.save();
  radarCtx.translate(tX, tY);
  radarCtx.rotate((tractor3DRenderHeading) * (Math.PI / 180));
  radarCtx.fillStyle = '#00e676';
  radarCtx.beginPath();
  radarCtx.moveTo(0, -7 * arrowScale);
  radarCtx.lineTo(5 * arrowScale, 5 * arrowScale);
  radarCtx.lineTo(0, 3 * arrowScale);
  radarCtx.lineTo(-5 * arrowScale, 5 * arrowScale);
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
// FIX v3.0 п.Б1: полная переработка функции закраски обработанного участка.
// Проблема 'залитого экрана' была вызвана двумя факторами:
//   1) canvas lineTo рисовал гигантскую линию через весь холст при любом
//      скачке позиции (GPS-рывок, старт заезда, ручное управление +рывок).
//   2) Функция вызывалась каждый кадр (60 fps) без проверки минимального
//      смещения — сотни микросегментов на стоянке засоряли trail-group.
// Новая логика:
//   - canvas-текстура больше НЕ рисует след — она остаётся как фон земли.
//   - Только 3D ribbon (tractor3DTrailGroup) показывает пройденный участок.
//   - Точка ribbon добавляется только при смещении >= MIN_PAINT_STEP метров.
//   - При прыжке > MAX_PAINT_JUMP разбиваем на промежуточные шаги (lerp),
//     иначе получается одна лента через всё поле.
function paint3DSoilCoverage(x, z, widthMeters, headingDeg) {
  const w = widthMeters || 12;
  const heading = (typeof headingDeg === 'number') ? headingDeg : tractor3DHeading;

  // --- 3D Ribbon Trail (единственный источник отображения следа) ---
  if (!tractor3DTrailGroup) return;

  const rad = heading * (Math.PI / 180);
  const halfW = w / 2;
  const cosH = Math.cos(rad);
  const sinH = Math.sin(rad);
  // Орудие крепится сзади трактора; hitch = 2.3м за центром модели.
  const hitchDist = 2.3;
  const bx = x - sinH * hitchDist;
  const bz = z - cosH * hitchDist;

  // Текущие края ленты (левый и правый край орудия).
  const curL = new THREE.Vector3(bx - cosH * halfW, 0.06, bz + sinH * halfW);
  const curR = new THREE.Vector3(bx + cosH * halfW, 0.06, bz - sinH * halfW);

  const prevL = tractor3DTrailGroup.userData.lastL;
  const prevR = tractor3DTrailGroup.userData.lastR;

  if (prevL && prevR) {
    // Измеряем реальное смещение центра орудия от предыдущей точки.
    const prevMidX = (prevL.x + prevR.x) / 2;
    const prevMidZ = (prevL.z + prevR.z) / 2;
    const dist = Math.hypot(bx - prevMidX, bz - prevMidZ);

    // Ничего не рисуем, если трактор почти не сдвинулся (стоит на месте).
    if (dist < MIN_PAINT_STEP) return;

    // Если прыжок слишком большой (GPS-рывок / телепорт) — разбиваем на
    // промежуточные шаги, чтобы не получалась одна лента через всё поле.
    const steps = dist > MAX_PAINT_JUMP ? Math.ceil(dist / MAX_PAINT_JUMP) : 1;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const iL = new THREE.Vector3().lerpVectors(prevL, curL, t);
      const iR = new THREE.Vector3().lerpVectors(prevR, curR, t);
      const fromL = s === 1 ? prevL : new THREE.Vector3().lerpVectors(prevL, curL, (s - 1) / steps);
      const fromR = s === 1 ? prevR : new THREE.Vector3().lerpVectors(prevR, curR, (s - 1) / steps);

      const segGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        fromL.x, fromL.y, fromL.z,
        fromR.x, fromR.y, fromR.z,
        iL.x,    iL.y,    iL.z,
        fromR.x, fromR.y, fromR.z,
        iR.x,    iR.y,    iR.z,
        iL.x,    iL.y,    iL.z
      ]);
      segGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      // FIX (сильное мерцание следа именно во время движения, не на стоянке):
      // раньше материал каждого сегмента ленты был transparent + depthWrite:false.
      // Новые сегменты создаются постоянно, пока трактор едет (каждые >=0.4м —
      // см. MIN_PAINT_STEP), и слегка перекрываются на стыках друг с другом и
      // с плоскостью земли. Без записи в depth-buffer у полупрозрачных
      // объектов WebGL не может стабильно отсортировать порядок отрисовки
      // между десятками пересекающихся сегментов на каждом кадре — это
      // классический z-fighting, который выглядит как мерцание именно
      // растущего "хвоста" за движущимся трактором. Сегменты почвы визуально
      // непрозрачны (закрашенный участок), поэтому включаем depthWrite и
      // добавляем небольшой polygonOffset, чтобы соседние сегменты и
      // плоскость земли больше не боролись за один и тот же пиксель глубины.
      const segMat = new THREE.MeshBasicMaterial({
        color: SOIL_TRAIL_COLOR_HEX,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });
      const segMesh = new THREE.Mesh(segGeo, segMat);
      tractor3DTrailGroup.add(segMesh);
    }

    // FIX (п.4 — закраска пропадала на длинных заездах): лимит в 1200
    // сегментов достигался уже через ~1-2 минуты обычной езды (каждый шаг
    // >= MIN_PAINT_STEP=0.4м создаёт новый сегмент), после чего САМЫЕ
    // СТАРЫЕ куски следа удалялись из сцены — обработанное поле визуально
    // "размывалось" позади трактора, будто закраска не сохраняется. След
    // должен оставаться на весь заезд, поэтому лимит поднят с большим
    // запасом (типичный заезд по полю в несколько га укладывается в это
    // число сегментов); чистка происходит только при новом заезде
    // (startTractorTracking/clearTractorRunTraces), а не во время текущего.
    const MAX_TRAIL_SEGMENTS = 20000;
    while (tractor3DTrailGroup.children.length > MAX_TRAIL_SEGMENTS) {
      const old = tractor3DTrailGroup.children[0];
      tractor3DTrailGroup.remove(old);
      if (old.geometry) old.geometry.dispose();
      if (old.material) old.material.dispose();
    }
  }

  tractor3DTrailGroup.userData.lastL = curL;
  tractor3DTrailGroup.userData.lastR = curR;
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
  // FIX v3.0 п.3: то же самое исправление масштаба 1:1, что и в
  // build3DTractorModel() — без искусственного минимума 6м.
  const implementWidth = tractorWidth || 12;
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

  // FIX (навесное оборудование не влезало в кадр): раньше CAM_DISTANCE/
  // CAM_HEIGHT были фиксированными константами, не учитывающими реальный
  // размер текущего навесного оборудования (tractorWidth/tractorOpType).
  // На широких сеялках/опрыскивателях/жатках (basicWidth иногда >12м)
  // камера стояла слишком близко и низко — оборудование сзади трактора
  // просто не помещалось в кадр. Теперь дистанция/высота камеры зависят
  // от ширины и "глубины" текущего орудия: чем шире/крупнее навеска, тем
  // дальше и выше отъезжает камера, чтобы вся техника была видна целиком.
  function computeCam3DFraming() {
    const width = Math.max(6, tractorWidth || 12);
    // Каждый build3DImplement (см. функцию) крепит орудие на hitch ~2.2–2.8м
    // позади центра модели трактора — это фиксированная "глубина" навески,
    // которую тоже нужно учитывать, иначе камера "видит" ширину орудия, но
    // обрезает его дальний (по глубине) край на очень широких агрегатах.
    const implementDepth = 2.8;
    // Базовые значения — раньше были 9.5/4.6, но при стандартной ширине
    // навесное оборудование (сеялка/опрыскиватель) всё равно частично
    // обрезалось нижним/дальним краем кадра. Пункт 1: камера отодвинута
    // дальше и выше примерно на 25-30% по сравнению со старыми базовыми
    // значениями, чтобы весь трактор + орудие уверенно помещались в кадр
    // с запасом, а не впритык.
    // ============================================================
    // ВНИМАНИЕ: параметры камеры ниже настроены вручную по запросу
    // владельца проекта (отдаление ~40-50% от прежних значений, чтобы
    // в кадре было видно больше пространства вокруг трактора).
    // НЕ МЕНЯТЬ BASE_DISTANCE / BASE_HEIGHT / коэффициенты extraWidth
    // без явного разрешения и отдельного запроса владельца проекта.
    // ============================================================
    const BASE_WIDTH = 12;
    const BASE_DISTANCE = 17.8;  // было 12.3 (+~45%) — камера отдалена по запросу владельца
    const BASE_HEIGHT = 8.4;     // было 5.9  (+~42%) — камера приподнята соразмерно
    const extraWidth = Math.max(0, width - BASE_WIDTH);
    // ~0.45м доп. дистанции и ~0.16м доп. высоты на каждый метр ширины
    // сверх базовой — подобрано так, чтобы орудие с запасом помещалось в
    // угол обзора камеры (FOV) даже на максимальной ширине захвата.
    const distance = BASE_DISTANCE + implementDepth * 0.35 + extraWidth * 0.45;
    const height = BASE_HEIGHT + extraWidth * 0.16;
    // Потолки подняты пропорционально новым BASE_DISTANCE/BASE_HEIGHT
    // (см. предупреждение выше), чтобы отдаление реально применялось и
    // на широких навесных орудиях, а не срезалось старым лимитом.
    return {
      distance: Math.min(43, distance),
      height: Math.min(19, height)
    };
  }

  let CAM_DISTANCE = 17.8;  // м позади трактора — пересчитывается по ширине орудия (см. computeCam3DFraming)
  let CAM_HEIGHT   = 8.4;   // высота камеры над землёй — пересчитывается по ширине орудия
  const CAM_LOOKAHEAD = 16;   // точка прицела вперёд — далеко, чтобы видеть гон
  const CAM_LOOK_HEIGHT = 1.1;
  const CAM_LERP = 0.11;      // чуть отзывчивее старого 0.07
  let _lastCamFramingWidth = null; // пересчитываем framing только при смене ширины/орудия

  let camPosInitialized = false;
  const desiredPos    = new THREE.Vector3();
  const desiredLookAt = new THREE.Vector3();
  // Позиционное сглаживание модели теперь считается по dt (см. ниже),
  // а не фиксированным лерп-коэффициентом на кадр — раньше при просадках
  // FPS движение либо "тормозило", либо телепортировалось рывками,
  // потому что 0.15 применялось одинаково независимо от реального dt.
  // FIX (мерцание/остановки при движении): смягчено вместе с учащением
  // тика демо-режима (см. toggleTractorSimulation, DEMO_TICK_MS) — при
  // прежнем высоком POS_SMOOTH_RATE=9.0 рендер-позиция успевала полностью
  // "доезжать" до цели между обновлениями и на миг замирала, создавая
  // впечатление рывков/остановок. Более низкая скорость сглаживания даёт
  // непрерывное, слегка "плывущее" движение без видимых стопов между
  // тиками — при этом всё ещё достаточно отзывчиво к ручному управлению.
  const POS_SMOOTH_RATE = 6.0;   // 1/с — выше = быстрее "доезд" до цели
  const HDG_SMOOTH_RATE = 7.0;   // 1/с — сглаживание поворота модели

  // FIX v3.0 п.Б1: updateGuidanceLightbar подключён к animate-циклу,
  // чтобы HUD обновлялся при ручном управлении, а не только при GPS.
  function animate() {
    if (!tractor3DActive) return;
    tractor3DAnimId = requestAnimationFrame(animate);

    const now = performance.now();
    const dt  = _lastFrameTime > 0 ? Math.min((now - _lastFrameTime) / 1000, 0.1) : 0.016;
    _lastFrameTime = now;

    if (_3dGasActive !== 0 || _3dSteerActive !== 0 || vehicleState.speed !== 0 || vehicleState.steerRate !== 0 || tractorSimInterval) {
      vehiclePhysicsTick(dt);
    }

    if (tractor3DModel) {
      if (tractorTeleportPending) {
        tractor3DRenderPos.x = vehicleState.x;
        tractor3DRenderPos.z = vehicleState.z;
        tractor3DRenderHeading = vehicleState.heading;
      } else {
        const posT = 1 - Math.exp(-POS_SMOOTH_RATE * dt);
        const hdgT = 1 - Math.exp(-HDG_SMOOTH_RATE * dt);

        tractor3DRenderPos.x += (vehicleState.x - tractor3DRenderPos.x) * posT;
        tractor3DRenderPos.z += (vehicleState.z - tractor3DRenderPos.z) * posT;

        let headingDiff = vehicleState.heading - tractor3DRenderHeading;
        while (headingDiff >  180) headingDiff -= 360;
        while (headingDiff < -180) headingDiff += 360;
        tractor3DRenderHeading += headingDiff * hdgT;
      }

      tractor3DModel.position.set(tractor3DRenderPos.x, 0, tractor3DRenderPos.z);
      tractor3DModel.rotation.y = tractor3DRenderHeading * (Math.PI / 180);

      // FIX (радар/мини-карта не двигались): tractor3DPos/tractor3DHeading
      // раньше выставлялись один раз при спавне и больше не обновлялись.
      // Держим их синхронными с живой рендер-позицией на случай, если
      // где-то ещё в коде используются эти (исторически "публичные")
      // переменные вместо tractor3DRenderPos/RenderHeading.
      tractor3DPos.x = tractor3DRenderPos.x;
      tractor3DPos.z = tractor3DRenderPos.z;
      tractor3DHeading = tractor3DRenderHeading;

      if (tractorActive && (tractorSimInterval || tractorWatchId || _3dGasActive !== 0 || Math.abs(vehicleState.speed) > 0)) {
        paint3DSoilCoverage(tractor3DRenderPos.x, tractor3DRenderPos.z, tractorWidth || 12, tractor3DRenderHeading);
      }

      updateGuidanceLightbar(tractor3DRenderHeading, tractor3DRenderPos.x, tractor3DRenderPos.z);

      if (camera3D) {
        const curWidth = tractorWidth || 12;
        if (_lastCamFramingWidth !== curWidth) {
          const framing = computeCam3DFraming();
          CAM_DISTANCE = framing.distance;
          CAM_HEIGHT = framing.height;
          _lastCamFramingWidth = curWidth;
        }

        const tPos = tractor3DModel.position;
        const rad  = tractor3DModel.rotation.y;

        desiredPos.set(tPos.x - Math.sin(rad) * CAM_DISTANCE, CAM_HEIGHT, tPos.z - Math.cos(rad) * CAM_DISTANCE);
        desiredLookAt.set(tPos.x + Math.sin(rad) * CAM_LOOKAHEAD, CAM_LOOK_HEIGHT, tPos.z + Math.cos(rad) * CAM_LOOKAHEAD);

        if (!camPosInitialized || tractorTeleportPending) {
          camera3D.position.copy(desiredPos);
          camPosInitialized = true;
        } else {
          camera3D.position.lerp(desiredPos, CAM_LERP);
        }
        camera3D.lookAt(desiredLookAt);
      }

      if (tractorTeleportPending) tractorTeleportPending = false;
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
  // FIX (баг): tractorSimInterval — флаг с ТРЕМЯ состояниями (true = едет,
  // false = на паузе, null = не запускалось/остановлено), но раньше
  // проверялось только `if (tractorSimInterval)`, что истинно лишь для
  // true. При состоянии false (пауза) выполнение проваливалось в блок
  // "первый запуск" ниже и сбрасывало весь прогресс демо (путь, площадь,
  // 3D-след) плюс телепортировало трактор обратно на старт — то есть
  // "продолжить после паузы" на деле начинало заезд заново. Три состояния
  // явно разделены ниже.
  if (tractorSimInterval === true) {
    tractorSimInterval = false;
    showToast(lang === 'ru' ? '<i data-lucide="pause" class="icon-sm"></i> Демо на паузе' : '<i data-lucide="pause" class="icon-sm"></i> Simulation paused');
    return;
  }
  if (tractorSimInterval === false) {
    // Возобновление после паузы — просто продолжаем с текущей позиции,
    // без сброса пути/площади/следа и без телепорта на старт.
    tractorSimInterval = true;
    const accEl = document.getElementById('tractor-3d-stat-accuracy');
    if (accEl) { accEl.textContent = lang === 'ru' ? 'демо' : 'demo'; accEl.style.color = '#90a4ae'; }
    showToast(lang === 'ru' ? '<i data-lucide="arrow-right" class="icon-sm"></i> Демо продолжено' : '<i data-lucide="arrow-right" class="icon-sm"></i> Demo resumed');
    return;
  }

  // tractorSimInterval === null: первый запуск демо в этом заезде.
  showToast(lang === 'ru' ? '<i data-lucide="arrow-right" class="icon-sm"></i> Демо заезд запущен' : '<i data-lucide="arrow-right" class="icon-sm"></i> Demo running');

  // ДОБАВЛЕНО: в демо-режиме реального GPS нет — показывать последнюю
  // реальную точность было бы вводящей в заблуждение, поэтому явно гасим
  // индикатор на время демо.
  const accEl = document.getElementById('tractor-3d-stat-accuracy');
  if (accEl) { accEl.textContent = lang === 'ru' ? 'демо' : 'demo'; accEl.style.color = '#90a4ae'; }

  const demoStart = tractorSpawnPoint || fieldCenter3D;
  if (demoStart) {
    tractorPath = [];
    tractorAreaHa = 0;
    tractorCoverageUnion = null;
    lastSoilPaintPos = null;
    tractor3DBaseTrackX = null;
    tractor3DBaseTrackZ = null;
    if (tractor3DTrailGroup) {
      tractor3DTrailGroup.clear();
      tractor3DTrailGroup.userData = {};
    }
    
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
    vehicleState.heading = demoHeading;
    tractor3DRenderHeading = demoHeading;
    vehicleApplyGpsFix(demoStart.lat, demoStart.lng, Date.now());
  }

  tractorSimInterval = true; 
}
// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
// REDESIGN: ПЛАВНОЕ РУЧНОЕ УПРАВЛЕНИЕ D-PAD (локальная физика).
//
// Раньше каждое движение D-pad конвертировалось в GPS-координаты через
// turf.destination(), а затем шло обратно через updateTractorLocation(),
// которая сама по себе делает turf.lineString/turf.length/turf.buffer и
// пишет полигоны на 2D Leaflet-карту — очень тяжёлый путь для того, что
// по сути является чисто локальным перемещением в 3D-сцене (x/z/heading).
// Это и было источником "дёрганости"/лагов при удержании кнопок: тяжёлые
// вычисления с плавающей точкой на геосфере выполнялись каждые полметра
// пути вместо простого приращения локальных координат.
//
// Теперь ручное управление двигает tractor3DPos напрямую (локальная
// декартова физика, как в аркадных driving-играх), плюс:
//   - плавный разгон/торможение (скорость — величина с инерцией, а не
//     мгновенный вкл/выкл MANUAL_SPEED_MS);
//   - плавный руль (угловая скорость руления тоже с инерцией, поэтому
//     трактор не "телепортируется" углами при отпускании кнопки);
//   - синхронизация обратно в lat/lng (для 2D-карты/статистики площади)
//     выполняется батчем не чаще, чем раз в SYNC_INTERVAL_MS — незачем
//     гонять turf на каждый кадр ради данных, которые всё равно
//     округляются до сотых на экране.
// ════════════════════════════════════════════════════

const MANUAL_MAX_SPEED_MS   = 4.17;  // м/с = 15 км/ч, максимальная скорость руками
const MANUAL_ACCEL_MS2      = 3.2;   // м/с² — разгон до полной скорости за ~1.3с
const MANUAL_DECEL_MS2      = 5.5;   // м/с² — торможение быстрее разгона (естественнее)
const MANUAL_MAX_STEER_DS   = 34;    // град/с — макс. угловая скорость поворота
const MANUAL_STEER_ACCEL_DS = 90;    // град/с² — с какой скоростью руль "довинчивается" до максимума
// FIX (рывки маркера на 2D-карте): было 350 мс — 3D-сцена рендерится
// каждый кадр (~60 раз/сек), а маркер на 2D-карте и статистика площади
// обновлялись лишь ~3 раза/сек, из-за чего на 2D-карте движение трактора
// выглядело рваным, скачками, хотя 3D-модель ехала плавно. 120 мс — разумный
// компромисс: маркер обновляется заметно чаще (~8 раз/сек), но turf.buffer
// (тяжёлая операция, см. ниже) не вызывается на каждый кадр без необходимости.
const SYNC_INTERVAL_MS      = 120;   // как часто синхронизировать локальную позицию в lat/lng

// Текущая (сглаженная) скорость и угловая скорость руления ручного режима.
// Не путать с _3dGasActive/_3dSteerActive — те лишь хранят "нажато ли",
// а эти два — уже фактическая физическая величина с инерцией.
let _manualCurSpeed = 0;      // м/с, со знаком (+ вперёд, - назад)
let _manualCurSteerRate = 0;  // град/с, со знаком (+ вправо, - влево)
let _manualLastSyncAt = 0;

function vehiclePhysicsTick(dt) {
  if (!tractorActive) return;

  const gas = tractorSimInterval ? 1 : _3dGasActive;
  
  const steerTarget = _3dSteerActive * MANUAL_MAX_STEER_DS;
  const steerDelta = steerTarget - vehicleState.steerRate;
  const steerStep = MANUAL_STEER_ACCEL_DS * dt;
  if (Math.abs(steerDelta) <= steerStep) vehicleState.steerRate = steerTarget;
  else vehicleState.steerRate += Math.sign(steerDelta) * steerStep;

  const speedTarget = gas * (tractorSimInterval ? 4.16 : MANUAL_MAX_SPEED_MS);
  const accelRate = Math.abs(speedTarget) > Math.abs(vehicleState.speed) ? MANUAL_ACCEL_MS2 : MANUAL_DECEL_MS2;
  const speedDelta = speedTarget - vehicleState.speed;
  const speedStep = accelRate * dt;
  if (Math.abs(speedDelta) <= speedStep) vehicleState.speed = speedTarget;
  else vehicleState.speed += Math.sign(speedDelta) * speedStep;

  const speedFactor = Math.abs(vehicleState.speed) > 0.05 || gas !== 0 ? 1 : 0;
  if (speedFactor > 0 && vehicleState.steerRate !== 0) {
    let step = vehicleState.steerRate * dt;
    step = Math.max(-2, Math.min(2, step));
    vehicleState.heading = (vehicleState.heading + step) % 360;
    if (vehicleState.heading < 0) vehicleState.heading += 360;
  }

  const speedEl = document.getElementById('tractor-3d-stat-speed');
  if (speedEl) speedEl.textContent = Math.abs(vehicleState.speed * 3.6).toFixed(1);

  if (Math.abs(vehicleState.speed) < 0.0005 && gas === 0) return;

  const rad = vehicleState.heading * (Math.PI / 180);
  const dist = vehicleState.speed * dt;
  vehicleState.x += Math.sin(rad) * dist;
  vehicleState.z += Math.cos(rad) * dist;

  if (tractor3DBaseTrackX === null && dist > 0) {
    tractor3DBaseTrackX = vehicleState.x;
    tractor3DBaseTrackZ = vehicleState.z;
  }

  const distMeters = Math.abs(dist);
  if (distMeters > 0) {
    const segKm = distMeters / 1000;
    tractorDistKm += segKm;
    const distElS = document.getElementById('tractor-3d-stat-dist');
    if (distElS) distElS.textContent = tractorDistKm.toFixed(2);
    // FIX (учёт перекрытий): площадь больше не накапливается здесь как
    // distance*width на каждый физ-тик — реальная площадь считается ниже,
    // из объединённого (turf.union) полигона покрытия батчем раз в
    // SYNC_INTERVAL_MS, см. recomputeCoverageArea().
  }

  const nowMs = performance.now();
  if (fieldCenter3D && (nowMs - _manualLastSyncAt) >= SYNC_INTERVAL_MS) {
    _manualLastSyncAt = nowMs;
    const lat = fieldCenter3D.lat - (vehicleState.z / 111320);
    const lng = fieldCenter3D.lng + (vehicleState.x / (111320 * Math.cos(fieldCenter3D.lat * Math.PI / 180)));
    if (tractorMarker) {
      try {
        tractorMarker.setLatLng([lat, lng]);
        const markerEl = tractorMarker.getElement();
        if (markerEl) markerEl.style.transform = `${markerEl.style.transform.replace(/rotate\([^)]+\)/g, '')} rotate(${vehicleState.heading.toFixed(0)}deg)`;
      } catch (_) {}
    }
    tractorPath.push([lat, lng]);
    if (tractorPath.length > 4000) tractorPath.shift();

    // FIX (микрорывки в 3D): turf.buffer — сравнительно тяжёлая геометрическая
    // операция. Раньше она выполнялась синхронно прямо внутри vehiclePhysicsTick(),
    // который сам вызывается из animate() каждый кадр — на слабых устройствах это
    // могло подвешивать кадр рендера и ощущаться как рывок движения трактора.
    // Она не обязана успеть строго в этот же кадр (это просто отрисовка следа
    // на 2D-карте и расчёт площади), поэтому переносим её в следующий свободный
    // тик event loop.
    const prevLL = tractorPath[tractorPath.length - 2];
    const curLL = [lat, lng];
    const widthNow = tractorWidth;
    const trailGroupRef = tractorTrailGroup;
    setTimeout(() => {
      try {
        const segLine = turf.lineString([[prevLL[1], prevLL[0]], [curLL[1], curLL[0]]]);
        const buffered = turf.buffer(segLine, (widthNow / 2) / 1000, { units: 'kilometers' });
        if (buffered && trailGroupRef) {
          L.geoJSON(buffered, {
            style: { color: SOIL_TRAIL_STROKE_CSS, weight: 1, fillColor: SOIL_TRAIL_FILL_CSS, fillOpacity: 0.55 },
            interactive: false
          }).addTo(trailGroupRef);
        }
        recomputeCoverageArea(buffered);
      } catch (_) {}
    }, 0);
  }
}
function _tickManual3DControl(dt) {
    vehiclePhysicsTick(dt);
}
// Запуск/остановка газа (кнопки ↑↓)
// ДОБАВЛЕНО: общий переход в режим ручного управления — останавливает демо
// и гасит индикатор точности GPS (реального сигнала при ручном вождении
// не используется, показывать устаревшее значение было бы обманчиво).
function _enterManualControlMode() {
  if (tractorSimInterval) { tractorSimInterval = null; } // FIX: bool-флаг, не таймер
  const accEl = document.getElementById('tractor-3d-stat-accuracy');
  if (accEl) { accEl.textContent = lang === 'ru' ? 'ручн.' : 'manual'; accEl.style.color = '#90a4ae'; }
}
function start3DGas(dir) {
  if (!tractorActive) return;
  // Останавливаем демо-интервал при ручном управлении.
  _enterManualControlMode();
  _3dGasActive = dir;   // +1 вперёд, -1 назад
  if (navigator.vibrate) navigator.vibrate(8);
}
function stop3DGas() { _3dGasActive = 0; }
// Запуск/остановка поворота (кнопки ←→)
function start3DSteer(dir) {
  if (!tractorActive) return;
  _enterManualControlMode();
  _3dSteerActive = dir;  // +1 вправо, -1 влево
  if (navigator.vibrate) navigator.vibrate(8);
}
function stop3DSteer() { _3dSteerActive = 0; }
// Оставляем manualTractorControl для обратной совместимости с onclick в HTML.
// При зажатой кнопке D-pad теперь используются start3DGas/start3DSteer.
function manualTractorControl(direction) {
  if (!tractorActive) return;
  _enterManualControlMode();
  if (direction === 'left')     { start3DSteer(-1); setTimeout(stop3DSteer, 200); }
  else if (direction === 'right')    { start3DSteer(1);  setTimeout(stop3DSteer, 200); }
  else if (direction === 'forward')  { start3DGas(1);   setTimeout(stop3DGas,   200); }
  else if (direction === 'backward') { start3DGas(-1);  setTimeout(stop3DGas,   200); }
}
function stopTractorTracking() {
  toggleTractor3DView(false);
  // FIX: если заезд завершили, пока была открыта вложенная 2D мини-карта
  // (open3DFieldMapOverlay), останавливаем её цикл обновления — иначе
  // requestAnimationFrame продолжал бы вызываться вхолостую в фоне.
  _overlayMapOpen = false;
  if (_overlayMapAnimId) { cancelAnimationFrame(_overlayMapAnimId); _overlayMapAnimId = null; }
  tractor3DPos = { x: 0, z: 0 };
  tractor3DHeading = 0;
  // FIX v3.0 п.Б3/Б4: сброс базовой X/Z гона и состояния D-pad при завершении заезда.
  tractor3DBaseTrackX = null;
  tractor3DBaseTrackZ = null;
  _3dGasActive = 0; _3dSteerActive = 0; _lastFrameTime = 0;
  _manualCurSpeed = 0; _manualCurSteerRate = 0; _manualLastSyncAt = 0;
  tractorLastFixAt = null;
  tractorTeleportPending = false;
  _gpsRawHistory = []; // сброс сглаживания GPS при завершении заезда

  if (tractorWatchId) {
    navigator.geolocation.clearWatch(tractorWatchId);
    tractorWatchId = null;
  }
  tractorSimInterval = null; // bool-флаг, не таймер — clearInterval() не требуется
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

  // FIX v3.0 п.2 ("карта мерещится" после заезда): пока был открыт
  // полноэкранный 3D-режим (#tractor-3d-view, position:fixed поверх всего),
  // контейнер 2D-карты Leaflet (#map) оставался скрытым. Leaflet не следит
  // за display:none у родителя и не знает, что размеры контейнера могли
  // измениться (например, после поворота экрана во время 3D-режима) — из-за
  // этого при возврате часть тайлов рисуется неверно, серыми/сдвинутыми
  // плитками ("рябь"/мерцание). invalidateSize() заставляет Leaflet
  // пересчитать размеры контейнера и перерисовать видимые тайлы.
  // requestAnimationFrame — даём браузеру завершить layout после
  // toggleTractor3DView(false) (display:none -> flex) ПЕРЕД пересчётом.
  if (typeof map !== 'undefined' && map) {
    requestAnimationFrame(() => {
      try { map.invalidateSize(false); } catch (_) {}
    });
  }

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
  tractorCoverageUnion = null; // отчёт (pendingTractorSummary) уже зафиксировал площадь этого заезда
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
  if (e.key === 'ArrowUp' || e.key === 'w' || e.code === 'KeyW') start3DGas(1);
  if (e.key === 'ArrowDown' || e.key === 's' || e.code === 'KeyS') start3DGas(-1);
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.code === 'KeyA') start3DSteer(-1);
  if (e.key === 'ArrowRight' || e.key === 'd' || e.code === 'KeyD') start3DSteer(1);
});

window.addEventListener('keyup', (e) => {
  if (!tractor3DActive) return;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.code === 'KeyW' || e.key === 'ArrowDown' || e.key === 's' || e.code === 'KeyS') stop3DGas();
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.code === 'KeyA' || e.key === 'ArrowRight' || e.key === 'd' || e.code === 'KeyD') stop3DSteer();
});
