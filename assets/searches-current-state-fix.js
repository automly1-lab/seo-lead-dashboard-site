(function(){
  'use strict';
  if(!document.body || !document.body.classList.contains('app-page-searches')) return;
  var STATE_KEY='rankforge-clean-app-state-v1';
  var USER_KEY='rankforge-current-user-id-v1';
  var PROCESSING_PREFIX='rankforge_processing_search_';
  function clean(v){return String(v==null?'':v).trim();}
  function low(v){return clean(v).toLowerCase();}
  function parse(raw,f){try{return raw?JSON.parse(raw):f;}catch(e){return f;}}
  function save(s){try{localStorage.setItem(STATE_KEY,JSON.stringify(s));}catch(e){}}
  function state(){var s=parse(localStorage.getItem(STATE_KEY),{})||{};s.localLists=Array.isArray(s.localLists)?s.localLists:[];s.localLeads=Array.isArray(s.localLeads)?s.localLeads:[];s.remoteCache=s.remoteCache||{};s.remoteCache.lists=Array.isArray(s.remoteCache.lists)?s.remoteCache.lists:[];s.remoteCache.leads=Array.isArray(s.remoteCache.leads)?s.remoteCache.leads:[];return s;}
  function session(){try{return window.rankforgeAuth&&window.rankforgeAuth.getSession?window.rankforgeAuth.getSession():parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};}catch(e){return{};}}
  function userId(){var s=session();return clean(s.userId||s.id||localStorage.getItem(USER_KEY));}
  function owner(row){return clean(row&&(row.userId||row.user_id||row.owner_user_id));}
  function owned(row,u){var o=owner(row);return !o||!u||o===u;}
  function lid(x){return clean(x&& (x.id||x.search_id||x.list_id||x.search_batch_id||x.batch_id||x.saved_list_id));}
  function leadLid(x){return clean(x&& (x.listId||x.list_id||x.search_id||x.searchId||x.search_batch_id||x.batch_id||x.saved_list_id));}
  function keyForList(l){return [l&&l.name,l&&l.search_name,l&&l.niche,l&&l.target_service,l&&l.business_type,l&&l.city,l&&l.target_city].map(low).filter(Boolean).join('|');}
  function keyForLead(l){return [l&&l.search_name,l&&l.list_name,l&&l.niche,l&&l.target_service,l&&l.business_type,l&&l.city,l&&l.target_city].map(low).filter(Boolean).join('|');}
  function statusOf(l){var s=low(l&& (l.qualification_status||l.status||l.decision));if(s==='qualified')return'qualified';if(s==='qualified_locked'||s==='locked_qualified')return'qualified_locked';if(s==='rejected'||s==='filtered_out'||s==='filtered out')return'rejected';return'review_needed';}
  function hasEvidence(l){return ['true','yes','verified','partial'].indexOf(low(l&& (l.seo_claims_verified||l.verified_seo_evidence||l.evidence_status)))>=0||Number(l&&l.seo_evidence_signal_count||0)>0||low(l&&l.crawl_accessible)==='true';}
  function hasContact(l){return !!(clean(l&& (l.email||l.decision_maker_email||l.phone||l.decision_maker_phone))||low(l&&l.contact_cta_found)==='true'||low(l&&l.contact_page_found)==='true');}
  function unique(arr,fn){var seen={};return arr.filter(function(x){var k=fn(x);if(!k||seen[k])return false;seen[k]=true;return true;});}
  function allLists(s,u){return unique([].concat(s.remoteCache.lists||[],s.localLists||[]),lid).filter(function(x){return owned(x,u);});}
  function allLeads(s,u){return unique([].concat(s.remoteCache.leads||[],s.localLeads||[]),function(x){return clean(x.id||x.lead_id||leadLid(x)+':'+(x.company_name||x.company||x.domain||x.website_url));}).filter(function(x){return owned(x,u);});}
  function relatedLeads(list,lists,leads){
    var id=lid(list), exact=leads.filter(function(x){return leadLid(x)===id;});
    if(exact.length) return exact;
    if(lists.length===1 && leads.length) return leads;
    var lk=keyForList(list);
    if(lk){var fuzzy=leads.filter(function(x){var k=keyForLead(x);return k&&((lk.indexOf(k)>=0)||(k.indexOf(lk)>=0));});if(fuzzy.length)return fuzzy;}
    return [];
  }
  function patchList(list,items){
    if(!items.length) return false;
    var q=items.filter(function(x){return statusOf(x)==='qualified';}).length;
    var r=items.filter(function(x){return statusOf(x)==='review_needed';}).length;
    var rej=items.filter(function(x){return statusOf(x)==='rejected';}).length;
    var locked=items.filter(function(x){return statusOf(x)==='qualified_locked';}).length;
    var total=items.length;
    var evidence=items.filter(hasEvidence).length;
    var contact=items.filter(hasContact).length;
    list.status=q>0||r>0||rej>0||locked>0?'completed':'completed_no_qualified';
    list.workflow_status=list.status;
    list.qualified=q;
    list.qualified_count=q;
    list.reviewNeeded=r;
    list.review_needed=r;
    list.needs_review_count=r;
    list.rejected=rej;
    list.rejected_count=rej;
    list.qualified_locked=locked;
    list.qualified_locked_count=locked;
    list.found=total;
    list.discovered=total;
    list.total_found=total;
    list.audited=total;
    list.audited_count=total;
    list.final_leads_count=total;
    list.verified_evidence_count=evidence;
    list.contact_ready_count=contact;
    list.updated_at=new Date().toISOString();
    return true;
  }
  function clearProcessingFor(ids){
    ids.filter(Boolean).forEach(function(id){try{localStorage.removeItem(PROCESSING_PREFIX+id);}catch(e){}});
    try{var url=new URL(location.href);if(url.searchParams.get('processing')){url.searchParams.delete('processing');history.replaceState({},'',url.toString());}}catch(e){}
  }
  function normalize(){
    var s=state(),u=userId(),lists=allLists(s,u),leads=allLeads(s,u),changed=false,finished=[];
    lists.forEach(function(list){var items=relatedLeads(list,lists,leads);if(patchList(list,items)){changed=true;finished.push(lid(list));}});
    if(changed){save(s);clearProcessingFor(finished);}
    return changed;
  }
  function hideUsageBadge(){var el=document.getElementById('rfSearchUsageBadge');if(el){el.hidden=true;el.style.display='none';el.setAttribute('aria-hidden','true');}}
  function cleanupProcessingBanner(){var s=state(),u=userId(),lists=allLists(s,u),leads=allLeads(s,u);if(!leads.length)return;var banner=document.getElementById('rfProcessingBanner');if(banner)banner.remove();try{var url=new URL(location.href);if(url.searchParams.get('processing')){url.searchParams.delete('processing');history.replaceState({},'',url.toString());}}catch(e){} }
  function run(){hideUsageBadge();var changed=normalize();cleanupProcessingBanner();if(window.rankforgeSearchesPremium&&typeof window.rankforgeSearchesPremium.render==='function'){try{window.rankforgeSearchesPremium.render();}catch(e){}}hideUsageBadge();}
  window.rankforgeSearchesCurrentStateFix={run:run,normalize:normalize};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('rankforge:user-profile-resolved',run);
  window.addEventListener('storage',function(e){if(e.key===STATE_KEY)run();});
  setTimeout(run,600);setTimeout(run,1800);setTimeout(run,4000);
})();