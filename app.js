const app = document.getElementById("app");
const bg = document.getElementById("bg");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
async function api(url, options={}) {
  const r = await fetch(url, options);
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.error || "Bir hata oluştu.");
  return data;
}
function json(method, body) {
  return { method, headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) };
}
function letters(word) {
  return [...word].map((x,i)=>`<span class="aevix-letter" style="transition-delay:${i*12}ms">${esc(x)}</span>`).join("");
}
function shell() {
  return `<div class="grid"></div>`;
}
function setBackground(u) {
  bg.innerHTML = "";
  if (!u) return;
  if (u.type === "video") {
    const v = document.createElement("video");
    v.src = u.url; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
    bg.appendChild(v);
  } else {
    bg.style.backgroundImage = `url("${u.url}")`;
  }
}
async function route() {
  const path = location.pathname;
  if (path.startsWith("/p/")) return profilePage(decodeURIComponent(path.slice(3)));
  if (path !== "/" && path !== "") return profilePage(decodeURIComponent(path.slice(1)));
  try { await api("/api/me"); return dashboard(); } catch {}
  return home();
}

function home() {
  app.innerHTML = shell() + `
    <header class="topbar"><div class="brand">AEVIX</div><button class="pill-btn" id="create">＋ Profil Oluştur</button></header>
    <main class="hero">
      <div class="kicker">the #1 bio platform ✦</div>
      <div class="aevix-word">${letters("aevix")}</div>
      <p class="tagline">dijital kimliğini tek bir adreste topla.</p>
      <div class="stats"><span class="dot"></span>0 üye　·　minimalist bio</div>
      <div class="empty">Henüz kayıtlı üye bulunmuyor.<br><a href="#" id="first">İlk profili sen oluştur →</a></div>
    </main>`;
  document.querySelector("#create").onclick = authPage;
  document.querySelector("#first").onclick = e => { e.preventDefault(); authPage(); };
}

function authPage() {
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <div class="brand">AEVIX</div><h1 id="authTitle">Hoş geldin.</h1><p class="sub">Dijital kimliğini oluştur.</p>
    <div class="tabs"><button class="tab active" id="loginTab">Giriş Yap</button><button class="tab" id="registerTab">Kayıt Ol</button></div>
    <form id="authForm"></form>
    <div id="authError"></div>
  </div></div>`;
  let mode="login";
  const form=document.querySelector("#authForm"), err=document.querySelector("#authError");
  function draw(){
    document.querySelector("#loginTab").classList.toggle("active",mode==="login");
    document.querySelector("#registerTab").classList.toggle("active",mode==="register");
    document.querySelector("#authTitle").textContent=mode==="login"?"Hoş geldin.":"AEVIX'e katıl.";
    form.innerHTML = mode==="login" ? `
      <div class="field"><label>E-POSTA</label><input id="email" type="email" required></div>
      <div class="field"><label>ŞİFRE</label><input id="password" type="password" required></div>
      <button class="primary">Giriş Yap</button>
      <button type="button" class="link-btn" id="forgot">Şifrenizi mi unuttunuz?</button>`
    : `
      <div class="field"><label>E-POSTA</label><input id="email" type="email" required></div>
      <div class="field"><label>KULLANICI ADI</label><input id="username" required maxlength="24"></div>
      <div class="field"><label>ŞİFRE</label><input id="password" type="password" required></div>
      <div class="field"><label>ŞİFRE DOĞRULA</label><input id="passwordConfirm" type="password" required></div>
      <button class="primary">Kayıt Ol</button>`;
    if(document.querySelector("#forgot")) document.querySelector("#forgot").onclick=resetPage;
  }
  document.querySelector("#loginTab").onclick=()=>{mode="login";draw()};
  document.querySelector("#registerTab").onclick=()=>{mode="register";draw()};
  form.onsubmit=async e=>{
    e.preventDefault(); err.textContent="";
    const body=Object.fromEntries(new FormData(form).entries());
    try {
      await api(mode==="login"?"/api/login":"/api/register", json("POST",body));
      location.href="/";
    } catch(e){err.className="error";err.textContent=e.message}
  };
  draw();
}

function resetPage() {
  app.innerHTML = `<div class="auth-wrap"><div class="auth-card">
    <div class="brand">AEVIX</div><h1>Şifre yenile.</h1><p class="sub">E-postana 6 haneli bir kod göndereceğiz.</p>
    <form id="resetReq">
      <div class="field"><label>E-POSTA</label><input id="email" type="email" required></div>
      <button class="primary">Kod Gönder</button>
    </form><div id="resetArea"></div><div id="authError"></div>
  </div></div>`;
  document.querySelector("#resetReq").onsubmit=async e=>{
    e.preventDefault(); const email=document.querySelector("#email").value;
    try {
      const d=await api("/api/request-reset",json("POST",{email}));
      document.querySelector("#resetArea").innerHTML=`
        <form id="finishReset">
          <div class="field"><label>6 HANELİ KOD</label><input id="code" inputmode="numeric" maxlength="6" required></div>
          <div class="field"><label>YENİ ŞİFRE</label><input id="newPassword" type="password" required></div>
          <button class="primary">Şifreyi Değiştir</button>
        </form><p class="small">${esc(d.message)}</p>`;
      document.querySelector("#finishReset").onsubmit=async ev=>{
        ev.preventDefault();
        try {
          await api("/api/reset-password",json("POST",{email,code:document.querySelector("#code").value,newPassword:document.querySelector("#newPassword").value}));
          alert("Şifren değiştirildi."); authPage();
        } catch(x){document.querySelector("#authError").textContent=x.message}
      };
    } catch(e){document.querySelector("#authError").textContent=e.message}
  };
}

async function dashboard() {
  const data=await api("/api/me");
  app.innerHTML=`<div class="dashboard">
    <div class="dash-head"><div><div class="brand">AEVIX</div><div class="small">@${esc(data.user.username)}</div></div><div class="row"><button class="pill-btn" id="view">Sayfam ↗</button><button class="pill-btn" id="logout">Çıkış</button></div></div>
    <div class="layout"><aside class="side">
      <button class="active" data-tab="settings">⚙ Ayarlar</button>
      <button data-tab="links">↗ Linklerim</button>
      <button data-tab="page">◉ Sayfam</button>
    </aside><section id="content"></section></div>
  </div>`;
  document.querySelector("#logout").onclick=async()=>{await api("/api/logout",{method:"POST"});location.href="/"};
  document.querySelector("#view").onclick=()=>location.href="/"+encodeURIComponent(data.user.username);
  document.querySelectorAll(".side button").forEach(b=>b.onclick=()=>showTab(b.dataset.tab,b,data));
  showTab("settings",document.querySelector('[data-tab="settings"]'),data);
}

function showTab(tab,btn,data) {
  document.querySelectorAll(".side button").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
  const c=document.querySelector("#content");
  if(tab==="settings") settingsTab(c,data);
  if(tab==="links") linksTab(c,data);
  if(tab==="page") pageTab(c,data);
}

function settingsTab(c,data) {
  c.innerHTML=`<div class="content-card"><h2>Ayarlar</h2>
    <div class="field"><label>PROFİL AÇIKLAMASI</label><textarea id="desc" rows="3" placeholder="Profilinde görünecek açıklama...">${esc(data.user.description)}</textarea></div>
    <div class="field"><label>TEMA RENGİ</label><div class="row"><input class="color" id="theme" type="color" value="${data.user.theme_color}"><span id="hex">${data.user.theme_color}</span></div></div>
    <button class="primary" id="saveProfile">Değişiklikleri Kaydet</button>
    <hr style="border:0;border-top:1px solid var(--border);margin:28px 0">
    <h2>Medya</h2>
    ${uploadBox("background","Arka Plan","Fotoğraf veya video seç. Profil arkasında koyu + blur katmanıyla gösterilir.")}
    ${uploadBox("audio","Arka Plan Sesi","MP3, WAV vb. ses dosyanı seç.")}
    ${uploadBox("avatar","Profil Resmi","Fotoğraf veya video seç.")}
    <hr style="border:0;border-top:1px solid var(--border);margin:28px 0">
    <h2>Rozetler</h2>
    <div class="row">${data.badges.map(b=>`<span class="badge" style="border-color:${b.color}66"><i class="badge-dot" style="background:${b.color}"></i>${esc(b.name)} ${b.equipped?"✓":"<button data-eq='"+b.id+"' style='background:none;border:0;color:#aaa'>kuşan</button>"}</span>`).join("") || '<span class="small">Henüz rozet yok.</span>'}</div>
    <div class="row" style="margin-top:12px"><input id="badgeName" placeholder="Rozet adı"><input class="color" id="badgeColor" type="color" value="${data.user.theme_color}"><button class="pill-btn" id="addBadge">＋ Rozet Oluştur</button></div>
  </div>`;
  document.querySelector("#theme").oninput=e=>{document.documentElement.style.setProperty("--accent",e.target.value);document.querySelector("#hex").textContent=e.target.value};
  document.querySelector("#saveProfile").onclick=async()=>{await api("/api/profile",json("POST",{description:document.querySelector("#desc").value,themeColor:document.querySelector("#theme").value}));alert("Kaydedildi.")};
  document.querySelectorAll("[data-eq]").forEach(b=>b.onclick=async()=>{await api("/api/badges/"+b.dataset.eq+"/equip",{method:"POST"});dashboard()});
  document.querySelector("#addBadge").onclick=async()=>{try{await api("/api/badges",json("POST",{name:document.querySelector("#badgeName").value,color:document.querySelector("#badgeColor").value}));dashboard()}catch(e){alert(e.message)}};
  document.querySelectorAll(".upload input").forEach(input=>input.onchange=async()=>{
    if(!input.files[0])return; const fd=new FormData(); fd.append("file",input.files[0]);fd.append("type",input.dataset.type);
    try{await api("/api/upload",{method:"POST",body:fd});alert("Yüklendi.");dashboard()}catch(e){alert(e.message)}
  });
}
function uploadBox(type,title,desc){return `<div class="upload"><div><b>${title}</b><div class="small">${desc}</div></div><input data-type="${type}" type="file" accept="${type==="audio"?"audio/*":type==="avatar"?"image/*,video/*":"image/*,video/*"}"></div>`}

function linksTab(c,data) {
  c.innerHTML=`<div class="content-card"><h2>Linklerim</h2><p class="sub">Sosyal hesaplarını ve kendi uygulamalarını profilinde göster.</p>
    <div class="row">
      ${["Discord","Instagram","Spotify","Kick","Twitch","YouTube","Steam"].map(x=>`<button class="pill-btn preset" data-name="${x}">＋ ${x}</button>`).join("")}
    </div>
    <div style="margin-top:25px" class="field"><label>UYGULAMA ADI</label><input id="lname" placeholder="Örn. Minecraft Sunucum"></div>
    <div class="field"><label>LINK</label><input id="lurl" type="url" placeholder="https://..."></div>
    <div class="field"><label>İKON / FOTOĞRAF (OPSİYONEL)</label><input id="licon" type="url" placeholder="https://..."></div>
    <button class="primary" id="addLink">＋ Uygulama Ekle</button>
    <div class="link-list">${data.links.map(l=>`<div class="link-item"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a><button class="pill-btn" data-del="${l.id}">Sil</button></div>`).join("")}</div>
  </div>`;
  document.querySelectorAll(".preset").forEach(b=>b.onclick=()=>document.querySelector("#lname").value=b.dataset.name);
  document.querySelector("#addLink").onclick=async()=>{try{await api("/api/links",json("POST",{name:document.querySelector("#lname").value,url:document.querySelector("#lurl").value,iconUrl:document.querySelector("#licon").value}));dashboard()}catch(e){alert(e.message)}};
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{await api("/api/links/"+b.dataset.del,{method:"DELETE"});dashboard()});
}

function pageTab(c,data) {
  c.innerHTML=`<div class="content-card"><h2>Sayfam</h2><p class="sub">Profil adresin:</p><div class="row"><input readonly value="${location.origin}/${esc(data.user.username)}" style="flex:1"><button class="pill-btn" id="openPage">Aç ↗</button></div><p class="small" style="margin-top:20px">Bu linki başkalarıyla paylaştığında profilini görebilirler.</p></div>`;
  document.querySelector("#openPage").onclick=()=>location.href="/"+encodeURIComponent(data.user.username);
}

async function profilePage(username) {
  try {
    const p=await api("/api/profile/"+encodeURIComponent(username));
    document.documentElement.style.setProperty("--accent",p.themeColor);
    setBackground({url:p.backgroundUrl,type:p.backgroundType});
    app.innerHTML=shell()+`<main class="profile-page">
      <section class="profile-card">
        <div class="profile-top">
          ${p.avatarUrl ? (p.avatarType==="video"?`<video class="avatar" src="${p.avatarUrl}" autoplay muted loop playsinline></video>`:`<img class="avatar" src="${p.avatarUrl}">`) : `<div class="avatar"></div>`}
          <div><div class="profile-name">${esc(p.username)}</div>
          <div class="profile-desc">${esc(p.description)}</div>
          <div class="badges">${p.badges.filter(x=>x.equipped).map(b=>`<span class="badge" style="border-color:${b.color}66"><i class="badge-dot" style="background:${b.color}"></i>${esc(b.name)}</span>`).join("")}</div></div>
        </div>
        <div class="audio-bar"><span>ses</span><input id="volume" type="range" min="0" max="100" value="45"><span>◖</span></div>
        <div class="profile-links">${p.links.map(l=>`<a class="profile-link" href="${esc(l.url)}" target="_blank" rel="noopener">${l.icon_url?`<img src="${esc(l.icon_url)}" style="width:18px;height:18px;vertical-align:middle;border-radius:5px"> `:""}${esc(l.name)}</a>`).join("")}</div>
      </section>
    </main>`;
    if(p.audioUrl){
      const audio=new Audio(p.audioUrl); audio.loop=true; audio.volume=.45;
      const vol=document.querySelector("#volume");
      vol.oninput=()=>audio.volume=Number(vol.value)/100;
      // Browsers may block autoplay; first click starts it.
      const start=()=>audio.play().catch(()=>{}); document.addEventListener("click",start,{once:true});
    }
  } catch {
    app.innerHTML=`<div class="auth-wrap"><div class="auth-card"><div class="brand">AEVIX</div><h1>Profil bulunamadı.</h1><p class="sub">@${esc(username)} için kayıtlı bir AEVIX profili yok.</p><button class="primary" onclick="location.href='/'">Ana sayfaya dön</button></div></div>`;
  }
}

route();
