import re, shutil, os, json
from PIL import Image
SRC="/home/claude"; NM="/tmp/claude-0/t/node_modules"; OUT="/home/claude/stemlight-lablink/app"
os.makedirs(OUT+"/vendor",exist_ok=True); os.makedirs(OUT+"/fonts",exist_ok=True); os.makedirs(OUT+"/labs",exist_ok=True); os.makedirs(OUT+"/icons",exist_ok=True)
# vendor
V={"three.min.js":NM+"/three/build/three.min.js","OrbitControls.js":NM+"/three/examples/js/controls/OrbitControls.js",
   "pdf.min.js":NM+"/pdfjs-dist/build/pdf.min.js","pdf.worker.min.js":NM+"/pdfjs-dist/build/pdf.worker.min.js",
   "mammoth.browser.min.js":NM+"/mammoth/mammoth.browser.min.js",
   "firebase-app-compat.js":NM+"/firebase/firebase-app-compat.js","firebase-auth-compat.js":NM+"/firebase/firebase-auth-compat.js","firebase-firestore-compat.js":NM+"/firebase/firebase-firestore-compat.js","firebase-functions-compat.js":NM+"/firebase/firebase-functions-compat.js"}
for k,v in V.items(): shutil.copy(v,OUT+"/vendor/"+k)
# fonts
F=[("Montserrat","montserrat",[600,700,800]),("IBM Plex Sans","ibm-plex-sans",[400,500,600]),("IBM Plex Mono","ibm-plex-mono",[400,500]),("Archivo","archivo",[500,700,800])]
css=""
for fam,slug,ws in F:
    for w in ws:
        fn=f"{slug}-latin-{w}-normal.woff2"; shutil.copy(f"{NM}/@fontsource/{slug}/files/{fn}",OUT+"/fonts/"+fn)
        css+=f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url({fn}) format('woff2')}}\n"
open(OUT+"/fonts/fonts.css","w").write(css)
FONTRE=re.compile(r'<link rel="preconnect" href="https://fonts.googleapis.com">\s*<link rel="stylesheet" href="https://fonts.googleapis.com/css2[^"]*">')
def fix(s,depth):
    pre="../" if depth else ""
    s,n=FONTRE.subn(f'<link rel="stylesheet" href="{pre}fonts/fonts.css">',s)
    s=s.replace("https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js",pre+"vendor/three.min.js").replace("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js",pre+"vendor/OrbitControls.js")
    s=s.replace("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",pre+"vendor/pdf.min.js").replace("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",pre+"vendor/pdf.worker.min.js").replace("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",pre+"vendor/mammoth.browser.min.js")
    assert "googleapis" not in s and "jsdelivr" not in s and "cdnjs" not in s, "external left"
    return s
for f in os.listdir(SRC+"/labs"):
    s=open(SRC+"/labs/"+f).read(); open(OUT+"/labs/"+f,"w").write(fix(s,1))
for f in ["logo.jpg","emblem.jpg","hero.jpg"]: shutil.copy(SRC+"/brand/"+f,OUT+"/"+f)
shutil.copy(SRC+"/chemicals.js",OUT+"/chemicals.js")
# index
s=fix(open(SRC+"/lablink.html").read(),0)
s=s.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','')
TXT={"Class work from your teacher appears here when you open LabLink signed in to claude.ai and online. Levels and free practice work without it.":"Class work appears here once you join your teacher's class: tap Account at the top of the page and enter the class code. Levels and free practice work without it.",
     "Share this page with learners as <b>Contributors</b> from the Share menu. They can then submit their own work but cannot see each other's. Anyone with edit access sees this dashboard.":"Learners create their own LabLink account and enter your <b>class code</b> (tap <b>Account</b> at the top of the page to see and copy it). They can then submit their own work but cannot see each other's. Only you see this dashboard.",
     "Progress is saved on this device.":"Progress is saved for each person: to their account when signed in, or on this device in demo mode.",
     "Your account cannot save class work here. Ask your teacher to share STEMLight LabLink with you as a Contributor.":"Your account cannot save class work for this class. Check that you have joined your teacher's class."}
for a,b in TXT.items():
    assert a in s, a; s=s.replace(a,b)
i=s.index("<script>"); s=s[:i]+'<script type="text/plain" id="lablink-app">'+s[i+len("<script>"):]
head='''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#023d84">
<meta name="description" content="STEMLight LabLink: virtual Physics, Chemistry, Biology and Workshop labs for Zimbabwean learners. A STEMLight Academy product.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<meta property="og:title" content="STEMLight LabLink"><meta property="og:description" content="Virtual science labs for every Zimbabwean learner."><meta property="og:image" content="hero.jpg">
<style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style>
'''
tail='''
<script src="firebase-config.js"></script>
<script src="vendor/firebase-app-compat.js"></script>
<script src="vendor/firebase-auth-compat.js"></script>
<script src="vendor/firebase-firestore-compat.js"></script>
<script src="vendor/firebase-functions-compat.js"></script>
<script src="accounts.js"></script>
<script>if("serviceWorker" in navigator&&!window.Capacitor&&location.protocol==="https:") addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));</script>
</body></html>
'''
# lablink.html has no <head>/<body> tags: everything after <title>.. is head-ish; body content begins at first non-head element
open(OUT+"/index.html","w").write(head+s.replace("<title>STEMLight LabLink</title>","<title>STEMLight LabLink</title>\n</head><body>",1) if False else head+s+tail)
# icons
em=Image.open(SRC+"/brand/emblem.jpg").convert("RGB")
def icon(size,pad):
    bg=Image.new("RGB",(size,size),(255,255,255)); inner=int(size*(1-2*pad)); im=em.copy(); im.thumbnail((inner,inner),Image.LANCZOS)
    bg.paste(im,((size-im.width)//2,(size-im.height)//2)); return bg
icon(192,0.04).save(OUT+"/icons/icon-192.png"); icon(512,0.04).save(OUT+"/icons/icon-512.png"); icon(512,0.16).save(OUT+"/icons/maskable-512.png")
os.makedirs("/home/claude/stemlight-lablink/assets",exist_ok=True)
icon(1024,0.16).save("/home/claude/stemlight-lablink/assets/icon-only.png")
icon(1024,0.24).save("/home/claude/stemlight-lablink/assets/icon-foreground.png")
Image.new("RGB",(1024,1024),(255,255,255)).save("/home/claude/stemlight-lablink/assets/icon-background.png")
sp=Image.new("RGB",(2732,2732),(255,255,255)); im=em.copy(); im.thumbnail((900,900)); sp.paste(im,((2732-im.width)//2,(2732-im.height)//2)); sp.save("/home/claude/stemlight-lablink/assets/splash.png"); sp.save("/home/claude/stemlight-lablink/assets/splash-dark.png")
# manifest
json.dump({"name":"STEMLight LabLink","short_name":"LabLink","description":"Virtual science labs for every Zimbabwean learner","start_url":"./","scope":"./","display":"standalone","background_color":"#ffffff","theme_color":"#023d84","orientation":"any",
  "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icons/maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]},open(OUT+"/manifest.webmanifest","w"),indent=1)
# service worker: precache everything in app/
files=[]
for root,_,fs in os.walk(OUT):
    for f in fs:
        p=os.path.relpath(os.path.join(root,f),OUT)
        if p in ("sw.js",) or p.startswith("vendor/pdf") or p.startswith("vendor/mammoth") or p.startswith("vendor/three") or p.startswith("vendor/Orbit") or p=="hero.jpg": continue
        files.append(p)
import hashlib
h=hashlib.sha1("".join(sorted(files)).encode()+b"".join(open(os.path.join(OUT,p),"rb").read() for p in sorted(files))).hexdigest()[:10]
sw=f'''/* STEMLight LabLink offline cache. Version {h} (changes whenever the app files change). */
const CACHE="lablink-{h}";
const FILES={json.dumps(["./"]+sorted(files))};
self.addEventListener("install",e=>{{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); }});
self.addEventListener("activate",e=>{{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("lablink-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); }});
self.addEventListener("fetch",e=>{{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==location.origin) return; // Firebase traffic goes straight to the network
  if(e.request.mode==="navigate"){{ e.respondWith(fetch(e.request).then(r=>{{ const c=r.clone(); caches.open(CACHE).then(x=>x.put(e.request,c)); return r; }}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./")))); return; }}
  const put=r=>{{ if(r&&r.ok){{ const c=r.clone(); caches.open(CACHE).then(x=>x.put(e.request,c)); }} return r; }};
  if(u.pathname.endsWith("firebase-config.js")){{ e.respondWith(fetch(e.request).then(put).catch(()=>caches.match(e.request))); return; }}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(put)));
}});
'''
open(OUT+"/sw.js","w").write(sw)
if not os.path.exists(OUT+"/firebase-config.js"):
    open(OUT+"/firebase-config.js","w").write('''/* Paste your Firebase web app settings here to switch on accounts (see README, "Switch on accounts").
   Until apiKey and projectId are filled in, LabLink runs in demo mode with data kept on the device.
   These values are not secret: Firebase security rules (firestore.rules) protect the data. */
window.LABLINK_FIREBASE = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
''')
print("ok",len(files),"files; cache",h)
