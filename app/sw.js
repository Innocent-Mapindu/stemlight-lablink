/* STEMLight LabLink offline cache. Version 0e5906b6c7 (changes whenever the app files change). */
const CACHE="lablink-0e5906b6c7";
const FILES=["./", "accounts.js", "chemicals.js", "emblem.jpg", "firebase-config.js", "fonts/archivo-latin-500-normal.woff2", "fonts/archivo-latin-700-normal.woff2", "fonts/archivo-latin-800-normal.woff2", "fonts/fonts.css", "fonts/ibm-plex-mono-latin-400-normal.woff2", "fonts/ibm-plex-mono-latin-500-normal.woff2", "fonts/ibm-plex-sans-latin-400-normal.woff2", "fonts/ibm-plex-sans-latin-500-normal.woff2", "fonts/ibm-plex-sans-latin-600-normal.woff2", "fonts/montserrat-latin-600-normal.woff2", "fonts/montserrat-latin-700-normal.woff2", "fonts/montserrat-latin-800-normal.woff2", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "index.html", "labs/heart.html", "labs/hookes-law.html", "labs/lathe.html", "labs/lungs.html", "labs/ohms-law.html", "labs/pendulum.html", "labs/titration.html", "labs/titration3d.html", "labs/wire-resistance.html", "logo.jpg", "manifest.webmanifest", "vendor/firebase-app-compat.js", "vendor/firebase-auth-compat.js", "vendor/firebase-firestore-compat.js", "vendor/firebase-functions-compat.js"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("lablink-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==location.origin) return; // Firebase traffic goes straight to the network
  if(e.request.mode==="navigate"){ e.respondWith(fetch(e.request).then(r=>{ const c=r.clone(); caches.open(CACHE).then(x=>x.put(e.request,c)); return r; }).catch(()=>caches.match(e.request).then(r=>r||caches.match("./")))); return; }
  const put=r=>{ if(r&&r.ok){ const c=r.clone(); caches.open(CACHE).then(x=>x.put(e.request,c)); } return r; };
  if(u.pathname.endsWith("firebase-config.js")){ e.respondWith(fetch(e.request).then(put).catch(()=>caches.match(e.request))); return; }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(put)));
});
