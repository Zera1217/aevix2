const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const UPLOADS = path.join(ROOT, "uploads");
fs.mkdirSync(UPLOADS, { recursive: true });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing!");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS badges (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#9b7cff',
      equipped INTEGER NOT NULL DEFAULT 0
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
      expires_at BIGINT NOT NULL
    );
  `);

  console.log("Supabase database ready.");
}

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || "aevix-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

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
  limits: {
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (_, file, cb) => {
    const allowed = /^(image|video|audio)\//.test(file.mimetype);

    cb(
      allowed
        ? null
        : new Error("Only image, video and audio files are allowed."),
      allowed
    );
  }
});

async function publicUser(username) {
  const userResult = await query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );

  const user = userResult.rows[0];

  if (!user) return null;

  const badgesResult = await query(
    "SELECT id,name,color,equipped FROM badges WHERE user_id=$1 ORDER BY id DESC",
    [user.id]
  );

  const linksResult = await query(
    "SELECT id,name,url,icon_url FROM links WHERE user_id=$1 ORDER BY id DESC",
    [user.id]
  );

  return {
    username: user.username,
    description: user.description,
    themeColor: user.theme_color,
    backgroundUrl: user.background_url,
    backgroundType: user.background_type,
    audioUrl: user.audio_url,
    avatarUrl: user.avatar_url,
    avatarType: user.avatar_type,
    badges: badgesResult.rows,
    links: linksResult.rows
  };
}

function auth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      error: "Not authenticated."
    });
  }

  next();
}

/* =========================
   ME
========================= */

app.get("/api/me", auth, async (req, res, next) => {
  try {
    const userResult = await query(
      `SELECT id,email,username,description,theme_color,
              background_url,background_type,audio_url,
              avatar_url,avatar_type
       FROM users
       WHERE id=$1`,
      [req.session.userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        error: "User not found."
      });
    }

    const badgesResult = await query(
      `SELECT id,name,color,equipped
       FROM badges
       WHERE user_id=$1
       ORDER BY id DESC`,
      [user.id]
    );

    const linksResult = await query(
      `SELECT id,name,url,icon_url
       FROM links
       WHERE user_id=$1
       ORDER BY id DESC`,
      [user.id]
    );

    res.json({
      user,
      badges: badgesResult.rows,
      links: linksResult.rows
    });
  } catch (err) {
    next(err);
  }
});

/* =========================
   REGISTER
========================= */

app.post("/api/register", async (req, res, next) => {
  try {
    const {
      email,
      username,
      password,
      passwordConfirm
    } = req.body;

    if (
      !email ||
      !username ||
      !password ||
      password !== passwordConfirm
    ) {
      return res.status(400).json({
        error:
          "Please fill every field and make sure the passwords match."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: "Invalid email."
      });
    }

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return res.status(400).json({
        error:
          "Username must be 3-24 characters: letters, numbers and underscore."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters."
      });
    }

    const normalizedEmail = email.toLowerCase();

    const exists = await query(
      "SELECT id FROM users WHERE email=$1 OR username=$2",
      [normalizedEmail, username]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({
        error: "Email or username is already in use."
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users
       (email,username,password_hash)
       VALUES ($1,$2,$3)
       RETURNING id`,
      [normalizedEmail, username, hash]
    );

    req.session.userId = result.rows[0].id;

    res.json({
      ok: true
    });
  } catch (err) {
    next(err);
  }
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", async (req, res, next) => {
  try {
    const {
      email,
      password
    } = req.body;

    const result = await query(
      "SELECT * FROM users WHERE email=$1",
      [(email || "").toLowerCase()]
    );

    const user = result.rows[0];

    if (
      !user ||
      !(await bcrypt.compare(
        password || "",
        user.password_hash
      ))
    ) {
      return res.status(401).json({
        error: "Email or password is incorrect."
      });
    }

    req.session.userId = user.id;

    res.json({
      ok: true
    });
  } catch (err) {
    next(err);
  }
});

/* =========================
   LOGOUT
========================= */

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      ok: true
    });
  });
});

/* =========================
   PASSWORD RESET REQUEST
========================= */

app.post("/api/request-reset", async (req, res, next) => {
  try {
    const email = (req.body.email || "").toLowerCase();

    const result = await query(
      "SELECT id,username FROM users WHERE email=$1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.json({
        ok: true,
        message:
          "If that email exists, a code has been sent."
      });
    }

    const code = String(
      crypto.randomInt(100000, 1000000)
    );

    const hash = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    await query(
      "DELETE FROM reset_codes WHERE user_id=$1",
      [user.id]
    );

    await query(
      `INSERT INTO reset_codes
       (user_id,code_hash,expires_at)
       VALUES ($1,$2,$3)`,
      [
        user.id,
        hash,
        Date.now() + 10 * 60 * 1000
      ]
    );

    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      const transporter =
        nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(
            process.env.SMTP_PORT || 587
          ),
          secure:
            Number(
              process.env.SMTP_PORT || 587
            ) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

      await transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          process.env.SMTP_USER,
        to: email,
        subject:
          "AEVIX password reset code",
        text:
          `Your AEVIX verification code is ${code}. ` +
          `It expires in 10 minutes.`
      });

      return res.json({
        ok: true,
        message:
          "If that email exists, a code has been sent."
      });
    }

    console.log(
      `[AEVIX DEV] Password reset code for ${email}: ${code}`
    );

    res.json({
      ok: true,
      message:
        "Development mode: check the server console for the 6-digit code."
    });
  } catch (err) {
    next(err);
  }
});

/* =========================
   RESET PASSWORD
========================= */

app.post("/api/reset-password", async (req, res, next) => {
  try {
    const {
      email,
      code,
      newPassword
    } = req.body;

    if (
      !email ||
      !code ||
      !newPassword ||
      newPassword.length < 6
    ) {
      return res.status(400).json({
        error: "Invalid reset request."
      });
    }

    const userResult = await query(
      "SELECT id FROM users WHERE email=$1",
      [email.toLowerCase()]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({
        error: "Invalid code."
      });
    }

    const resetResult = await query(
      `SELECT *
       FROM reset_codes
       WHERE user_id=$1
       AND expires_at>$2
       ORDER BY id DESC
       LIMIT 1`,
      [user.id, Date.now()]
    );

    const row = resetResult.rows[0];

    const hash = crypto
      .createHash("sha256")
      .update(String(code))
      .digest("hex");

    if (
      !row ||
      !crypto.timingSafeEqual(
        Buffer.from(row.code_hash),
        Buffer.from(hash)
      )
    ) {
      return res.status(400).json({
        error: "Invalid or expired code."
      });
    }

    const passwordHash =
      await bcrypt.hash(newPassword, 12);

    await query(
      "UPDATE users SET password_hash=$1 WHERE id=$2",
      [passwordHash, user.id]
    );

    await query(
      "DELETE FROM reset_codes WHERE user_id=$1",
      [user.id]
    );

    res.json({
      ok: true
    });
  } catch (err) {
    next(err);
  }
});

/* =========================
   PROFILE
========================= */

app.post("/api/profile", auth, async (req, res, next) => {
  try {
    const {
      description,
      themeColor
    } = req.body;

    if (
      themeColor &&
      !/^#[0-9a-fA-F]{6}$/.test(themeColor)
    ) {
      return res.status(400).json({
        error: "Invalid theme color."
      });
    }

    await query(
      `UPDATE users
       SET description=$1,
           theme_color=$2
       WHERE id=$3`,
      [
        description || "",
        themeColor || "#9b7cff",
        req.session.userId
      ]
    );

    res.json({
      ok: true
    });
  } catch (err) {
    next(err);
  }
});

/* =========================
   UPLOAD
========================= */

app.post(
  "/api/upload",
  auth,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded."
        });
      }

      const type = req.body.type;

      if (
        !["background", "audio", "avatar"].includes(type)
      ) {
        return res.status(400).json({
          error: "Invalid upload type."
        });
      }

      const url =
        `/uploads/${req.file.filename}`;

      if (type === "background") {
        const kind =
          req.file.mimetype.startsWith("video/")
            ? "video"
            : "image";

        await query(
          `UPDATE users
           SET background_url=$1,
               background_type=$2
           WHERE id=$3`,
          [
            url,
            kind,
            req.session.userId
          ]
        );
      } else if (type === "audio") {
        await query(
          `UPDATE users
           SET audio_url=$1
           WHERE id=$2`,
          [
            url,
            req.session.userId
          ]
        );
      } else {
        const kind =
          req.file.mimetype.startsWith("video/")
            ? "video"
            : "image";

        await query(
          `UPDATE users
           SET avatar_url=$1,
               avatar_type=$2
           WHERE id=$3`,
          [
            url,
            kind,
            req.session.userId
          ]
        );
      }

      res.json({
        ok: true,
        url
      });
    } catch (err) {
      next(err);
    }
  }
);

/* =========================
   BADGES
========================= */

app.post("/api/badges", auth, async (req, res, next) => {
  try {
    const {
      name,
      color
    } = req.body;

    if (
      !name ||
      name.length > 20 ||
      !/^#[0-9a-fA-F]{6}$/.test(color || "")
    ) {
      return res.status(400).json({
        error: "Badge name/color is invalid."
      });
    }

    const result = await query(
      `INSERT INTO badges
       (user_id,name,color,equipped)
       VALUES ($1,$2,$3,0)
       RETURNING id`,
      [
        req.session.userId,
        name.trim(),
        color
      ]
    );

    res.json({
      id: result.rows[0].id,
      name: name.trim(),
      color,
      equipped: 0
    });
  } catch (err) {
    next(err);
  }
});

app.post(
  "/api/badges/:id/equip",
  auth,
  async (req, res, next) => {
    try {
      const badgeResult = await query(
        `SELECT *
         FROM badges
         WHERE id=$1
         AND user_id=$2`,
        [
          req.params.id,
          req.session.userId
        ]
      );

      const badge = badgeResult.rows[0];

      if (!badge) {
        return res.status(404).json({
          error: "Badge not found."
        });
      }

      await query(
        `UPDATE badges
         SET equipped =
           CASE
             WHEN id=$1 THEN 1
             ELSE 0
           END
         WHERE user_id=$2`,
        [
          badge.id,
          req.session.userId
        ]
      );

      res.json({
        ok: true
      });
    } catch (err) {
      next(err);
    }
  }
);

app.delete(
  "/api/badges/:id",
  auth,
  async (req, res, next) => {
    try {
      await query(
        `DELETE FROM badges
         WHERE id=$1
         AND user_id=$2`,
        [
          req.params.id,
          req.session.userId
        ]
      );

      res.json({
        ok: true
      });
    } catch (err) {
      next(err);
    }
  }
);

/* =========================
   LINKS
========================= */

app.post("/api/links", auth, async (req, res, next) => {
  try {
    const {
      name,
      url,
      iconUrl
    } = req.body;

    if (!name || !url) {
      return res.status(400).json({
        error: "Name and URL are required."
      });
    }

    try {
      const u = new URL(url);

      if (
        !["http:", "https:"].includes(
          u.protocol
        )
      ) {
        throw new Error();
      }
    } catch {
      return res.status(400).json({
        error:
          "Please enter a valid http/https URL."
      });
    }

    const result = await query(
      `INSERT INTO links
       (user_id,name,url,icon_url)
       VALUES ($1,$2,$3,$4)
       RETURNING id`,
      [
        req.session.userId,
        name.trim(),
        url.trim(),
        iconUrl || ""
      ]
    );

    res.json({
      id: result.rows[0].id,
      name: name.trim(),
      url: url.trim(),
      icon_url: iconUrl || ""
    });
  } catch (err) {
    next(err);
  }
});

app.delete(
  "/api/links/:id",
  auth,
  async (req, res, next) => {
    try {
      await query(
        `DELETE FROM links
         WHERE id=$1
         AND user_id=$2`,
        [
          req.params.id,
          req.session.userId
        ]
      );

      res.json({
        ok: true
      });
    } catch (err) {
      next(err);
    }
  }
);

/* =========================
   PUBLIC PROFILE
========================= */

app.get(
  "/api/profile/:username",
  async (req, res, next) => {
    try {
      const user =
        await publicUser(
          req.params.username
        );

      if (!user) {
        return res.status(404).json({
          error: "Profile not found."
        });
      }

      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

/* =========================
   PAGES
========================= */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(ROOT, "index.html")
  );
});

app.get("/*splat", (req, res) => {
  res.sendFile(
    path.join(ROOT, "index.html")
  );
});

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error:
      err.message ||
      "Something went wrong."
  });
});

/* =========================
   START
========================= */

async function start() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      console.log(
        `AEVIX running at http://localhost:${PORT}`
      );
    });
  } catch (err) {
    console.error(
      "Database initialization failed:",
      err
    );
    process.exit(1);
  }
}

start();
