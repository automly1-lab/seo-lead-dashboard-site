(function(){
  'use strict';
  if(!document.body || !document.body.classList.contains('app-page-searches')) return;
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  function parse(raw,f){try{return raw?JSON.parse(raw):f;}catch(e){return f;}}
  function clean(v){return String(v==null?'':v).trim();}
  function num(v){var n=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):0;}
  function profile(){return window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),{})||{};}
  function currentStateReady(p){return p && (p.profile_source==='user_current_state' || p.debug_using_user_current_state);}
  function setText(id,value){var el=document.getElementById(id);if(el)el.textContent=value;}
  function hasCompletedUsage(p){
    if(!p) return false;
    if(currentStateReady(p) && num(p.search_batches_used)>0) return true;
    var limit=num(p.monthly_search_limit), remaining=num(p.search_batches_remaining);
    return limit>0 && remaining<limit;
  }
  function forceRemaining(){
    var p=profile();
    if(!currentStateReady(p)) return;
    if(p.search_batches_remaining!==undefined && p.search_batches_remaining!==null && clean(p.search_batches_remaining)!==''){
      setText('rfKpiSearchesRemaining', String(num(p.search_batches_remaining)));
    }
    var badge=document.getElementById('rfSearchUsageBadge');
    if(badge){badge.hidden=true;badge.style.display='none';badge.setAttribute('aria-hidden','true');}
  }
  function forceRows(){
    var p=profile();
    if(!hasCompletedUsage(p)) return;
    var rows=[].slice.call(document.querySelectorAll('#rfSearchBatchesTable tbody tr'));
    rows.forEach(function(row){
      var badge=row.querySelector('.rf-status-badge');
      if(!badge) return;
      if(!/processing/i.test(badge.textContent||'')) return;
      badge.textContent='Completed';
      badge.className='rf-status-badge rf-status-completed';
      var quality=row.querySelector('.rf-quality strong');
      var qualityNote=row.querySelector('.rf-quality .rf-cell-note');
      if(quality && /worth reviewing|crawl issue|processing/i.test(quality.textContent||'')) quality.textContent='Completed search';
      if(qualityNote && /partial evidence|unavailable|processing/i.test(qualityNote.textContent||'')) qualityNote.textContent='Search finished. Open Prospects to review results.';
    });
    var banner=document.getElementById('rfProcessingBanner');
    if(banner) banner.remove();
    try{
      var url=new URL(location.href);
      if(url.searchParams.get('processing')){url.searchParams.delete('processing');history.replaceState({},'',url.toString());}
    }catch(e){}
  }
  function run(){forceRemaining();forceRows();}
  window.rankforgeForceCompletedSearches=run;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  window.addEventListener('rankforge:user-profile-resolved',run);
  window.addEventListener('storage',function(e){if(e.key===PROFILE_KEY||e.key==='rankforge-clean-app-state-v1')run();});
  setTimeout(run,150);
  setTimeout(run,600);
  setTimeout(run,1200);
  setTimeout(run,2500);
  setTimeout(run,5000);
})();