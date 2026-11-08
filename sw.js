const CACHE='fleetledger-v41';
const ASSETS=['./','./index.html','./styles.css','./app.js','./modules/utils.js','./modules/finance.js','./modules/dashboard.js','./modules/chat.js','./modules/auth.js','./modules/records.js','./modules/data-tools.js','./modules/reports.js','./modules/reminders.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method==='GET'&&new URL(event.request.url).origin===location.origin) {
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
  }
});
