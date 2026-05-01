(function(){
  'use strict';
  var PUBLIC_RE=/\/(how-it-works|pricing|privacy|terms|refund-policy|login|signup)\/?$/;
  function isPublic(){return location.pathname==='/'||/\/seo-lead-dashboard-site\/?$/.test(location.pathname)||PUBLIC_RE.test(location.pathname||'');}
  function nested(){return PUBLIC_RE.test(location.pathname||'');}
  function prefix(){return nested()?'../':'';}
  function clean(v){return String(v==null?'':v).trim();}
  function page(){var p=location.pathname;if(/\/how-it-works\//.test(p))return'how';if(/\/pricing\//.test(p))return'pricing';if(/\/privacy\//.test(p))return'privacy';if(/\/terms\//.test(p))return'terms';if(/\/refund-policy\//.test(p))return'refund';if(/\/login\//.test(p))return'login';if(/\/signup\//.test(p))return'signup';return'home';}
  function session(){try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';if(/^sb-.+-auth-token$/.test(k)){var p=JSON.parse(localStorage.getItem(k)||'{}');var u=p.user||p.currentSession&&p.currentSession.user||p.session&&p.session.user;if(u)return{userId:u.id,email:u.email};}}return JSON.parse(localStorage.getItem('rankforge-auth-session-v1')||'null');}catch(e){return null;}}
  function loggedIn(){var s=session();return !!(s&&s.userId);}
  function href(path){return prefix()+path;}
  function removeOldShell(){document.querySelectorAll('.rf-public-footer,.marketing-footer,.footer').forEach(function(n){n.remove();});document.querySelectorAll('.navbar,.site-header').forEach(function(n){if(!n.classList.contains('rf-marketing-nav'))n.remove();});}
  function ensureHeader(){
    if(!isPublic())return;
    var existing=document.querySelector('.rf-marketing-nav');
    var active=page();
    var actions=loggedIn()?'<a class="rf-button primary" href="'+href('dashboard/')+'">Dashboard</a>':'<a class="rf-button secondary" href="'+href('login/')+'">Log in</a><a class="rf-button primary" href="'+href('signup/')+'">Start free</a>';
    var html='<div class="rf-container rf-nav-inner"><a class="rf-brand" href="'+prefix()+'"><span class="rf-brand-mark">RF</span><span class="rf-brand-copy"><strong>RankForge</strong><small>by CrestlineOps</small></span></a><nav class="rf-nav-links" aria-label="Primary"><a '+(active==='how'?'class="active" aria-current="page"':'')+' href="'+href('how-it-works/')+'">How it works</a><a '+(active==='pricing'?'class="active" aria-current="page"':'')+' href="'+href('pricing/')+'">Pricing</a></nav><div class="rf-nav-actions nav-actions">'+actions+'</div><button class="rf-menu-button" type="button" aria-label="Open menu" aria-expanded="false"><span></span></button></div><div class="rf-mobile-menu" hidden><a href="'+href('how-it-works/')+'">How it works</a><a href="'+href('pricing/')+'">Pricing</a>'+(loggedIn()?'<a href="'+href('dashboard/')+'">Dashboard</a>':'<a href="'+href('login/')+'">Log in</a><a class="rf-mobile-cta" href="'+href('signup/')+'">Start free</a>')+'</div>';
    if(!existing){var h=document.createElement('header');h.className='rf-marketing-nav';h.innerHTML=html;document.body.prepend(h);}else existing.innerHTML=html;
  }
  function ensureFooter(){
    if(!isPublic())return;
    document.querySelectorAll('.rf-public-footer').forEach(function(n){n.remove();});
    var f=document.createElement('footer');
    f.className='rf-public-footer';
    f.innerHTML='<div class="rf-container rf-public-footer-inner"><div><strong>RankForge by CrestlineOps</strong><p>Evidence-based SEO lead intelligence for agencies.</p></div><div class="rf-footer-cols"><div><h3>Product</h3><a href="'+href('how-it-works/')+'">How it works</a><a href="'+href('pricing/')+'">Pricing</a><a href="'+href('dashboard/')+'">Dashboard</a></div><div><h3>Account</h3><a href="'+href('login/')+'">Log in</a><a href="'+href('signup/')+'">Start free</a></div><div><h3>Legal</h3><a href="'+href('privacy/')+'">Privacy</a><a href="'+href('terms/')+'">Terms</a><a href="'+href('refund-policy/')+'">Refund Policy</a></div></div></div>';
    document.body.appendChild(f);
  }
  function bindMobile(){var btn=document.querySelector('.rf-menu-button'),menu=document.querySelector('.rf-mobile-menu');if(!btn||!menu||btn.dataset.bound==='true')return;btn.dataset.bound='true';btn.addEventListener('click',function(){var open=menu.hidden;menu.hidden=!open;btn.setAttribute('aria-expanded',String(open));});menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.hidden=true;btn.setAttribute('aria-expanded','false');});});}
  function init(){if(!isPublic())return;removeOldShell();ensureHeader();ensureFooter();bindMobile();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setTimeout(init,700);
})();