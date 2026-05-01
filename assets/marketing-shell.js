(function(){
  'use strict';
  var ADMIN_EMAIL='automly1@gmail.com';
  var PUBLIC_RE=/\/(how-it-works|pricing|privacy|terms|refund-policy|login|signup|checkout-success|checkout-cancelled|checkout-pending)\/?$/;
  function isPublic(){return location.pathname==='/'||/\/seo-lead-dashboard-site\/?$/.test(location.pathname)||PUBLIC_RE.test(location.pathname||'');}
  function nested(){return PUBLIC_RE.test(location.pathname||'');}
  function prefix(){return nested()?'../':'';}
  function page(){var p=location.pathname;if(/\/how-it-works\//.test(p))return'how';if(/\/pricing\//.test(p))return'pricing';if(/\/privacy\//.test(p))return'privacy';if(/\/terms\//.test(p))return'terms';if(/\/refund-policy\//.test(p))return'refund';if(/\/login\//.test(p))return'login';if(/\/signup\//.test(p))return'signup';return'home';}
  function session(){try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';if(/^sb-.+-auth-token$/.test(k)){var p=JSON.parse(localStorage.getItem(k)||'{}');var u=p.user||p.currentSession&&p.currentSession.user||p.session&&p.session.user;if(u)return{userId:u.id,email:u.email};}}return JSON.parse(localStorage.getItem('rankforge-auth-session-v1')||'null');}catch(e){return null;}}
  function userEmail(){var s=session();return String(s&&(s.email||s.userEmail)||'').trim().toLowerCase();}
  function loggedIn(){var s=session();return !!(s&&s.userId);}
  function isAdmin(){return userEmail()===ADMIN_EMAIL;}
  function initial(){var e=userEmail();return e?e.charAt(0).toUpperCase():'A';}
  function displayEmail(){var e=userEmail();return e||'Account';}
  function href(path){return prefix()+path;}
  function clearMarketingChrome(){
    document.querySelectorAll('.rf-public-footer,.marketing-footer,.footer').forEach(function(n){n.remove();});
    document.querySelectorAll('header.rf-marketing-nav,header.rf-pricing-nav,.navbar,.site-header').forEach(function(n){n.remove();});
  }
  function signedOutActions(){return '<a class="rf-login-action" href="'+href('login/')+'">Log in</a><a class="rf-start-action" href="'+href('signup/')+'">Start free</a>';}
  function signedInActions(){
    var adminLink=isAdmin()?'<a href="'+href('quality/')+'">Quality</a>':'';
    return '<a class="rf-dashboard-action" href="'+href('dashboard/')+'">Dashboard</a><div class="rf-account-menu"><button class="rf-account-chip" type="button" aria-haspopup="true" aria-expanded="false"><span class="rf-avatar">'+initial()+'</span><span class="rf-account-label">'+displayEmail()+'</span><span class="rf-chevron">⌄</span></button><div class="rf-account-dropdown" hidden><a href="'+href('dashboard/')+'">Dashboard</a><a href="'+href('settings/')+'">Settings</a><a href="'+href('pricing/')+'">Pricing</a>'+adminLink+'<button type="button" data-rf-signout>Sign out</button></div></div>';
  }
  function headerHtml(){
    var active=page();
    var actions=loggedIn()?signedInActions():signedOutActions();
    return '<div class="rf-container rf-nav-inner"><a class="rf-brand" href="'+prefix()+'"><span class="rf-brand-mark">RF</span><span class="rf-brand-copy"><strong>RankForge</strong><small>by CrestlineOps</small></span></a><nav class="rf-nav-links" aria-label="Primary"><a '+(active==='home'?'class="active" aria-current="page"':'')+' href="'+prefix()+'">Home</a><a '+(active==='how'?'class="active" aria-current="page"':'')+' href="'+href('how-it-works/')+'">How it works</a><a '+(active==='pricing'?'class="active" aria-current="page"':'')+' href="'+href('pricing/')+'">Pricing</a></nav><div class="rf-nav-actions nav-actions">'+actions+'</div><button class="rf-menu-button" type="button" aria-label="Open menu" aria-expanded="false"><span></span></button></div><div class="rf-mobile-menu" hidden><a href="'+prefix()+'">Home</a><a href="'+href('how-it-works/')+'">How it works</a><a href="'+href('pricing/')+'">Pricing</a>'+(loggedIn()?'<a class="rf-mobile-cta" href="'+href('dashboard/')+'">Dashboard</a><a href="'+href('settings/')+'">Settings</a>'+(isAdmin()?'<a href="'+href('quality/')+'">Quality</a>':'')+'<button type="button" data-rf-signout>Sign out</button>':'<a href="'+href('login/')+'">Log in</a><a class="rf-mobile-cta" href="'+href('signup/')+'">Start free</a>')+'</div>';
  }
  function ensureHeader(){
    if(!isPublic())return;
    document.querySelectorAll('header.rf-marketing-nav[data-rf-shell="true"]').forEach(function(n){n.remove();});
    var h=document.createElement('header');
    h.className='rf-marketing-nav';
    h.setAttribute('data-rf-shell','true');
    h.innerHTML=headerHtml();
    document.body.prepend(h);
  }
  function ensureFooter(){
    if(!isPublic())return;
    document.querySelectorAll('.rf-public-footer').forEach(function(n){n.remove();});
    var f=document.createElement('footer');
    f.className='rf-public-footer';
    f.setAttribute('data-rf-shell','true');
    f.innerHTML='<div class="rf-container rf-public-footer-inner"><div><strong>RankForge by CrestlineOps</strong><p>Evidence-based SEO lead intelligence for agencies.</p></div><div class="rf-footer-cols"><div><h3>Product</h3><a href="'+prefix()+'">Home</a><a href="'+href('how-it-works/')+'">How it works</a><a href="'+href('pricing/')+'">Pricing</a><a href="'+href('dashboard/')+'">Dashboard</a></div><div><h3>Account</h3><a href="'+href('login/')+'">Log in</a><a href="'+href('signup/')+'">Start free</a></div><div><h3>Legal</h3><a href="'+href('privacy/')+'">Privacy</a><a href="'+href('terms/')+'">Terms</a><a href="'+href('refund-policy/')+'">Refund Policy</a></div></div></div>';
    document.body.appendChild(f);
  }
  function closeAccount(){var dd=document.querySelector('.rf-account-dropdown'),chip=document.querySelector('.rf-account-chip');if(dd)dd.hidden=true;if(chip)chip.setAttribute('aria-expanded','false');}
  function bindAccount(){var chip=document.querySelector('.rf-account-chip'),dd=document.querySelector('.rf-account-dropdown');if(chip&&dd&&chip.dataset.bound!=='true'){chip.dataset.bound='true';chip.addEventListener('click',function(e){e.stopPropagation();var open=dd.hidden;dd.hidden=!open;chip.setAttribute('aria-expanded',String(open));});}document.addEventListener('click',closeAccount,{once:true});}
  async function signOut(){try{if(window.rankforgeAuth&&window.rankforgeAuth.getSupabaseClient){var c=window.rankforgeAuth.getSupabaseClient();if(c)await c.auth.signOut();}}catch(e){}localStorage.removeItem('rankforge-auth-session-v1');localStorage.removeItem('rankforge-current-user-id-v1');location.href=href('login/');}
  function bindSignout(){document.querySelectorAll('[data-rf-signout]').forEach(function(b){if(b.dataset.bound==='true')return;b.dataset.bound='true';b.addEventListener('click',signOut);});}
  function bindMobile(){var btn=document.querySelector('.rf-menu-button'),menu=document.querySelector('.rf-mobile-menu');if(!btn||!menu||btn.dataset.bound==='true')return;btn.dataset.bound='true';btn.addEventListener('click',function(){var open=menu.hidden;menu.hidden=!open;btn.setAttribute('aria-expanded',String(open));});menu.querySelectorAll('a,button').forEach(function(a){a.addEventListener('click',function(){menu.hidden=true;btn.setAttribute('aria-expanded','false');});});}
  function init(){if(!isPublic())return;clearMarketingChrome();ensureHeader();ensureFooter();bindMobile();bindAccount();bindSignout();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.addEventListener('rankforge:session-ready',init);
})();