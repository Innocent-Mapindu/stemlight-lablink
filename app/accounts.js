/* STEMLight LabLink: accounts and class data for the standalone web and Android app.
   - Firebase mode (firebase-config.js filled in): email/password accounts, teacher classes with join codes,
     class work stored per class in Cloud Firestore, learner progress saved to the account.
   - Demo mode (no Firebase config yet): everything is stored on this device, with a switch to view as teacher or learner. */
(function(){
"use strict";
const KEY="stemlight-lablink-v1";
const CFG=window.LABLINK_FIREBASE||{};
const FB=!!(CFG.apiKey&&CFG.projectId&&window.firebase);
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

let booted=false;
function bootApp(){ if(booted) return; booted=true; const src=$("lablink-app"); const s=document.createElement("script"); s.textContent=src.textContent; document.body.appendChild(s); }

// ---------- shared styles ----------
const css=`
.acct-gate{position:fixed;inset:0;z-index:100;overflow:auto;background:linear-gradient(160deg,#e9f1fb 0%,#fff7ec 100%);display:flex;align-items:flex-start;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px 24px}
.acct-box{width:100%;max-width:440px;margin:auto 0;background:#fff;border:1px solid #d3dbd8;border-radius:16px;padding:22px 20px;box-shadow:0 10px 40px rgba(2,61,132,.12);font-family:"IBM Plex Sans",system-ui,sans-serif;color:#17221f}
.acct-box img{display:block;width:96px;height:96px;object-fit:contain;margin:0 auto 6px;border-radius:14px}
.acct-box h1{font-family:Montserrat,system-ui,sans-serif;font-size:1.35rem;text-align:center;margin:0;color:#023d84}
.acct-box h1 b{color:#f58300}
.acct-box .sub{text-align:center;color:#5a6966;font-size:.9rem;margin:4px 0 16px}
.acct-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:#eef1f0;border-radius:10px;padding:4px;margin-bottom:14px}
.acct-tabs button{border:0;background:transparent;border-radius:8px;min-height:40px;font-weight:600;font-family:inherit;font-size:.92rem;color:#5a6966;cursor:pointer}
.acct-tabs button[aria-selected=true]{background:#fff;color:#023d84;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.acct-f{display:grid;gap:4px;margin-bottom:10px}
.acct-f label{font-size:.82rem;font-weight:600;color:#5a6966}
.acct-f input,.acct-f select{font:inherit;font-size:1rem;padding:10px 12px;border:1px solid #c9d2cf;border-radius:9px;min-height:44px;width:100%;box-sizing:border-box;background:#fff;color:#17221f}
.acct-f input:focus,.acct-f select:focus{outline:2px solid #f58300;outline-offset:1px;border-color:#f58300}
.acct-role{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.acct-role label{border:1.5px solid #c9d2cf;border-radius:10px;padding:10px;cursor:pointer;display:grid;gap:2px;font-size:.92rem;font-weight:600}
.acct-role label small{font-weight:400;color:#5a6966;font-size:.78rem}
.acct-role input{position:absolute;opacity:0;pointer-events:none}
.acct-role label:has(input:checked){border-color:#023d84;background:#eaf1fb;color:#023d84}
.acct-role label:has(input:focus-visible){outline:2px solid #f58300;outline-offset:2px}
.acct-btn{width:100%;min-height:46px;border:0;border-radius:10px;background:#023d84;color:#fff;font:600 1rem "IBM Plex Sans",system-ui,sans-serif;cursor:pointer;margin-top:4px}
.acct-btn.alt{background:#fff;color:#023d84;border:1.5px solid #023d84}
.acct-btn:disabled{opacity:.55;cursor:wait}
.acct-link{background:none;border:0;color:#023d84;font:600 .88rem inherit;font-family:inherit;cursor:pointer;padding:6px 0;text-decoration:underline}
.acct-msg{font-size:.88rem;border-radius:8px;padding:8px 10px;margin:8px 0;background:#fbe7e3;border-left:3px solid #b4442f}
.acct-msg.ok{background:#e3f1e8;border-left-color:#2f7d4f}
.acct-note{font-size:.78rem;color:#5a6966;text-align:center;margin-top:12px}
.acct-strip{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;background:#023d84;color:#fff;font:500 .82rem "IBM Plex Sans",system-ui,sans-serif;padding:6px max(12px,env(safe-area-inset-right)) 6px max(12px,env(safe-area-inset-left))}
.acct-strip b{font-weight:600}
.acct-strip .tag{background:#f58300;color:#fff;border-radius:99px;padding:1px 8px;font-size:.72rem;font-weight:600;margin-left:6px}
.acct-strip button,.acct-strip select{font:600 .8rem inherit;font-family:inherit;border-radius:7px;border:1px solid rgba(255,255,255,.6);background:transparent;color:#fff;min-height:32px;padding:3px 10px;cursor:pointer}
.acct-strip select option{color:#17221f}
.acct-dlg{position:fixed;inset:0;z-index:90;background:rgba(10,20,25,.5);display:flex;align-items:center;justify-content:center;padding:16px}
.acct-dlg .acct-box{margin:0}
.acct-code{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:1.8rem;font-weight:500;letter-spacing:.18em;text-align:center;color:#023d84;background:#eaf1fb;border-radius:10px;padding:10px;margin:6px 0}
.acct-row{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #e3e8e6;padding:7px 0;font-size:.9rem}
.acct-row span:first-child{color:#5a6966}
`;
function addCss(){ const s=document.createElement("style"); s.textContent=css; document.head.appendChild(s); }
function strip(html){ let el=$("acct-strip"); if(!el){ el=document.createElement("div"); el.id="acct-strip"; el.className="acct-strip"; document.body.prepend(el); } el.innerHTML=html; return el; }

// =====================================================================
// DEMO MODE: no accounts yet; class data kept on this device
// =====================================================================
function demoMode(){
  addCss();
  const DB="lablink-demo-db", RK="lablink-demo-role";
  const PEOPLE={u_teacher:"Mr Moyo (teacher)",u_rudo:"Rudo Ncube",u_tendai:"Tendai Dube",u_chipo:"Chipo Sibanda"};
  let ME=localStorage.getItem(RK)||"u_teacher"; if(!PEOPLE[ME]) ME="u_teacher";
  const load=()=>{ try{ return JSON.parse(localStorage.getItem(DB)||"{}"); }catch(e){ return {}; } };
  const save=s=>localStorage.setItem(DB,JSON.stringify(s));
  const subs=[]; const notify=()=>subs.forEach(f=>{ try{ f(); }catch(e){} });
  const merge=(a,b)=>{ const o=Object.assign({},a); for(const k in b){ const v=b[k]; o[k]=(v&&typeof v==="object"&&!Array.isArray(v)&&o[k]&&typeof o[k]==="object"&&!Array.isArray(o[k]))?merge(o[k],v):v; } return o; };
  const snap=p=>{ const d=load()[p]; return {id:p.split("/").pop(),exists:!!d,data:()=>d?JSON.parse(JSON.stringify(d)):undefined,metadata:{}}; };
  const doc=p=>({id:p.split("/").pop(),path:p,
    get:async()=>snap(p),
    set:async d=>{ const s=load(); s[p]=JSON.parse(JSON.stringify(d)); save(s); notify(); },
    update:async d=>{ const s=load(); if(!s[p]) throw {code:"not-found"}; s[p]=merge(s[p],JSON.parse(JSON.stringify(d))); save(s); notify(); },
    delete:async()=>{ const s=load(); delete s[p]; save(s); notify(); },
    onSnapshot:n=>{ const f=()=>n(snap(p)); subs.push(f); setTimeout(f,0); return ()=>{ const i=subs.indexOf(f); if(i>=0) subs.splice(i,1); }; }});
  const col=p=>({path:p,
    doc:id=>doc(p+"/"+(id||Math.random().toString(36).slice(2,12))),
    add:async d=>{ const r=doc(p+"/"+Math.random().toString(36).slice(2,12)); await r.set(d); return r; },
    get:async()=>{ const s=load(); const docs=Object.keys(s).filter(k=>k.startsWith(p+"/")&&k.split("/").length===p.split("/").length+1).map(snap); return {docs,size:docs.length,empty:!docs.length}; },
    onSnapshot:n=>{ const f=()=>{ const s=load(); const docs=Object.keys(s).filter(k=>k.startsWith(p+"/")&&k.split("/").length===p.split("/").length+1).map(snap); n({docs,size:docs.length,empty:!docs.length,docChanges:()=>[],metadata:{}}); }; subs.push(f); setTimeout(f,0); return ()=>{ const i=subs.indexOf(f); if(i>=0) subs.splice(i,1); }; }});
  addEventListener("storage",e=>{ if(e.key===DB) notify(); });
  const teacher=ME==="u_teacher";
  const user={id:async()=>ME,canEdit:async()=>teacher,isOwner:async()=>teacher,can:async()=>true,
    profiles:async ids=>Object.fromEntries([].concat(ids).map(i=>[i,{id:i,name:(PEOPLE[i]||"Learner").replace(" (teacher)",""),avatarUrl:"",color:"#888",email:null,isMe:i===ME,guest:false}]))};
  window.claude={use:async n=>n==="db"?{doc,collection:col}:n==="user"?user:null};
  // per-person progress on the shared demo device
  const pk=KEY+"::"+ME, cur=localStorage.getItem(pk);
  if(cur!=null) localStorage.setItem(KEY,cur); else localStorage.removeItem(KEY);
  hookProgress(v=>{ try{ if(v==null) localStorage.removeItem(pk); else origSet.call(localStorage,pk,v); }catch(e){} });
  strip(`<span><b>Demo mode</b><span class="tag">no accounts yet</span></span>
    <span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><label for="acct-as" style="font-weight:500">Viewing as</label>
    <select id="acct-as">${Object.entries(PEOPLE).map(([k,v])=>`<option value="${k}" ${k===ME?"selected":""}>${esc(v)}</option>`).join("")}</select>
    <button id="acct-reset" title="Clear the demo class data on this device">Reset demo</button></span>`);
  $("acct-as").onchange=e=>{ localStorage.setItem(RK,e.target.value); location.reload(); };
  $("acct-reset").onclick=()=>{ if(!confirm("Clear all demo class work and progress on this device?")) return; Object.keys(localStorage).filter(k=>k===DB||k.startsWith(KEY)).forEach(k=>localStorage.removeItem(k)); location.reload(); };
  bootApp();
}

// progress hook: mirror the app's progress key somewhere else (per-person store or the account)
let origSet=Storage.prototype.setItem, origRemove=Storage.prototype.removeItem;
function hookProgress(cb){
  Storage.prototype.setItem=function(k,v){ origSet.apply(this,arguments); if(this===localStorage&&k===KEY) cb(String(v)); };
  Storage.prototype.removeItem=function(k){ origRemove.apply(this,arguments); if(this===localStorage&&k===KEY) cb(null); };
}

// =====================================================================
// FIREBASE MODE: real accounts
// =====================================================================
function firebaseMode(){
  addCss();
  firebase.initializeApp(CFG);
  const auth=firebase.auth(), fs=firebase.firestore();
  try{ fs.settings({ignoreUndefinedProperties:true,merge:true}); }catch(e){}
  try{ fs.enablePersistence({synchronizeTabs:true}).catch(()=>{}); }catch(e){}
  let signingUp=false, newUid=null, current=null; // newUid: account made in this tab; the sign-up form finishes it, not the auth listener

  const ERR={"auth/email-already-in-use":"An account with this email already exists. Sign in instead, or reset your password.",
    "auth/invalid-email":"That email address does not look right.","auth/weak-password":"Use a password of at least 6 characters.",
    "auth/user-not-found":"Email or password is not correct.","auth/wrong-password":"Email or password is not correct.","auth/invalid-credential":"Email or password is not correct.","auth/invalid-login-credentials":"Email or password is not correct.",
    "auth/too-many-requests":"Too many attempts. Wait a few minutes and try again.","auth/network-request-failed":"No internet connection. Connect and try again.",
    "auth/missing-password":"Enter your password.","auth/operation-not-allowed":"Email sign-in is not switched on for this app yet (Firebase console → Authentication → Sign-in method → Email/Password)."};
  const errText=e=>ERR[e&&e.code]||(e&&e.code==="no-class"?"No class has that code. Check it with your teacher.":(e&&e.code==="permission-denied"?"You do not have permission for that.":"Something went wrong ("+esc((e&&(e.code||e.message))||"error")+"). Try again."));

  // ---------- class helpers ----------
  const ALPH="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const newCode=()=>Array.from({length:6},()=>ALPH[Math.floor(Math.random()*ALPH.length)]).join("");
  async function createClass(uid,info){
    for(let i=0;i<6;i++){ const code=newCode(); try{ await fs.doc("classes/"+code).set({owner:uid,name:info.className||"My class",school:info.school||"",teacher:info.name,created:new Date().toISOString()}); return code; }catch(e){ if(e.code!=="permission-denied") throw e; } }
    throw {code:"class-create"}; }
  async function joinClass(uid,code,info){
    code=String(code||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");
    const s=await fs.doc("classes/"+code).get(); if(!s.exists) throw {code:"no-class"};
    await fs.doc(`classes/${code}/members/${uid}`).set({name:info.name,email:info.email,joined:new Date().toISOString()});
    try{ const sub=fs.doc(`classes/${code}/subs/${uid}`); const ss=await sub.get(); if(!ss.exists) await sub.set({nick:info.name,work:{}}); }catch(e){}
    return code; }

  // ---------- gate (sign in / create account) ----------
  function gate(mode){
    let g=$("acct-gate"); if(!g){ g=document.createElement("div"); g.id="acct-gate"; g.className="acct-gate"; document.body.appendChild(g); }
    document.body.style.overflow="hidden";
    const head=`<img src="emblem.jpg" alt=""><h1>STEM<b>Light</b> LabLink</h1><p class="sub">Virtual science labs for every Zimbabwean learner</p>`;
    if(mode==="reset"){
      g.innerHTML=`<form class="acct-box" id="acct-form" novalidate>${head}<h2 style="font-size:1.05rem;margin:0 0 8px">Reset your password</h2>
        <div class="acct-f"><label for="a-email">Email</label><input id="a-email" type="email" autocomplete="email" required></div>
        <div id="acct-m" role="status"></div><button class="acct-btn" type="submit">Send reset link</button>
        <p style="text-align:center;margin:8px 0 0"><button type="button" class="acct-link" id="a-back">Back to sign in</button></p></form>`;
      $("a-back").onclick=()=>gate("in");
      $("acct-form").onsubmit=async e=>{ e.preventDefault(); const b=e.submitter||e.target.querySelector("[type=submit]"); b.disabled=true;
        try{ await auth.sendPasswordResetEmail($("a-email").value.trim()); $("acct-m").innerHTML=`<div class="acct-msg ok">If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.</div>`; }
        catch(err){ $("acct-m").innerHTML=`<div class="acct-msg">${errText(err)}</div>`; } b.disabled=false; };
      return; }
    const up=mode==="up";
    g.innerHTML=`<form class="acct-box" id="acct-form" novalidate>${head}
      <div class="acct-tabs" role="tablist"><button type="button" role="tab" aria-selected="${!up}" id="t-in">Sign in</button><button type="button" role="tab" aria-selected="${up}" id="t-up">Create account</button></div>
      ${up?`<div class="acct-role" role="radiogroup" aria-label="I am a"><label><input type="radio" name="role" value="learner" checked>Learner<small>Join my teacher's class</small></label><label><input type="radio" name="role" value="teacher">Teacher<small>Set work for my class</small></label></div>
      <div class="acct-f"><label for="a-name">Full name</label><input id="a-name" autocomplete="name" maxlength="60" required></div>`:""}
      <div class="acct-f"><label for="a-email">Email</label><input id="a-email" type="email" autocomplete="email" required></div>
      <div class="acct-f"><label for="a-pw">Password${up?" (at least 6 characters)":""}</label><input id="a-pw" type="password" autocomplete="${up?"new-password":"current-password"}" minlength="6" required></div>
      ${up?`<div class="acct-f"><label for="a-school">School</label><input id="a-school" maxlength="80" autocomplete="organization" placeholder="e.g. Mzilikazi High School"></div>
      <div class="acct-f" id="f-code"><label for="a-code">Class code from your teacher (optional)</label><input id="a-code" maxlength="8" autocapitalize="characters" placeholder="e.g. K7Q2MX" style="text-transform:uppercase;letter-spacing:.1em"></div>
      <div class="acct-f" id="f-class" hidden><label for="a-class">Class name</label><input id="a-class" maxlength="60" placeholder="e.g. Form 4B Physics"></div>`:""}
      <div id="acct-m" role="status"></div>
      <button class="acct-btn" type="submit">${up?"Create account":"Sign in"}</button>
      ${up?"":`<p style="text-align:center;margin:8px 0 0"><button type="button" class="acct-link" id="a-forgot">Forgot password?</button></p>`}
      <p class="acct-note">Your progress and class work are saved to your account, so you can use any phone or computer.</p></form>`;
    $("t-in").onclick=()=>gate("in"); $("t-up").onclick=()=>gate("up");
    if($("a-forgot")) $("a-forgot").onclick=()=>gate("reset");
    if(up) g.querySelectorAll("input[name=role]").forEach(r=>r.onchange=()=>{ const t=g.querySelector("input[name=role]:checked").value==="teacher"; $("f-code").hidden=t; $("f-class").hidden=!t; });
    $("acct-form").onsubmit=async e=>{
      e.preventDefault(); const btn=$("acct-form").querySelector("[type=submit]"), m=$("acct-m"); m.innerHTML="";
      const email=$("a-email").value.trim(), pw=$("a-pw").value;
      if(up&&!$("a-name").value.trim()){ m.innerHTML=`<div class="acct-msg">Enter your full name.</div>`; return; }
      btn.disabled=true; btn.textContent=up?"Creating your account…":"Signing in…";
      try{
        if(!up){ await auth.signInWithEmailAndPassword(email,pw); return; }
        const role=g.querySelector("input[name=role]:checked").value, info={name:$("a-name").value.trim().slice(0,60),email,school:$("a-school").value.trim().slice(0,80),className:($("a-class").value||"").trim().slice(0,60)};
        signingUp=true;
        const cred=await auth.createUserWithEmailAndPassword(email,pw), uid=cred.user.uid; newUid=uid;
        try{ await cred.user.updateProfile({displayName:info.name}); }catch(_){}
        let classCode="", note="";
        if(role==="teacher") classCode=await createClass(uid,info);
        else if($("a-code").value.trim()){ try{ classCode=await joinClass(uid,$("a-code").value,info); }catch(err){ note=err.code==="no-class"?"Your account is ready, but no class has that code. You can join a class later: tap Account at the top of the page.":""; } }
        await fs.doc("users/"+uid).set({name:info.name,email,role,school:info.school,classCode,progress:"",created:new Date().toISOString()});
        try{ await cred.user.sendEmailVerification(); }catch(_){}
        signingUp=false;
        if(note){ m.innerHTML=`<div class="acct-msg">${esc(note)}</div>`; btn.disabled=false; btn.textContent="Continue"; btn.type="button"; btn.onclick=()=>enter(cred.user); return; }
        enter(cred.user);
      }catch(err){ signingUp=false; m.innerHTML=`<div class="acct-msg">${errText(err)}</div>`; btn.disabled=false; btn.textContent=up?"Create account":"Sign in"; }
    };
    setTimeout(()=>{ const f=$(up?"a-name":"a-email"); if(f) f.focus(); },50);
  }
  function closeGate(){ const g=$("acct-gate"); if(g) g.remove(); document.body.style.overflow=""; }

  // ---------- after sign-in ----------
  async function enter(u){
    if(booted){ if(current&&current.uid!==u.uid) location.reload(); return; }
    let snap; try{ snap=await fs.doc("users/"+u.uid).get(); }catch(e){ snap=null; }
    let prof=snap&&snap.exists?snap.data():null;
    if(!prof){ // account without a profile (e.g. sign-up interrupted): make a learner profile
      prof={name:u.displayName||(u.email||"").split("@")[0],email:u.email||"",role:"learner",school:"",classCode:"",progress:"",created:new Date().toISOString()};
      try{ await fs.doc("users/"+u.uid).set(prof); }catch(e){} }
    current={uid:u.uid,user:u,prof};
    // the teacher owns their class; check so a teacher profile never edits someone else's class
    let owner=false; if(prof.classCode){ try{ const c=await fs.doc("classes/"+prof.classCode).get(); owner=c.exists&&c.data().owner===u.uid; current.cls=c.exists?c.data():null; }catch(e){} }
    current.teacher=prof.role==="teacher"&&owner;
    // progress: the account's copy wins; nothing from another person on this device carries over
    if(prof.progress) origSet.call(localStorage,KEY,prof.progress); else origRemove.call(localStorage,KEY);
    let t=null; hookProgress(v=>{ clearTimeout(t); t=setTimeout(()=>{ fs.doc("users/"+u.uid).update({progress:v||""}).catch(()=>{}); },1200); });
    const prefix=prof.classCode?`classes/${prof.classCode}/`:null;
    const flat=(o,pre,out)=>{ for(const k in o){ const v=o[k]; if(v&&typeof v==="object"&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length) flat(v,pre+k+".",out); else out[pre+k]=v; } return out; };
    // learner submissions are labelled with the assignment they change (_k) so the security rules can protect teacher marks
    const tag=(p,d)=>{ if(/^subs\//.test(p)&&d&&d.work&&typeof d.work==="object"){ const ks=Object.keys(d.work); if(ks.length===1) return Object.assign({},d,{_k:ks[0]}); } return d; };
    const wrapDoc=(r,p)=>({id:r.id,path:r.path,get:()=>r.get(),set:d=>r.set(tag(p,d)),delete:()=>r.delete(),onSnapshot:(n,e)=>r.onSnapshot(n,e||(()=>{})),
      update:d=>r.update(flat(tag(p,d),"",{}))}); // deep-merge like the LabLink data API, not replace whole maps
    const db=prefix?{doc:p=>wrapDoc(fs.doc(prefix+p),p),collection:p=>{ const c=fs.collection(prefix+p); return {path:c.path,doc:id=>{ const r=id?c.doc(id):c.doc(); return wrapDoc(r,p+"/"+r.id); },add:async d=>{ const r=await c.add(d); return wrapDoc(r,p+"/"+r.id); },get:()=>c.get(),onSnapshot:(n,e)=>c.onSnapshot(n,e||(()=>{}))}; }}:null;
    const user={id:async()=>u.uid,canEdit:async()=>current.teacher,isOwner:async()=>current.teacher,can:async()=>true,
      profiles:async ids=>{ const out={}; await Promise.all([].concat(ids).map(async i=>{ let name=""; try{ const s=await fs.doc(`classes/${prof.classCode}/members/${i}`).get(); if(s.exists) name=s.data().name||""; }catch(e){} out[i]={id:i,name,avatarUrl:"",color:"#888",email:null,isMe:i===u.uid,guest:false}; })); return out; }};
    window.claude={use:async n=>n==="db"?db:n==="user"?user:null};
    closeGate(); renderStrip(); bootApp();
  }
  function renderStrip(){
    const p=current.prof, roleT=current.teacher?"Teacher":"Learner";
    strip(`<span><b>${esc(p.name)}</b><span class="tag">${roleT}</span>${p.classCode?` <span style="opacity:.85">· ${current.cls?esc(current.cls.name):"Class"} <span style="font-family:'IBM Plex Mono',monospace">${esc(p.classCode)}</span></span>`:` <span style="opacity:.85">· no class yet</span>`}</span>
      <span style="display:flex;gap:6px"><button id="acct-open">Account</button></span>`);
    $("acct-open").onclick=accountDialog;
  }
  function accountDialog(){
    const p=current.prof, d=document.createElement("div"); d.className="acct-dlg"; d.setAttribute("role","dialog"); d.setAttribute("aria-modal","true");
    const teacher=current.teacher;
    d.innerHTML=`<div class="acct-box"><h1 style="text-align:left;font-size:1.15rem">Your account</h1>
      <div style="margin:10px 0"><div class="acct-row"><span>Name</span><span>${esc(p.name)}</span></div><div class="acct-row"><span>Email</span><span style="word-break:break-all">${esc(p.email)}</span></div><div class="acct-row"><span>Role</span><span>${teacher?"Teacher":"Learner"}</span></div>${p.school?`<div class="acct-row"><span>School</span><span>${esc(p.school)}</span></div>`:""}</div>
      ${teacher?`<p style="margin:8px 0 0;font-size:.9rem"><b>Class code</b> for ${esc((current.cls&&current.cls.name)||"your class")}. Learners enter it when they create their account, or from Account → Join a class.</p><div class="acct-code">${esc(p.classCode)}</div><button class="acct-btn alt" id="acct-copy">Copy class code</button>`
      :`<div class="acct-f" style="margin-top:6px"><label for="acct-jc">${p.classCode?"Move to another class: enter its code":"Join a class: enter the code from your teacher"}</label><input id="acct-jc" maxlength="8" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.1em"></div><button class="acct-btn alt" id="acct-join">Join class</button>`}
      <div id="acct-dm" role="status"></div>
      <button class="acct-btn" id="acct-out" style="margin-top:14px;background:#b4442f">Sign out</button>
      <p style="text-align:center;margin:6px 0 0"><button class="acct-link" id="acct-close">Close</button></p></div>`;
    document.body.appendChild(d);
    const close=()=>d.remove(); $("acct-close").onclick=close; d.onclick=e=>{ if(e.target===d) close(); }; d.addEventListener("keydown",e=>{ if(e.key==="Escape") close(); });
    $("acct-out").onclick=async()=>{ origRemove.call(localStorage,KEY); await auth.signOut(); location.reload(); };
    if($("acct-copy")) $("acct-copy").onclick=()=>{ try{ navigator.clipboard.writeText(p.classCode); $("acct-dm").innerHTML=`<div class="acct-msg ok">Class code copied.</div>`; }catch(e){} };
    if($("acct-join")) $("acct-join").onclick=async()=>{ const b=$("acct-join"); b.disabled=true;
      try{ const code=await joinClass(current.uid,$("acct-jc").value,{name:p.name,email:p.email}); await fs.doc("users/"+current.uid).update({classCode:code}); location.reload(); }
      catch(err){ $("acct-dm").innerHTML=`<div class="acct-msg">${errText(err)}</div>`; b.disabled=false; } };
    setTimeout(()=>$("acct-close").focus(),30);
  }

  // loading screen until Firebase reports the sign-in state
  gate("loading"); $("acct-gate").innerHTML=`<div class="acct-box" style="text-align:center"><img src="emblem.jpg" alt=""><h1>STEM<b>Light</b> LabLink</h1><p class="sub">Loading…</p></div>`;
  auth.onAuthStateChanged(u=>{ if(signingUp||(u&&u.uid===newUid)) return; if(!u){ if(booted){ location.reload(); return; } gate("in"); return; } enter(u); });
}

if(window.claude&&typeof window.claude.use==="function") bootApp();
else if(FB){ try{ firebaseMode(); }catch(e){ console.error(e); demoMode(); } }
else demoMode();
})();
