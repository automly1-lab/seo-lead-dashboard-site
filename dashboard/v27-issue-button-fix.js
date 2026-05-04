(function(){
  'use strict';
  var openState = false;
  function clean(v){ return String(v == null ? '' : v).trim(); }
  function takeover(){
    var wraps = Array.from(document.querySelectorAll('#leadDetailPage .rf26-issues-expand'));
    wraps.forEach(function(wrap){
      if (wrap.dataset.rf27Ready === 'true') return;
      var oldBtn = wrap.querySelector('.rf26-toggle');
      var panel = wrap.querySelector('.rf26-panel');
      if (!oldBtn || !panel) return;
      var label = clean(oldBtn.textContent) || 'See all issues';
      var btn = oldBtn.cloneNode(true);
      btn.className = 'rf27-toggle';
      btn.type = 'button';
      btn.dataset.closedLabel = label.match(/See all .* issues/i) ? label : 'See all issues';
      oldBtn.replaceWith(btn);
      wrap.dataset.rf27Ready = 'true';
      apply(wrap);
    });
  }
  function apply(wrap){
    var btn = wrap.querySelector('.rf27-toggle');
    var panel = wrap.querySelector('.rf26-panel');
    if (!btn || !panel) return;
    if (openState) {
      panel.removeAttribute('hidden');
      btn.setAttribute('aria-expanded', 'true');
      btn.textContent = 'Hide issues';
    } else {
      panel.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = btn.dataset.closedLabel || 'See all issues';
    }
  }
  document.addEventListener('click', function(ev){
    var btn = ev.target.closest && ev.target.closest('.rf27-toggle');
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    var wrap = btn.closest('.rf26-issues-expand');
    openState = !(wrap && wrap.querySelector('.rf26-panel') && !wrap.querySelector('.rf26-panel').hasAttribute('hidden'));
    if (wrap) apply(wrap);
  }, true);
  function boot(){
    takeover();
    var root = document.getElementById('leadDetailPage');
    if (root) {
      new MutationObserver(function(){ requestAnimationFrame(takeover); }).observe(root, { childList:true, subtree:true });
    }
    setTimeout(takeover, 300);
    setTimeout(takeover, 900);
    setTimeout(takeover, 1600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();