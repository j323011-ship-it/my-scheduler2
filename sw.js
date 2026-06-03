const CACHE_NAME = 'scheduler-v1'
const FILES = [
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
]

// インストール時にキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  )
})

// オフラインでもキャッシュから返す
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  )
})