/*
 * Client-side redirects for beckharrisdesign.com (Notion → Super).
 *
 * Why this file exists: Super has no redirects panel, and it rebuilds its
 * Head/Body code fields as React elements, so inline <script> and inline
 * event handlers never execute. A script loaded by URL does. Super's head
 * code carries one line:
 *
 *   <script src="https://labs.beckharrisdesign.com/super/redirects.js" async></script>
 *
 * Use: a slug changed or a link went out wrong (a PDF, an email) and can't be
 * recalled. Add one line to REDIRECTS below: old path → live path. Keys are
 * matched case-insensitively with any trailing slash removed. Query strings
 * and #hashes are carried over. Values may be a path or a full URL.
 *
 * This is a browser redirect, not a 301: people land on the right page;
 * crawlers still see the old URL's 404. That is the job it's for.
 */
(function () {
  var REDIRECTS = {
    // 2026-09-30 · Figma "Manager, Design – Systems & Infrastructure" cover
    // letter (sent as PDF) links the Notion slug, not the live one.
    "/project-case-voltron": "/project-voltron",
  };

  function normalize(path) {
    var p = String(path || "/").toLowerCase().replace(/\/+$/, "");
    return p === "" ? "/" : p;
  }

  var lookup = {};
  for (var key in REDIRECTS) {
    if (Object.prototype.hasOwnProperty.call(REDIRECTS, key)) {
      lookup[normalize(key)] = REDIRECTS[key];
    }
  }

  function check() {
    var target = lookup[normalize(window.location.pathname)];
    if (!target) return;
    var dest = new URL(target, window.location.origin);
    if (!dest.search) dest.search = window.location.search;
    if (!dest.hash) dest.hash = window.location.hash;
    if (normalize(dest.pathname) === normalize(window.location.pathname) &&
        dest.origin === window.location.origin) return; // never loop
    window.location.replace(dest.toString());
  }

  check();

  // Super is a Next.js app: in-site navigation changes the path without a
  // page load, so re-check after client-side route changes too.
  ["pushState", "replaceState"].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      check();
      return result;
    };
  });
  window.addEventListener("popstate", check);
})();
