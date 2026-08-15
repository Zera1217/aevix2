const app = document.getElementById("app");
const bg = document.getElementById("bg");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));

async function api(url, options = {}) {
  const r = await fetch(url, options);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Bir hata oluştu.");
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
  bg.innerHTML = "";
  bg.style.backgroundImage = "";

  if (!media || !media.url) return;

  if (media.type === "video") {
    const video = document.createElement("video");
    video.src = media.url;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    bg.appendChild(video);
  } else {
    bg.style.backgroundImage = `url("${media.url}")`;
  }
}

/* =========================
   ROUTER
========================= */

async function route() {
  const path = location.pathname;

  if (path.startsWith("/p/")) {
    return profilePage(decodeURIComponent(path.slice(3)));
  }

  if (path !== "/" && path !== "") {
    return profilePage(decodeURIComponent(path.slice(1)));
  }

  try {
    await api("/api/me");
    return dashboard();
  } catch {
    return home();
  }
}

/* =========================
   HOME
========================= */

function home() {
  setBackground(null);

  app.innerHTML = `
    <div class="home">

      <nav class="nav">
        <div class="logo">
          <span class="logo-mark">A</span>
          <span>AEVIX</span>
        </div>

        <div class="nav-actions">
          <button class="nav-link" id="loginBtn">Giriş yap</button>
          <button class="nav-cta" id="createBtn">Profil oluştur</button>
        </div>
      </nav>

      <main class="landing">

        <section class="hero-section">

          <div class="hero-copy">
            <div class="eyebrow">
              <span></span>
              YOUR DIGITAL SPACE
            </div>

            <h1>
              Kendini.
              <strong>Tek bir linkte.</strong>
            </h1>

            <p>
              AEVIX ile sosyal hesaplarını, bağlantılarını,
              müziklerini ve dijital kimliğini tek bir profilde birleştir.
            </p>

            <div class="hero-buttons">
              <button class="big-button" id="heroCreate">
                Profilimi oluştur
                <span>→</span>
              </button>

              <button class="ghost-button" id="heroLogin">
                Zaten hesabım var
              </button>
            </div>

            <div class="mini-info">
              <div class="mini-dot"></div>
              Ücretsiz profil · Kişiselleştirilebilir · AEVIX
            </div>
          </div>

          <div class="profile-preview">

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

              <p class="preview-description">
                Welcome to my corner of the internet.
              </p>

              <div class="preview-tags">
                <span>creator</span>
                <span>developer</span>
                <span>gamer</span>
              </div>

              <div class="preview-links">
                <div>◎ Instagram <b>↗</b></div>
                <div>◉ Discord <b>↗</b></div>
                <div>♪ Spotify <b>↗</b></div>
                <div>◆ My Website <b>↗</b></div>
              </div>

              <div class="preview-footer">
                <span>AEVIX</span>
                <span>digital identity</span>
              </div>

            </div>
          </div>

        </section>

        <section class="feature-section">

          <div class="section-title">
            <span>WHY AEVIX</span>
            <h2>Profilinden daha fazlası.</h2>
          </div>

          <div class="features">

            <article>
              <div class="feature-number">01</div>
              <h3>Kendi alanın</h3>
              <p>
                Sana ait bir profil oluştur ve istediğin şekilde
                kişiselleştir.
              </p>
            </article>

            <article>
              <div class="feature-number">02</div>
              <h3>Her şey tek yerde</h3>
              <p>
                Sosyal medya hesaplarını, uygulamalarını ve
                bağlantılarını tek profilde topla.
              </p>
            </article>

            <article>
              <div class="feature-number">03</div>
              <h3>Senin tarzın</h3>
              <p>
                Tema renginden arka plana, avatarından müziğine
                kadar profilini kendin tasarla.
              </p>
            </article>

          </div>

        </section>

        <section class="final-section">
          <span>READY?</span>
          <h2>Dijital kimliğini<br>şimdi oluştur.</h2>
          <button class="big-button" id="bottomCreate">
            AEVIX'e katıl
            <span>→</span>
          </button>
        </section>

        <footer>
          <div>AEVIX</div>
          <span>your space on the internet.</span>
        </footer>

      </main>
    </div>
  `;

  document.querySelector("#createBtn").onclick = authPage;
  document.querySelector("#heroCreate").onclick = authPage;
  document.querySelector("#bottomCreate").onclick = authPage;
  document.querySelector("#loginBtn").onclick = authPage;
  document.querySelector("#heroLogin").onclick = authPage;
}

/* =========================
   AUTH
========================= */

function authPage() {
  setBackground(null);

  app.innerHTML = `
    <div class="auth-screen">

      <button class="back-button" id="backHome">← Ana sayfa</button>

      <div class="auth-panel">

        <div class="auth-logo">
          <span>A</span> AEVIX
        </div>

        <div class="auth-heading">
          <div class="auth-eyebrow">AEVIX ACCOUNT</div>
          <h1 id="authTitle">Tekrar hoş geldin.</h1>
          <p id="authSubtitle">
            Hesabına giriş yap ve profilini yönet.
          </p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab active" id="loginTab">
            Giriş
          </button>

          <button class="auth-tab" id="registerTab">
            Kayıt
          </button>
        </div>

        <form id="authForm"></form>

        <div id="authError"></div>

      </div>
    </div>
  `;

  let mode = "login";

  const form = document.querySelector("#authForm");
  const error = document.querySelector("#authError");

  document.querySelector("#backHome").onclick = () => {
    history.pushState({}, "", "/");
    home();
  };

  function draw() {
    const login = mode === "login";

    document.querySelector("#loginTab").classList.toggle("active", login);
    document.querySelector("#registerTab").classList.toggle("active", !login);

    document.querySelector("#authTitle").textContent =
      login ? "Tekrar hoş geldin." : "AEVIX'e katıl.";

    document.querySelector("#authSubtitle").textContent =
      login
        ? "Hesabına giriş yap ve profilini yönet."
        : "Kendi dijital alanını birkaç saniyede oluştur.";

    error.textContent = "";

    if (login) {
      form.innerHTML = `
        <div class="input-group">
          <label>E-POSTA</label>
          <input
            name="email"
            type="email"
            autocomplete="email"
            required
          >
        </div>

        <div class="input-group">
          <label>ŞİFRE</label>
          <input
            name="password"
            type="password"
            autocomplete="current-password"
            required
          >
        </div>

        <button class="submit-button">
          Giriş yap <span>→</span>
        </button>

        <button type="button" class="forgot-button" id="forgot">
          Şifremi unuttum
        </button>
      `;
    } else {
      form.innerHTML = `
        <div class="input-group">
          <label>E-POSTA</label>
          <input
            name="email"
            type="email"
            autocomplete="email"
            required
          >
        </div>

        <div class="input-group">
          <label>KULLANICI ADI</label>
          <input
            name="username"
            autocomplete="username"
            maxlength="24"
            required
          >
          <small>3-24 karakter · harf, sayı ve _</small>
        </div>

        <div class="input-group">
          <label>ŞİFRE</label>
          <input
            name="password"
            type="password"
            autocomplete="new-password"
            minlength="6"
            required
          >
        </div>

        <div class="input-group">
          <label>ŞİFRE TEKRARI</label>
          <input
            name="passwordConfirm"
            type="password"
            autocomplete="new-password"
            minlength="6"
            required
          >
        </div>

        <button class="submit-button">
          Hesap oluştur <span>→</span>
        </button>
      `;
    }

    if (document.querySelector("#forgot")) {
      document.querySelector("#forgot").onclick = resetPage;
    }
  }

  document.querySelector("#loginTab").onclick = () => {
    mode = "login";
    draw();
  };

  document.querySelector("#registerTab").onclick = () => {
    mode = "register";
    draw();
  };

  form.onsubmit = async (e) => {
    e.preventDefault();

    error.textContent = "";

    const body = Object.fromEntries(
      new FormData(form).entries()
    );

    try {
      await api(
        mode === "login"
          ? "/api/login"
          : "/api/register",
        json("POST", body)
      );

      location.href = "/";
    } catch (e) {
      error.className = "auth-error";
      error.textContent = e.message;
    }
  };

  draw();
}

/* =========================
   PASSWORD RESET
========================= */

function resetPage() {
  app.innerHTML = `
    <div class="auth-screen">

      <button class="back-button" id="resetBack">
        ← Geri
      </button>

      <div class="auth-panel">

        <div class="auth-logo">
          <span>A</span> AEVIX
        </div>

        <div class="auth-heading">
          <div class="auth-eyebrow">PASSWORD RESET</div>
          <h1>Şifreni yenile.</h1>
          <p>
            Hesabına bağlı e-posta adresini gir.
          </p>
        </div>

        <form id="resetForm">

          <div class="input-group">
            <label>E-POSTA</label>
            <input id="resetEmail" type="email" required>
          </div>

          <button class="submit-button">
            Kod gönder <span>→</span>
          </button>

        </form>

        <div id="resetError"></div>
        <div id="resetArea"></div>

      </div>
    </div>
  `;

  document.querySelector("#resetBack").onclick = authPage;

  document.querySelector("#resetForm").onsubmit = async (e) => {
    e.preventDefault();

    const email = document.querySelector("#resetEmail").value;
    const error = document.querySelector("#resetError");

    try {
      const data = await api(
        "/api/request-reset",
        json("POST", { email })
      );

      document.querySelector("#resetArea").innerHTML = `
        <div class="reset-message">
          ${esc(data.message)}
        </div>

        <form id="finishReset">

          <div class="input-group">
            <label>6 HANELİ KOD</label>
            <input id="code" maxlength="6" inputmode="numeric" required>
          </div>

          <div class="input-group">
            <label>YENİ ŞİFRE</label>
            <input id="newPassword" type="password" minlength="6" required>
          </div>

          <button class="submit-button">
            Şifreyi değiştir <span>→</span>
          </button>

        </form>
      `;

      document.querySelector("#finishReset").onsubmit = async (ev) => {
        ev.preventDefault();

        try {
          await api(
            "/api/reset-password",
            json("POST", {
              email,
              code: document.querySelector("#code").value,
              newPassword: document.querySelector("#newPassword").value
            })
          );

          alert("Şifren değiştirildi.");
          authPage();
        } catch (x) {
          error.className = "auth-error";
          error.textContent = x.message;
        }
      };
    } catch (e) {
      error.className = "auth-error";
      error.textContent = e.message;
    }
  };
}

/* =========================
   DASHBOARD
========================= */

async function dashboard() {
  const data = await api("/api/me");

  app.innerHTML = `
    <div class="dashboard">

      <header class="dashboard-header">

        <div class="dashboard-brand">
          <div class="auth-logo">
            <span>A</span> AEVIX
          </div>

          <div class="dashboard-user">
            @${esc(data.user.username)}
          </div>
        </div>

        <div class="dashboard-actions">
          <button class="outline-button" id="viewPage">
            Profilim ↗
          </button>

          <button class="outline-button" id="logout">
            Çıkış
          </button>
        </div>

      </header>

      <div class="dashboard-layout">

        <aside class="dashboard-sidebar">

          <button class="dash-tab active" data-tab="settings">
            <span>◈</span>
            Profil
          </button>

          <button class="dash-tab" data-tab="links">
            <span>↗</span>
            Linkler
          </button>

          <button class="dash-tab" data-tab="page">
            <span>◎</span>
            Sayfam
          </button>

        </aside>

        <main id="dashboardContent"></main>

      </div>

    </div>
  `;

  document.querySelector("#logout").onclick = async () => {
    await api("/api/logout", { method: "POST" });
    location.href = "/";
  };

  document.querySelector("#viewPage").onclick = () => {
    location.href =
      "/" + encodeURIComponent(data.user.username);
  };

  document.querySelectorAll(".dash-tab").forEach((button) => {
    button.onclick = () => {
      showTab(button.dataset.tab, button, data);
    };
  });

  showTab(
    "settings",
    document.querySelector('[data-tab="settings"]'),
    data
  );
}

function showTab(tab, button, data) {
  document.querySelectorAll(".dash-tab")
    .forEach((x) => x.classList.remove("active"));

  button.classList.add("active");

  const content =
    document.querySelector("#dashboardContent");

  if (tab === "settings") settingsTab(content, data);
  if (tab === "links") linksTab(content, data);
  if (tab === "page") pageTab(content, data);
}

/* =========================
   SETTINGS
========================= */

function settingsTab(content, data) {
  content.innerHTML = `
    <div class="dashboard-card">

      <div class="card-heading">
        <div>
          <span>PROFILE</span>
          <h2>Profilini düzenle</h2>
        </div>
      </div>

      <div class="input-group">
        <label>BİYOGRAFİ</label>
        <textarea id="description" rows="4">${esc(
          data.user.description
        )}</textarea>
      </div>

      <div class="theme-row">
        <div>
          <label>TEMA RENGİ</label>
          <p>Profilindeki vurgu rengini seç.</p>
        </div>

        <input
          id="theme"
          class="color-input"
          type="color"
          value="${data.user.theme_color}"
        >

        <span id="hexColor">
          ${data.user.theme_color}
        </span>
      </div>

      <button class="submit-button small-submit" id="saveProfile">
        Değişiklikleri kaydet <span>→</span>
      </button>

      <div class="divider"></div>

      <div class="card-heading">
        <div>
          <span>MEDIA</span>
          <h2>Medyan</h2>
        </div>
      </div>

      ${uploadBox(
        "background",
        "Profil arka planı",
        "Fotoğraf veya video yükle."
      )}

      ${uploadBox(
        "audio",
        "Profil müziği",
        "MP3, WAV veya desteklenen ses dosyası."
      )}

      ${uploadBox(
        "avatar",
        "Avatar",
        "Profil fotoğrafını değiştir."
      )}

      <div class="divider"></div>

      <div class="card-heading">
        <div>
          <span>BADGES</span>
          <h2>Rozetler</h2>
        </div>
      </div>

      <div class="badges-area">
        ${
          data.badges.length
            ? data.badges.map(b => `
              <span class="badge"
                style="--badge:${b.color}">
                <i></i>
                ${esc(b.name)}
                ${
                  b.equipped
                    ? " ✓"
                    : `<button data-equip="${b.id}">kuşan</button>`
                }
              </span>
            `).join("")
            : `<span class="muted">
                Henüz rozet oluşturmadın.
              </span>`
        }
      </div>

      <div class="badge-create">

        <input
          id="badgeName"
          placeholder="Rozet adı"
          maxlength="20"
        >

        <input
          id="badgeColor"
          class="color-input"
          type="color"
          value="${data.user.theme_color}"
        >

        <button class="outline-button" id="addBadge">
          + Oluştur
        </button>

      </div>

    </div>
  `;

  document.querySelector("#theme").oninput = (e) => {
    document.documentElement.style.setProperty(
      "--accent",
      e.target.value
    );

    document.querySelector("#hexColor")
      .textContent = e.target.value;
  };

  document.querySelector("#saveProfile").onclick = async () => {
    try {
      await api(
        "/api/profile",
        json("POST", {
          description:
            document.querySelector("#description").value,
          themeColor:
            document.querySelector("#theme").value
        })
      );

      alert("Profil kaydedildi.");
    } catch (e) {
      alert(e.message);
    }
  };

  document.querySelectorAll("[data-equip]")
    .forEach((button) => {
      button.onclick = async () => {
        await api(
          "/api/badges/" + button.dataset.equip + "/equip",
          { method: "POST" }
        );

        dashboard();
      };
    });

  document.querySelector("#addBadge").onclick = async () => {
    try {
      await api(
        "/api/badges",
        json("POST", {
          name: document.querySelector("#badgeName").value,
          color: document.querySelector("#badgeColor").value
        })
      );

      dashboard();
    } catch (e) {
      alert(e.message);
    }
  };

  document.querySelectorAll(".upload-input")
    .forEach((input) => {
      input.onchange = async () => {
        if (!input.files[0]) return;

        const form = new FormData();
        form.append("file", input.files[0]);
        form.append("type", input.dataset.type);

        try {
          await api("/api/upload", {
            method: "POST",
            body: form
          });

          alert("Dosya yüklendi.");
          dashboard();
        } catch (e) {
          alert(e.message);
        }
      };
    });
}

function uploadBox(type, title, description) {
  const accept =
    type === "audio"
      ? "audio/*"
      : "image/*,video/*";

  return `
    <div class="upload-box">

      <div>
        <strong>${title}</strong>
        <p>${description}</p>
      </div>

      <label class="upload-button">
        Dosya seç
        <input
          class="upload-input"
          data-type="${type}"
          type="file"
          accept="${accept}"
        >
        <span class="upload-check">✓</span>
      </label>

    </div>
  `;
}

  return `
    <div class="upload-box">

      <div>
        <strong>${title}</strong>
        <p>${description}</p>
      </div>

      <label class="upload-button">
        Dosya seç
        <input
          class="upload-input"
          data-type="${type}"
          type="file"
          accept="${accept}"
        >
      </label>

    </div>
  `;
}

/* =========================
   LINKS
========================= */

function linksTab(content, data) {
  content.innerHTML = `
    <div class="dashboard-card">

      <div class="card-heading">
        <div>
          <span>LINKS</span>
          <h2>Bağlantıların</h2>
        </div>
      </div>

      <div class="preset-row">
        ${[
          "Discord",
          "Instagram",
          "Spotify",
          "Kick",
          "Twitch",
          "YouTube",
          "Steam"
        ].map(name => `
          <button
            class="preset-button"
            data-name="${name}">
            + ${name}
          </button>
        `).join("")}
      </div>

      <div class="input-group">
        <label>BAĞLANTI ADI</label>
        <input
          id="linkName"
          placeholder="Örn. Discord sunucum"
        >
      </div>

      <div class="input-group">
        <label>URL</label>
        <input
          id="linkUrl"
          type="url"
          placeholder="https://..."
        >
      </div>

      <div class="input-group">
        <label>İKON URL — OPSİYONEL</label>
        <input
          id="linkIcon"
          type="url"
          placeholder="https://..."
        >
      </div>

      <button class="submit-button small-submit" id="addLink">
        Bağlantı ekle <span>→</span>
      </button>

      <div class="saved-links">

        ${
          data.links.length
            ? data.links.map(link => `
              <div class="saved-link">

                <a
                  href="${esc(link.url)}"
                  target="_blank"
                  rel="noopener">
                  ${esc(link.name)}
                </a>

                <button data-delete="${link.id}">
                  Sil
                </button>

              </div>
            `).join("")
            : `<p class="muted">Henüz bağlantı eklemedin.</p>`
        }

      </div>

    </div>
  `;

  document.querySelectorAll(".preset-button")
    .forEach(button => {
      button.onclick = () => {
        document.querySelector("#linkName").value =
          button.dataset.name;
      };
    });

  document.querySelector("#addLink").onclick = async () => {
    try {
      await api(
        "/api/links",
        json("POST", {
          name: document.querySelector("#linkName").value,
          url: document.querySelector("#linkUrl").value,
          iconUrl: document.querySelector("#linkIcon").value
        })
      );

      dashboard();
    } catch (e) {
      alert(e.message);
    }
  };

  document.querySelectorAll("[data-delete]")
    .forEach(button => {
      button.onclick = async () => {
        await api(
          "/api/links/" + button.dataset.delete,
          { method: "DELETE" }
        );

        dashboard();
      };
    });
}

/* =========================
   PAGE
========================= */

function pageTab(content, data) {
  const url =
    location.origin +
    "/" +
    encodeURIComponent(data.user.username);

  content.innerHTML = `
    <div class="dashboard-card">

      <div class="card-heading">
        <div>
          <span>YOUR PAGE</span>
          <h2>Profil adresin</h2>
        </div>
      </div>

      <p class="muted">
        Bu bağlantıyı arkadaşlarınla paylaşabilirsin.
      </p>

      <div class="page-url">
        <input readonly value="${url}">
        <button class="outline-button" id="openProfile">
          Aç ↗
        </button>
      </div>

    </div>
  `;

  document.querySelector("#openProfile").onclick =
    () => location.href = url;
}

/* =========================
   PUBLIC PROFILE
========================= */

async function profilePage(username) {
  try {
    const p = await api(
      "/api/profile/" + encodeURIComponent(username)
    );

    document.documentElement.style.setProperty(
      "--accent",
      p.themeColor || "#8b5cf6"
    );

    setBackground({
      url: p.backgroundUrl,
      type: p.backgroundType
    });

    app.innerHTML = `
      <main class="public-profile">

        <div class="public-card">

          <div class="public-header">

            ${
              p.avatarUrl
                ? p.avatarType === "video"
                  ? `
                    <video
                      class="public-avatar"
                      src="${esc(p.avatarUrl)}"
                      autoplay
                      muted
                      loop
                      playsinline>
                    </video>
                  `
                  : `
                    <img
                      class="public-avatar"
                      src="${esc(p.avatarUrl)}">
                  `
                : `
                  <div class="public-avatar">
                    ${esc(p.username[0]?.toUpperCase() || "A")}
                  </div>
                `
            }

            <div class="public-info">
              <div class="public-username">
                @${esc(p.username)}
              </div>

              <p>
                ${esc(p.description)}
              </p>
            </div>

          </div>

          ${
            p.badges.filter(b => b.equipped).length
              ? `
                <div class="public-badges">
                  ${p.badges
                    .filter(b => b.equipped)
                    .map(b => `
                      <span style="--badge:${b.color}">
                        <i></i>
                        ${esc(b.name)}
                      </span>
                    `).join("")
                  }
                </div>
              `
              : ""
          }

          ${
            p.audioUrl
              ? `
                <div class="audio-control">
                  <span>♪</span>
                  <input
                    id="volume"
                    type="range"
                    min="0"
                    max="100"
                    value="45">
                  <span>music</span>
                </div>
              `
              : ""
          }

          <div class="public-links">

            ${
              p.links.length
                ? p.links.map(link => `
                  <a
                    href="${esc(link.url)}"
                    target="_blank"
                    rel="noopener"
                    class="public-link">

                    ${
                      link.icon_url
                        ? `
                          <img src="${esc(link.icon_url)}">
                        `
                        : `
                          <span class="link-icon">↗</span>
                        `
                    }

                    <span>${esc(link.name)}</span>

                    <b>↗</b>
                  </a>
                `).join("")
                : `
                  <div class="empty-public">
                    Bu profil henüz bağlantı eklememiş.
                  </div>
                `
            }

          </div>

          <div class="public-footer">
            <span>AEVIX</span>
            <span>digital identity</span>
          </div>

        </div>

      </main>
    `;

    if (p.audioUrl) {
      const audio = new Audio(p.audioUrl);
      audio.loop = true;
      audio.volume = 0.45;

      const volume = document.querySelector("#volume");

      volume.oninput = () => {
        audio.volume =
          Number(volume.value) / 100;
      };

      const start = () => {
        audio.play().catch(() => {});
      };

      document.addEventListener(
        "click",
        start,
        { once: true }
      );
    }

  } catch {
    setBackground(null);

    app.innerHTML = `
      <div class="not-found">

        <div class="not-found-code">404</div>

        <h1>Profil bulunamadı.</h1>

        <p>
          @${esc(username)} adına kayıtlı bir AEVIX profili yok.
        </p>

        <button
          class="big-button"
          onclick="location.href='/'">
          Ana sayfaya dön →
        </button>

      </div>
    `;
  }
}

window.addEventListener("popstate", route);

route();
