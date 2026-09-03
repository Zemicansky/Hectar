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
// FIX: версия поднята с v3.0 до v3.1 — все предыдущие правки CSS/JS для
// PWA standalone бага (fixed→absolute у #tab-bar, --app-height логика)
// физически не долетали до устройства, потому что старый кэш с этим же
// именем уже был создан ДО правок, а cache-first стратегия для navigate-
// запросов (index.html) продолжала отдавать старую закэшированную версию.
// Смена имени кэша — единственный надёжный триггер для activate-хендлера,
// который удаляет все кэши с другим именем и заставляет клиент забрать
// свежие файлы по сети.
// FIX v3.0 п.7 (сайт вообще не открывается офлайн на GitHub Pages): версия
// поднята с v3.1 до v3.2 — новый precache-список ниже добавлен только сейчас,
// а меняет он ровно то, что кэшируется при install, поэтому без смены имени
// кэша activate не заставит уже установленный на телефоне Service Worker
// перечитать install и забрать новый список файлов — пользователь так и
// остался бы со старым (почти пустым) кэшем до тех пор, пока вручную не
// переустановит PWA.
const CACHE_NAME = 'hectar-v3.2';

// FIX v3.0 п.7 (офлайн-режим полностью ломался при первом заходе без сети):
// раньше единственным, что клалось в кэш при install, была сама страница
// (self.registration.scope, то есть, по сути, index.html) — ни один из
// JS-файлов проекта, ни style.css, ни манифест/иконки в precache не
// попадали. Стратегия для JS/CSS ниже (в обработчике fetch) — network-first
// с фоллбэком на кэш, а фоллбэк работает только если файл уже был успешно
// закэширован раньше (то есть только если пользователь уже открывал
// приложение хотя бы раз при наличии сети и конкретный файл успел
// прокэшироваться при том заходе). Для фермера в поле, где сеть то есть, то
// нет, это означало: реально сайт открывается офлайн только "как повезёт" —
// если конкретный JS-файл на момент потери сети ещё не был закэширован
// (например, из-за прерванной загрузки или обновления кэша по новой версии),
// вся страница переставала грузиться, потому что core.js/map.js и другие
// файлы, от которых зависят все остальные (см. порядок подключения в
// PROJECT-MAP.md), отсутствовали.
//
// Исправлено: явный список всего необходимого минимума для полной загрузки
// приложения с нуля офлайн, в том числе все .js-файлы проекта по порядку
// подключения из PROJECT-MAP.md, style.css, манифест и иконки. Пути —
// ОТНОСИТЕЛЬНЫЕ (без ведущего "/"), потому что на GitHub Pages для
// проектных сайтов (username.github.io/repo-name/) абсолютный путь "/sw.js"
// или "/core.js" указывал бы на несуществующий адрес в корне github.io, а не
// в подпапке репозитория — относительные пути наследуют реальный scope
// Service Worker'а независимо от того, развёрнут сайт в корне домена или в
// подпапке. cache.addAll() падает атомарно, если хотя бы один файл не
// найден — специально не оборачиваем это в try/catch, который бы это тихо
// проглотил, а логируем в консоль, чтобы ошибка (например, из-за опечатки в
// имени файла при будущих правках) была заметна разработчику, а не просто
// молча оставляла кэш пустым.
// ВАЖНО (см. отчёт): имя файла манифеста и путь(и) к иконкам PWA я не
// проверял — они прописываются в <head> index.html (обычно <link
// rel="manifest" href="...">), а этот файл мне не присылали. Ниже — самое
// частое имя ("manifest.json"), но если у вас оно другое (или иконки лежат
// не рядом с index.html, а в подпапке типа /icons/) — поправьте эту строку
// и добавьте пути к иконкам, иначе именно эти 1-2 файла не попадут в
// precache (остальной офлайн-режим на это не повлияет, всё остальное уже
// работает).
const APP_SHELL_FILES = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './firebase-init.js',
  './core.js',
  './map.js',
  './fields.js',
  './ndvi.js',
  './weather.js',
  './notes-seasons.js',
  './firebase-sync.js',
  './tractor-3d.js',
  './export.js'
];

// On install: cache the full app shell so the app can start from zero offline
self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL_FILES).catch(function (err) {
        // Не глушим ошибку молча — если один из файлов не найден (например,
        // переименовали/удалили, а список здесь не обновили), лучше увидеть
        // это в консоли разработчика при тестировании, чем потом гадать,
        // почему офлайн-режим снова не работает.
        console.error('Hectar SW: precache failed', err);
      });
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
