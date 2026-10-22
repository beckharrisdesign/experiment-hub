/*
 * Bootstrap for the Notion-callout components on beckharrisdesign.com.
 * The loader itself is components/loader.js; this file only imports it.
 *
 * Why two files: Super rebuilds its Head code field as React elements, and a
 * classic <script src> is the one shape known to survive that — it is how
 * redirects.js and lightbox.js are installed. This file is therefore plain
 * script, not a module (no `export`, no `import.meta`), and reaches the real
 * loader through a dynamic import(), which classic scripts may use.
 *
 * Install: one line in Super → Settings → Code → Head, next to the others:
 *
 *   <script src="https://labs.beckharrisdesign.com/super/components.js" async></script>
 *
 * Bump VERSION here and in components/loader.js when a component changes.
 */
(function () {
  if (window.__bhdComponents) return; // loaded twice — keep the first
  window.__bhdComponents = true;

  var VERSION = '4';
  var FALLBACK = 'https://labs.beckharrisdesign.com/super/components.js';
  /* currentScript is null when run as a module; the fallback covers that. */
  var self = (document.currentScript && document.currentScript.src) || FALLBACK;
  var loader = new URL('components/loader.js?v=' + VERSION, self).href;

  import(loader)
    .then(function (m) { m.boot(); })
    .catch(function (err) { console.warn('[bhd] components loader failed to load', err); });
})();
