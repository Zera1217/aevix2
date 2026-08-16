const app = document.getElementById("app");
const bg = document.getElementById("bg");

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Bir hata oluştu.");
  return data;
}

function json(method, body) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

function setBackground(media) {
  bg.replaceChildren();
  bg.style.backgroundImage = "";
  bg.className = "";

  if (!media?.url) {
    bg.classList.add("plain-bg");
    return;
  }

  if (media.type === "video") {
    const video = document.createElement("video");
    video.className = "background-video";
    video.src = media.url;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    bg.appendChild(video);
  } else {
    bg.style.backgroundImage = `url("${media.url.replaceAll('"', '\\"')}")`;
  }
}

function go(path) {
  history.pushState({}, "", path);
  route();
}

async function route() {
  const path = decodeURIComponent(location.pathname);

  try {
    if (path.startsWith("/p/") && path.length > 3) {
      return await profilePage(path.slice(3));
    }

    if (path !== "/" && path.length > 1) {
      return await profilePage(path.slice(1));
    }

    try {
      await api("/api/me");
      return await dashboard();
    } catch {
      return home();
    }
  } catch (error) {
    console.error(error);
    setBackground(null);
    app.innerHTML = `
      <div class="fatal">
        <div class="fatal-icon">!</div>
        <h1>AEVIX yüklenirken bir sorun oldu.</h1>
        <p>${esc(error.message || "Bilinmeyen hata.")}</p>
        <button class="primary" id="fatalReload">Yenile</button>
      </div>`;
    document.getElementById("fatalReload").onclick = () => location.reload();
  }
}

function home() {
  setBackground(null);
  app.innerHTML = `
    <div class="home">
      <nav class="nav">
        <button class="brand" id="homeBrand" aria-label="AEVIX ana sayfa">
          <span class="brand-mark">A</span><span>AEVIX</span>
        </button>
        <div class="nav-actions">
          <button class="text-button" id="loginBtn">Giriş yap</button>
          <button class="primary compact" id="createBtn">Profil oluştur</button>
        </div>
      </nav>

      <main class="landing">
        <section class="hero-section">
          <div class="hero-copy">
            <div class="eyebrow"><i></i> YOUR DIGITAL SPACE</div>
            <h1>Kendini.<strong>Tek bir linkte.</strong></h1>
            <p>
              AEVIX ile sosyal hesaplarını, bağlantılarını, müziklerini
              ve dijital kimliğini tek bir profilde birleştir.
            </p>
            <div class="hero-buttons">
              <button class="primary big" id="heroCreate">Profilimi oluştur <span>→</span></button>
              <button class="secondary big" id="heroLogin">Zaten hesabım var</button>
            </div>
            <div class="mini-info"><i></i> Ücretsiz profil · Kişiselleştirilebilir · AEVIX</div>
          </div>

          <div class="preview-wrap">
            <div class="preview-glow"></div>
            <div class="preview-card">
              <div class="preview-top">
                <div class="preview-avatar">Z</div>
                <div>
                  <div class="preview-name">yourname</div>
                  <div class="preview-handle">@yourname</div>
                </div>
                <div class="preview-menu">•••</div>
              </div>
              <p class="preview-description">Welcome to my corner of the internet.</p>
              <div class="preview-tags"><span>creator</span><span>developer</span><span>gamer</span></div>
              <div class="preview-links">
                <div>◎ Instagram <b>↗</b></div>
                <div>◉ Discord <b>↗</b></div>
                <div>♪ Spotify <b>↗</b></div>
                <div>◆ My Website <b>↗</b></div>
              </div>
              <div class="preview-footer"><span>AEVIX</span><span>digital identity</span></div>
            </div>
          </div>
        </section>

        <section class="feature-section">
          <div class="section-title"><span>WHY AEVIX</span><h2>Profilinden daha fazlası.</h2></div>
          <div class="features">
            <article><div class="feature-number">01</div><h3>Kendi alanın</h3><p>Sana ait bir profil oluştur ve istediğin şekilde kişiselleştir.</p></article>
            <article><div class="feature-number">02</div><h3>Her şey tek yerde</h3><p>Sosyal medya hesaplarını, uygulamalarını ve bağlantılarını tek profilde topla.</p></article>
            <article><div class="feature-number">03</div><h3>Senin tarzın</h3><p>Tema renginden arka plana, avatarından müziğine kadar profilini kendin tasarla.</p></article>
          </div>
        </section>

        <section class="final-section">
          <span>READY?</span>
          <h2>Dijital kimliğini<br>şimdi oluştur.</h2>
          <button class="primary big" id="bottomCreate">AEVIX'e katıl <span>→</span></button>
        </section>

        <footer><strong>AEVIX</strong><span>your space on the internet.</span></footer>
      </main>
    </div>`;

  ["createBtn", "heroCreate", "bottomCreate", "loginBtn", "heroLogin"].forEach((id) => {
    document.getElementById(id).onclick = authPage;
  });
  document.getElementById("homeBrand").onclick = () => go("/");
}

function authPage() {
  setBackground(null);
  app.innerHTML = `
    <div class="auth-screen">
      <button class="back-button" id="backHome">← Ana sayfa</button>
      <div class="auth-panel">
        <div class="auth-logo"><span>A</span> AEVIX</div>
        <div class="auth-heading">
          <div class="auth-eyebrow">AEVIX ACCOUNT</div>
          <h1 id="authTitle">Tekrar hoş geldin.</h1>
          <p id="authSubtitle">Hesabına giriş yap ve profilini yönet.</p>
        </div>
        <div class="auth-tabs">
          <button class="auth-tab active" id="loginTab">Giriş</button>
          <button class="auth-tab" id="registerTab">Kayıt</button>
        </div>
        <form id="authForm"></form>
        <div id="authError" class="form-error"></div>
      </div>
    </div>`;

  let mode = "login";
  const form = document.getElementById("authForm");
  const error = document.getElementById("authError");

  document.getElementById("backHome").onclick = () => go("/");

  function draw() {
    const login = mode === "login";
    document.getElementById("loginTab").classList.toggle("active", login);
    document.getElementById("registerTab").classList.toggle("active", !login);
    document.getElementById("authTitle").textContent = login ? "Tekrar hoş geldin." : "AEVIX'e katıl.";
    document.getElementById("authSubtitle").textContent = login
      ? "Hesabına giriş yap ve profilini yönet."
      : "Kendi dijital alanını birkaç saniyede oluştur.";
    error.textContent = "";

    form.innerHTML = login ? `
      <div class="input-group"><label>E-POSTA</label><input name="email" type="email" autocomplete="email" required></div>
      <div class="input-group"><label>ŞİFRE</label><input name="password" type="password" autocomplete="current-password" required></div>
      <button class="primary submit" type="submit">Giriş yap <span>→</span></button>
      <button class="forgot" type="button" id="forgot">Şifremi unuttum</button>
    ` : `
      <div class="input-group"><label>E-POSTA</label><input name="email" type="email" autocomplete="email" required></div>
      <div class="input-group"><label>KULLANICI ADI</label><input name="username" autocomplete="username" maxlength="24" required><small>3-24 karakter · harf, sayı ve _</small></div>
      <div class="input-group"><label>ŞİFRE</label><input name="password" type="password" autocomplete="new-password" minlength="6" required></div>
      <div class="input-group"><label>ŞİFRE TEKRARI</label><input name="passwordConfirm" type="password" autocomplete="new-password" minlength="6" required></div>
      <button class="primary submit" type="submit">Hesap oluştur <span>→</span></button>`;

    document.getElementById("forgot")?.addEventListener("click", resetPage);
  }

  document.getElementById("loginTab").onclick = () => { mode = "login"; draw(); };
  document.getElementById("registerTab").onclick = () => { mode = "register"; draw(); };

  form.onsubmit = async (e) => {
    e.preventDefault();
    error.textContent = "";
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      await api(mode === "login" ? "/api/login" : "/api/register", json("POST", body));
      location.href = "/";
    } catch (e) {
      error.textContent = e.message;
    }
  };

  draw();
}

function resetPage() {
  setBackground(null);
  app.innerHTML = `
    <div class="auth-screen">
      <button class="back-button" id="resetBack">← Geri</button>
      <div class="auth-panel">
        <div class="auth-logo"><span>A</span> AEVIX</div>
        <div class="auth-heading">
          <div class="auth-eyebrow">PASSWORD RESET</div>
          <h1>Şifreni yenile.</h1>
          <p>Hesabına bağlı e-posta adresini gir.</p>
        </div>
        <form id="resetForm">
          <div class="input-group"><label>E-POSTA</label><input id="resetEmail" type="email" required></div>
          <button class="primary submit">Kod gönder <span>→</span></button>
        </form>
        <div id="resetError" class="form-error"></div>
        <div id="resetArea"></div>
      </div>
    </div>`;

  document.getElementById("resetBack").onclick = authPage;
  const error = document.getElementById("resetError");

  document.getElementById("resetForm").onsubmit = async (e) => {
    e.preventDefault();
    error.textContent = "";
    const email = document.getElementById("resetEmail").value.trim();

    try {
      const data = await api("/api/request-reset", json("POST", { email }));
      document.getElementById("resetArea").innerHTML = `
        <div class="reset-message">${esc(data.message)}</div>
        <form id="finishReset">
          <div class="input-group"><label>6 HANELİ KOD</label><input id="code" maxlength="6" inputmode="numeric" required></div>
          <div class="input-group"><label>YENİ ŞİFRE</label><input id="newPassword" type="password" minlength="6" required></div>
          <button class="primary submit">Şifreyi değiştir <span>→</span></button>
        </form>`;
      document.getElementById("finishReset").onsubmit = async (ev) => {
        ev.preventDefault();
        try {
          await api("/api/reset-password", json("POST", {
            email,
            code: document.getElementById("code").value,
            newPassword: document.getElementById("newPassword").value
          }));
          alert("Şifren değiştirildi.");
          authPage();
        } catch (x) { error.textContent = x.message; }
      };
    } catch (e) { error.textContent = e.message; }
  };
}

async function dashboard() {
  const data = await api("/api/me");
  setBackground(null);

  app.innerHTML = `
    <div class="dashboard">
      <header class="dashboard-header">
        <button class="brand" id="dashHome"><span class="brand-mark">A</span><span>AEVIX</span></button>
        <div class="dashboard-user">@${esc(data.user.username)}</div>
        <div class="dashboard-actions">
          <button class="outline" id="viewPage">Profilim ↗</button>
          <button class="outline" id="logout">Çıkış</button>
        </div>
      </header>
      <div class="dashboard-layout">
        <aside class="dashboard-sidebar">
          <button class="dash-tab active" data-tab="settings"><span>◈</span> Profil</button>
          <button class="dash-tab" data-tab="links"><span>↗</span> Linkler</button>
          <button class="dash-tab" data-tab="page"><span>◎</span> Sayfam</button>
        </aside>
        <main id="dashboardContent"></main>
      </div>
    </div>`;

  document.getElementById("dashHome").onclick = () => go("/");
  document.getElementById("logout").onclick = async () => {
    await api("/api/logout", { method: "POST" });
    location.href = "/";
  };
  document.getElementById("viewPage").onclick = () => location.href = "/" + encodeURIComponent(data.user.username);

  document.querySelectorAll(".dash-tab").forEach((button) => {
    button.onclick = () => showTab(button.dataset.tab, button, data);
  });
  showTab("settings", document.querySelector('[data-tab="settings"]'), data);
}

function showTab(tab, button, data) {
  document.querySelectorAll(".dash-tab").forEach((x) => x.classList.remove("active"));
  button.classList.add("active");
  const content = document.getElementById("dashboardContent");
  if (tab === "settings") settingsTab(content, data);
  if (tab === "links") linksTab(content, data);
  if (tab === "page") pageTab(content, data);
}

function uploadBox(type, title, description) {
  const accept = type === "audio" ? "audio/*" : "image/*,video/*";
  return `
    <div class="upload-box">
      <div><strong>${title}</strong><p>${description}</p></div>
      <label class="upload-button">Dosya seç<input class="upload-input" data-type="${type}" type="file" accept="${accept}"></label>
    </div>`;
}

function settingsTab(content, data) {
  content.innerHTML = `
    <div class="dashboard-card">
      <div class="card-heading"><div><span>PROFILE</span><h2>Profilini düzenle</h2></div></div>
      <div class="input-group"><label>BİYOGRAFİ</label><textarea id="description" rows="4" maxlength="1000">${esc(data.user.description)}</textarea></div>

      <div class="theme-row">
        <div><label>TEMA RENGİ</label><p>Profilindeki vurgu rengini seç.</p></div>
        <input id="theme" class="color-input" type="color" value="${esc(data.user.theme_color)}">
        <span id="hexColor">${esc(data.user.theme_color)}</span>
      </div>

      <button class="primary submit small" id="saveProfile">Değişiklikleri kaydet <span>→</span></button>
      <div class="divider"></div>

      <div class="card-heading"><div><span>MEDIA</span><h2>Medya</h2></div></div>
      ${uploadBox("background", "Profil arka planı", "Fotoğraf, GIF veya video yükle.")}
      ${uploadBox("audio", "Profil müziği", "MP3, WAV veya desteklenen ses dosyası.")}
      ${uploadBox("avatar", "Avatar", "Fotoğraf, GIF veya video yükle.")}

      <div class="divider"></div>
      <div class="card-heading"><div><span>BADGES</span><h2>Rozetler</h2></div></div>
      <div class="badges-area">
        ${data.badges.length ? data.badges.map(b => `
          <div class="badge" style="--badge:${esc(b.color)}">
            <i></i><span>${esc(b.name)}</span>
            ${b.equipped ? '<b>✓</b>' : `<button data-equip="${b.id}">kuşan</button>`}
            <button class="badge-delete" data-delete-badge="${b.id}" title="Sil">×</button>
          </div>`).join("") : '<span class="muted">Henüz rozet oluşturmadın.</span>'}
      </div>

      <div class="badge-create">
        <input id="badgeName" placeholder="Rozet adı" maxlength="20">
        <input id="badgeColor" class="color-input" type="color" value="${esc(data.user.theme_color)}">
        <button class="outline" id="addBadge">+ Oluştur</button>
      </div>
    </div>`;

  const theme = document.getElementById("theme");
  theme.oninput = () => document.getElementById("hexColor").textContent = theme.value;

  document.getElementById("saveProfile").onclick = async () => {
    try {
      await api("/api/profile", json("POST", {
        description: document.getElementById("description").value,
        themeColor: theme.value
      }));
      alert("Profil kaydedildi.");
    } catch (e) { alert(e.message); }
  };

  document.querySelectorAll("[data-equip]").forEach(btn => {
    btn.onclick = async () => {
      try {
        await api("/api/badges/" + btn.dataset.equip + "/equip", { method: "POST" });
        dashboard();
      } catch (e) { alert(e.message); }
    };
  });

  document.querySelectorAll("[data-delete-badge]").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Bu rozeti silmek istiyor musun?")) return;
      await api("/api/badges/" + btn.dataset.deleteBadge, { method: "DELETE" });
      dashboard();
    };
  });

  document.getElementById("addBadge").onclick = async () => {
    try {
      const name = document.getElementById("badgeName").value.trim();
      await api("/api/badges", json("POST", {
        name, color: document.getElementById("badgeColor").value
      }));
      dashboard();
    } catch (e) { alert(e.message); }
  };

  document.querySelectorAll(".upload-input").forEach(input => {
    input.onchange = async () => {
      if (!input.files[0]) return;
      const form = new FormData();
      form.append("file", input.files[0]);
      form.append("type", input.dataset.type);
      try {
        await api("/api/upload", { method: "POST", body: form });
        alert("Dosya yüklendi.");
        dashboard();
      } catch (e) { alert(e.message); }
    };
  });
}

function linksTab(content, data) {
  const presets = ["Discord","Instagram","Spotify","Kick","Twitch","YouTube","Steam"];
  content.innerHTML = `
    <div class="dashboard-card">
      <div class="card-heading"><div><span>LINKS</span><h2>Bağlantıların</h2></div></div>
      <div class="preset-row">${presets.map(name => `<button class="preset-button" data-name="${name}">+ ${name}</button>`).join("")}</div>
      <div class="input-group"><label>BAĞLANTI ADI</label><input id="linkName" placeholder="Örn. Discord sunucum"></div>
      <div class="input-group"><label>URL</label><input id="linkUrl" type="url" placeholder="https://..."></div>
      <div class="input-group"><label>İKON URL — OPSİYONEL</label><input id="linkIcon" type="url" placeholder="https://..."></div>
      <button class="primary submit small" id="addLink">Bağlantı ekle <span>→</span></button>
      <div class="saved-links">
        ${data.links.length ? data.links.map(link => `
          <div class="saved-link">
            <a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.name)}</a>
            <button data-delete-link="${link.id}">Sil</button>
          </div>`).join("") : '<p class="muted">Henüz bağlantı eklemedin.</p>'}
      </div>
    </div>`;

  document.querySelectorAll(".preset-button").forEach(btn => {
    btn.onclick = () => document.getElementById("linkName").value = btn.dataset.name;
  });

  document.getElementById("addLink").onclick = async () => {
    try {
      await api("/api/links", json("POST", {
        name: document.getElementById("linkName").value,
        url: document.getElementById("linkUrl").value,
        iconUrl: document.getElementById("linkIcon").value
      }));
      dashboard();
    } catch (e) { alert(e.message); }
  };

  document.querySelectorAll("[data-delete-link]").forEach(btn => {
    btn.onclick = async () => {
      await api("/api/links/" + btn.dataset.deleteLink, { method: "DELETE" });
      dashboard();
    };
  });
}

function pageTab(content, data) {
  const url = location.origin + "/" + encodeURIComponent(data.user.username);
  content.innerHTML = `
    <div class="dashboard-card">
      <div class="card-heading"><div><span>YOUR PAGE</span><h2>Profil adresin</h2></div></div>
      <p class="muted">Bu bağlantıyı arkadaşlarınla paylaşabilirsin.</p>
      <div class="page-url"><input readonly value="${esc(url)}"><button class="outline" id="copyUrl">Kopyala</button><button class="outline" id="openProfile">Aç ↗</button></div>
    </div>`;

  document.getElementById("openProfile").onclick = () => location.href = url;
  document.getElementById("copyUrl").onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert("Profil bağlantısı kopyalandı.");
    } catch { alert(url); }
  };
}

async function profilePage(username) {
  try {
    const p = await api("/api/profile/" + encodeURIComponent(username));
    document.documentElement.style.setProperty("--accent", p.themeColor || "#9b7cff");

    setBackground({ url: p.backgroundUrl, type: p.backgroundType });

    app.innerHTML = `
      <main class="public-profile">
        <div class="public-card">
          <div class="public-top-actions">
            <button class="outline tiny" id="publicHome">AEVIX</button>
          </div>

          <div class="public-header">
            ${
              p.avatarUrl
                ? p.avatarType === "video"
                  ? `<video class="public-avatar" src="${esc(p.avatarUrl)}" autoplay muted loop playsinline></video>`
                  : `<img class="public-avatar" src="${esc(p.avatarUrl)}" alt="@${esc(p.username)}">`
                : `<div class="public-avatar">${esc(p.username[0]?.toUpperCase() || "A")}</div>`
            }
            <div class="public-info">
              <div class="public-username">@${esc(p.username)}</div>
              <p>${esc(p.description)}</p>
            </div>
          </div>

          ${p.badges.some(b => b.equipped) ? `
            <div class="public-badges">
              ${p.badges.filter(b => b.equipped).map(b => `<span style="--badge:${esc(b.color)}"><i></i>${esc(b.name)}</span>`).join("")}
            </div>` : ""}

          ${p.audioUrl ? `
            <div class="audio-control">
              <span>♪</span><input id="volume" type="range" min="0" max="100" value="45"><span>music</span>
            </div>` : ""}

          <div class="public-links">
            ${p.links.length ? p.links.map(link => `
              <a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer" class="public-link">
                ${link.icon_url ? `<img src="${esc(link.icon_url)}" alt="">` : `<span class="link-icon">↗</span>`}
                <span>${esc(link.name)}</span><b>↗</b>
              </a>`).join("") : `<div class="empty-public">Bu profil henüz bağlantı eklememiş.</div>`}
          </div>

          <div class="public-footer"><span>AEVIX</span><span>digital identity</span></div>
        </div>
      </main>`;

    document.getElementById("publicHome").onclick = () => go("/");

    if (p.audioUrl) {
      const audio = new Audio(p.audioUrl);
      audio.loop = true;
      audio.volume = 0.45;
      const volume = document.getElementById("volume");
      volume.oninput = () => audio.volume = Number(volume.value) / 100;

      const startAudio = () => audio.play().catch(() => {});
      document.addEventListener("pointerdown", startAudio, { once: true, passive: true });
      document.addEventListener("keydown", startAudio, { once: true });
    }
  } catch {
    setBackground(null);
    app.innerHTML = `
      <div class="not-found">
        <div class="not-found-code">404</div>
        <h1>Profil bulunamadı.</h1>
        <p>@${esc(username)} adına kayıtlı bir AEVIX profili yok.</p>
        <button class="primary big" id="notFoundHome">Ana sayfaya dön →</button>
      </div>`;
    document.getElementById("notFoundHome").onclick = () => go("/");
  }
}

window.addEventListener("popstate", route);
window.addEventListener("error", (e) => {
  console.error("AEVIX JS ERROR:", e.error || e.message);
});
route();
