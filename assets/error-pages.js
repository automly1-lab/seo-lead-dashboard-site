(function(){
  'use strict';
  function getSession(){try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';if(/^sb-.+-auth-token$/.test(k)){var p=JSON.parse(localStorage.getItem(k)||'{}');var u=p.user||p.currentSession&&p.currentSession.user||p.session&&p.session.user;if(u)return{userId:u.id,email:u.email};}}return JSON.parse(localStorage.getItem('rankforge-auth-session-v1')||'null');}catch(e){return null;}}
  function loggedIn(){var s=getSession();return !!(s&&s.userId);}
  function updateActions(){
    var primary=document.querySelector('[data-error-primary]');
    var secondary=document.querySelector('[data-error-secondary]');
    var tertiary=document.querySelector('[data-error-tertiary]');
    if(loggedIn()){
      if(primary){primary.textContent='Go to dashboard';primary.href='dashboard/';}
      if(secondary){secondary.textContent='Back to home';secondary.href='./';}
      if(tertiary){tertiary.textContent='View pricing';tertiary.href='pricing/';}
    }else{
      if(primary){primary.textContent='Back to home';primary.href='./';}
      if(secondary){secondary.textContent='Log in';secondary.href='login/';}
      if(tertiary){tertiary.textContent='Start free';tertiary.href='signup/';}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateActions);else updateActions();
  window.addEventListener('rankforge:session-ready',updateActions);
})();