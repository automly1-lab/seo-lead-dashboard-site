/* CrestlineOps / RankForge brand consistency + premium shell loader */
(function () {
  'use strict';

  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function nested() { return /\/(dashboard|lists|searches|leads|lead-detail|settings|quality|opportunities|competitors|pricing|login|signup|privacy|terms|refund-policy)\//.test(window.location.pathname || '/'); }
  function normalizePath(path) { return nested() ? '../' + path.replace(/^\//, '') : path; }
  function asset(path) { return normalizePath(path); }
  function loadCss(href, key) { if (document.querySelector('link[data-' + key + '="true"]')) return; var link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; link.setAttribute('data-' + key, 'true'); document.head.appendChild(link); }
  function loadJs(src, key) { if (document.querySelector('script[data-' + key + '="true"]')) return; var script = document.createElement('script'); script.src = src; script.defer = true; script.setAttribute('data-' + key, 'true'); document.body.appendChild(script); }
  function protectedPage() { return document.body && (document.body.dataset.auth === 'protected' || /\/(dashboard|lists|searches|leads|lead-detail|settings|quality|opportunities|competitors)\//.test(location.pathname)); }

  function updateSidebarBrand() {
    var brand = document.querySelector('.sidebar .brand'); if (!brand) return;
    brand.setAttribute('href', normalizePath('dashboard/'));
    brand.setAttribute('aria-label', 'RankForge dashboard');
    var strong = brand.querySelector('.brand-copy strong'); if (strong) strong.textContent = 'RankForge';
    var small = brand.querySelector('.brand-copy small'); if (small) small.textContent = 'SEO Lead Intelligence';
  }

  function removeTopbarContextClutter() { document.querySelectorAll('.app-brand-context, .app-back-home-link, .sidebar-site-link').forEach(function (node) { node.remove(); }); }

  function updateAuthCopy() {
    var isAuthPage = document.body && (document.body.classList.contains('auth-page-shell') || document.body.dataset.page === 'login' || document.body.dataset.page === 'signup'); if (!isAuthPage) return;
    var heading = document.querySelector('.auth-card-head h2');
    if (heading && !/RankForge/i.test(heading.textContent)) heading.textContent = /sign up|create/i.test(heading.textContent) ? 'Create your RankForge workspace' : 'Sign in to RankForge';
    var authHead = document.querySelector('.auth-card-head');
    if (authHead && !document.querySelector('.auth-brand-context')) { var context = document.createElement('div'); context.className = 'auth-brand-context'; context.innerHTML = 'RankForge by <strong>CrestlineOps</strong>'; authHead.appendChild(context); }
  }

  function updateTitle() { if (document.title && /RankForge Intelligence/i.test(document.title)) document.title = document.title.replace('RankForge Intelligence', 'RankForge'); }

  function loadPremiumShell() {
    loadCss(asset('assets/app-shell.css?v=premium-shell-1'), 'rf-app-shell-css');
    loadJs(asset('assets/app-shell.js?v=premium-shell-1'), 'rf-app-shell-js');
  }

  ready(function () {
    updateSidebarBrand();
    removeTopbarContextClutter();
    updateAuthCopy();
    updateTitle();
    if (protectedPage()) loadPremiumShell();
    window.rankforgeBrandConsistency = { active: true, version: 'brand-consistency-shell-3' };
  });
})();