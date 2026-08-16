const express = require("express");
const session = require("express-session");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const UPLOADS = path.join(ROOT, "uploads");

fs.mkdirSync(UPLOADS, { recursive: true });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      theme_color TEXT NOT NULL DEFAULT '#9b7cff',
      background_url TEXT NOT NULL DEFAULT '',
      background_type TEXT NOT NULL DEFAULT 'image',
      audio_url TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      avatar_type TEXT NOT NULL DEFAULT 'image',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS badges (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#9b7cff',
      equipped BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS links (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon_url TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS reset_codes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
  `);
  console.log("Database initialized.");
}

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "aevix-development-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use("/uploads", express.static(UPLOADS, {
  maxAge: "1h",
  fallthrough: false
}));
app.use(express.static(PUBLIC, { index: "index.html", maxAge: 0 }));

function auth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Giriş yapman gerekiyor." });
  }
  next();
}

async function getUserById(id) {
  const r = await query(`
    SELECT id,email,username,description,theme_color,
           background_url,background_type,audio_url,
           avatar_url,avatar_type
    FROM users WHERE id=$1
  `, [id]);
  return r.rows[0] || null;
}

async function getProfile(username) {
  const u = await query(`
    SELECT username,description,theme_color,
           background_url,background_type,audio_url,
           avatar_url,avatar_type
    FROM users WHERE LOWER(username)=LOWER($1)
  `, [username]);

  if (!u.rows[0]) return null;
  const user = u.rows[0];

  const badges = await query(`
    SELECT id,name,color,equipped
    FROM badges
    WHERE user_id=(SELECT id FROM users WHERE LOWER(username)=LOWER($1))
    ORDER BY id DESC
  `, [username]);

  const links = await query(`
    SELECT id,name,url,icon_url
    FROM links
    WHERE user_id=(SELECT id FROM users WHERE LOWER(username)=LOWER($1))
    ORDER BY id DESC
  `, [username]);

  return {
    username: user.username,
    description: user.description,
    themeColor: user.theme_color,
    backgroundUrl: user.background_url,
    backgroundType: user.background_type,
    audioUrl: user.audio_url,
    avatarUrl: user.avatar_url,
    avatarType: user.avatar_type,
    badges: badges.rows,
    links: links.rows
  };
}

app.get("/api/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true, service: "AEVIX" });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    const passwordConfirm = String(req.body.passwordConfirm || "");

    if (!email || !username || !password || password !== passwordConfirm) {
      return res.status(400).json({ error: "Tüm alanları doldur ve şifreleri aynı gir." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Geçerli bir e-posta gir." });
    }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return res.status(400).json({ error: "Kullanıcı adı 3-24 karakter olmalı; sadece harf, sayı ve _ kullanılabilir." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Şifre en az 6 karakter olmalı." });
    }

    const existing = await query(
      "SELECT id FROM users WHERE LOWER(email)=LOWER($1) OR LOWER(username)=LOWER($2)",
      [email, username]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: "Bu e-posta veya kullanıcı adı zaten kullanılıyor." });
    }

    const hash = await bcrypt.hash(password, 12);
    const created = await query(`
      INSERT INTO users(email,username,password_hash)
      VALUES($1,$2,$3) RETURNING id
    `, [email, username, hash]);

    req.session.userId = created.rows[0].id;
    res.json({ ok: true });
  } catch (e) {
    console.error("REGISTER", e);
    res.status(500).json({ error: "Kayıt sırasında hata oluştu." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const r = await query("SELECT * FROM users WHERE LOWER(email)=LOWER($1)", [email]);
    const user = r.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "E-posta veya şifre yanlış." });
    }

    req.session.userId = user.id;
    res.json({ ok: true });
  } catch (e) {
    console.error("LOGIN", e);
    res.status(500).json({ error: "Giriş sırasında hata oluştu." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", auth, async (req, res) => {
  try {
    const user = await getUserById(req.session.userId);
    if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

    const badges = await query(
      "SELECT id,name,color,equipped FROM badges WHERE user_id=$1 ORDER BY id DESC",
      [user.id]
    );
    const links = await query(
      "SELECT id,name,url,icon_url FROM links WHERE user_id=$1 ORDER BY id DESC",
      [user.id]
    );

    res.json({ user, badges: badges.rows, links: links.rows });
  } catch (e) {
    console.error("ME", e);
    res.status(500).json({ error: "Profil alınamadı." });
  }
});

app.post("/api/profile", auth, async (req, res) => {
  const description = String(req.body.description || "").slice(0, 1000);
  const themeColor = String(req.body.themeColor || "#9b7cff");

  if (!/^#[0-9a-fA-F]{6}$/.test(themeColor)) {
    return res.status(400).json({ error: "Geçersiz renk." });
  }

  try {
    await query(
      "UPDATE users SET description=$1,theme_color=$2 WHERE id=$3",
      [description, themeColor, req.session.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("PROFILE", e);
    res.status(500).json({ error: "Profil kaydedilemedi." });
  }
});

app.get("/api/profile/:username", async (req, res) => {
  try {
    const profile = await getProfile(req.params.username);
    if (!profile) return res.status(404).json({ error: "Profil bulunamadı." });
    res.json(profile);
  } catch (e) {
    console.error("PUBLIC PROFILE", e);
    res.status(500).json({ error: "Profil yüklenemedi." });
  }
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 12);
    cb(null, crypto.randomBytes(18).toString("hex") + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype.startsWith("audio/")
    ) return cb(null, true);
    cb(new Error("Sadece resim, video veya ses dosyası yükleyebilirsin."));
  }
});

app.post("/api/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Dosya seçmedin." });

    const type = String(req.body.type || "");
    if (!["background", "avatar", "audio"].includes(type)) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(400).json({ error: "Geçersiz medya türü." });
    }

    const url = "/uploads/" + req.file.filename;
    const isVideo = req.file.mimetype.startsWith("video/");
    const isAudio = req.file.mimetype.startsWith("audio/");

    if (type === "audio" && !isAudio) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(400).json({ error: "Müzik alanına sadece ses dosyası yükleyebilirsin." });
    }

    if (type === "background") {
      await query(
        "UPDATE users SET background_url=$1,background_type=$2 WHERE id=$3",
        [url, isVideo ? "video" : "image", req.session.userId]
      );
    }

    if (type === "avatar") {
      await query(
        "UPDATE users SET avatar_url=$1,avatar_type=$2 WHERE id=$3",
        [url, isVideo ? "video" : "image", req.session.userId]
      );
    }

    if (type === "audio") {
      await query("UPDATE users SET audio_url=$1 WHERE id=$2", [url, req.session.userId]);
    }

    res.json({ ok: true, url });
  } catch (e) {
    console.error("UPLOAD", e);
    if (req.file) fs.rmSync(req.file.path, { force: true });
    res.status(400).json({ error: e.message || "Dosya yüklenemedi." });
  }
});

app.post("/api/badges", auth, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const color = String(req.body.color || "");
  if (!name || name.length > 20 || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ error: "Rozet adı veya rengi geçersiz." });
  }

  try {
    const r = await query(`
      INSERT INTO badges(user_id,name,color)
      VALUES($1,$2,$3)
      RETURNING id,name,color,equipped
    `, [req.session.userId, name, color]);
    res.json(r.rows[0]);
  } catch (e) {
    console.error("BADGE CREATE", e);
    res.status(500).json({ error: "Rozet oluşturulamadı." });
  }
});

app.post("/api/badges/:id/equip", auth, async (req, res) => {
  try {
    const check = await query(
      "SELECT id FROM badges WHERE id=$1 AND user_id=$2",
      [req.params.id, req.session.userId]
    );
    if (!check.rows.length) return res.status(404).json({ error: "Rozet bulunamadı." });

    await query("UPDATE badges SET equipped=FALSE WHERE user_id=$1", [req.session.userId]);
    await query(
      "UPDATE badges SET equipped=TRUE WHERE id=$1 AND user_id=$2",
      [req.params.id, req.session.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("BADGE EQUIP", e);
    res.status(500).json({ error: "Rozet kuşanılamadı." });
  }
});

app.delete("/api/badges/:id", auth, async (req, res) => {
  try {
    await query(
      "DELETE FROM badges WHERE id=$1 AND user_id=$2",
      [req.params.id, req.session.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Rozet silinemedi." });
  }
});

app.post("/api/links", auth, async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  const url = String(req.body.url || "").trim();
  const iconUrl = String(req.body.iconUrl || "").trim().slice(0, 500);

  if (!name || !url) return res.status(400).json({ error: "Bağlantı adı ve URL gerekli." });

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    if (iconUrl) {
      const icon = new URL(iconUrl);
      if (!["http:", "https:"].includes(icon.protocol)) throw new Error();
    }
  } catch {
    return res.status(400).json({ error: "Geçerli bir http/https URL gir." });
  }

  try {
    const r = await query(`
      INSERT INTO links(user_id,name,url,icon_url)
      VALUES($1,$2,$3,$4)
      RETURNING id,name,url,icon_url
    `, [req.session.userId, name, url, iconUrl]);
    res.json(r.rows[0]);
  } catch (e) {
    console.error("LINK CREATE", e);
    res.status(500).json({ error: "Bağlantı eklenemedi." });
  }
});

app.delete("/api/links/:id", auth, async (req, res) => {
  try {
    await query(
      "DELETE FROM links WHERE id=$1 AND user_id=$2",
      [req.params.id, req.session.userId]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Bağlantı silinemedi." });
  }
});

app.post("/api/request-reset", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const r = await query("SELECT id FROM users WHERE LOWER(email)=LOWER($1)", [email]);

    // Deliberately generic response so account existence is not exposed.
    if (!r.rows.length) {
      return res.json({ ok: true, message: "Eğer bu e-posta kayıtlıysa kod gönderildi." });
    }

    const userId = r.rows[0].id;
    const code = String(crypto.randomInt(100000, 1000000));
    const hash = crypto.createHash("sha256").update(code).digest("hex");

    await query("DELETE FROM reset_codes WHERE user_id=$1", [userId]);
    await query(`
      INSERT INTO reset_codes(user_id,code_hash,expires_at)
      VALUES($1,$2,NOW()+INTERVAL '10 minutes')
    `, [userId, hash]);

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: "AEVIX şifre yenileme kodu",
        text: `AEVIX doğrulama kodun: ${code}`
      });
    } else {
      console.log(`[AEVIX RESET CODE] ${email}: ${code}`);
    }

    res.json({ ok: true, message: "Eğer bu e-posta kayıtlıysa kod gönderildi." });
  } catch (e) {
    console.error("RESET REQUEST", e);
    res.status(500).json({ error: "Kod gönderilemedi." });
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!email || !/^\d{6}$/.test(code) || newPassword.length < 6) {
      return res.status(400).json({ error: "Geçersiz şifre sıfırlama isteği." });
    }

    const u = await query("SELECT id FROM users WHERE LOWER(email)=LOWER($1)", [email]);
    if (!u.rows.length) return res.status(400).json({ error: "Kod geçersiz." });

    const userId = u.rows[0].id;
    const r = await query(`
      SELECT * FROM reset_codes
      WHERE user_id=$1 AND expires_at>NOW()
      ORDER BY id DESC LIMIT 1
    `, [userId]);

    if (!r.rows.length) return res.status(400).json({ error: "Kod geçersiz veya süresi dolmuş." });

    const hash = crypto.createHash("sha256").update(code).digest("hex");
    if (hash !== r.rows[0].code_hash) {
      return res.status(400).json({ error: "Kod geçersiz veya süresi dolmuş." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query("UPDATE users SET password_hash=$1 WHERE id=$2", [passwordHash, userId]);
    await query("DELETE FROM reset_codes WHERE user_id=$1", [userId]);

    res.json({ ok: true });
  } catch (e) {
    console.error("RESET PASSWORD", e);
    res.status(500).json({ error: "Şifre değiştirilemedi." });
  }
});

// SPA fallback: every non-API GET returns the real HTML file.
app.get("*splat", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) return next();
  res.sendFile(path.join(PUBLIC, "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Bir hata oluştu." });
});

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`AEVIX running on port ${PORT}`);
    });
  } catch (e) {
    console.error("Database initialization failed:", e);
    process.exit(1);
  }
}

start();
