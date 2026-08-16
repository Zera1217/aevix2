const app = document.getElementById("app");
const bg = document.getElementById("bg");

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]
  );


async function api(url, options = {}) {

  const response =
    await fetch(url, options);

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      "Bir hata oluştu."
    );
  }

  return data;
}


function json(method, body) {

  return {
    method,

    headers: {
      "Content-Type":
        "application/json"
    },

    body:
      JSON.stringify(body)
  };
}


/* =========================
   BACKGROUND
========================= */

function setBackground(
  url,
  type
) {

  bg.innerHTML = "";
  bg.className = "";

  if (!url) {
    return;
  }

  if (type === "video") {

    const video =
      document.createElement(
        "video"
      );

    video.className =
      "background-video";

    video.src = url;

    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    video.setAttribute(
      "playsinline",
      ""
    );

    video.setAttribute(
      "webkit-playsinline",
      ""
    );

    video.preload = "auto";

    bg.appendChild(video);

    video.play().catch(() => {});

  } else {

    bg.style.backgroundImage =
      `url("${url}")`;
  }
}


/* =========================
   ROUTER
========================= */

async function route() {

  const path =
    location.pathname;

  if (
    path === "/" ||
    path === ""
  ) {

    try {

      await api("/api/me");

      dashboard();

    } catch {

      home();
    }

    return;
  }

  const username =
    decodeURIComponent(
      path.startsWith("/p/")
        ? path.slice(3)
        : path.slice(1)
    );

  profilePage(username);
}


/* =========================
   HOME
========================= */

function home() {

  setBackground(
    null,
    null
  );

  app.innerHTML = `

    <div class="home">

      <nav class="nav">

        <div class="logo">
          <span class="logo-mark">A</span>
          AEVIX
        </div>

        <div class="nav-actions">

          <button
            class="nav-link"
            id="loginBtn">
            Giriş yap
          </button>

          <button
            class="nav-cta"
            id="createBtn">
            Profil oluştur
          </button>

        </div>

      </nav>


      <main class="landing">

        <section class="hero">

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
              Sosyal hesaplarını,
              bağlantılarını,
              müziğini ve dijital
              kimliğini tek bir
              AEVIX profilinde
              birleştir.
            </p>

            <div class="hero-buttons">

              <button
                class="big-button"
                id="heroCreate">
                Profilimi oluştur
                <span>→</span>
              </button>

              <button
                class="ghost-button"
                id="heroLogin">
                Zaten hesabım var
              </button>

            </div>

            <div class="mini-info">
              <span></span>
              Ücretsiz · Kişiselleştirilebilir · AEVIX
            </div>

          </div>


          <div class="preview-wrap">

            <div class="preview-card">

              <div class="preview-avatar">
                Z
              </div>

              <h3>
                @yourname
              </h3>

              <p>
                Welcome to my digital space.
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
                <div>◆ Website <b>↗</b></div>
              </div>

              <small>
                AEVIX · digital identity
              </small>

            </div>

          </div>

        </section>


        <section class="features-section">

          <div class="section-title">
            <span>WHY AEVIX</span>
            <h2>Profilinden daha fazlası.</h2>
          </div>

          <div class="features">

            <article>
              <strong>01</strong>
              <h3>Kendi alanın</h3>
              <p>
                Sana ait bir dijital profil.
              </p>
            </article>

            <article>
              <strong>02</strong>
              <h3>Her şey tek yerde</h3>
              <p>
                Linklerin, sosyal hesapların
                ve içeriklerin.
              </p>
            </article>

            <article>
              <strong>03</strong>
              <h3>Senin tarzın</h3>
              <p>
                Avatarından arka planına
                kadar tamamen sen.
              </p>
            </article>

          </div>

        </section>


        <section class="final-section">

          <span>READY?</span>

          <h2>
            Dijital kimliğini
            şimdi oluştur.
          </h2>

          <button
            class="big-button"
            id="bottomCreate">
            AEVIX'e katıl →
          </button>

        </section>

        <footer>
          AEVIX
          <span>
            your space on the internet.
          </span>
        </footer>

      </main>

    </div>
  `;


  document.getElementById(
    "createBtn"
  ).onclick = authPage;

  document.getElementById(
    "heroCreate"
  ).onclick = authPage;

  document.getElementById(
    "bottomCreate"
  ).onclick = authPage;

  document.getElementById(
    "loginBtn"
  ).onclick = authPage;

  document.getElementById(
    "heroLogin"
  ).onclick = authPage;
}


/* =========================
   AUTH
========================= */

function authPage() {

  setBackground(
    null,
    null
  );

  app.innerHTML = `

    <div class="auth-screen">

      <button
        class="back-button"
        id="backHome">
        ← Ana sayfa
      </button>

      <div class="auth-panel">

        <div class="auth-logo">
          <span>A</span>
          AEVIX
        </div>

        <div class="auth-heading">

          <span>
            AEVIX ACCOUNT
          </span>

          <h1 id="authTitle">
            Tekrar hoş geldin.
          </h1>

          <p id="authSubtitle">
            Hesabına giriş yap.
          </p>

        </div>


        <div class="auth-tabs">

          <button
            id="loginTab"
            class="auth-tab active">
            Giriş
          </button>

          <button
            id="registerTab"
            class="auth-tab">
            Kayıt
          </button>

        </div>


        <form id="authForm"></form>

        <div id="authError"></div>

      </div>

    </div>
  `;


  let mode = "login";

  const form =
    document.getElementById(
      "authForm"
    );

  const error =
    document.getElementById(
      "authError"
    );


  function draw() {

    const login =
      mode === "login";


    document.getElementById(
      "loginTab"
    ).classList.toggle(
      "active",
      login
    );


    document.getElementById(
      "registerTab"
    ).classList.toggle(
      "active",
      !login
    );


    document.getElementById(
      "authTitle"
    ).textContent =
      login
        ? "Tekrar hoş geldin."
        : "AEVIX'e katıl.";


    document.getElementById(
      "authSubtitle"
    ).textContent =
      login
        ? "Hesabına giriş yap ve profilini yönet."
        : "Kendi dijital alanını oluştur.";


    error.textContent = "";


    if (login) {

      form.innerHTML = `

        <div class="input-group">
          <label>E-POSTA</label>

          <input
            name="email"
            type="email"
            required>
        </div>

        <div class="input-group">
          <label>ŞİFRE</label>

          <input
            name="password"
            type="password"
            required>
        </div>

        <button class="submit-button">
          Giriş yap →
        </button>

        <button
          type="button"
          class="forgot-button"
          id="forgot">
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
            required>
        </div>

        <div class="input-group">
          <label>KULLANICI ADI</label>

          <input
            name="username"
            maxlength="24"
            required>

          <small>
            3-24 karakter · harf, sayı, _
          </small>
        </div>

        <div class="input-group">
          <label>ŞİFRE</label>

          <input
            name="password"
            type="password"
            minlength="6"
            required>
        </div>

        <div class="input-group">
          <label>ŞİFRE TEKRARI</label>

          <input
            name="passwordConfirm"
            type="password"
            minlength="6"
            required>
        </div>

        <button class="submit-button">
          Hesap oluştur →
        </button>

      `;
    }


    const forgot =
      document.getElementById(
        "forgot"
      );

    if (forgot) {
      forgot.onclick = resetPage;
    }
  }


  document.getElementById(
    "backHome"
  ).onclick = () => {

    history.pushState(
      {},
      "",
      "/"
    );

    home();
  };


  document.getElementById(
    "loginTab"
  ).onclick = () => {

    mode = "login";
    draw();
  };


  document.getElementById(
    "registerTab"
  ).onclick = () => {

    mode = "register";
    draw();
  };


  form.onsubmit =
    async (event) => {

      event.preventDefault();

      error.textContent = "";

      const body =
        Object.fromEntries(
          new FormData(form)
        );

      try {

        await api(
          mode === "login"
            ? "/api/login"
            : "/api/register",
          json(
            "POST",
            body
          )
        );

        location.href = "/";

      } catch (e) {

        error.className =
          "auth-error";

        error.textContent =
          e.message;
      }
    };


  draw();
}


/* =========================
   RESET
========================= */

function resetPage() {

  app.innerHTML = `

    <div class="auth-screen">

      <button
        class="back-button"
        id="resetBack">
        ← Geri
      </button>

      <div class="auth-panel">

        <div class="auth-logo">
          <span>A</span>
          AEVIX
        </div>

        <div class="auth-heading">
          <span>PASSWORD RESET</span>
          <h1>Şifreni yenile.</h1>
          <p>
            E-posta adresini gir.
          </p>
        </div>

        <form id="resetForm">

          <div class="input-group">
            <label>E-POSTA</label>

            <input
              id="resetEmail"
              type="email"
              required>
          </div>

          <button class="submit-button">
            Kod gönder →
          </button>

        </form>

        <div id="resetError"></div>

        <div id="resetArea"></div>

      </div>

    </div>
  `;


  document.getElementById(
    "resetBack"
  ).onclick = authPage;


  document.getElementById(
    "resetForm"
  ).onsubmit =
    async (event) => {

      event.preventDefault();

      const email =
        document.getElementById(
          "resetEmail"
        ).value;

      try {

        const result =
          await api(
            "/api/request-reset",
            json(
              "POST",
              { email }
            )
          );


        document.getElementById(
          "resetArea"
        ).innerHTML = `

          <div class="reset-message">
            ${esc(result.message)}
          </div>

          <form id="finishReset">

            <div class="input-group">
              <label>6 HANELİ KOD</label>

              <input
                id="resetCode"
                maxlength="6"
                required>
            </div>

            <div class="input-group">
              <label>YENİ ŞİFRE</label>

              <input
                id="newPassword"
                type="password"
                minlength="6"
                required>
            </div>

            <button class="submit-button">
              Şifreyi değiştir →
            </button>

          </form>
        `;


        document.getElementById(
          "finishReset"
        ).onsubmit =
          async (event) => {

            event.preventDefault();

            try {

              await api(
                "/api/reset-password",
                json(
                  "POST",
                  {
                    email,

                    code:
                      document.getElementById(
                        "resetCode"
                      ).value,

                    newPassword:
                      document.getElementById(
                        "newPassword"
                      ).value
                  }
                )
              );

              alert(
                "Şifren değiştirildi."
              );

              authPage();

            } catch (e) {

              document.getElementById(
                "resetError"
              ).textContent =
                e.message;
            }
          };
      }
    };
}


/* =========================
   DASHBOARD
========================= */

async function dashboard() {

  const data =
    await api("/api/me");


  app.innerHTML = `

    <div class="dashboard">

      <header class="dashboard-header">

        <div>

          <div class="auth-logo">
            <span>A</span>
            AEVIX
          </div>

          <div class="dashboard-user">
            @${esc(
              data.user.username
            )}
          </div>

        </div>


        <div class="dashboard-actions">

          <button
            class="outline-button"
            id="viewPage">
            Profilim ↗
          </button>

          <button
            class="outline-button"
            id="logout">
            Çıkış
          </button>

        </div>

      </header>


      <div class="dashboard-layout">

        <aside class="dashboard-sidebar">

          <button
            class="dash-tab active"
            data-tab="settings">
            ◈ Profil
          </button>

          <button
            class="dash-tab"
            data-tab="links">
            ↗ Linkler
          </button>

          <button
            class="dash-tab"
            data-tab="page">
            ◎ Sayfam
          </button>

        </aside>


        <main
          id="dashboardContent">
        </main>

      </div>

    </div>
  `;


  document.getElementById(
    "logout"
  ).onclick =
    async () => {

      await api(
        "/api/logout",
        {
          method: "POST"
        }
      );

      location.href = "/";
    };


  document.getElementById(
    "viewPage"
  ).onclick =
    () => {

      location.href =
        "/" +
        encodeURIComponent(
          data.user.username
        );
    };


  document
    .querySelectorAll(".dash-tab")
    .forEach(
      (button) => {

        button.onclick = () => {

          showTab(
            button.dataset.tab,
            button,
            data
          );
        };
      }
    );


  showTab(
    "settings",
    document.querySelector(
      '[data-tab="settings"]'
    ),
    data
  );
}


function showTab(
  tab,
  button,
  data
) {

  document
    .querySelectorAll(
      ".dash-tab"
    )
    .forEach(
      (item) =>
        item.classList.remove(
          "active"
        )
    );

  button.classList.add(
    "active"
  );


  const content =
    document.getElementById(
      "dashboardContent"
    );


  if (tab === "settings") {
    settingsTab(
      content,
      data
    );
  }

  if (tab === "links") {
    linksTab(
      content,
      data
    );
  }

  if (tab === "page") {
    pageTab(
      content,
      data
    );
  }
}


/* =========================
   SETTINGS
========================= */

function settingsTab(
  content,
  data
) {

  content.innerHTML = `

    <div class="dashboard-card">

      <div class="card-heading">
        <span>PROFILE</span>
        <h2>Profilini düzenle</h2>
      </div>


      <div class="input-group">

        <label>BİYOGRAFİ</label>

        <textarea
          id="description"
          rows="4">${esc(
            data.user.description
          )}</textarea>

      </div>


      <div class="theme-row">

        <div>
          <label>TEMA RENGİ</label>
          <p>
            Profilinin vurgu rengini seç.
          </p>
        </div>

        <input
          id="theme"
          type="color"
          value="${
            data.user.theme_color
          }">

        <span id="hexColor">
          ${data.user.theme_color}
        </span>

      </div>


      <button
        class="submit-button"
        id="saveProfile">
        Kaydet →
      </button>


      <div class="divider"></div>


      <div class="card-heading">
        <span>MEDIA</span>
        <h2>Medya</h2>
      </div>


      ${uploadBox(
        "background",
        "Profil arka planı",
        "Resim veya hareketli video."
      )}


      ${uploadBox(
        "avatar",
        "Avatar",
        "Resim veya hareketli video avatar."
      )}


      ${uploadBox(
        "audio",
        "Profil müziği",
        "MP3, WAV vb."
      )}


      <div class="divider"></div>


      <div class="card-heading">
        <span>BADGES</span>
        <h2>Rozetler</h2>
      </div>


      <div class="badges-area">

        ${
          data.badges.length
            ? data.badges
                .map(
                  (badge) => `

              <span
                class="badge"
                style="--badge:${badge.color}">

                ${esc(
                  badge.name
                )}

                ${
                  badge.equipped
                    ? " ✓"
                    : `
                      <button
                        data-equip="${badge.id}">
                        kuşan
                      </button>
                    `
                }

              </span>

            `
                )
                .join("")

            : `
              <span class="muted">
                Henüz rozet yok.
              </span>
            `
        }

      </div>


      <div class="badge-create">

        <input
          id="badgeName"
          maxlength="20"
          placeholder="Rozet adı">

        <input
          id="badgeColor"
          type="color"
          value="${
            data.user.theme_color
          }">

        <button
          class="outline-button"
          id="addBadge">
          + Oluştur
        </button>

      </div>

    </div>
  `;


  document.getElementById(
    "theme"
  ).oninput =
    (event) => {

      document.documentElement
        .style
        .setProperty(
          "--accent",
          event.target.value
        );

      document.getElementById(
        "hexColor"
      ).textContent =
        event.target.value;
    };


  document.getElementById(
    "saveProfile"
  ).onclick =
    async () => {

      try {

        await api(
          "/api/profile",
          json(
            "POST",
            {
              description:
                document.getElementById(
                  "description"
                ).value,

              themeColor:
                document.getElementById(
                  "theme"
                ).value
            }
          )
        );

        alert(
          "Profil kaydedildi."
        );

      } catch (e) {

        alert(e.message);
      }
    };


  document
    .querySelectorAll(
      "[data-equip]"
    )
    .forEach(
      (button) => {

        button.onclick =
          async () => {

            await api(
              `/api/badges/${button.dataset.equip}/equip`,
              {
                method: "POST"
              }
            );

            dashboard();
          };
      }
    );


  document.getElementById(
    "addBadge"
  ).onclick =
    async () => {

      try {

        await api(
          "/api/badges",
          json(
            "POST",
            {
              name:
                document.getElementById(
                  "badgeName"
                ).value,

              color:
                document.getElementById(
                  "badgeColor"
                ).value
            }
          )
        );

        dashboard();

      } catch (e) {

        alert(e.message);
      }
    };


  document
    .querySelectorAll(
      ".upload-input"
    )
    .forEach(
      (input) => {

        input.onchange =
          async () => {

            const file =
              input.files[0];

            if (!file) {
              return;
            }

            const formData =
              new FormData();

            formData.append(
              "file",
              file
            );

            formData.append(
              "type",
              input.dataset.type
            );

            try {

              await api(
                "/api/upload",
                {
                  method: "POST",
                  body: formData
                }
              );

              alert(
                "Dosya başarıyla yüklendi."
              );

              dashboard();

            } catch (e) {

              alert(e.message);
            }
          };
      }
    );
}


function uploadBox(
  type,
  title,
  description
) {

  const accept =
    type === "audio"
      ? "audio/*"
      : "image/*,video/*";


  return `

    <div class="upload-box">

      <div>

        <strong>
          ${title}
        </strong>

        <p>
          ${description}
        </p>

      </div>

      <label class="upload-button">

        Dosya seç

        <input
          class="upload-input"
          data-type="${type}"
          type="file"
          accept="${accept}">

      </label>

    </div>
  `;
}


/* =========================
   LINKS
========================= */

function linksTab(
  content,
  data
) {

  content.innerHTML = `

    <div class="dashboard-card">

      <div class="card-heading">
        <span>LINKS</span>
        <h2>Bağlantıların</h2>
      </div>


      <div class="preset-row">

        ${
          [
            "Discord",
            "Instagram",
            "Spotify",
            "YouTube",
            "Twitch",
            "Steam",
            "Kick"
          ]
            .map(
              (name) => `

              <button
                class="preset-button"
                data-name="${name}">
                + ${name}
              </button>

            `
            )
            .join("")
        }

      </div>


      <div class="input-group">

        <label>BAĞLANTI ADI</label>

        <input
          id="linkName"
          placeholder="Discord">

      </div>


      <div class="input-group">

        <label>URL</label>

        <input
          id="linkUrl"
          type="url"
          placeholder="https://...">

      </div>


      <div class="input-group">

        <label>İKON URL</label>

        <input
          id="linkIcon"
          placeholder="Opsiyonel">

      </div>


      <button
        class="submit-button"
        id="addLink">
        Bağlantı ekle →
      </button>


      <div class="saved-links">

        ${
          data.links.length

            ? data.links
                .map(
                  (link) => `

                <div class="saved-link">

                  <a
                    href="${esc(
                      link.url
                    )}"
                    target="_blank"
                    rel="noopener">
                    ${esc(
                      link.name
                    )}
                  </a>

                  <button
                    data-delete="${link.id}">
                    Sil
                  </button>

                </div>

              `
                )
                .join("")

            : `
              <p class="muted">
                Henüz bağlantı yok.
              </p>
            `
        }

      </div>

    </div>
  `;


  document
    .querySelectorAll(
      ".preset-button"
    )
    .forEach(
      (button) => {

        button.onclick =
          () => {

            document.getElementById(
              "linkName"
            ).value =
              button.dataset.name;
          };
      }
    );


  document.getElementById(
    "addLink"
  ).onclick =
    async () => {

      try {

        await api(
          "/api/links",
          json(
            "POST",
            {
              name:
                document.getElementById(
                  "linkName"
                ).value,

              url:
                document.getElementById(
                  "linkUrl"
                ).value,

              iconUrl:
                document.getElementById(
                  "linkIcon"
                ).value
            }
          )
        );

        dashboard();

      } catch (e) {

        alert(e.message);
      }
    };


  document
    .querySelectorAll(
      "[data-delete]"
    )
    .forEach(
      (button) => {

        button.onclick =
          async () => {

            await api(
              `/api/links/${button.dataset.delete}`,
              {
                method: "DELETE"
              }
            );

            dashboard();
          };
      }
    );
}


/* =========================
   PAGE
========================= */

function pageTab(
  content,
  data
) {

  const url =
    location.origin +
    "/" +
    encodeURIComponent(
      data.user.username
    );


  content.innerHTML = `

    <div class="dashboard-card">

      <div class="card-heading">
        <span>YOUR PAGE</span>
        <h2>Profil adresin</h2>
      </div>

      <p class="muted">
        Profilini paylaşmak için:
      </p>

      <div class="page-url">

        <input
          readonly
          value="${esc(url)}">

        <button
          class="outline-button"
          id="openProfile">
          Aç ↗
        </button>

      </div>

    </div>
  `;


  document.getElementById(
    "openProfile"
  ).onclick =
    () => {
      location.href = url;
    };
}


/* =========================
   PUBLIC PROFILE
========================= */

async function profilePage(
  username
) {

  try {

    const profile =
      await api(
        "/api/profile/" +
        encodeURIComponent(
          username
        )
      );


    document.documentElement
      .style
      .setProperty(
        "--accent",
        profile.themeColor ||
          "#9b7cff"
      );


    setBackground(
      profile.backgroundUrl,
      profile.backgroundType
    );


    const avatar =
      profile.avatarUrl
        ? profile.avatarType ===
          "video"

          ? `
            <video
              class="public-avatar video-avatar"
              src="${esc(
                profile.avatarUrl
              )}"
              autoplay
              muted
              loop
              playsinline
              webkit-playsinline
              preload="auto">
            </video>
          `

          : `
            <img
              class="public-avatar"
              src="${esc(
                profile.avatarUrl
              )}"
              alt="">
          `

        : `
          <div class="public-avatar">
            ${esc(
              (
                profile.username[0] ||
                "A"
              ).toUpperCase()
            )}
          </div>
        `;


    app.innerHTML = `

      <main class="public-profile">

        <div class="public-card">

          ${avatar}


          <div class="public-username">
            @${esc(
              profile.username
            )}
          </div>


          <p class="public-description">
            ${esc(
              profile.description
            )}
          </p>


          ${
            profile.badges.some(
              (badge) =>
                badge.equipped
            )

              ? `
                <div class="public-badges">

                  ${
                    profile.badges
                      .filter(
                        (badge) =>
                          badge.equipped
                      )
                      .map(
                        (badge) => `

                        <span
                          style="--badge:${badge.color}">
                          ${esc(
                            badge.name
                          )}
                        </span>

                      `
                      )
                      .join("")
                  }

                </div>
              `

              : ""
          }


          ${
            profile.audioUrl

              ? `
                <div class="music-box">

                  <button
                    id="musicButton">
                    ▶
                  </button>

                  <span>
                    Profile music
                  </span>

                </div>
              `

              : ""
          }


          <div class="public-links">

            ${
              profile.links.length

                ? profile.links
                    .map(
                      (link) => `

                      <a
                        class="public-link"
                        href="${esc(
                          link.url
                        )}"
                        target="_blank"
                        rel="noopener">

                        ${
                          link.icon_url

                            ? `
                              <img
                                src="${esc(
                                  link.icon_url
                                )}">
                            `

                            : `
                              <span>
                                ↗
                              </span>
                            `
                        }

                        <strong>
                          ${esc(
                            link.name
                          )}
                        </strong>

                        <b>
                          ↗
                        </b>

                      </a>

                    `
                    )
                    .join("")

                : `
                  <div class="empty-public">
                    Henüz bağlantı eklenmemiş.
                  </div>
                `
            }

          </div>


          <div class="public-footer">
            AEVIX
          </div>

        </div>

      </main>
    `;


    /* VIDEO AVATAR */

    const avatarVideo =
      document.querySelector(
        ".video-avatar"
      );

    if (avatarVideo) {

      avatarVideo.muted = true;
      avatarVideo.playsInline = true;

      avatarVideo.play().catch(() => {});

      document.addEventListener(
        "touchstart",
        () => {
          avatarVideo
            .play()
            .catch(() => {});
        },
        {
          once: true,
          passive: true
        }
      );
    }


    /* MUSIC */

    if (profile.audioUrl) {

      const audio =
        new Audio(
          profile.audioUrl
        );

      audio.loop = true;
      audio.volume = 0.45;

      const button =
        document.getElementById(
          "musicButton"
        );

      button.onclick =
        async () => {

          if (
            audio.paused
          ) {

            await audio
              .play();

            button.textContent =
              "Ⅱ";

          } else {

            audio.pause();

            button.textContent =
              "▶";
          }
        };
    }


  } catch {

    setBackground(
      null,
      null
    );

    app.innerHTML = `

      <div class="not-found">

        <div class="not-found-code">
          404
        </div>

        <h1>
          Profil bulunamadı.
        </h1>

        <p>
          @${esc(username)}
          adına kayıtlı bir AEVIX profili yok.
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


window.addEventListener(
  "popstate",
  route
);


route();
