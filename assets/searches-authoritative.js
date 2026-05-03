(function(){
  'use strict';
  if(!document.body || !document.body.classList.contains('app-page-searches')) return;

  var SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  var STATE_KEY='rankforge-clean-app-state-v1';
  var ADMIN_EMAIL='automly1@gmail.com';
  var lastSig='';

  function clean(v){return String(v==null?'':v).trim();}
  function low(v){return clean(v).toLowerCase();}
  function esc(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function parse(raw,f){try{return raw?JSON.parse(raw):f;}catch(e){return f;}}
  function num(v){var raw=clean(v);if(/^(infinity|unlimited|∞)$/i.test(raw))return Infinity;var n=Number(raw.replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):0;}
  function dateMs(v){var t=Date.parse(clean(v));return Number.isFinite(t)?t:0;}
  function fmtDate(v){var d=new Date(clean(v));return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d);}
  function tc(v){return clean(v).replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});}
  function profile(){return window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),{})||{};}
  function session(){try{return window.rankforgeAuth&&window.rankforgeAuth.getSession?window.rankforgeAuth.getSession():parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};}catch(e){return{};}}
  function userId(){var s=session(),p=profile();return clean(s.userId||s.id||p.user_id);}
  function userEmail(){var s=session(),p=profile();return low(s.email||s.userEmail||p.email);}
  function isAdmin(){return userEmail()===ADMIN_EMAIL || low(profile().plan)==='admin_unlimited' || low(profile().billing_status)==='admin_unlimited';}
  function setText(id,val){var el=document.getElementById(id);if(el)el.textContent=val;}
  function hide(id){var el=document.getElementById(id);if(el){el.hidden=true;el.style.display='none';el.setAttribute('aria-hidden','true');}}
  function show(id){var el=document.getElementById(id);if(el){el.hidden=false;el.style.display='';el.removeAttribute('aria-hidden');}}

  function fetchSheet(sheet){
    return new Promise(function(resolve){
      var cb='rfAuthSheet_'+sheet.replace(/\W/g,'_')+'_'+Date.now()+'_'+Math.floor(Math.random()*999999);
      var done=false, script=document.createElement('script');
      var timer=setTimeout(function(){finish([], 'timeout');},12000);
      function finish(rows,error){if(done)return;done=true;clearTimeout(timer);try{script.remove();}catch(e){}try{delete window[cb];}catch(e){}resolve({sheet:sheet,rows:rows||[],error:error||''});}
      window[cb]=function(payload){try{var cols=(payload.table&&payload.table.cols||[]).map(function(c){return c.label||c.id;});var rows=(payload.table&&payload.table.rows||[]).map(function(r,i){var o={_row_index:i+2};(r.c||[]).forEach(function(cell,idx){o[cols[idx]]=cell?clean(cell.f||cell.v||''):'';});return o;});finish(rows,'');}catch(e){finish([],e&&e.message||'parse_error');}};
      script.src='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?sheet='+encodeURIComponent(sheet)+'&tqx=responseHandler:'+cb+'&headers=1&cacheBust='+Date.now();
      script.onerror=function(){finish([], 'script_error');};
      (document.body||document.documentElement).appendChild(script);
    });
  }

  function rowEmail(r){return low(r.email||r.user_email||r.owner_email||r.customer_email||r.billing_email);}
  function rowUser(r){return clean(r.user_id||r.userId||r.owner_user_id||r.id);}
  function matchesUser(r,u,e,admin){if(admin)return true;var ru=rowUser(r),re=rowEmail(r);return (!!u&&ru===u)||(!!e&&re===e)||(!ru&&!re);}
  function bestCurrent(rows,u,e,admin){
    var m=rows.filter(function(r){return matchesUser(r,u,e,admin);});
    m.sort(function(a,b){return dateMs(b.updated_at||b.synced_at||b.created_at)-dateMs(a.updated_at||a.synced_at||a.created_at) || Number(b._row_index||0)-Number(a._row_index||0);});
    return m[0]||{};
  }
  function leadStatus(l){var s=low(l.qualification_status||l.status||l.decision).replace(/[\s-]+/g,'_');if(s==='qualified')return'qualified';if(s==='qualified_locked'||s==='locked_qualified')return'qualified_locked';if(s==='rejected'||s==='filtered_out'||s==='filtered')return'rejected';return'review_needed';}
  function leadSearchId(l){return clean(l.search_id||l.list_id||l.search_batch_id||l.batch_id||l.saved_list_id);}
  function searchId(s){return clean(s.search_id||s.id||s.list_id||s.search_batch_id||s.batch_id||s.saved_list_id);}
  function searchName(s){return clean(s.name||s.search_name||s.batch_name||s.description);}
  function searchNiche(s){return clean(s.niche||s.target_service||s.business_type||s.businessType||s.service);}
  function searchCity(s){return clean(s.city||s.target_city||s.market);}
  function leadKey(l){return [l.search_name,l.list_name,l.niche,l.target_service,l.business_type,l.businessType,l.city,l.target_city].map(low).filter(Boolean).join('|');}
  function searchKey(s){return [searchName(s),searchNiche(s),searchCity(s)].map(low).filter(Boolean).join('|');}
  function hasEvidence(l){return ['true','yes','verified','partial'].indexOf(low(l.seo_claims_verified||l.verified_seo_evidence||l.evidence_status))>=0||num(l.seo_evidence_signal_count)>0||low(l.crawl_accessible)==='true';}
  function hasContact(l){return !!(clean(l.email||l.decision_maker_email||l.phone||l.decision_maker_phone)||low(l.contact_cta_found)==='true'||low(l.contact_page_found)==='true');}
  function isThisMonth(v){var d=new Date(clean(v)),n=new Date();return !Number.isNaN(d.getTime())&&d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();}
  function last30(v){var t=dateMs(v);return t && Date.now()-t<=2592e6;}
  function unique(arr,fn){var seen={};return arr.filter(function(x){var k=fn(x);if(!k||seen[k])return false;seen[k]=true;return true;});}

  function relatedLeads(search,allSearches,allLeads){
    var id=searchId(search);
    var exact=id?allLeads.filter(function(l){return leadSearchId(l)===id;}):[];
    if(exact.length)return exact;
    if(allSearches.length===1)return allLeads;
    var sk=searchKey(search);
    if(sk){var fuzzy=allLeads.filter(function(l){var lk=leadKey(l);return lk&&(sk.indexOf(lk)>=0||lk.indexOf(sk)>=0||lk.split('|').some(function(part){return part&&sk.indexOf(part)>=0;}));});if(fuzzy.length)return fuzzy;}
    return [];
  }
  function buildFallbackSearch(leads,current){
    var first=leads[0]||{};
    return {search_id:leadSearchId(first)||'current-search',name:clean(first.search_name||first.list_name)||'Latest search',niche:clean(first.niche||first.target_service||first.business_type)||'Search',city:clean(first.city||first.target_city)||'',created_at:current.updated_at||first.created_at||new Date().toISOString(),status:'completed'};
  }
  function summarize(search,allSearches,allLeads,current){
    var leads=relatedLeads(search,allSearches,allLeads);
    var q=leads.filter(function(l){return leadStatus(l)==='qualified';}).length;
    var locked=leads.filter(function(l){return leadStatus(l)==='qualified_locked';}).length;
    var review=leads.filter(function(l){return leadStatus(l)==='review_needed';}).length;
    var rejected=leads.filter(function(l){return leadStatus(l)==='rejected';}).length;
    var found=Math.max(leads.length,q+locked+review+rejected,num(search.found||search.discovered||search.total_found||search.final_leads_count));
    if(!found && num(current.qualified_leads_used)>0) found=num(current.qualified_leads_used);
    var evidenceCount=leads.filter(hasEvidence).length;
    var contactReady=leads.filter(hasContact).length;
    var coverage=found?Math.round((evidenceCount||q||0)/found*100):0;
    var credits=num(current.qualified_leads_used)||q;
    var status=found>0||credits>0||/complete|done|finished|success/i.test(clean(search.status||search.workflow_status))?'completed':'processing';
    var created=clean(search.created_at||search.started_at||search.completed_at||search.updated_at||current.updated_at);
    var primary=(tc(searchNiche(search)||'Search')+(searchCity(search)?' · '+tc(searchCity(search)):''));
    var sub=searchName(search)||'Search batch';
    return {id:searchId(search)||'current-search',search:search,leads:leads,qualified:q||credits,locked:locked,review:review,rejected:rejected,found:found,evidenceCount:evidenceCount,contactReady:contactReady,coverage:coverage,credits:credits,status:status,created:created,primary:primary,sub:sub};
  }

  function getFilters(rows){
    var markets=unique(rows.map(function(r){return tc(searchCity(r.search));}).filter(Boolean),function(x){return x;}).sort();
    var niches=unique(rows.map(function(r){return tc(searchNiche(r.search));}).filter(Boolean),function(x){return x;}).sort();
    var m=document.getElementById('rfMarketFilter'),n=document.getElementById('rfNicheFilter');
    var mv=m&&m.value||'all',nv=n&&n.value||'all';
    if(m){m.innerHTML='<option value="all">All cities</option>'+markets.map(function(x){return '<option>'+esc(x)+'</option>';}).join('');m.value=markets.indexOf(mv)>=0?mv:'all';}
    if(n){n.innerHTML='<option value="all">All niches</option>'+niches.map(function(x){return '<option>'+esc(x)+'</option>';}).join('');n.value=niches.indexOf(nv)>=0?nv:'all';}
  }
  function filterRows(rows){
    var q=low(document.getElementById('rfSearchQuery')&&document.getElementById('rfSearchQuery').value);
    var st=document.getElementById('rfStatusFilter')&&document.getElementById('rfStatusFilter').value||'all';
    var m=document.getElementById('rfMarketFilter')&&document.getElementById('rfMarketFilter').value||'all';
    var n=document.getElementById('rfNicheFilter')&&document.getElementById('rfNicheFilter').value||'all';
    var qa=document.getElementById('rfQualityFilter')&&document.getElementById('rfQualityFilter').value||'all';
    var d=document.getElementById('rfDateFilter')&&document.getElementById('rfDateFilter').value||'month';
    var sort=document.getElementById('rfSortSelect')&&document.getElementById('rfSortSelect').value||'newest';
    var out=rows.filter(function(r){
      var hay=low(r.primary+' '+r.sub+' '+r.id);
      var quality=r.qualified>0?'high':(r.coverage<20?'low_evidence':'review');
      return (!q||hay.indexOf(q)>=0)&&(st==='all'||r.status===st)&&(m==='all'||tc(searchCity(r.search))===m)&&(n==='all'||tc(searchNiche(r.search))===n)&&(qa==='all'||quality===qa)&&(d!=='month'||isThisMonth(r.created))&&(d!=='30'||last30(r.created));
    });
    out.sort(function(a,b){if(sort==='qualified')return b.qualified-a.qualified||dateMs(b.created)-dateMs(a.created);if(sort==='evidence_high')return b.coverage-a.coverage;if(sort==='evidence_low')return a.coverage-b.coverage;if(sort==='review')return b.review-a.review;if(sort==='oldest')return dateMs(a.created)-dateMs(b.created);return dateMs(b.created)-dateMs(a.created);});
    return out;
  }
  function statusBadge(status){return '<span class="rf-status-badge rf-status-'+esc(status)+'">'+(status==='completed'?'Completed':status==='failed'?'Failed':status==='no_qualified'?'No Qualified Results':'Processing')+'</span>';}
  function evidenceLabel(r){if(r.coverage>0)return r.coverage+'%';return r.evidenceCount>0?'Available':'—';}
  function renderRows(rows,current){
    var tbody=document.querySelector('#rfSearchBatchesTable tbody');if(!tbody)return;
    tbody.innerHTML=rows.map(function(r){
      var results='<div class="rf-result-counts"><strong>'+esc(r.found||r.qualified)+'</strong> found</div><div class="rf-cell-note">'+esc(r.qualified)+' qualified · '+esc(r.review)+' review · '+esc(r.rejected)+' filtered out</div>';
      var evidence='<div class="rf-evidence-meter"><strong>'+esc(evidenceLabel(r))+'</strong><div class="rf-cell-note">'+(r.evidenceCount?'Evidence signals found':'Open Prospects for evidence details')+'</div><div class="rf-evidence-track"><span class="rf-evidence-fill" style="--coverage:'+Math.max(5,r.coverage)+'%"></span></div></div>';
      var qualityTitle=r.qualified>0?'Qualified results found':(r.status==='completed'?'Completed search':'Still processing');
      var qualityNote=r.qualified>0?'Open Prospects to review qualified leads.':'Open Prospects to review results.';
      return '<tr data-search-id="'+esc(r.id)+'"><td><div class="rf-search-title">'+esc(r.primary)+'</div><div class="rf-search-subtitle">'+esc(r.sub)+'</div></td><td>'+statusBadge(r.status)+'</td><td>'+results+'</td><td>'+evidence+'</td><td><div class="rf-quality"><strong>'+esc(qualityTitle)+'</strong><span class="rf-cell-note">'+esc(qualityNote)+'</span></div></td><td><div class="rf-usage"><strong>Search used</strong><span class="rf-cell-note">'+esc(r.credits)+' qualified credits counted</span></div></td><td>'+esc(fmtDate(r.created))+'</td><td><div class="rf-row-actions"><button class="button ghost" data-open-prospects="'+esc(r.id)+'">Open Prospects</button><button class="button ghost" data-archive-search="'+esc(r.id)+'">Archive</button></div></td></tr>';
    }).join('');
  }
  function renderKpis(rows,current){
    var used=num(current.search_batches_used);
    var remaining=clean(current.search_batches_remaining)!==''?num(current.search_batches_remaining):(num(current.effective_search_limit||current.monthly_search_limit)-used);
    var qUsed=num(current.qualified_leads_used)||rows.reduce(function(a,r){return a+r.qualified;},0);
    setText('rfKpiSearchesCreated', String(used||rows.length));
    setText('rfKpiSearchesRemaining', String(Math.max(0,remaining)));
    setText('rfKpiQualifiedLeads', String(qUsed));
    var covRows=rows.filter(function(r){return r.found||r.coverage;});
    var avg=covRows.length?Math.round(covRows.reduce(function(a,r){return a+r.coverage;},0)/covRows.length):0;
    setText('rfKpiEvidenceCoverage', avg?avg+'%':'—');
    hide('rfSearchUsageBadge');
  }
  function clearProcessingUi(){
    var banner=document.getElementById('rfProcessingBanner');if(banner)banner.remove();
    try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';if(k.indexOf('rankforge_processing_search_')===0)localStorage.removeItem(k);}}catch(e){}
    try{var url=new URL(location.href);if(url.searchParams.get('processing')){url.searchParams.delete('processing');history.replaceState({},'',url.toString());}}catch(e){}
  }
  function bindOnce(){
    if(document.body.dataset.searchesAuthBound==='true')return;document.body.dataset.searchesAuthBound='true';
    ['rfSearchQuery','rfStatusFilter','rfMarketFilter','rfNicheFilter','rfQualityFilter','rfDateFilter','rfSortSelect'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener(id==='rfSearchQuery'?'input':'change',function(){window.rankforgeSearchesAuthoritativeRender&&window.rankforgeSearchesAuthoritativeRender();});});
    var clear=document.getElementById('rfClearFiltersButton');if(clear)clear.addEventListener('click',function(){['rfSearchQuery'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});['rfStatusFilter','rfMarketFilter','rfNicheFilter','rfQualityFilter'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='all';});var d=document.getElementById('rfDateFilter');if(d)d.value='month';var s=document.getElementById('rfSortSelect');if(s)s.value='newest';render();});
    document.addEventListener('click',function(e){var btn=e.target.closest('[data-open-prospects]');if(btn){location.href='../leads/?search_id='+encodeURIComponent(btn.dataset.openProspects)+'&list_id='+encodeURIComponent(btn.dataset.openProspects);}});
  }

  async function render(){
    hide('rfSearchLoading');
    bindOnce();
    var u=userId(),e=userEmail(),admin=isAdmin();
    var results=await Promise.all([fetchSheet('user_current_state'),fetchSheet('searches'),fetchSheet('final_leads')]);
    var current=bestCurrent(results[0].rows,u,e,admin);
    var searches=results[1].rows.filter(function(r){return matchesUser(r,u,e,admin);});
    var leads=results[2].rows.filter(function(r){return matchesUser(r,u,e,admin);});
    if(!searches.length && leads.length) searches=[buildFallbackSearch(leads,current)];
    searches=unique(searches,searchId).sort(function(a,b){return dateMs(b.created_at||b.started_at||b.updated_at)-dateMs(a.created_at||a.started_at||a.updated_at);});
    var rows=searches.map(function(s){return summarize(s,searches,leads,current);});
    var sig=JSON.stringify({c:current.updated_at||'',used:current.search_batches_used,rem:current.search_batches_remaining,q:current.qualified_leads_used,rows:rows.map(function(r){return [r.id,r.found,r.qualified,r.status].join(':');})});
    if(sig===lastSig){return;}lastSig=sig;
    getFilters(rows);
    var filtered=filterRows(rows);
    renderKpis(rows,current);
    renderRows(filtered,current);
    var empty=document.getElementById('rfSearchEmpty');if(empty)empty.hidden=rows.length>0;
    var no=document.getElementById('rfNoFilterResults');if(no)no.hidden=filtered.length>0;
    if(rows.some(function(r){return r.status==='completed';}))clearProcessingUi();
  }

  window.rankforgeSearchesAuthoritativeRender=render;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
  window.addEventListener('rankforge:user-profile-resolved',function(){lastSig='';render();});
})();