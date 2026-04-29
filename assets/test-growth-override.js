(function(){
  var TEST_EMAIL='automly2@gmail.com';
  function readSession(){
    try{
      if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();
      return JSON.parse(localStorage.getItem('rankforge-auth-session-v1')||'null');
    }catch(e){return null;}
  }
  function apply(){
    var session=readSession();
    var email=String(session&&(session.email||session.userEmail)||'').trim().toLowerCase();
    if(email!==TEST_EMAIL)return;
    localStorage.setItem('rankforge-current-plan-v1','growth');
    localStorage.setItem('rankforge-selected-plan-v1','growth');
    localStorage.setItem('rankforge-billing-status-v1','active');
    document.documentElement.setAttribute('data-rf-test-plan','growth');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  setTimeout(apply,400);
  setTimeout(apply,1200);
})();
