import { interpretPrompt } from "./interpret.js";

/** Machine colours from the Atomm SVG export spec. Red cuts, blue engraves. */
export const CUT = "#FE0002";
export const ENGRAVE = "#2366FF";

const DESIGN_W = 100;
const DESIGN_H = 120;

function round(value) {
  return Math.round(value * 100) / 100;
}

function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeOptions(options = {}) {
  return {
    widthMm: round(clamp(num(options.widthMm, 140), 40, 400)),
    strokeMm: round(clamp(num(options.strokeMm, 0.6), 0.2, 2)),
    mode: options.mode === "stencil" ? "stencil" : "engrave",
    palette: options.palette === "preview" ? "preview" : "machine",
  };
}

function scaler(widthMm) {
  const s = widthMm / DESIGN_W;
  const p = (x, y) => `${round(x * s)} ${round(y * s)}`;
  const u = (value) => round(value * s);
  return { p, u };
}

function pathEl(part, d, stroke, width, style) {
  const styleAttr = style ? ` data-style="${style}"` : "";
  return `<path data-part="${part}"${styleAttr} fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`;
}

function circle(p, u, cx, cy, r) {
  return `M ${p(cx - r, cy)} A ${u(r)} ${u(r)} 0 1 0 ${p(cx + r, cy)} A ${u(r)} ${u(r)} 0 1 0 ${p(cx - r, cy)} Z`;
}

function ellipse(p, u, cx, cy, rx, ry) {
  return `M ${p(cx - rx, cy)} A ${u(rx)} ${u(ry)} 0 1 0 ${p(cx + rx, cy)} A ${u(rx)} ${u(ry)} 0 1 0 ${p(cx - rx, cy)} Z`;
}

function pumpkin(p) {
  return [
    `M ${p(50, 30)}`,
    `C ${p(24, 28)} ${p(8, 48)} ${p(12, 68)}`,
    `C ${p(16, 92)} ${p(30, 108)} ${p(50, 104)}`,
    `C ${p(70, 108)} ${p(84, 92)} ${p(88, 68)}`,
    `C ${p(92, 48)} ${p(76, 28)} ${p(50, 30)}`,
    "Z",
  ].join(" ");
}

function stem(p) {
  return [
    `M ${p(45, 33)}`,
    `C ${p(44, 24)} ${p(46, 15)} ${p(50, 12)}`,
    `C ${p(54, 14)} ${p(56, 22)} ${p(55, 33)}`,
    "Z",
  ].join(" ");
}

function rib(p, x1, y1, x2, y2, bend) {
  const mx = (x1 + x2) / 2 + bend;
  const my = (y1 + y2) / 2;
  return `M ${p(x1, y1)} Q ${p(mx, my)} ${p(x2, y2)}`;
}

function thickLine(p, x1, y1, x2, y2, t) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (t / 2);
  const ny = (dx / len) * (t / 2);
  return `M ${p(x1 + nx, y1 + ny)} L ${p(x2 + nx, y2 + ny)} L ${p(x2 - nx, y2 - ny)} L ${p(x1 - nx, y1 - ny)} Z`;
}

function crescent(p, cx, cy, rx, ry, thick, smile) {
  const steps = 14;
  const sign = smile ? 1 : -1;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI * (1 - i / steps);
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry * sign]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = Math.PI * (1 - i / steps);
    const innerRx = Math.max(rx - thick, rx * 0.35);
    const innerRy = Math.max(ry - thick * 0.55, ry * 0.25);
    pts.push([
      cx + Math.cos(a) * innerRx,
      cy + Math.sin(a) * innerRy * sign - sign * thick * 0.15,
    ]);
  }
  return `M ${pts.map(([x, y]) => p(x, y)).join(" L ")} Z`;
}

function heart(p, cx, cy, s) {
  return [
    `M ${p(cx, cy + s * 0.7)}`,
    `C ${p(cx - s * 0.1, cy + s * 0.3)} ${p(cx - s * 1.15, cy + s * 0.15)} ${p(cx - s * 0.7, cy - s * 0.35)}`,
    `C ${p(cx - s * 0.35, cy - s * 0.9)} ${p(cx, cy - s * 0.45)} ${p(cx, cy - s * 0.2)}`,
    `C ${p(cx, cy - s * 0.45)} ${p(cx + s * 0.35, cy - s * 0.9)} ${p(cx + s * 0.7, cy - s * 0.35)}`,
    `C ${p(cx + s * 1.15, cy + s * 0.15)} ${p(cx + s * 0.1, cy + s * 0.3)} ${p(cx, cy + s * 0.7)}`,
    "Z",
  ].join(" ");
}

function star(p, cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(p(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
  }
  return `M ${pts.join(" L ")} Z`;
}

function triangle(p, cx, cy, s) {
  return `M ${p(cx, cy - s)} L ${p(cx - s, cy + s * 0.8)} L ${p(cx + s, cy + s * 0.8)} Z`;
}

function square(p, cx, cy, s) {
  return `M ${p(cx - s, cy - s)} L ${p(cx + s, cy - s)} L ${p(cx + s, cy + s)} L ${p(cx - s, cy + s)} Z`;
}

function spiral(p, cx, cy, r) {
  const pts = [];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * 2.15;
    pts.push(p(cx + Math.cos(a) * r * t, cy + Math.sin(a) * r * t));
  }
  return `M ${pts.join(" L ")}`;
}

function zigzag(p, cx, cy, w, h) {
  const teeth = 5;
  const left = cx - w / 2;
  const pts = [[left, cy - h * 0.15]];
  for (let i = 0; i <= teeth; i++) {
    pts.push([left + (w * i) / teeth, cy - (i % 2 === 0 ? h * 0.45 : 0)]);
  }
  pts.push([left + w, cy + h * 0.55], [left, cy + h * 0.55]);
  return `M ${pts.map(([x, y]) => p(x, y)).join(" L ")} Z`;
}

function wavy(p, cx, cy, w, h) {
  const steps = 8;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([cx - w / 2 + w * t, cy + Math.sin(t * Math.PI * 2) * h * 0.35]);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    pts.push([cx - w / 2 + w * t, cy + Math.sin(t * Math.PI * 2) * h * 0.35 + h * 0.4]);
  }
  return `M ${pts.map(([x, y]) => p(x, y)).join(" L ")} Z`;
}

function eyeCenters(face) {
  const gap = 14 * face.layout.gap;
  const y = 58;
  const size = 6.4 * face.layout.eyeScale;
  const uneven = face.eyes === "uneven";
  return {
    left: { x: 50 - gap, y, s: size * (uneven ? 1.28 : 1) },
    right: { x: 50 + gap, y, s: size * (uneven ? 0.7 : 1) },
  };
}

function eyePath(style, tools, eye, closedSpiral) {
  const { p, u } = tools;
  const { x, y, s } = eye;
  if (style === "circle" || style === "dot") return circle(p, u, x, y, style === "dot" ? s * 0.38 : s);
  if (style === "oval") return ellipse(p, u, x, y, s * 0.85, s * 1.15);
  if (style === "sleepy") return ellipse(p, u, x, y, s * 1.15, s * 0.38);
  if (style === "square") return square(p, x, y, s * 0.85);
  if (style === "heart") return heart(p, x, y + s * 0.15, s * 0.85);
  if (style === "star") return star(p, x, y, s);
  if (style === "x") {
    return `${thickLine(p, x - s, y - s, x + s, y + s, s * 0.28)} ${thickLine(p, x + s, y - s, x - s, y + s, s * 0.28)}`;
  }
  if (style === "spiral") return closedSpiral ? circle(p, u, x, y, s * 0.85) : spiral(p, x, y, s);
  if (style === "slit") return ellipse(p, u, x, y, s * 0.28, s * 1.15);
  return triangle(p, x, y, s);
}

function browPath(kind, p, eye, tilt, side) {
  const y = eye.y - eye.s - 3.2;
  const half = eye.s * 0.95;
  const lift = tilt * 0.8;
  if (kind === "angry") {
    return side === "left"
      ? `M ${p(eye.x - half, y - 2)} Q ${p(eye.x, y + lift)} ${p(eye.x + half, y + 3)}`
      : `M ${p(eye.x - half, y + 3)} Q ${p(eye.x, y + lift)} ${p(eye.x + half, y - 2)}`;
  }
  if (kind === "worried") {
    return side === "left"
      ? `M ${p(eye.x - half, y + 3)} Q ${p(eye.x, y - 1)} ${p(eye.x + half, y - 2)}`
      : `M ${p(eye.x - half, y - 2)} Q ${p(eye.x, y - 1)} ${p(eye.x + half, y + 3)}`;
  }
  if (kind === "arched") {
    return `M ${p(eye.x - half, y + 1)} Q ${p(eye.x, y - 4)} ${p(eye.x + half, y + 1)}`;
  }
  if (kind === "uneven") {
    return side === "left"
      ? `M ${p(eye.x - half, y - 3)} Q ${p(eye.x, y - 5)} ${p(eye.x + half, y - 1)}`
      : `M ${p(eye.x - half, y + 2)} Q ${p(eye.x, y + 1)} ${p(eye.x + half, y + 3)}`;
  }
  return `M ${p(eye.x - half, y)} Q ${p(eye.x, y - 3)} ${p(eye.x + half, y)}`;
}

function hatPaths(kind, p, u) {
  if (kind === "hat-witch") {
    return [
      `M ${p(50, 6)} L ${p(34, 28)} L ${p(66, 28)} Z`,
      ellipse(p, u, 50, 28, 22, 3.4),
    ];
  }
  if (kind === "hat-cowboy") {
    return [
      `M ${p(40, 20)} L ${p(42, 8)} Q ${p(50, 4)} ${p(58, 8)} L ${p(60, 20)} Z`,
      ellipse(p, u, 50, 20, 26, 3.2),
    ];
  }
  if (kind === "hat-chef") {
    return [
      `M ${p(38, 18)} C ${p(34, 4)} ${p(66, 4)} ${p(62, 18)} Z`,
      `M ${p(40, 16)} L ${p(40, 28)} L ${p(60, 28)} L ${p(60, 16)} Z`,
    ];
  }
  if (kind === "hat-beanie") {
    return [`M ${p(34, 32)} C ${p(32, 14)} ${p(68, 14)} ${p(66, 32)} Z`];
  }
  if (kind === "crown") {
    return [`M ${p(32, 32)} L ${p(32, 16)} L ${p(40, 24)} L ${p(50, 10)} L ${p(60, 24)} L ${p(68, 16)} L ${p(68, 32)} Z`];
  }
  return [];
}

function silhouetteExtras(face, tools) {
  const { p, u } = tools;
  const paths = [];
  const add = (part, d) => paths.push({ part, d });
  if (face.extras.includes("cat-ears")) {
    add("cat-ears", `M ${p(22, 52)} L ${p(10, 30)} L ${p(36, 42)} Z`);
    add("cat-ears", `M ${p(78, 42)} L ${p(90, 30)} L ${p(64, 52)} Z`);
  }
  if (face.extras.includes("dog-ears")) {
    add("dog-ears", `M ${p(18, 46)} C ${p(4, 58)} ${p(6, 90)} ${p(20, 92)} C ${p(24, 74)} ${p(22, 56)} ${p(26, 44)} Z`);
    add("dog-ears", `M ${p(82, 46)} C ${p(96, 58)} ${p(94, 90)} ${p(80, 92)} C ${p(76, 74)} ${p(78, 56)} ${p(74, 44)} Z`);
  }
  if (face.extras.includes("bat-ears")) {
    add("bat-ears", `M ${p(30, 38)} L ${p(18, 8)} L ${p(40, 32)} Z`);
    add("bat-ears", `M ${p(70, 32)} L ${p(82, 8)} L ${p(60, 38)} Z`);
  }
  if (face.extras.includes("horns")) {
    add("horns", `M ${p(34, 36)} L ${p(30, 14)} L ${p(42, 32)} Z`);
    add("horns", `M ${p(66, 32)} L ${p(70, 14)} L ${p(58, 36)} Z`);
  }
  for (const extra of face.extras) {
    for (const d of hatPaths(extra, p, u)) add("hat", d);
  }
  return paths;
}

function hasHat(face) {
  return face.extras.some((extra) => extra.startsWith("hat-") || extra === "crown");
}

function mouthPaths(face, p, u) {
  const cx = 50 + (face.mouth === "smirk" ? 3 : 0);
  const cy = 82;
  const w = 26 * face.layout.mouthScale;
  const h = 9 * face.layout.mouthScale;
  const style = face.mouth;
  const paths = [];
  if (style === "frown") paths.push(crescent(p, cx, cy, w / 2, h, 3.2, false));
  else if (style === "o") paths.push(circle(p, u, cx, cy, Math.min(w, h) * 0.38));
  else if (style === "line") paths.push(ellipse(p, u, cx, cy, w / 2, 1.1));
  else if (style === "zigzag" || style === "teeth") paths.push(zigzag(p, cx, cy, w, h));
  else if (style === "wavy") paths.push(wavy(p, cx, cy, w, h));
  else if (style === "smirk") paths.push(crescent(p, cx, cy - 1, w / 2, h * 0.7, 2.6, true));
  else if (style === "tongue") {
    paths.push(ellipse(p, u, cx, cy - 1, w * 0.32, h * 0.7));
  } else paths.push(crescent(p, cx, cy, w / 2, h, 3.4, true));
  return { style, paths, cx, cy, w, h };
}

export function filenameFor(prompt) {
  const slug = String(prompt ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return `${slug || "jack-o-lantern"}.svg`;
}

export function renderFace(face, options = {}) {
  const opt = normalizeOptions(options);
  const tools = scaler(opt.widthMm);
  const { p, u } = tools;
  const heightMm = round(opt.widthMm * (DESIGN_H / DESIGN_W));
  const cutStroke = opt.palette === "preview" ? "currentColor" : CUT;
  const lineStroke = opt.palette === "preview" ? "currentColor" : ENGRAVE;
  const faceStroke = opt.mode === "stencil" ? cutStroke : lineStroke;
  const cutWidth = 0.2;
  const lineWidth = opt.strokeMm;
  const faceWidth = opt.mode === "stencil" ? cutWidth : lineWidth;

  const parts = [];
  parts.push(pathEl("pumpkin", pumpkin(p), cutStroke, cutWidth));
  if (!hasHat(face)) parts.push(pathEl("stem", stem(p), cutStroke, cutWidth));

  for (const extra of silhouetteExtras(face, tools)) {
    parts.push(pathEl(extra.part, extra.d, cutStroke, cutWidth));
  }

  if (opt.mode === "engrave") {
    const ribs = [
      rib(p, 22, 46, 26, 100, -6),
      rib(p, 78, 46, 74, 100, 6),
    ];
    for (const d of ribs) parts.push(pathEl("rib", d, lineStroke, lineWidth));
  }

  const eyes = eyeCenters(face);
  const openStyle = face.eyes === "wink" ? "triangle" : face.eyes === "uneven" ? "circle" : face.eyes;
  for (const side of ["left", "right"]) {
    const eye = eyes[side];
    if (face.extras.includes("eyepatch") && side === "right") continue;
    if (face.eyes === "wink" && side === face.layout.wink) {
      parts.push(pathEl("wink", crescent(p, eye.x, eye.y, eye.s, eye.s * 0.45, 1.4, true), faceStroke, faceWidth, "wink"));
    } else if (face.eyes === "uneven" && side === "right") {
      parts.push(pathEl("eye", triangle(p, eye.x, eye.y, eye.s), faceStroke, faceWidth, "triangle"));
    } else if (face.eyes === "x") {
      const s = eye.s;
      parts.push(pathEl("eye", thickLine(p, eye.x - s, eye.y - s, eye.x + s, eye.y + s, s * 0.28), faceStroke, faceWidth, "x"));
      parts.push(pathEl("eye", thickLine(p, eye.x + s, eye.y - s, eye.x - s, eye.y + s, s * 0.28), faceStroke, faceWidth, "x"));
    } else {
      parts.push(pathEl("eye", eyePath(openStyle, tools, eye, opt.mode === "stencil"), faceStroke, faceWidth, openStyle));
    }
  }

  if (face.brows === "unibrow") {
    const y = eyes.left.y - eyes.left.s - 3;
    parts.push(pathEl("brow", `M ${p(eyes.left.x - eyes.left.s, y)} L ${p(eyes.right.x + eyes.right.s, y)}`, lineStroke, lineWidth, "unibrow"));
  } else if (face.brows !== "none") {
    for (const side of ["left", "right"]) {
      parts.push(pathEl("brow", browPath(face.brows, p, eyes[side], face.layout.browTilt, side), lineStroke, lineWidth, face.brows));
    }
  }

  if (face.nose === "heart") {
    parts.push(pathEl("nose", heart(p, 50, 72, 2.4), faceStroke, faceWidth, "heart"));
  } else if (face.nose === "circle") {
    parts.push(pathEl("nose", circle(p, u, 50, 71, 3.4), faceStroke, faceWidth, "circle"));
  } else if (face.nose === "triangle") {
    parts.push(pathEl("nose", triangle(p, 50, 70, 2.6), faceStroke, faceWidth, "triangle"));
  }

  const mouth = mouthPaths(face, p, u);
  for (const d of mouth.paths) {
    parts.push(pathEl("mouth", d, faceStroke, faceWidth, mouth.style));
  }
  if (face.mouth === "fangs") {
    parts.push(pathEl("fang", triangle(p, mouth.cx - mouth.w * 0.22, mouth.cy - 1, 2.1), faceStroke, faceWidth));
    parts.push(pathEl("fang", triangle(p, mouth.cx + mouth.w * 0.22, mouth.cy - 1, 2.1), faceStroke, faceWidth));
  }
  if (face.mouth === "tongue") {
    parts.push(pathEl("tongue", ellipse(p, u, mouth.cx, mouth.cy + 2.2, mouth.w * 0.14, mouth.h * 0.45), lineStroke, lineWidth));
  }

  drawAccessories(parts, face, tools, eyes, lineStroke, lineWidth);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${opt.widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${opt.widthMm} ${heightMm}" fill="none">`,
    ...parts,
    "</svg>",
  ].join("");
}

function drawAccessories(parts, face, tools, eyes, stroke, width) {
  const { p, u } = tools;
  const extras = new Set(face.extras);
  if (extras.has("glasses")) {
    parts.push(pathEl("glasses", circle(p, u, eyes.left.x, eyes.left.y, eyes.left.s + 1.6), stroke, width));
    parts.push(pathEl("glasses", circle(p, u, eyes.right.x, eyes.right.y, eyes.right.s + 1.6), stroke, width));
    parts.push(pathEl("glasses", `M ${p(eyes.left.x + eyes.left.s + 1.4, eyes.left.y)} L ${p(eyes.right.x - eyes.right.s - 1.4, eyes.right.y)}`, stroke, width));
  }
  if (extras.has("monocle")) {
    parts.push(pathEl("monocle", circle(p, u, eyes.right.x, eyes.right.y, eyes.right.s + 1.8), stroke, width));
    parts.push(pathEl("monocle", `M ${p(eyes.right.x, eyes.right.y + eyes.right.s + 1.6)} L ${p(eyes.right.x + 1, eyes.right.y + eyes.right.s + 8)}`, stroke, width));
  }
  if (extras.has("mustache")) {
    parts.push(pathEl("mustache", `M ${p(42, 76)} Q ${p(46, 80)} ${p(50, 76)}`, stroke, width));
    parts.push(pathEl("mustache", `M ${p(50, 76)} Q ${p(54, 80)} ${p(58, 76)}`, stroke, width));
  }
  if (extras.has("beard")) {
    parts.push(pathEl("beard", `M ${p(40, 86)} Q ${p(50, 102)} ${p(60, 86)}`, stroke, width));
  }
  if (extras.has("eyepatch")) {
    parts.push(pathEl("eyepatch", ellipse(p, u, eyes.right.x, eyes.right.y, eyes.right.s + 1.2, eyes.right.s + 2), stroke, width));
  }
  if (extras.has("scar")) {
    parts.push(pathEl("scar", thickLine(p, 28, 64, 36, 76, 0.9), stroke, width));
  }
  if (extras.has("freckles")) {
    for (const [x, y] of [[30, 70], [33, 74], [28, 75], [67, 70], [72, 74], [70, 67]]) {
      parts.push(pathEl("freckles", circle(p, u, x, y, 0.55), stroke, width));
    }
  }
  if (extras.has("blush")) {
    parts.push(pathEl("blush", `M ${p(28, 68)} Q ${p(32, 66)} ${p(36, 69)}`, stroke, width));
    parts.push(pathEl("blush", `M ${p(64, 69)} Q ${p(68, 66)} ${p(72, 68)}`, stroke, width));
  }
  if (extras.has("bowtie")) {
    parts.push(pathEl("bowtie", `M ${p(44, 96)} L ${p(50, 99)} L ${p(44, 102)} Z`, stroke, width));
    parts.push(pathEl("bowtie", `M ${p(56, 96)} L ${p(50, 99)} L ${p(56, 102)} Z`, stroke, width));
  }
}

export function generateLantern(prompt, options) {
  const face = interpretPrompt(prompt);
  return {
    svg: renderFace(face, options),
    face,
    reading: face.reading,
    filename: filenameFor(face.prompt),
  };
}
