(function(){
  'use strict';
  function session(){try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';if(/^sb-.+-auth-token$/.test(k)){var p=JSON.parse(localStorage.getItem(k)||'{}');var u=p.user||p.currentSession&&p.currentSession.user||p.session&&p.session.user;if(u)return{userId:u.id,email:u.email};}}return JSON.parse(localStorage.getItem('rankforge-auth-session-v1')||'null');}catch(e){return null;}}
  function loggedIn(){var s=session();return !!(s&&s.userId);}
  function nestedPrefix(){return '../';}
  function planLabel(){var p=new URLSearchParams(location.search).get('plan')||'';p=String(p).trim().toLowerCase().replace(/[_-]/g,' ');if(!p)return'';return p.replace(/\b\w/g,function(c){return c.toUpperCase();});}
  function updateAuthCtas(){
    var isIn=loggedIn();
    document.querySelectorAll('[data-auth-primary]').forEach(function(a){
      var type=a.getAttribute('data-auth-primary');
      if(isIn){a.textContent=type==='settings'?'View Settings':'Go to Dashboard';a.href=type==='settings'?nestedPrefix()+'settings/':nestedPrefix()+'dashboard/';}
      else{a.textContent='Log in to continue';a.href=nestedPrefix()+'login/';}
    });
    document.querySelectorAll('[data-auth-secondary]').forEach(function(a){
      if(isIn){a.textContent='View Settings';a.href=nestedPrefix()+'settings/';}
      else{a.textContent='Start Free';a.href=nestedPrefix()+'signup/';}
    });
    var hint=document.querySelector('[data-plan-hint]');
    if(hint){var label=planLabel();hint.textContent=label?'Your '+label+' plan is being confirmed. Plan access is applied after backend billing confirmation.':'';}
  }
  function bindRefresh(){document.querySelectorAll('[data-refresh-billing]').forEach(function(btn){if(btn.dataset.bound==='true')return;btn.dataset.bound='true';btn.addEventListener('click',function(){if(loggedIn())location.href=nestedPrefix()+'settings/';else location.href=nestedPrefix()+'login/';});});}
  function init(){updateAuthCtas();bindRefresh();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.addEventListener('rankforge:session-ready',init);
})();