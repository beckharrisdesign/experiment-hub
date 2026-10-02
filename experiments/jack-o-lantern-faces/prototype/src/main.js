import { generateLantern } from "./render.js";

const EXAMPLES = [
  "grumpy librarian cat",
  "surprised alien",
  "smug vampire",
  "sleepy dog",
  "unhinged clown",
  "pirate",
];

const TIPS = [
  {
    title: "Real-world units",
    body: "The file is the size you set, in millimetres. What you export is what the laser gets.",
  },
  {
    title: "Cut lines and engraving",
    body: "The pumpkin outline is a red cut. Engrave lines keeps the face as a blue stroke. Cut holes makes the face fall out, which is the stencil.",
  },
  {
    title: "A joke, not a portrait",
    body: "The prompt picks features — ears, fangs, a mood, a pair of glasses. It does not draw the words themselves.",
  },
];

const MM_PER_IN = 25.4;
const state = {
  prompt: "",
  widthMm: 140,
  strokeMm: 0.6,
  mode: "engrave",
  unit: "mm",
  palette: "preview",
  history: [],
};
let latest = generateLantern("", { widthMm: 140, strokeMm: 0.6, palette: "preview" });
let viewScale = 1;
let panX = 0;
let panY = 0;
let tipIndex = 0;
let historyTimer = 0;

const $ = (id) => document.getElementById(id);

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function display(mm, places) {
  if (state.unit === "in") return String(round(mm / MM_PER_IN, 2));
  return String(round(mm, places));
}

function fromDisplay(text) {
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return state.unit === "in" ? value * MM_PER_IN : value;
}

function draw() {
  latest = generateLantern(state.prompt, {
    widthMm: state.widthMm,
    strokeMm: state.strokeMm,
    mode: state.mode,
    palette: state.palette,
  });
  $("art").innerHTML = latest.svg;
  $("art").querySelector("svg")?.setAttribute("aria-hidden", "true");
  $("reading").textContent = latest.reading;
  $("height-value").textContent = display(state.widthMm * 1.2, 1);
  $("counter").textContent = `${state.prompt.length}/180`;
  $("mode-note").textContent = state.mode === "stencil"
    ? "The outline and the face are both cut. Glasses and other worn details stay engraved."
    : "The outline is cut. The face is engraved as a line.";
  markPressed();
}

function markPressed() {
  const current = state.prompt.trim().toLowerCase();
  for (const button of document.querySelectorAll(".tile")) {
    button.setAttribute("aria-pressed", button.dataset.prompt.toLowerCase() === current ? "true" : "false");
  }
}

function tile(prompt) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tile";
  button.dataset.prompt = prompt;
  button.setAttribute("aria-pressed", "false");
  const art = document.createElement("div");
  art.className = "tile-art";
  art.innerHTML = generateLantern(prompt, {
    widthMm: 40,
    strokeMm: 0.8,
    palette: "preview",
  }).svg;
  art.querySelector("svg")?.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.textContent = prompt;
  button.append(art, label);
  button.addEventListener("click", () => {
    state.prompt = prompt;
    $("prompt").value = prompt;
    draw();
    remember(prompt);
    fit();
  });
  return button;
}

function renderExamples() {
  const root = $("examples");
  root.replaceChildren(...EXAMPLES.map(tile));
}

function renderHistory() {
  const root = $("history");
  root.replaceChildren(...state.history.map(tile));
  $("history-empty").hidden = state.history.length > 0;
  markPressed();
}

function remember(prompt) {
  const text = prompt.trim();
  if (!text) return;
  state.history = [
    text,
    ...state.history.filter((item) => item.toLowerCase() !== text.toLowerCase()),
  ].slice(0, 6);
  renderHistory();
}

function syncNumbers() {
  const width = $("width");
  const stroke = $("stroke");
  if (document.activeElement !== width) width.value = display(state.widthMm, 0);
  if (document.activeElement !== stroke) stroke.value = display(state.strokeMm, state.unit === "in" ? 2 : 1);
  $("width-range").value = String(state.widthMm);
  $("stroke-range").value = String(state.strokeMm);
  for (const id of ["width-unit", "height-unit", "stroke-unit"]) {
    $(id).textContent = state.unit;
  }
  const inch = state.unit === "in";
  width.step = inch ? "0.01" : "1";
  stroke.step = inch ? "0.001" : "0.1";
  width.min = display(40, 0);
  width.max = display(400, 0);
  stroke.min = display(0.2, 1);
  stroke.max = display(2, 1);
}

function setUnit(unit) {
  state.unit = unit;
  $("unit-mm").setAttribute("aria-pressed", unit === "mm" ? "true" : "false");
  $("unit-in").setAttribute("aria-pressed", unit === "in" ? "true" : "false");
  syncNumbers();
  draw();
}

function setPalette(palette) {
  state.palette = palette;
  $("view-art").setAttribute("aria-pressed", palette === "preview" ? "true" : "false");
  $("view-machine").setAttribute("aria-pressed", palette === "machine" ? "true" : "false");
  draw();
}

function applyView() {
  $("art").style.transform = `translate(${panX}px, ${panY}px) scale(${viewScale})`;
  $("zoom-fit").textContent = `${Math.round(viewScale * 100)}%`;
}

function fit() {
  const stage = $("stage");
  const art = $("art");
  const previous = art.style.transform;
  art.style.transform = "none";
  const aw = art.offsetWidth || 1;
  const ah = art.offsetHeight || 1;
  art.style.transform = previous;
  const next = Math.min((stage.clientWidth - 64) / aw, (stage.clientHeight - 96) / ah);
  viewScale = Math.max(0.2, Math.min(next, 4));
  panX = 0;
  panY = 0;
  applyView();
}

function zoomBy(factor) {
  viewScale = Math.max(0.2, Math.min(viewScale * factor, 6));
  applyView();
}

function showTip(index) {
  tipIndex = (index + TIPS.length) % TIPS.length;
  const tip = TIPS[tipIndex];
  $("tips-title").textContent = tip.title;
  $("tips-body").textContent = tip.body;
  $("tips-count").textContent = `${tipIndex + 1} / ${TIPS.length}`;
  $("tips-back").disabled = tipIndex === 0;
  $("tips-next").textContent = tipIndex === TIPS.length - 1 ? "Done" : "Next";
}

function download() {
  const file = generateLantern(state.prompt, {
    widthMm: state.widthMm,
    strokeMm: state.strokeMm,
    mode: state.mode,
    palette: "machine",
  });
  const url = URL.createObjectURL(new Blob([file.svg], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  link.click();
  URL.revokeObjectURL(url);
}

function registerExport() {
  const lifecycle = window.atomm?.lifecycle;
  if (!lifecycle?.on || registerExport.done) return;
  registerExport.done = true;
  lifecycle.on("export", async () => {
    const file = generateLantern(state.prompt, {
      widthMm: state.widthMm,
      strokeMm: state.strokeMm,
      mode: state.mode,
      palette: "machine",
    });
    return {
      filename: file.filename,
      blob: new Blob([file.svg], { type: "image/svg+xml" }),
    };
  });
  $("download").hidden = true;
}

function bindCards() {
  for (const head of document.querySelectorAll(".card-head")) {
    head.addEventListener("click", () => {
      const body = document.getElementById(head.getAttribute("aria-controls"));
      const open = head.getAttribute("aria-expanded") === "true";
      head.setAttribute("aria-expanded", open ? "false" : "true");
      body.hidden = open;
    });
  }
}

function bindZoom() {
  const stage = $("stage");
  stage.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.08 : 0.92);
  }, { passive: false });

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    panX += event.clientX - lastX;
    panY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    applyView();
  });
  stage.addEventListener("pointerup", () => {
    dragging = false;
  });
  $("zoom-in").addEventListener("click", () => zoomBy(1.2));
  $("zoom-out").addEventListener("click", () => zoomBy(1 / 1.2));
  $("zoom-fit").addEventListener("click", fit);
}

function bindDragNumber(input, read, write) {
  input.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const start = read();
    let moved = false;
    const dir = document.dir === "rtl" ? -1 : 1;
    function move(ev) {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) < 3 && !moved) return;
      moved = true;
      const step = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
      write(start + dir * dx * step * 0.2);
    }
    function up() {
      input.removeEventListener("pointermove", move);
      input.removeEventListener("pointerup", up);
    }
    input.addEventListener("pointermove", move);
    input.addEventListener("pointerup", up);
  });
}

function boot() {
  renderExamples();
  renderHistory();
  $("prompt").addEventListener("input", () => {
    state.prompt = $("prompt").value;
    draw();
    window.clearTimeout(historyTimer);
    historyTimer = window.setTimeout(() => remember(state.prompt), 500);
  });
  $("width-range").addEventListener("input", () => {
    state.widthMm = Number($("width-range").value);
    syncNumbers();
    draw();
    fit();
  });
  $("stroke-range").addEventListener("input", () => {
    state.strokeMm = Number($("stroke-range").value);
    syncNumbers();
    draw();
  });
  $("width").addEventListener("change", () => {
    const next = fromDisplay($("width").value);
    if (next == null) return;
    state.widthMm = next;
    syncNumbers();
    draw();
    fit();
  });
  $("stroke").addEventListener("change", () => {
    const next = fromDisplay($("stroke").value);
    if (next == null) return;
    state.strokeMm = next;
    syncNumbers();
    draw();
  });
  $("mode").addEventListener("change", () => {
    state.mode = $("mode").value;
    draw();
  });
  $("unit-mm").addEventListener("click", () => setUnit("mm"));
  $("unit-in").addEventListener("click", () => setUnit("in"));
  $("view-art").addEventListener("click", () => setPalette("preview"));
  $("view-machine").addEventListener("click", () => setPalette("machine"));
  $("reset").addEventListener("click", () => {
    state.widthMm = 140;
    state.strokeMm = 0.6;
    state.mode = "engrave";
    $("mode").value = "engrave";
    setUnit("mm");
    setPalette("preview");
    fit();
  });
  $("download").addEventListener("click", download);
  $("tips-open").addEventListener("click", () => {
    showTip(0);
    $("tips").showModal();
  });
  $("tips-close").addEventListener("click", () => $("tips").close());
  $("tips-back").addEventListener("click", () => showTip(tipIndex - 1));
  $("tips-next").addEventListener("click", () => {
    if (tipIndex === TIPS.length - 1) $("tips").close();
    else showTip(tipIndex + 1);
  });
  bindCards();
  bindZoom();
  bindDragNumber($("width"), () => state.widthMm, (value) => {
    state.widthMm = value;
    syncNumbers();
    draw();
  });
  bindDragNumber($("stroke"), () => state.strokeMm, (value) => {
    state.strokeMm = value;
    syncNumbers();
    draw();
  });
  draw();
  syncNumbers();
  requestAnimationFrame(fit);
  registerExport();
  window.addEventListener("load", registerExport);
}

boot();
