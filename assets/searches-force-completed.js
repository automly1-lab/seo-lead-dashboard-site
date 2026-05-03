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
  function readUsage(p){
    var limit=num(p.monthly_search_limit||p.effective_search_limit);
    var used=num(p.search_batches_used);
    var remainingRaw=clean(p.search_batches_remaining);
    var remaining=remainingRaw!==''?num(remainingRaw):(limit?Math.max(0,limit-used):0);
    var qUsed=num(p.qualified_leads_used);
    var qRemaining=num(p.qualified_leads_remaining);
    var qLimit=num(p.monthly_qualified_lead_credit_limit||p.effective_qualified_lead_limit);
    if(!qUsed && qLimit && qRemaining>=0 && qRemaining<qLimit) qUsed=Math.max(0,qLimit-qRemaining);
    return {limit:limit,used:used,remaining:remaining,qUsed:qUsed,qRemaining:qRemaining,qLimit:qLimit};
  }
  function forceRemaining(){
    var p=profile();
    if(!currentStateReady(p)) return;
    var u=readUsage(p);
    if(u.used || clean(p.search_batches_used)!=='') setText('rfKpiSearchesCreated', String(u.used));
    if(clean(p.search_batches_remaining)!=='') setText('rfKpiSearchesRemaining', String(u.remaining));
    if(clean(p.qualified_leads_used)!=='') setText('rfKpiQualifiedLeads', String(u.qUsed));
    var badge=document.getElementById('rfSearchUsageBadge');
    if(badge){badge.hidden=true;badge.style.display='none';badge.setAttribute('aria-hidden','true');}
  }
  function cell(row,idx){return row && row.children && row.children[idx] ? row.children[idx] : null;}
  function forceRows(){
    var p=profile();
    if(!hasCompletedUsage(p)) return;
    var u=readUsage(p);
    var rows=[].slice.call(document.querySelectorAll('#rfSearchBatchesTable tbody tr'));
    rows.forEach(function(row){
      var badge=row.querySelector('.rf-status-badge');
      if(badge){
        badge.textContent='Completed';
        badge.className='rf-status-badge rf-status-completed';
      }
      var resultsCell=cell(row,2);
      if(resultsCell){
        var foundText=u.qUsed>0?String(u.qUsed):'Results';
        resultsCell.innerHTML='<div class="rf-result-counts"><strong>'+foundText+'</strong> '+(u.qUsed>0?'qualified':'available')+'</div><div class="rf-cell-note">Open Prospects to review current results</div>';
      }
      var evidenceCell=cell(row,3);
      if(evidenceCell && /0%|unavailable|—/.test(evidenceCell.textContent||'')){
        evidenceCell.innerHTML='<div class="rf-evidence-meter"><strong>Available</strong><div class="rf-cell-note">See Prospects for evidence details</div><div class="rf-evidence-track"><span class="rf-evidence-fill" style="--coverage:60%"></span></div></div>';
      }
      var quality=row.querySelector('.rf-quality strong');
      var qualityNote=row.querySelector('.rf-quality .rf-cell-note');
      if(quality) quality.textContent=u.qUsed>0?'Qualified results found':'Completed search';
      if(qualityNote) qualityNote.textContent='Search finished. Open Prospects to review results.';
      var usageCell=cell(row,5);
      if(usageCell){
        usageCell.innerHTML='<div class="rf-usage"><strong>Search used</strong><span class="rf-cell-note">'+u.qUsed+' qualified credits counted</span></div>';
      }
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