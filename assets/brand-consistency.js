/* CrestlineOps / RankForge brand consistency layer
   Safe add-on: updates labels and navigation only. */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function normalizePath(path) {
    var current = window.location.pathname || '/';
    if (current.includes('/dashboard/') || current.includes('/lists/') || current.includes('/leads/') || current.includes('/lead-detail/') || current.includes('/login/') || current.includes('/signup/')) {
      return '../' + path.replace(/^\//, '');
    }
    return path;
  }

  function updateSidebarBrand() {
    var brand = document.querySelector('.sidebar .brand');
    if (!brand) return;

    brand.setAttribute('href', normalizePath('index.html'));
    brand.setAttribute('aria-label', 'Back to CrestlineOps homepage');

    var strong = brand.querySelector('.brand-copy strong');
    if (strong) strong.textContent = 'RankForge';

    var small = brand.querySelector('.brand-copy small');
    if (small) small.textContent = 'by CrestlineOps';

    var sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav && !document.querySelector('.sidebar-site-link')) {
      var home = document.createElement('a');
      home.className = 'sidebar-site-link';
      home.href = normalizePath('index.html');
      home.textContent = '← CrestlineOps site';
      sidebarNav.parentNode.insertBefore(home, sidebarNav.nextSibling);
    }
  }

  function addTopbarContext() {
    var actions = document.querySelector('.topbar-actions');
    if (!actions) return;

    if (!document.querySelector('.app-brand-context')) {
      var context = document.createElement('div');
      context.className = 'app-brand-context';
      context.innerHTML = 'App: <strong>RankForge</strong>'; 
      actions.insertBefore(context, actions.firstChild);
    }

    if (!document.querySelector('.app-back-home-link')) {
      var link = document.createElement('a');
      link.className = 'app-back-home-link';
      link.href = normalizePath('index.html');
      link.textContent = '← Back to CrestlineOps';
      actions.insertBefore(link, actions.firstChild);
    }
  }

  function updateAuthCopy() {
    var isAuthPage = document.body && (document.body.classList.contains('auth-page-shell') || document.body.dataset.page === 'login' || document.body.dataset.page === 'signup');
    if (!isAuthPage) return;

    var heading = document.querySelector('.auth-card-head h2');
    if (heading && !/RankForge/i.test(heading.textContent)) {
      if (/sign up|create/i.test(heading.textContent)) heading.textContent = 'Create your RankForge workspace';
      else heading.textContent = 'Sign in to RankForge';
    }

    var authHead = document.querySelector('.auth-card-head');
    if (authHead && !document.querySelector('.auth-brand-context')) {
      var context = document.createElement('div');
      context.className = 'auth-brand-context';
      context.innerHTML = 'RankForge by <strong>CrestlineOps</strong>';
      authHead.appendChild(context);
    }
  }

  function updateTitle() {
    if (!document.title) return;
    if (/RankForge/i.test(document.title) && !/CrestlineOps/i.test(document.title)) {
      document.title = document.title.replace('RankForge Intelligence', 'RankForge by CrestlineOps');
    }
  }

  ready(function () {
    updateSidebarBrand();
    addTopbarContext();
    updateAuthCopy();
    updateTitle();
    window.rankforgeBrandConsistency = { active: true, version: 'brand-consistency-1' };
  });
})();
