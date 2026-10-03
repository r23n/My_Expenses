// يغير الرقم مع كل تحديث كبير عشان المتصفح يمسح النسخة القديمة من الملفات
const CACHE_NAME = 'my-expenses-v6';
const SETTINGS_CACHE = 'my-expenses-settings';

const APP_FILES = [
  '/',
  '/index.html',
  '/html/',
  '/html/index.html',
  '/css/reset.css?v=5',
  '/css/layout.css?v=5',
  '/css/components.css?v=5',
  '/js/app.js?v=5',
  '/js/ui.js',
  '/js/i18n.js',
  '/js/storage.js',
  '/js/config.js',
  '/js/cloud.js',
  '/js/cloud-config.js',
  '/assets/logo.svg?v=5',
  '/assets/icon-180.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/icon-180.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', event => {
  // نحفظ كل ملف لحاله، فلو ملف واحد فشل ما يوقف تثبيت الباقي
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => Promise.allSettled(APP_FILES.map(file => cache.add(file))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.filter(name => name !== CACHE_NAME && name !== SETTINGS_CACHE).map(name => caches.delete(name))))
  );
  self.clients.claim();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return cache.match('/html/');
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // طلبات Supabase بيانات حية، ما نخزنها أبدًا عشان ما تطلع لك أرقام قديمة
  if (url.hostname.endsWith('supabase.co')) return;
  // ملفات التطبيق: نجيب الأحدث من النت، وبدون نت نستخدم المحفوظة
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }
  // الخطوط ومكتبة Supabase ما تتغير، فنستخدم المحفوظة مباشرة وهذا أسرع
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(cacheFirst(request));
  }
});

async function showReminder() {
  let language = 'ar';
  const cache = await caches.open(SETTINGS_CACHE);
  const saved = await cache.match('/settings/language');
  if (saved) language = await saved.text();
  let title = 'مصاريفي';
  let body = 'سجّلت مصاريف اليوم؟';
  if (language === 'en') {
    title = 'My Expenses';
    body = "Did you log today's expenses?";
  }
  return self.registration.showNotification(title, { body: body, icon: '/assets/icon-192.png', badge: '/assets/icon-192.png', tag: 'daily-reminder' });
}

self.addEventListener('push', event => {
  event.waitUntil(showReminder());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('/html/');
    })
  );
});