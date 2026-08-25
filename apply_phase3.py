import os
import re

def main():
    base_dir = r"C:\GitHub\Hectar"
    index_path = os.path.join(base_dir, "index.html")
    script_path = os.path.join(base_dir, "script.js")
    style_path = os.path.join(base_dir, "style.css")

    # 1. Update index.html
    with open(index_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    if 'id="btn-tractor-mode"' not in html:
        # Insert btn-tractor-mode right before btn-add-field-map
        btn_tractor_html = """
      <!-- Кнопка Трактор/Заезд -->
      <button id="btn-tractor-mode" onclick="openTractorSetupModal()">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="10" width="14" height="8" rx="2"/><circle cx="6" cy="18" r="2"/><circle cx="14" cy="18" r="2"/><path d="M17 14h3a2 2 0 0 0 2-2v-2l-3-2H8"/><path d="M12 10V6a1 1 0 0 1 1-1h2"/></svg>
        <span data-i18n="tractorMode">Заезд</span>
      </button>
"""
        html = html.replace('<!-- Кнопка добавить поле -->', btn_tractor_html + '      <!-- Кнопка добавить поле -->')

    if 'id="tractor-active-ui"' not in html:
        # Insert active UI below draw-mode-ui
        tractor_active_ui = """
    <!-- Режим трактора -->
    <div id="tractor-active-ui" style="display:none; position:fixed; top:0; left:0; width:100%; z-index:900; pointer-events:none;">
      <div style="padding:calc(var(--safe-top) + 16px) 16px 0;">
        <div style="background:var(--glass);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:16px;pointer-events:auto;box-shadow:var(--shadow);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;">
              <span class="pulse-dot" style="width:10px;height:10px;background:#ff6b6b;border-radius:50%;display:inline-block;animation:pulse 1.5s infinite;"></span>
              <span id="tractor-status-text">Запись трека</span>
            </div>
            <button class="modal-btn secondary" onclick="stopTractorTracking()" style="width:auto;padding:8px 16px;font-size:14px;background:#ff6b6b20;color:#ff6b6b;border:1px solid #ff6b6b40;">Завершить</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <div style="font-size:11px;color:var(--text3);text-transform:uppercase;font-weight:600;margin-bottom:4px;">Площадь</div>
              <div style="font-size:22px;font-weight:800;color:var(--accent);"><span id="tractor-stat-area">0.00</span> <span style="font-size:14px;color:var(--text2);">га</span></div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text3);text-transform:uppercase;font-weight:600;margin-bottom:4px;">Дистанция</div>
              <div style="font-size:22px;font-weight:800;color:#fff;"><span id="tractor-stat-dist">0.0</span> <span style="font-size:14px;color:var(--text2);">км</span></div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text3);text-transform:uppercase;font-weight:600;margin-bottom:4px;">Скорость</div>
              <div style="font-size:16px;font-weight:700;color:#fff;"><span id="tractor-stat-speed">0</span> <span style="font-size:12px;color:var(--text2);">км/ч</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
"""
        html = html.replace('<!-- ════ ЭКРАН ПОЛЕЙ ════ -->', tractor_active_ui + '\n    <!-- ════ ЭКРАН ПОЛЕЙ ════ -->')

    if 'id="modal-tractor-setup"' not in html:
        # Insert modal setup before <!-- Firebase Auth Modal --> or at the end
        tractor_setup_modal = """
  <!-- Модалка Настройки Заезда -->
  <div class="modal-overlay" id="modal-tractor-setup" onclick="if(event.target===this)closeTractorSetupModal()">
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header-row">
        <div class="modal-title">🚜 Настройки заезда</div>
        <button type="button" class="icon-btn" onclick="closeTractorSetupModal()">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-sheet-body">
        <p style="font-size:14px;color:var(--text2);margin-bottom:16px;">
          Включите GPS. Траектория вашего движения будет отрисовываться на карте с учетом ширины оборудования.
        </p>
        <div style="margin-bottom: 20px;">
          <label style="display:block;font-size:12px;font-weight:600;color:var(--text2);margin-bottom:6px;">Ширина оборудования (метры)</label>
          <input type="number" id="tractor-width-input" class="modal-input" value="12" step="0.5" min="1">
        </div>
        <button class="modal-btn primary" onclick="startTractorTracking()">Начать работу</button>
      </div>
    </div>
  </div>
"""
        html = html.replace('<!-- Firebase Auth Modal -->', tractor_setup_modal + '\n  <!-- Firebase Auth Modal -->')

    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(html)

    # 2. Update style.css
    with open(style_path, 'r', encoding='utf-8') as f:
        css = f.read()

    if '#btn-tractor-mode' not in css:
        tractor_css = """
#btn-tractor-mode {
  position: absolute;
  right: 16px;
  bottom: calc(var(--nav-total) + 90px);
  z-index: var(--z-map);
  background: var(--bg2);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 100px;
  padding: 10px 18px 10px 14px;
  color: #fff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.1s;
}
#btn-tractor-mode:active { transform: scale(0.95); }
#btn-tractor-mode svg { width: 22px; height: 22px; color: var(--accent-light); }

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(255, 107, 107, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
}
"""
        css = css + tractor_css

    with open(style_path, 'w', encoding='utf-8') as f:
        f.write(css)

    # 3. Update script.js
    with open(script_path, 'r', encoding='utf-8') as f:
        js = f.read()

    if 'function openTractorSetupModal' not in js:
        tractor_js = """
// ==========================================
// TRACTOR GPS TRACKING MODE
// ==========================================
let tractorWatchId = null;
let tractorActive = false;
let tractorPath = [];
let tractorWidth = 12; // meters
let tractorAreaHa = 0;
let tractorDistKm = 0;
let tractorMarker = null;
let tractorTrailGroup = null;

function openTractorSetupModal() {
  document.getElementById('modal-tractor-setup').classList.add('open');
}
function closeTractorSetupModal() {
  document.getElementById('modal-tractor-setup').classList.remove('open');
}

function startTractorTracking() {
  const widthInput = document.getElementById('tractor-width-input');
  if (widthInput && widthInput.value) {
    tractorWidth = parseFloat(widthInput.value) || 12;
  }
  closeTractorSetupModal();
  
  if (!navigator.geolocation) {
    showToast(lang === 'ru' ? 'GPS не поддерживается' : 'GPS not supported');
    return;
  }
  
  tractorActive = true;
  tractorPath = [];
  tractorAreaHa = 0;
  tractorDistKm = 0;
  
  document.getElementById('tractor-stat-area').textContent = '0.00';
  document.getElementById('tractor-stat-dist').textContent = '0.0';
  document.getElementById('tractor-stat-speed').textContent = '0';
  
  document.getElementById('tractor-active-ui').style.display = 'block';
  
  if (!tractorTrailGroup) {
    tractorTrailGroup = L.layerGroup().addTo(map);
  } else {
    tractorTrailGroup.clearLayers();
  }
  
  if (tractorMarker) {
    map.removeLayer(tractorMarker);
  }
  
  const iconHtml = `<div style="background:var(--accent);width:24px;height:24px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5);"><svg fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24" width="14" height="14"><rect x="3" y="10" width="14" height="8" rx="2"/><circle cx="6" cy="18" r="2"/><circle cx="14" cy="18" r="2"/><path d="M17 14h3a2 2 0 0 0 2-2v-2l-3-2H8"/><path d="M12 10V6a1 1 0 0 1 1-1h2"/></svg></div>`;
  tractorMarker = L.marker([0,0], {
    icon: L.divIcon({ html: iconHtml, className: '', iconSize: [24,24], iconAnchor: [12,12] })
  });
  
  tractorWatchId = navigator.geolocation.watchPosition(
    onTractorPosition,
    (err) => { console.error('GPS Error:', err); },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
  
  showToast(lang === 'ru' ? 'Заезд начат!' : 'Tractor mode started!');
}

function onTractorPosition(pos) {
  if (!tractorActive) return;
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const speed = pos.coords.speed || 0; // m/s
  
  const speedKmh = (speed * 3.6).toFixed(1);
  document.getElementById('tractor-stat-speed').textContent = speedKmh;
  
  const currentPoint = [lat, lng];
  
  if (tractorPath.length === 0) {
    tractorMarker.setLatLng(currentPoint).addTo(map);
    map.setView(currentPoint, 18);
  } else {
    tractorMarker.setLatLng(currentPoint);
    
    // Calculate distance added
    const prevPoint = tractorPath[tractorPath.length - 1];
    const segLine = turf.lineString([[prevPoint[1], prevPoint[0]], [lng, lat]]);
    const segKm = turf.length(segLine, { units: 'kilometers' });
    tractorDistKm += segKm;
    
    // Calculate area added based on equipment width
    // segment length (m) * width (m) = area (sq m)
    const segMeters = segKm * 1000;
    const addedAreaHa = (segMeters * tractorWidth) / 10000;
    tractorAreaHa += addedAreaHa;
    
    document.getElementById('tractor-stat-dist').textContent = tractorDistKm.toFixed(2);
    document.getElementById('tractor-stat-area').textContent = tractorAreaHa.toFixed(2);
    
    // Draw the trail using a polyline with dynamic width, or better: Turf buffer.
    // For simplicity and speed in real-time, we draw a filled polyline with high weight.
    // To be perfectly accurate across zooms, Turf buffer is better.
    const buffered = turf.buffer(segLine, (tractorWidth / 2) / 1000, { units: 'kilometers' });
    if (buffered) {
      L.geoJSON(buffered, {
        style: { color: 'var(--accent)', weight: 1, fillOpacity: 0.4, fillColor: 'var(--accent)' }
      }).addTo(tractorTrailGroup);
    }
  }
  
  tractorPath.push(currentPoint);
}

function stopTractorTracking() {
  if (tractorWatchId) {
    navigator.geolocation.clearWatch(tractorWatchId);
    tractorWatchId = null;
  }
  tractorActive = false;
  document.getElementById('tractor-active-ui').style.display = 'none';
  
  const isRu = lang === 'ru';
  alert(`${isRu ? 'Заезд завершен!' : 'Tracking finished!'}\\n\\n${isRu ? 'Пройдено' : 'Distance'}: ${tractorDistKm.toFixed(2)} км\\n${isRu ? 'Обработано' : 'Area'}: ${tractorAreaHa.toFixed(2)} га`);
}
"""
        js = js + "\n\n" + tractor_js
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(js)

    print("Phase 3 setup complete.")

if __name__ == "__main__":
    main()
