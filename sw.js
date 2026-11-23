const CACHE='fleetledger-v48';
const ASSETS=['./','./index.html','./styles.css','./app.js','./modules/utils.js','./modules/finance.js','./modules/dashboard.js','./modules/chat.js','./modules/auth.js','./modules/records.js','./modules/data-tools.js','./modules/reports.js','./modules/reminders.js','./modules/notes.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method==='GET'&&new URL(event.request.url).origin===location.origin) {
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
  }
});


self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const target=new URL('./',self.location).href;
    const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clientsList){
      if('focus' in client){await client.focus();client.postMessage({type:'APEX_OPEN_CHAT'});return;}
    }
    if(self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
