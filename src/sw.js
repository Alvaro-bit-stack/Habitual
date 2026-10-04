/* Public app shell only. Private progress is account-scoped device storage, never an HTTP cache. */
const CACHE='habitual-shell-__BUILD_ID__';
const ROOT=new URL('./',self.location.href);
const SHELL=['Habitual.html','manifest.webmanifest','icon.svg'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('habitual-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||request.headers.has('Authorization'))return;
  const url=new URL(request.url);
  if(url.origin!==ROOT.origin)return;
  const isPage=request.mode==='navigate'&&(url.pathname===ROOT.pathname||url.pathname===new URL('Habitual.html',ROOT).pathname);
  const isAsset=SHELL.includes(url.href);
  if(!isPage&&!isAsset)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{const response=await fetch(request);if(response.ok){await cache.put(isPage?SHELL[0]:request,response.clone());return response;}const saved=await cache.match(isPage?SHELL[0]:request);return saved||response;}
    catch(e){const saved=await cache.match(isPage?SHELL[0]:request);if(saved)return saved;return new Response('Open Habitual online once to save it for offline use.',{status:503,headers:{'Content-Type':'text/plain'}});}
  })());
});
