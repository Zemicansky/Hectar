import re
def extract_func(code, func_name):
    start = code.find('function ' + func_name)
    if start == -1: return None, -1, -1
    braces = 0
    in_func = False
    for i in range(start, len(code)):
        if code[i] == '{':
            braces += 1
            in_func = True
        elif code[i] == '}':
            braces -= 1
            if in_func and braces == 0:
                return code[start:i+1], start, i+1
    return None, -1, -1

with open('script.js', 'r', encoding='utf-8') as f:
    code = f.read()

new_demo = '''function toggleTractorSimulation() {
  if (!tractorActive) return;
  if (tractorSimInterval) {
    tractorSimInterval = false;
    showToast(lang === 'ru' ? '<i data-lucide="pause" class="icon-sm"></i> Демо на паузе' : '<i data-lucide="pause" class="icon-sm"></i> Simulation paused');
    return;
  }

  showToast(lang === 'ru' ? '<i data-lucide="arrow-right" class="icon-sm"></i> Демо заезд запущен' : '<i data-lucide="arrow-right" class="icon-sm"></i> Demo running');

  const demoStart = tractorSpawnPoint || fieldCenter3D;
  if (demoStart) {
    tractorPath = [];
    lastSoilPaintPos = null;
    tractor3DBaseTrackX = null;
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
}'''
_, start, end = extract_func(code, 'toggleTractorSimulation')
code = code[:start] + new_demo + code[end:]

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(code)
