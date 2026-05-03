(function(){
  'use strict';
  if(((document.body||{}).dataset||{}).page!=='dashboard')return;
  var SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  var ADMIN_EMAIL='automly1@gmail.com';
  function clean(v){return String(v==null?'':v).trim();}
  function low(v){return clean(v).toLowerCase();}
  function esc(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function parse(raw,f){try{return raw?JSON.parse(raw):f;}catch(e){return f;}}
  function num(v){var n=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):0;}
  function pct(a,b){return b?Math.round((a/b)*100)+'%':'—';}
  function session(){try{return window.rankforgeAuth&&window.rankforgeAuth.getSession?window.rankforgeAuth.getSession():parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};}catch(e){return{};}}
  function profile(){return window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),{})||{};}
  function userId(){var s=session(),p=profile();return clean(s.userId||s.id||p.user_id);}
  function email(){var s=session(),p=profile();return low(s.email||s.userEmail||p.email);}
  function isAdmin(){return email()===ADMIN_EMAIL||low(profile().plan)==='admin_unlimited'||low(profile().billing_status)==='admin_unlimited';}
  function setText(id,value){var el=document.getElementById(id);if(el)el.textContent=value;}
  function rowUser(r){return clean(r.user_id||r.userId||r.owner_user_id||r.id);}
  function rowEmail(r){return low(r.email||r.user_email||r.owner_email||r.customer_email||r.billing_email);}
  function match(r,u,e,admin){if(admin)return true;var ru=rowUser(r),re=rowEmail(r);return (!!u&&ru===u)||(!!e&&re===e)||(!ru&&!re);}
  function leadStatus(l){var s=low(l.qualification_status||l.status||l.decision).replace(/[\s-]+/g,'_');if(s==='qualified')return'qualified';if(s==='qualified_locked'||s==='locked_qualified')return'qualified_locked';if(s==='rejected'||s==='filtered_out'||s==='filtered')return'rejected';return'review_needed';}
  function hasEvidence(l){return ['true','yes','verified','partial'].indexOf(low(l.seo_claims_verified||l.verified_seo_evidence||l.evidence_status))>=0||num(l.seo_evidence_signal_count)>0||low(l.crawl_accessible)==='true';}
  function partialEvidence(l){return !hasEvidence(l)&&(num(l.seo_issue_count)>0||num(l.homepage_word_count)>0||num(l.service_page_count)>0||low(l.contact_cta_found)==='true'||low(l.target_city_found)==='true'||low(l.target_service_found)==='true');}
  function searchId(r){return clean(r.search_id||r.id||r.list_id||r.search_batch_id||r.batch_id||r.saved_list_id);}
  function leadSearchId(r){return clean(r.search_id||r.list_id||r.search_batch_id||r.batch_id||r.saved_list_id);}
  function searchName(r){return clean(r.search_name||r.name||r.batch_name||r.description)||'Search batch';}
  function searchNiche(r){return clean(r.niche||r.target_service||r.business_type||r.service)||'Market';}
  function searchCity(r){return clean(r.city||r.target_city||r.market)||'';}
  function dateMs(v){var t=Date.parse(clean(v));return Number.isFinite(t)?t:0;}
  function fmtDate(v){var d=new Date(clean(v));return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d);}
  function fetchSheet(sheet){return new Promise(function(resolve){var cb='rfDashKpi_'+sheet.replace(/\W/g,'_')+'_'+Date.now()+'_'+Math.floor(Math.random()*99999),sc=document.createElement('script'),done=false,to=setTimeout(function(){finish([]);},9000);function finish(rows){if(done)return;done=true;clearTimeout(to);try{sc.remove();}catch(e){}try{delete window[cb];}catch(e){}resolve(rows||[]);}window[cb]=function(payload){try{var cols=(payload.table&&payload.table.cols||[]).map(function(c){return c.label||c.id;});var rows=(payload.table&&payload.table.rows||[]).map(function(r,i){var o={_row_index:i+2};(r.c||[]).forEach(function(cell,idx){o[cols[idx]]=cell?clean(cell.f||cell.v||''):'';});return o;});finish(rows);}catch(e){finish([]);}};sc.src='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?sheet='+encodeURIComponent(sheet)+'&tqx=responseHandler:'+cb+'&headers=1&cacheBust='+Date.now();sc.onerror=function(){finish([]);};document.body.appendChild(sc);});}
  function bestCurrent(rows,u,e,admin){return rows.filter(function(r){return match(r,u,e,admin);}).sort(function(a,b){return dateMs(b.updated_at||b.synced_at||b.created_at)-dateMs(a.updated_at||a.synced_at||a.created_at)||Number(b._row_index||0)-Number(a._row_index||0);})[0]||{};}
  function relatedLeads(search,searches,leads){var id=searchId(search);var exact=id?leads.filter(function(l){return leadSearchId(l)===id;}):[];if(exact.length)return exact;if(searches.length===1)return leads;return [];}
  function renderEvidence(leads){
    var verified=leads.filter(hasEvidence).length;
    var partial=leads.filter(partialEvidence).length;
    var none=Math.max(0,leads.length-verified-partial);
    var failed=leads.filter(function(l){return low(l.crawl_accessible)==='false'||low(l.crawl_source_field)==='none'||(!hasEvidence(l)&&num(l.homepage_word_count)===0&&num(l.service_page_count)===0);}).length;
    var rows=[
      ['Crawled Successfully', pct(leads.length-failed,leads.length), 'Sites with usable homepage or page content.'],
      ['Verified Evidence', verified+' · '+pct(verified,leads.length), 'Leads with enough crawl signals to support SEO claims.'],
      ['Partial Evidence', partial+' · '+pct(partial,leads.length), 'Some signals exist, but review is still useful.'],
      ['No Verified Evidence', none+' · '+pct(none,leads.length), 'Kept in review because no strong SEO claim can be made.']
    ];
    var el=document.getElementById('rfEvidenceRows');
    if(el)el.innerHTML=rows.map(function(r){return '<div class="rf-evidence-row"><span><strong>'+esc(r[0])+'</strong><br><small>'+esc(r[2])+'</small></span><strong>'+esc(r[1])+'</strong></div>';}).join('');
  }
  function renderRecent(searches,leads){
    var tbody=document.querySelector('#rfRecentSearchesTable tbody');if(!tbody)return;
    if(!searches.length&&leads.length){searches=[{search_id:leadSearchId(leads[0])||'current-search',search_name:clean(leads[0].search_name||leads[0].list_name)||'Latest search',niche:clean(leads[0].niche||leads[0].target_service||leads[0].business_type)||'Search',city:clean(leads[0].city||leads[0].target_city)||'',created_at:clean(leads[0].created_at||leads[0].updated_at)}];}
    searches=searches.slice().sort(function(a,b){return dateMs(b.created_at||b.started_at||b.updated_at)-dateMs(a.created_at||a.started_at||a.updated_at);}).slice(0,8);
    if(!searches.length){tbody.innerHTML='<tr><td colspan="9"><div class="rf-table-loading">No search batches yet.</div></td></tr>';return;}
    tbody.innerHTML=searches.map(function(s){var rel=relatedLeads(s,searches,leads);var q=rel.filter(function(l){return leadStatus(l)==='qualified';}).length;var review=rel.filter(function(l){return leadStatus(l)==='review_needed';}).length;var rejected=rel.filter(function(l){return leadStatus(l)==='rejected';}).length;var evidence=rel.filter(hasEvidence).length;var found=rel.length||q+review+rejected;var status=found?'Completed':'Processing';return '<tr><td data-label="Search"><div class="rf-search-name">'+esc(searchNiche(s)+(searchCity(s)?' · '+searchCity(s):''))+'</div><div class="rf-search-sub">'+esc(searchName(s))+'</div></td><td data-label="Date">'+esc(fmtDate(s.created_at||s.started_at||s.updated_at))+'</td><td data-label="Found">'+found+'</td><td data-label="Qualified">'+q+'</td><td data-label="Needs Review">'+review+'</td><td data-label="Rejected">'+rejected+'</td><td data-label="Evidence">'+pct(evidence,found)+'</td><td data-label="Status"><span class="rf-badge '+(status==='Completed'?'rf-badge-success':'rf-badge-muted')+'">'+status+'</span></td><td data-label="Action"><a class="button ghost small" href="../leads/?search_id='+encodeURIComponent(searchId(s))+'&list_id='+encodeURIComponent(searchId(s))+'">Open Leads</a></td></tr>';}).join('');
  }
  async function run(){
    var u=userId(),e=email(),admin=isAdmin();
    var result=await Promise.all([fetchSheet('user_current_state'),fetchSheet('final_leads'),fetchSheet('searches')]);
    var current=bestCurrent(result[0],u,e,admin);
    var leads=result[1].filter(function(r){return match(r,u,e,admin);});
    var searches=result[2].filter(function(r){return match(r,u,e,admin);});
    var qualified=leads.filter(function(l){return leadStatus(l)==='qualified';}).length;
    var review=leads.filter(function(l){return leadStatus(l)==='review_needed';}).length;
    var evidenceCount=leads.filter(hasEvidence).length;
    var limit=num(current.effective_qualified_lead_limit||current.monthly_qualified_lead_credit_limit||profile().monthly_qualified_lead_credit_limit);
    var used=num(current.qualified_leads_used||profile().qualified_leads_used)||qualified;
    setText('rfKpiQualified',qualified);setText('rfKpiReview',review);setText('rfKpiEvidence',pct(evidenceCount,leads.length));setText('rfKpiCredits',limit?used+' / '+limit:String(used));
    renderEvidence(leads);
    renderRecent(searches,leads);
  }
  window.rankforgeDashboardAuthoritativeKpis=run;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('rankforge:user-profile-resolved',run);
})();