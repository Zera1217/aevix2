const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const UPLOADS = path.join(ROOT, "uploads");
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

const db = new Database(path.join(DATA, "aevix.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  theme_color TEXT NOT NULL DEFAULT '#9b7cff',
  background_url TEXT NOT NULL DEFAULT '',
  background_type TEXT NOT NULL DEFAULT 'image',
  audio_url TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  avatar_type TEXT NOT NULL DEFAULT 'image',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#9b7cff',
  equipped INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_url TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reset_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
`);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "aevix-dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
app.use("/uploads", express.static(UPLOADS));
app.use(express.static(ROOT));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomBytes(16).toString("hex") + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = /^(image|video|audio)\//.test(file.mimetype);
    cb(allowed ? null : new Error("Only image, video and audio files are allowed."), allowed);
  }
});

function publicUser(username) {
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return null;
  const badges = db.prepare("SELECT id,name,color,equipped FROM badges WHERE user_id=? ORDER BY id DESC").all(user.id);
  const links = db.prepare("SELECT id,name,url,icon_url FROM links WHERE user_id=? ORDER BY id DESC").all(user.id);
  return {
    username: user.username,
    description: user.description,
    themeColor: user.theme_color,
    backgroundUrl: user.background_url,
    backgroundType: user.background_type,
    audioUrl: user.audio_url,
    avatarUrl: user.avatar_url,
    avatarType: user.avatar_type,
    badges,
    links
  };
}

function auth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated." });
  next();
}

app.get("/api/me", auth, (req, res) => {
  const user = db.prepare("SELECT id,email,username,description,theme_color,background_url,background_type,audio_url,avatar_url,avatar_type FROM users WHERE id=?").get(req.session.userId);
  const badges = db.prepare("SELECT id,name,color,equipped FROM badges WHERE user_id=? ORDER BY id DESC").all(user.id);
  const links = db.prepare("SELECT id,name,url,icon_url FROM links WHERE user_id=? ORDER BY id DESC").all(user.id);
  res.json({ user, badges, links });
});

app.post("/api/register", async (req, res) => {
  const { email, username, password, passwordConfirm } = req.body;
  if (!email || !username || !password || password !== passwordConfirm)
    return res.status(400).json({ error: "Please fill every field and make sure the passwords match." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "Invalid email." });
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username))
    return res.status(400).json({ error: "Username must be 3-24 characters: letters, numbers and underscore." });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters." });

  const exists = db.prepare("SELECT id FROM users WHERE email=? OR username=?").get(email.toLowerCase(), username);
  if (exists) return res.status(409).json({ error: "Email or username is already in use." });

  const hash = await bcrypt.hash(password, 12);
  const info = db.prepare("INSERT INTO users(email,username,password_hash) VALUES(?,?,?)")
    .run(email.toLowerCase(), username, hash);
  req.session.userId = info.lastInsertRowid;
  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email=?").get((email || "").toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.password_hash)))
    return res.status(401).json({ error: "Email or password is incorrect." });
  req.session.userId = user.id;
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.post("/api/request-reset", async (req, res) => {
  const email = (req.body.email || "").toLowerCase();
  const user = db.prepare("SELECT id,username FROM users WHERE email=?").get(email);

  // Always return the same message to avoid revealing whether an email exists.
  if (!user) return res.json({ ok: true, message: "If that email exists, a code has been sent." });

  const code = String(crypto.randomInt(100000, 1000000));
  const hash = crypto.createHash("sha256").update(code).digest("hex");
  db.prepare("DELETE FROM reset_codes WHERE user_id=?").run(user.id);
  db.prepare("INSERT INTO reset_codes(user_id,code_hash,expires_at) VALUES(?,?,?)")
    .run(user.id, hash, Date.now() + 10 * 60 * 1000);

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
      subject: "AEVIX password reset code",
      text: `Your AEVIX verification code is ${code}. It expires in 10 minutes.`
    });
    return res.json({ ok: true, message: "If that email exists, a code has been sent." });
  }

  // Development fallback only. Never use this in production.
  console.log(`[AEVIX DEV] Password reset code for ${email}: ${code}`);
  res.json({ ok: true, message: "Development mode: check the server console for the 6-digit code." });
});

app.post("/api/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword || newPassword.length < 6)
    return res.status(400).json({ error: "Invalid reset request." });

  const user = db.prepare("SELECT id FROM users WHERE email=?").get(email.toLowerCase());
  if (!user) return res.status(400).json({ error: "Invalid code." });

  const row = db.prepare("SELECT * FROM reset_codes WHERE user_id=? AND expires_at>? ORDER BY id DESC LIMIT 1")
    .get(user.id, Date.now());
  const hash = crypto.createHash("sha256").update(String(code)).digest("hex");
  if (!row || !crypto.timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(hash)))
    return res.status(400).json({ error: "Invalid or expired code." });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(passwordHash, user.id);
  db.prepare("DELETE FROM reset_codes WHERE user_id=?").run(user.id);
  res.json({ ok: true });
});

app.post("/api/profile", auth, (req, res) => {
  const { description, themeColor } = req.body;
  if (themeColor && !/^#[0-9a-fA-F]{6}$/.test(themeColor))
    return res.status(400).json({ error: "Invalid theme color." });
  db.prepare("UPDATE users SET description=?, theme_color=? WHERE id=?")
    .run(description || "", themeColor || "#9b7cff", req.session.userId);
  res.json({ ok: true });
});

app.post("/api/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  const type = req.body.type;
  const url = `/uploads/${req.file.filename}`;
  if (!["background", "audio", "avatar"].includes(type))
    return res.status(400).json({ error: "Invalid upload type." });

  if (type === "background") {
    const kind = req.file.mimetype.startsWith("video/") ? "video" : "image";
    db.prepare("UPDATE users SET background_url=?, background_type=? WHERE id=?").run(url, kind, req.session.userId);
  } else if (type === "audio") {
    db.prepare("UPDATE users SET audio_url=? WHERE id=?").run(url, req.session.userId);
  } else {
    const kind = req.file.mimetype.startsWith("video/") ? "video" : "image";
    db.prepare("UPDATE users SET avatar_url=?, avatar_type=? WHERE id=?").run(url, kind, req.session.userId);
  }
  res.json({ ok: true, url });
});

app.post("/api/badges", auth, (req, res) => {
  const { name, color } = req.body;
  if (!name || name.length > 20 || !/^#[0-9a-fA-F]{6}$/.test(color || ""))
    return res.status(400).json({ error: "Badge name/color is invalid." });
  const info = db.prepare("INSERT INTO badges(user_id,name,color,equipped) VALUES(?,?,?,0)")
    .run(req.session.userId, name.trim(), color);
  res.json({ id: info.lastInsertRowid, name: name.trim(), color, equipped: 0 });
});

app.post("/api/badges/:id/equip", auth, (req, res) => {
  const badge = db.prepare("SELECT * FROM badges WHERE id=? AND user_id=?").get(req.params.id, req.session.userId);
  if (!badge) return res.status(404).json({ error: "Badge not found." });
  db.prepare("UPDATE badges SET equipped = CASE WHEN id=? THEN 1 ELSE 0 END WHERE user_id=?")
    .run(badge.id, req.session.userId);
  res.json({ ok: true });
});

app.delete("/api/badges/:id", auth, (req, res) => {
  db.prepare("DELETE FROM badges WHERE id=? AND user_id=?").run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

app.post("/api/links", auth, (req, res) => {
  const { name, url, iconUrl } = req.body;
  if (!name || !url) return res.status(400).json({ error: "Name and URL are required." });
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) throw new Error();
  } catch {
    return res.status(400).json({ error: "Please enter a valid http/https URL." });
  }
  const info = db.prepare("INSERT INTO links(user_id,name,url,icon_url) VALUES(?,?,?,?)")
    .run(req.session.userId, name.trim(), url.trim(), iconUrl || "");
  res.json({ id: info.lastInsertRowid, name: name.trim(), url: url.trim(), icon_url: iconUrl || "" });
});

app.delete("/api/links/:id", auth, (req, res) => {
  db.prepare("DELETE FROM links WHERE id=? AND user_id=?").run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

app.get("/api/profile/:username", (req, res) => {
  const user = publicUser(req.params.username);
  if (!user) return res.status(404).json({ error: "Profile not found." });
  res.json(user);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.get('/*splat', (req, res) => {
res.sendFile(path.join(ROOT, "index.html"));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Something went wrong." });
});

app.listen(PORT, () => console.log(`AEVIX running at http://localhost:${PORT}`));
