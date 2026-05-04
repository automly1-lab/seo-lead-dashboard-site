(function(){
  function clean(v){return String(v==null?'':v).trim()}
  function label(v){var k=clean(v).toLowerCase();if(k==='growth')return'Growth';if(k==='starter')return'Starter';if(k==='agency_intelligence')return'Agency Intelligence';if(k==='admin'||k==='admin_unlimited')return'Admin';return clean(v)||'Free'}
  function load(){try{return JSON.parse(localStorage.getItem('rankforge-user-plan-v1')||'null')}catch(e){return null}}
  function paint(plan){
    var used=document.getElementById('creditsUsed'),limit=document.getElementById('creditsLimit'),bar=document.getElementById('creditsBar'),usage=document.querySelector('.usage');
    if(plan&&plan.name&&Number(plan.creditsLimit||0)>10){
      if(used)used.textContent=String(plan.creditsUsed||0);
      if(limit)limit.textContent=' / '+String(plan.creditsLimit||0);
      if(bar)bar.style.width=(plan.creditsLimit?Math.min(100,(plan.creditsUsed||0)/plan.creditsLimit*100):0)+'%';
      if(usage){var small=usage.querySelector('small');if(small)small.textContent='Plan: '+label(plan.name)+(plan.billingStatus?' · '+plan.billingStatus:'')}
      var title=document.querySelector('.account strong');if(title)title.textContent='RankForge '+label(plan.name);
      return;
    }
    if(used)used.textContent='…';
    if(limit)limit.textContent='';
    if(usage){var s=usage.querySelector('small');if(s)s.textContent='Plan sync pending'}
  }
  function boot(){paint(load())}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();