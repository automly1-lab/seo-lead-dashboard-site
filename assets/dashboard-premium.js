(function(){
  'use strict';
  if(((document.body||{}).dataset||{}).page!=='dashboard')return;
  var ADMIN_EMAIL='automly1@gmail.com';
  function c(v){return String(v==null?'':v).trim();}
  function lower(v){return c(v).toLowerCase();}
  function n(v){var x=Number(String(v||'').replace(/[^0-9.-]/g,''));return Number.isFinite(x)?Math.max(0,Math.round(x)):0;}
  function pct(a,b){return b?Math.round((a/b)*100)+'%':'0%';}
  function esc(v){return c(v).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[x];});}
  function parse(raw,f){try{return raw?JSON.parse(raw):f;}catch(e){return f;}}
  function session(){
    try{
      if(window.rankforgeAuth&&window.rankforgeAuth.getSession){
        var s=window.rankforgeAuth.getSession();
        if(s&&(s.userId||s.id||s.email||s.userEmail))return s;
      }
      return parse(localStorage.getItem('rankforge-auth-session-v1'),null);
    }catch(e){return null;}
  }
  function normalizePlan(value){var raw=lower(value).replace(/\s+/g,'_').replace(/-/g,'_');if(raw==='growth'||raw==='pro')return 'growth';if(raw==='starter'||raw==='start'||raw==='basic')return 'starter';if(raw==='admin'||raw==='admin_unlimited')return 'admin_unlimited';if(raw==='agency'||raw==='agency_intelligence')return 'agency_intelligence';return 'free';}
  function billingIsActive(value){var b=lower(value).replace(/\s+/g,'_').replace(/-/g,'_');return ['active','paid','trialing','complete','checkout_complete','subscription_active','admin_unlimited'].indexOf(b)>=0;}
  function isAdmin(){var s=session();return c(s&&(s.email||s.userEmail)).toLowerCase()===ADMIN_EMAIL;}
  function resolvedProfileSync(){
    if(window.rankforgeUserPlanResolver&&typeof window.rankforgeUserPlanResolver.getResolvedProfileSync==='function'){
      return window.rankforgeUserPlanResolver.getResolvedProfileSync();
    }
    return null;
  }
  function state(){return parse(localStorage.getItem('rankforge-clean-app-state-v1'),{})||{};}
  function runtime(){var s=state();var lists=[];var leads=[];try{lists=(s.remoteCache&&s.remoteCache.lists)||s.localLists||[];leads=(s.remoteCache&&s.remoteCache.leads)||s.localLeads||[];}catch(e){}return {lists:lists||[],leads:leads||[]};}
  function statusOf(l){var x=c(l.status||l.qualification_status).toLowerCase();if(x==='qualified')return 'qualified';if(x==='qualified_locked'||x==='locked_qualified')return 'qualified_locked';if(x==='rejected'||x==='filtered_out')return 'rejected';if(x==='completed'||x==='active'||x==='running'||x==='queued')return x;return 'review_needed';}
  function evidence(leads){var verified=0,partial=0,none=0,failed=0;leads.forEach(function(l){var signals=n(l.seo_evidence_signal_count||l.seoEvidenceSignalCount||l.seo_issue_count);var claims=c(l.seo_claims_verified||l.seoClaimsVerified).toLowerCase();var source=c(l.crawl_source_field||l.crawlSourceField);var html=n(l.homepage_html_bytes_analyzed||l.homepageHtmlBytesAnalyzed);var words=n(l.homepage_text_words_analyzed||l.homepageTextWordsAnalyzed);if(claims==='true'||claims==='verified'||signals>=3)verified++;else if(signals>0||claims==='partial')partial++;else none++;if(source==='none'||(!source&&html===0&&words===0))failed++;});return {verified:verified,partial:partial,none:none,failed:failed};}
  function planInfo(){
    var resolved=resolvedProfileSync();
    if(resolved&&resolved.plan){
      var billingLabel=(resolved.source_row_source==='admin_override'||resolved.source_row_source==='admin_managed')?'Admin override':(resolved.plan==='free'?'Free / no active paid plan':'Active');
      return {
        name:resolved.plan_label||'Free',
        searchLimit:resolved.monthly_search_limit===Infinity?'Unlimited':resolved.monthly_search_limit,
        leadLimit:resolved.monthly_qualified_lead_credit_limit===Infinity?'Unlimited':resolved.monthly_qualified_lead_credit_limit,
        maxBatch:resolved.max_leads_per_batch===Infinity?'Unlimited':resolved.max_leads_per_batch,
        csv:(resolved.plan&&resolved.plan!=='free')?'Enabled':'Disabled',
        billingLabel:billingLabel
      };
    }
    if(window.rankforgeMvpCredits&&typeof window.rankforgeMvpCredits.planInfo==='function'){
      var p=window.rankforgeMvpCredits.planInfo();
      return {name:p.name||'Free',searchLimit:p.searchLimit===Infinity?'Unlimited':p.searchLimit,leadLimit:p.creditLimit===Infinity?'Unlimited':p.creditLimit,maxBatch:p.maxBatch===Infinity?'Unlimited':p.maxBatch,csv:p.csv?'Enabled':'Disabled',billingLabel:(p.name==='Free'?'Free / no active paid plan':'Active')};
    }
    var s=session()||{};var email=lower(s.email||s.userEmail);if(email===ADMIN_EMAIL)return {name:'Admin Unlimited',searchLimit:'Unlimited',leadLimit:'Unlimited',maxBatch:50,csv:'Enabled'};
    var billing=localStorage.getItem('rankforge-billing-status-v1')||'';
    var plan=normalizePlan(localStorage.getItem('rankforge-current-plan-v1')||localStorage.getItem('rankforge-plan-v1')||localStorage.getItem('rankforge-selected-plan-v1')||'free');
    if(!billingIsActive(billing))plan='free';
    if(plan==='growth')return {name:'Growth',searchLimit:150,leadLimit:250,maxBatch:50,csv:'Enabled',billingLabel:'Active'};
    if(plan==='starter')return {name:'Starter',searchLimit:50,leadLimit:50,maxBatch:25,csv:'Enabled',billingLabel:'Active'};
    return {name:'Free',searchLimit:2,leadLimit:10,maxBatch:10,csv:'Disabled',billingLabel:'Free / no active paid plan'};
  }
  function creditAmount(l){var s=statusOf(l);if(s!=='qualified')return 0;if(l.lead_credit_counted!==undefined&&!/^(true|yes|1|counted)$/i.test(c(l.lead_credit_counted)))return 0;var amount=n(l.lead_credit_amount);return amount||1;}
  function fillPreset(btn){var map={searchNameInput:'name',nicheInput:'niche',cityInput:'city',countryInput:'country',keywordSeedInput:'keyword',includeTermsInput:'include',excludeTermsInput:'exclude'};Object.keys(map).forEach(function(id){var el=document.getElementById(id);if(el)el.value=btn.dataset[map[id]]||'';});var s=document.getElementById('createSearchStatus');if(s)s.textContent='Preset loaded. Adjust keywords or strictness, then create the search.';}
  function row(label,value){return '<div class="rf-usage-row"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';}
  function action(title,body,href,label){return '<div class="rf-action-item"><strong>'+esc(title)+'</strong><p>'+esc(body)+'</p><a class="button ghost small" href="'+esc(href)+'">'+esc(label)+'</a></div>';}
  function setText(id,value){var el=document.getElementById(id);if(el)el.textContent=value;}
  function render(){var data=runtime();var lists=data.lists||[],allLeads=data.leads||[],leads=allLeads.filter(function(l){return statusOf(l)!=='rejected'||isAdmin();});var q=leads.filter(function(l){return statusOf(l)==='qualified';}).length;var locked=leads.filter(function(l){return statusOf(l)==='qualified_locked';}).length;var review=leads.filter(function(l){return statusOf(l)==='review_needed';}).length;var rejected=allLeads.filter(function(l){return statusOf(l)==='rejected';}).length;var found=leads.length+rejected;var ev=evidence(leads);var coverage=pct(ev.verified+ev.partial,leads.length);var plan=planInfo();var used=(plan.leadLimit==='Unlimited')?allLeads.reduce(function(sum,l){return sum+creditAmount(l);},0):Math.min(Number(plan.leadLimit)||0,allLeads.reduce(function(sum,l){return sum+creditAmount(l);},0));var creditText=(plan.leadLimit==='Unlimited')?used+' / unlimited':used+' / '+plan.leadLimit;
    setText('rfPlanBadge',plan.name+' Plan');setText('rfCreditBadge',plan.leadLimit==='Unlimited'?'Unlimited qualified lead credits':Math.max(0,Number(plan.leadLimit)-used)+' credits remaining');
    setText('rfKpiQualified',q);setText('rfKpiReview',review);setText('rfKpiEvidence',coverage);setText('rfKpiCredits',creditText);
    var empty=document.getElementById('rfDashboardEmpty');if(empty)empty.hidden=Boolean(lists.length||leads.length);
    var funnel=[['Searches Created',lists.length,'Search batches started',''],['Businesses Found',found,'Visible candidates',''],['Passed Pre-filter',Math.max(0,found-rejected),'Rejected removed',''],['Audited',leads.length,'Checked for signals',''],['Needs Review',review,'0 credits','review'],['Qualified',q,'1 credit each','qualified'],['Qualified Locked',locked,'Credit limit reached','review']];var funnelEl=document.getElementById('rfLeadFunnel');if(funnelEl)funnelEl.innerHTML=funnel.map(function(x){return '<div class="rf-funnel-step '+x[3]+'"><span>'+esc(x[0])+'</span><strong>'+x[1]+'</strong><small>'+esc(x[2])+'</small></div>';}).join('');
    var evidenceEl=document.getElementById('rfEvidenceRows');if(evidenceEl)evidenceEl.innerHTML=[['Crawled Successfully',pct(leads.length-ev.failed,leads.length),'Sites with usable homepage or page content.'],['Verified Evidence',ev.verified+' · '+pct(ev.verified,leads.length),'Leads with enough crawl signals to support SEO claims.'],['No Verified Evidence',ev.none+' · '+pct(ev.none,leads.length),'Kept in review because no strong SEO claim can be made.'],['Crawl Failed / Empty Content',ev.failed+' · '+pct(ev.failed,leads.length),'Requires workflow or manual review.']].map(function(x){return '<div class="rf-evidence-row"><span><strong>'+esc(x[0])+'</strong><br><small>'+esc(x[2])+'</small></span><strong>'+esc(x[1])+'</strong></div>';}).join('');
    var usageEl=document.getElementById('rfUsageList');if(usageEl)usageEl.innerHTML=[['Current plan',plan.name],['Billing status',plan.billingLabel|| (plan.name==='Free'?'Free / no active paid plan':'Active')],['Search batches used',lists.length+' / '+plan.searchLimit],['Qualified lead credits used',creditText],['CSV export access',plan.csv],['Max prospects per batch',plan.maxBatch]].map(function(x){return row(x[0],x[1]);}).join('');
    var actions=[];if(review>0)actions.push(action('Review '+review+' leads with partial evidence','Manual review prevents unsupported SEO claims.','../leads/','Review Leads'));if(q>0)actions.push(action('Open qualified opportunities',q+' evidence-backed leads are ready for review.','../leads/','Open Leads'));if(ev.failed>5&&isAdmin())actions.push(action('Check crawl pipeline','Many leads have weak or missing crawl source data.','../quality/','Go to Quality'));if(actions.length<2)actions.push(action('Start a new market search','Try a focused niche and city to find more opportunities.','#rfNewSearchCard','Start Search'));var actionsEl=document.getElementById('rfActionList');if(actionsEl)actionsEl.innerHTML=actions.slice(0,4).join('');
    var tbody=document.querySelector('#rfRecentSearchesTable tbody');if(tbody)tbody.innerHTML=lists.slice(0,8).map(function(l){var listLeads=allLeads.filter(function(x){return c(x.listId||x.search_id)===c(l.id||l.search_id);});var lq=listLeads.filter(function(x){return statusOf(x)==='qualified';}).length;var lr=listLeads.filter(function(x){return statusOf(x)==='review_needed';}).length;var lj=listLeads.filter(function(x){return statusOf(x)==='rejected';}).length;var lev=evidence(listLeads);var cov=pct(lev.verified+lev.partial,listLeads.length);var calm=lq?'Completed':(listLeads.length?'Needs attention':'Processing');return '<tr><td data-label="Search"><div class="rf-search-name">'+esc(l.name||l.search_name||'Untitled search')+'</div><div class="rf-search-sub">'+esc((l.niche||'Market')+' · '+(l.city||''))+'</div></td><td data-label="Date">'+esc(l.lastRun||l.updated_at||l.created_at||'—')+'</td><td data-label="Found">'+(listLeads.length||l.discovered||0)+'</td><td data-label="Qualified">'+lq+'</td><td data-label="Needs Review">'+lr+'</td><td data-label="Rejected">'+lj+'</td><td data-label="Evidence">'+cov+'</td><td data-label="Status"><span class="rf-badge '+(calm==='Completed'?'rf-badge-success':calm==='Needs attention'?'rf-badge-warning':'rf-badge-muted')+'">'+esc(calm)+'</span></td><td data-label="Action"><a class="button ghost small" href="../leads/">Open Leads</a></td></tr>';}).join('')||'<tr><td colspan="9"><div class="rf-table-loading">No search batches yet.</div></td></tr>';
    var aq=document.getElementById('rfAdminQualityCard'),adt=document.getElementById('rfAdminDebugTableCard');if(isAdmin()){if(aq)aq.hidden=false;if(adt)adt.hidden=false;var htmlAvg=leads.length?Math.round(leads.reduce(function(a,l){return a+n(l.homepage_html_bytes_analyzed||l.homepageHtmlBytesAnalyzed);},0)/leads.length):0;var wordAvg=leads.length?Math.round(leads.reduce(function(a,l){return a+n(l.homepage_text_words_analyzed||l.homepageTextWordsAnalyzed);},0)/leads.length):0;var adminMetrics=document.getElementById('rfAdminMetrics');if(adminMetrics)adminMetrics.innerHTML=[['Crawl source available',leads.length-ev.failed],['Empty HTML/text count',ev.failed],['Avg HTML bytes',htmlAvg],['Avg text words',wordAvg],['seo_claims_verified true',ev.verified],['Qualified locked',locked]].map(function(x){return '<div class="rf-admin-metric"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('');var debugBody=document.querySelector('#rfAdminDebugTable tbody');if(debugBody)debugBody.innerHTML=leads.slice(0,20).map(function(l){return '<tr><td>'+esc(l.listId||l.search_id||'')+'</td><td>'+esc(l.company||l.company_name||'')+'</td><td>'+esc(l.crawl_source_field||'')+'</td><td>'+n(l.homepage_html_bytes_analyzed)+'</td><td>'+n(l.homepage_text_words_analyzed)+'</td><td>'+n(l.seo_issue_count)+'</td><td>'+n(l.seo_evidence_signal_count)+'</td><td>'+esc(l.seo_claims_verified||'')+'</td><td>'+esc(statusOf(l))+'</td></tr>';}).join('');}else{if(aq)aq.hidden=true;if(adt)adt.hidden=true;}
  }
  document.querySelectorAll('.rf-preset-row button').forEach(function(btn){btn.addEventListener('click',function(){fillPreset(btn);});});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
  setTimeout(render,900);
  setTimeout(render,2200);
  window.addEventListener('rankforge:user-profile-resolved',render);
  document.addEventListener('rankforge-profile-resolved',render);
})();
