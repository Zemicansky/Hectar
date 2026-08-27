// Hectar — Service Worker (offline caching)
//
// FIX (iOS Safari): раньше этот код собирался на лету в script.js и
// регистрировался через Blob URL (URL.createObjectURL). Это удобно для
// однофайлового прототипа, но WebKit на iOS требует, чтобы скрипт
// Service Worker'а был реальным same-origin файлом — регистрация через
// blob: там либо тихо проваливается, либо ведёт себя нестабильно в
// зависимости от версии iOS. Из-за этого офлайн-режим PWA на iPhone/iPad
// не работал вообще, хотя весь остальной код (manifest, apple-mobile-web-app
// мета-теги) предполагал наличие полноценного офлайн-кэша.
//
// Это отдельный статический файл — теперь его можно зарегистрировать
// как обычный same-origin скрипт (navigator.serviceWorker.register('./sw.js')),
// что работает во всех браузерах, включая Safari/iOS.
//
// ВАЖНО: версия кэша (CACHE_NAME) должна совпадать по смыслу с APP_VERSION
// в script.js — при выпуске новой версии приложения увеличивайте номер
// здесь вручную, чтобы activate удалил старый кэш и не отдавал устаревшую
// версию из офлайн-кэша.
const CACHE_NAME = 'hectar-v3.0';

// On install: cache the page itself
self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll([
        self.registration.scope
      ]).catch(function () {});
    })
  );
});

// On activate: delete old caches
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// On fetch: cache-first for navigation, network-first with cache fallback for assets
self.addEventListener('fetch', function (event) {
  var req = event.request;
  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Navigation requests (the HTML page itself) — cache-first
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(req).then(function (cached) {
        var networkFetch = fetch(req).then(function (response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
          }
          return response;
        }).catch(function () { return cached; });
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
      fetch(req).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        }
        return response;
      }).catch(function () {
        return caches.match(req);
      })
    );
  }
});
