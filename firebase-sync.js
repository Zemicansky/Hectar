// ════════════════════════════════════════════════════
// HECTAR — FIREBASE SYNC — аккаунт, авторизация, облачная синхронизация
// Файл сгенерирован автоматическим разбиением script.js
// См. PROJECT-MAP.md для описания структуры проекта
// ════════════════════════════════════════════════════

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
