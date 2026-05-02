(function(){
  'use strict';
  if(!document.body.classList.contains('rf-pricing-page')) return;
  function fix(){
    document.querySelectorAll('li,p,h2,h3,td').forEach(function(el){
      var t=el.textContent.trim();
      if(t==='Up to 50 qualified leads/month') el.textContent='50 qualified lead credits/month';
      if(t==='Up to 250 qualified leads/month') el.textContent='250 qualified lead credits/month';
      if(t==='Only qualified prospects consume lead credits.') el.textContent='Only qualified leads consume credits.';
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix);else fix();
})();
