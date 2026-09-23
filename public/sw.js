const CACHE='english-pod-shell-v2';
const SHELL=['/','/manifest.webmanifest','/icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([
 caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('english-pod-shell-')&&key!==CACHE).map(key=>caches.delete(key)))),
 self.clients.claim()
])));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/media/'))return;
 const networkFirst=event.request.mode==='navigate'||url.pathname.startsWith('/api/');
 const fromNetwork=()=>fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
  return response;
 });
 event.respondWith(networkFirst
  ?fromNetwork().catch(async()=>await caches.match(event.request)||
    (event.request.mode==='navigate'?await caches.match('/'):Response.error()))
  :caches.match(event.request).then(cached=>cached||fromNetwork()));
});
