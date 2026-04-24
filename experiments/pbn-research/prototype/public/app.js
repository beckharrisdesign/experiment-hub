(function () {
  const statusEl = document.getElementById("pbn-status");
  const sampleSel = document.getElementById("pbn-sample");
  const fileInput = document.getElementById("pbn-file");
  const runForm = document.getElementById("pbn-form-run");
  const runBtn = document.getElementById("pbn-run-btn");
  const logForm = document.getElementById("pbn-form-log");
  const logBtn = document.getElementById("pbn-log-btn");
  const resultsEl = document.getElementById("pbn-results");

  let timerId = null;
  let busyMode = "run";
  function clearTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function showBusy(message, btn, mode) {
    busyMode = mode || "run";
    clearTimer();
    statusEl.classList.remove("pbn-status-hidden");
    const t0 = Date.now();
    function tick() {
      const sec = (Date.now() - t0) / 1000;
      const s = sec.toFixed(1);
      let tail = "";
      if (busyMode === "run") {
        if (sec >= 45 && sec < 120) {
          tail = " — still normal for 3× pipeline on a photo.";
        } else if (sec >= 120 && sec < 600) {
          tail = " — if Activity Monitor shows Python ~0% CPU for a long stretch, it may be stuck.";
        } else if (sec >= 600) {
          tail = " — over 10m: consider stopping (refresh) and a smaller image.";
        }
      } else if (busyMode === "log" && sec >= 20) {
        tail = " — logging should be quick; if this never finishes, check the terminal running the server.";
      }
      statusEl.textContent = message + " Elapsed: " + s + "s" + tail;
    }
    tick();
    timerId = setInterval(tick, 400);
    if (btn) {
      btn.disabled = true;
      btn.dataset.orig = btn.textContent;
      btn.textContent = "Working…";
    }
  }

  function hideBusy(btn) {
    clearTimer();
    statusEl.classList.add("pbn-status-hidden");
    statusEl.textContent = "";
    if (btn) {
      btn.disabled = false;
      if (btn.dataset.orig) btn.textContent = btn.dataset.orig;
    }
  }

  async function loadSamples() {
    const r = await fetch("/api/samples");
    const j = await r.json();
    const samples = j.samples || [];
    for (const s of samples) {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s;
      sampleSel.appendChild(o);
    }
  }

  function renderResults(data) {
    const qs = "t=" + (data.cache_bust || Date.now());
    const rows = (data.rows || [])
      .map(
        (row) =>
          "<tr><td>" +
          escapeHtml(row.variant) +
          "</td><td>" +
          row.n_regions +
          "</td><td>" +
          row.tiny_frac.toFixed(3) +
          "</td><td>" +
          row.mean_adjacent_delta_e.toFixed(1) +
          "</td><td>" +
          row.auto_total.toFixed(3) +
          "</td></tr>"
      )
      .join("");
    resultsEl.innerHTML =
      '<p class="ok">Source: <strong>' +
      escapeHtml(data.source_label || "") +
      "</strong></p>" +
      '<div class="row">' +
      '<div class="tile"><h3>Input</h3><img src="/preview/input.png?' +
      qs +
      '" alt="input"></div>' +
      '<div class="tile"><h3>A</h3><img src="/preview/A.png?' +
      qs +
      '" alt="A"></div>' +
      '<div class="tile"><h3>B</h3><img src="/preview/B.png?' +
      qs +
      '" alt="B"></div>' +
      '<div class="tile"><h3>C</h3><img src="/preview/C.png?' +
      qs +
      '" alt="C"></div></div>' +
      "<table><thead><tr><th>Variant</th><th>Regions</th><th>tiny_frac</th><th>dE adj</th><th>auto</th></tr></thead><tbody>" +
      rows +
      "</tbody></table>";
    logForm.classList.remove("pbn-hidden");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  runForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    resultsEl.innerHTML = "";
    logForm.classList.add("pbn-hidden");
    showBusy(
      "Running three pipelines (A / B / C). Do not close this tab.",
      runBtn,
      "run"
    );
    try {
      const fd = new FormData();
      const s = sampleSel.value;
      if (s) fd.append("sample", s);
      if (fileInput.files && fileInput.files[0]) fd.append("file", fileInput.files[0]);
      const r = await fetch("/api/run", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        resultsEl.innerHTML =
          '<p class="err">' + escapeHtml(j.error || "Request failed") + "</p>";
        return;
      }
      renderResults(j);
    } catch (e) {
      resultsEl.innerHTML =
        '<p class="err">' + escapeHtml(e.message || String(e)) + "</p>";
    } finally {
      hideBusy(runBtn);
    }
  });

  logForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    showBusy("Writing run log and manifests…", logBtn, "log");
    try {
      const fd = new FormData(logForm);
      const body = {
        subject_clarity: Number(fd.get("subject_clarity")),
        paintability: Number(fd.get("paintability")),
        background_simplicity: Number(fd.get("background_simplicity")),
      };
      const r = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        resultsEl.insertAdjacentHTML(
          "afterbegin",
          '<p class="err">' + escapeHtml(j.error || "Log failed") + "</p>"
        );
        return;
      }
      resultsEl.insertAdjacentHTML(
        "afterbegin",
        '<p class="ok">Logged ' +
          j.logged +
          " rows to <code>" +
          escapeHtml(j.runs_path || "runs.jsonl") +
          "</code>.</p>"
      );
    } catch (e) {
      resultsEl.insertAdjacentHTML(
        "afterbegin",
        '<p class="err">' + escapeHtml(e.message || String(e)) + "</p>"
      );
    } finally {
      hideBusy(logBtn);
    }
  });

  loadSamples().catch(() => {});
})();
