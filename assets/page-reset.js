(function(){
  'use strict';
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  } catch (_) {}

  function shouldSkip(){
    return Boolean(window.location.hash);
  }

  function scrollTop(){
    if (shouldSkip()) return;
    try { window.scrollTo(0, 0); } catch (_) {}
  }

  scrollTop();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ requestAnimationFrame(scrollTop); }, { once: true });
  } else {
    requestAnimationFrame(scrollTop);
  }
  window.addEventListener('load', function(){ setTimeout(scrollTop, 40); }, { once: true });
})();
