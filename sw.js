/* Increase the version whenever any shell file changes. Old workers wait until all app windows close. */
const CACHE='kochwerk-shell-v5';
const FILES=['./','./index.html','./styles.css','./app.js','./domain.js','./storage.js','./demo.js','./art.js','./cooking-mode.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
const base=new URL('./',self.location.href);
const allowed=new Set(FILES.map(file=>new URL(file,base).href));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(file=>new Request(new URL(file,base),{cache:'reload'})))));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('kochwerk-shell-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==base.origin)return;
  if(request.mode==='navigate'&&url.pathname===base.pathname){
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(new URL('./index.html',base)))??fetch(request)));return;
  }
  if(allowed.has(url.href))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))??fetch(request)));
});


