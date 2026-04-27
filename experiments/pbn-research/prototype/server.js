"use strict";

const { spawnSync } = require("child_process");
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const ROOT = path.resolve(__dirname, "..");

function pythonExe() {
  if (process.env.PBN_PYTHON) return process.env.PBN_PYTHON;
  const candidates = [
    path.join(ROOT, ".venv", "bin", "python3"),
    path.join(ROOT, ".venv", "bin", "python"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return "python3";
}

const PYTHON = pythonExe();
const STASH = path.join(ROOT, "assets", "output", "_web_last");

function pyJson(argv) {
  const r = spawnSync(PYTHON, ["-m", "pbn_eval.api_cli", ...argv], {
    cwd: ROOT,
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const raw = (r.stdout || "").trim();
  const lines = raw.split("\n").filter((l) => l.length > 0);
  const last = lines[lines.length - 1] || "{}";
  let out;
  try {
    out = JSON.parse(last);
  } catch {
    const err = new Error("Invalid JSON from Python");
    err.stdout = raw.slice(0, 500);
    err.stderr = (r.stderr || "").slice(0, 500);
    throw err;
  }
  if (!out.ok) {
    const err = new Error(out.error || "Python reported ok:false");
    err.details = out;
    err.code = r.status || 1;
    throw err;
  }
  if (r.status !== 0) {
    const err = new Error(out.error || r.stderr || "Python exited non-zero");
    err.code = r.status;
    throw err;
  }
  return out;
}

const app = express();
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 45 * 1024 * 1024 },
});

app.use("/preview", express.static(STASH));

app.get("/api/samples", (_req, res) => {
  try {
    const d = path.join(ROOT, "assets", "input");
    const ex = new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".JPG",
      ".JPEG",
      ".PNG",
    ]);
    const names =
      fs.existsSync(d) && fs.statSync(d).isDirectory()
        ? fs
            .readdirSync(d)
            .filter((f) => ex.has(path.extname(f)))
            .sort()
        : [];
    res.json({ samples: names });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message) });
  }
});

app.post("/api/run", upload.single("file"), (req, res) => {
  let tmpPath;
  const cleanup = () => {
    if (!tmpPath) return;
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  };
  try {
    if (req.file && req.file.buffer && req.file.buffer.length) {
      const ext = path.extname(req.file.originalname || "") || ".png";
      const safeExt = ext.replace(/[^a-zA-Z0-9._-]/g, "") || ".png";
      const dir = path.join(ROOT, "assets", "output", "_tmp_upload");
      fs.mkdirSync(dir, { recursive: true });
      tmpPath = path.join(dir, `${Date.now()}_upload${safeExt}`);
      fs.writeFileSync(tmpPath, req.file.buffer);
      const out = pyJson(["run", "--image", tmpPath]);
      cleanup();
      return res.json(out);
    }
    const sample = req.body && req.body.sample;
    if (sample && String(sample).trim()) {
      const out = pyJson(["run", "--sample", String(sample).trim()]);
      return res.json(out);
    }
    cleanup();
    return res
      .status(400)
      .json({ ok: false, error: "Choose a sample or upload a file." });
  } catch (e) {
    cleanup();
    const msg = e.message || String(e);
    return res.status(500).json({ ok: false, error: msg });
  }
});

app.post("/api/log", (req, res) => {
  try {
    const b = req.body || {};
    const s = Number(b.subject_clarity ?? 3);
    const p = Number(b.paintability ?? 3);
    const g = Number(b.background_simplicity ?? 3);
    const out = pyJson([
      "log",
      "--subject-clarity",
      String(s),
      "--paintability",
      String(p),
      "--background-simplicity",
      String(g),
    ]);
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

app.use(express.static(path.join(__dirname, "public")));

const PORT = Number(process.env.PORT) || 3010;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`PBN UI  http://127.0.0.1:${PORT}`);
  console.log(`Python  ${PYTHON}`);
});
