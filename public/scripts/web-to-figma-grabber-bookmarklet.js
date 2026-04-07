// Paste this file's single-line output into a bookmark URL if needed.
(function(){
  var NS="[web-to-figma-grabber:bookmarklet]";
  try {
    window.__WEB_TO_FIGMA_GRABBER_DEBUG__ = window.__WEB_TO_FIGMA_GRABBER_DEBUG__ || { events: [] };
    window.__WEB_TO_FIGMA_GRABBER_DEBUG__.events.push({
      stage:"bookmarklet-start",
      href:window.location.href,
      ts:new Date().toISOString()
    });
    console.info(NS,"start",window.location.href);
  } catch(_) {}

  if(window.__WEB_TO_FIGMA_GRABBER_LOADER_ACTIVE__){
    console.warn(NS,"loader already active");
    window.alert("Web-to-Figma Grabber loader already active.");
    return;
  }

  window.__WEB_TO_FIGMA_GRABBER_LOADER_ACTIVE__=true;
  var url="https://labs.beckharrisdesign.com/scripts/web-to-figma-grabber-loader.js?v="+Date.now();
  var s=document.createElement("script");
  s.src=url;
  s.async=true;
  s.onload=function(){
    try {
      window.__WEB_TO_FIGMA_GRABBER_DEBUG__.events.push({
        stage:"bookmarklet-loader-loaded",
        src:url,
        ts:new Date().toISOString()
      });
      console.info(NS,"loader script loaded",url);
    } catch(_) {}
    window.__WEB_TO_FIGMA_GRABBER_LOADER_ACTIVE__=false;
  };
  s.onerror=function(ev){
    try {
      window.__WEB_TO_FIGMA_GRABBER_DEBUG__.events.push({
        stage:"bookmarklet-loader-error",
        src:url,
        eventType:ev&&ev.type,
        ts:new Date().toISOString()
      });
      console.error(NS,"loader failed to load",url,ev);
    } catch(_) {}
    window.__WEB_TO_FIGMA_GRABBER_LOADER_ACTIVE__=false;
    window.alert("Web-to-Figma loader failed to load. Check console for [web-to-figma-grabber].");
  };
  document.head.appendChild(s);
})();
