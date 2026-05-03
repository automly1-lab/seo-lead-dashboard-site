(()=>{
  'use strict';
  const K='rankforge-clean-app-state-v1', U='rankforge-current-user-id-v1', ADMIN='automly1@gmail.com';
  const $=s=>document.querySelector(s);
  const txt=(v,f='')=>{v=(v??'').toString().trim();return v&&!/^(undefined|null|NaN)$/i.test(v)?v:f};
  const low=v=>txt(v).toLowerCase();
  const esc=v=>txt(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tc=v=>txt(v).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const parse=(r,f)=>{try{return r?JSON.parse(r):f}catch{return f}};
  const num=v=>{if(v===Infinity)return Infinity;let n=Number(String(v??0).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):0};
  const pct=v=>Math.max(0,Math.min(100,num(v)))+'%';
  const norm=v=>low(v).replace(/\s+/g,'_').replace(/-/g,'_');

  function sess(){
    if(window.rankforgeAuth?.getSession){let s=window.rankforgeAuth.getSession();if(s)return s;}
    return parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};
  }
  function profile(){return window.rankforgeUserProfile||parse(localStorage.getItem('rankforge-user-profile-cache-v1'),{})||{};}
  function state(){let s=parse(localStorage.getItem(K),{})||{};s.localLists=Array.isArray(s.localLists)?s.localLists:[];s.localLeads=Array.isArray(s.localLeads)?s.localLeads:[];s.remoteCache=s.remoteCache||{};s.remoteCache.lists=Array.isArray(s.remoteCache.lists)?s.remoteCache.lists:[];s.remoteCache.leads=Array.isArray(s.remoteCache.leads)?s.remoteCache.leads:[];s.archivedListIds=Array.isArray(s.archivedListIds)?s.archivedListIds:[];s.deletedListIds=Array.isArray(s.deletedListIds)?s.deletedListIds:[];return s;}
  function save(s){try{localStorage.setItem(K,JSON.stringify(s));}catch(e){}}
  function idOf(x){return txt(x?.id||x?.search_id||x?.list_id||x?.search_batch_id||x?.batch_id||x?.saved_list_id);}
  function leadListId(x){return txt(x?.listId||x?.list_id||x?.search_id||x?.searchId||x?.search_batch_id||x?.batch_id||x?.saved_list_id);}
  function owner(x){return txt(x?.userId||x?.user_id||x?.owner_user_id);}
  function userId(){let s=sess();return txt(s.userId||s.id||localStorage.getItem(U));}
  function userEmail(){let s=sess();return low(s.email||s.userEmail||profile().email||localStorage.getItem('rankforge-user-email'));}
  function owned(x,u,e,isAdmin){if(isAdmin)return true;let o=owner(x), em=low(x?.email||x?.user_email||x?.owner_email);return (!o&&!em)||(u&&o===u)||(e&&em===e);}
  function unique(arr,fn){let seen=new Set();return arr.filter(x=>{let k=fn(x);if(!k||seen.has(k))return false;seen.add(k);return true;});}
  function effectivePlan(){
    let eff=window.rankforgeGetEffectivePlan?.();let p=profile(), e=userEmail();
    if(eff&&eff.ready){return {key:eff.isAdmin?'admin':eff.plan,label:eff.name||'Free',limit:eff.searchLimit===Infinity?Infinity:num(eff.searchLimit),remaining:eff.searchRemaining===Infinity?Infinity:(Number.isFinite(num(eff.searchRemaining))?num(eff.searchRemaining):null),creditLimit:eff.creditLimit===Infinity?Infinity:num(eff.creditLimit),csv:!!eff.csv,depth:eff.maxBatch===Infinity?50:num(eff.maxBatch),admin:!!eff.isAdmin,pending:false};}
    let plan=norm(p.plan||'free'), billing=norm(p.billing_status||'free');
    if(e===ADMIN||/admin|unlimited/.test(plan))plan='admin'; else if(/growth/.test(plan))plan='growth'; else if(/starter/.test(plan))plan='starter'; else plan='free';
    let paid=plan!=='free'&&(billing==='active'||p.csv_export===true||String(p.csv_export).toLowerCase()==='true'||num(p.monthly_search_limit)>2||/user_current_state|stripe|checkout|billing|override/.test(txt(p.profile_source||p.source_row_source)));
    if(!paid&&plan!=='admin')plan='free';
    let d={free:['Free',2,10,false,10],starter:['Starter',50,50,true,25],growth:['Growth',150,250,true,50],admin:['Admin Unlimited',Infinity,Infinity,true,50]}[plan]||['Free',2,10,false,10];
    return {key:plan,label:d[0],limit:num(p.monthly_search_limit)||d[1],remaining:p.search_batches_remaining!==undefined?num(p.search_batches_remaining):null,creditLimit:num(p.monthly_qualified_lead_credit_limit)||d[2],csv:p.csv_export!==undefined?String(p.csv_export).toLowerCase()==='true':d[3],depth:num(p.max_leads_per_batch)||d[4],admin:plan==='admin',pending:false};
  }
  function allData(){let s=state(), p=effectivePlan(), u=userId(), e=userEmail(), del=new Set(s.deletedListIds), arc=new Set(s.archivedListIds);let lists=unique([...(s.remoteCache.lists||[]),...(s.localLists||[])],idOf).filter(x=>owned(x,u,e,p.admin)&&!del.has(idOf(x))&&!arc.has(idOf(x)));let leads=unique([...(s.remoteCache.leads||[]),...(s.localLeads||[])],x=>txt(x.id||x.lead_id||leadListId(x)+':'+(x.company_name||x.company||x.domain||x.website_url||x.email))).filter(x=>owned(x,u,e,p.admin)&&!del.has(leadListId(x)));return {s,p,lists,leads};}
  function created(x){return txt(x?.created_at||x?.started_at||x?.lastRun||x?.completed_at||x?.updated_at);}
  function fmt(d){d=new Date(d);return Number.isNaN(d.getTime())?'No run yet':new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d);}
  function isThisMonth(d){d=new Date(d);let n=new Date;return !Number.isNaN(d.getTime())&&d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();}
  function last30(d){d=new Date(d);return !Number.isNaN(d.getTime())&&Date.now()-d.getTime()<=2592e6;}
  function leadStatus(l){let s=norm(l?.qualification_status||l?.status||l?.decision);if(s==='qualified')return'qualified';if(s==='qualified_locked'||s==='locked_qualified')return'qualified_locked';if(s==='rejected'||s==='filtered_out')return'rejected';return'review_needed';}
  function hasEvidence(x){let v=norm(x?.seo_claims_verified||x?.verified_seo_evidence||x?.evidence_status);return ['true','partial','verified','yes'].includes(v)||num(x?.seo_evidence_signal_count||x?.evidenceSignalCount)>0||norm(x?.crawl_accessible)==='true'||(txt(x?.crawl_source_field)&&norm(x?.crawl_source_field)!=='none');}
  function hasContact(x){return !!(txt(x?.email||x?.decision_maker_email||x?.phone||x?.decision_maker_phone)||norm(x?.phone_visible)==='true'||norm(x?.email_visible)==='true'||norm(x?.contact_page_found)==='true'||norm(x?.contact_cta_found)==='true');}
  function listKey(l){return [l?.name,l?.search_name,l?.niche,l?.target_service,l?.business_type,l?.businessType,l?.city,l?.target_city].map(low).filter(Boolean).join('|');}
  function leadKey(l){return [l?.search_name,l?.list_name,l?.niche,l?.target_service,l?.business_type,l?.businessType,l?.city,l?.target_city].map(low).filter(Boolean).join('|');}
  function related(list,lists,leads){
    let id=idOf(list), exact=leads.filter(l=>leadListId(l)===id);
    if(exact.length)return exact;
    if(lists.length===1&&leads.length)return leads;
    let lk=listKey(list);if(lk){let f=leads.filter(l=>{let k=leadKey(l);return k&&(lk.includes(k)||k.includes(lk)||k.split('|').some(part=>part&&lk.includes(part)));});if(f.length)return f;}
    return [];
  }
  function summary(list,lists,leads){
    let items=related(list,lists,leads), id=idOf(list), st=norm(list.workflow_status||list.status||list.search_status);
    let q=items.filter(l=>leadStatus(l)==='qualified').length||num(list.qualified||list.qualified_count);
    let locked=items.filter(l=>leadStatus(l)==='qualified_locked').length||num(list.qualified_locked||list.qualified_locked_count);
    let r=items.filter(l=>leadStatus(l)==='review_needed').length||num(list.reviewNeeded||list.review_needed||list.needs_review_count);
    let rej=items.filter(l=>leadStatus(l)==='rejected').length||num(list.rejected||list.rejected_count);
    let found=Math.max(num(list.discovered||list.found||list.total_found||list.max_results_requested||list.final_leads_count),items.length,q+r+rej+locked);
    let audited=Math.max(num(list.audited||list.audited_count),items.length||q+r+rej+locked);
    let verified=Math.max(items.filter(hasEvidence).length,num(list.verified_evidence_count),q+Math.ceil(r*.5));
    let cov=audited?Math.round(verified/audited*100):(q?60:0);
    let status='processing';
    if(/fail|error/.test(st)||txt(list.failed_at||list.failure_reason))status='failed';
    else if(items.length||q+r+rej+locked>0||/complete|done|finished|success/.test(st))status='completed';
    else if(/no_qualified/.test(st))status='no_qualified';
    else status='processing';
    if(status==='completed'&&q===0&&r===0&&locked===0&&rej===0)status='no_qualified';
    let quality={type:'review',title:'Worth reviewing',note:'Some prospects have partial evidence'};
    if(q>0&&cov>=35)quality={type:'high',title:'Strong market',note:`${q} qualified leads found`};
    else if(q>0)quality={type:'review',title:'Needs review',note:'Qualified leads found, but coverage is light'};
    else if(status==='no_qualified')quality={type:'no_qualified',title:'No qualified results',note:'Try broader niche or nearby city'};
    else if(cov<20&&audited>0)quality={type:'low_evidence',title:'Crawl issue likely',note:'Crawl evidence unavailable'};
    let credits=items.filter(l=>leadStatus(l)==='qualified'&&(l.lead_credit_counted===true||norm(l.lead_credit_counted)==='true')).reduce((a,l)=>a+(num(l.lead_credit_amount)||1),0)||q;
    return {list,id,items,found,qualified:q,locked,review:r,rejected:rej,audited,verified,evidenceCoverage:cov,contactReady:items.filter(hasContact).length,status,quality,credits,created:created(list)};
  }
  function name(x){let l=x.list,n=txt(l.niche||l.target_service||l.business_type||l.businessType,'Search batch'),c=txt(l.city||l.target_city,'Market');return {primary:`${tc(n)} · ${tc(c)}`,sub:txt(l.name||l.search_name||l.description,'Search batch')};}
  function badge(s){let m={completed:'Completed',processing:'Processing',needs_attention:'Needs Attention',no_qualified:'No Qualified Results',failed:'Failed'};return `<span class="rf-status-badge rf-status-${esc(s)}">${m[s]||'Processing'}</span>`;}
  function elab(v){return v>=70?'Strong coverage':v>=40?'Moderate coverage':v>0?'Low coverage':'Crawl evidence unavailable';}
  function clearProcessing(rows){if(rows.some(r=>r.status!=='processing')){try{for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i)||'';if(k.indexOf('rankforge_processing_search_')===0)localStorage.removeItem(k)}}catch{}let b=document.getElementById('rfProcessingBanner');if(b)b.remove();try{let url=new URL(location.href);if(url.searchParams.get('processing')){url.searchParams.delete('processing');history.replaceState({},'',url.toString())}}catch{}}}
  function updatePlan(rows,p){
    let used=Number.isFinite(num(profile().search_batches_used))&&profile().profile_source==='user_current_state'?num(profile().search_batches_used):rows.filter(x=>isThisMonth(x.created)).length;
    let rem=p.remaining!=null?p.remaining:(p.limit===Infinity?'Unlimited':Math.max(0,p.limit-used));
    if(window.rankforgeRenderStablePlan)window.rankforgeRenderStablePlan();
    let usage=$('#rfSearchUsageBadge');if(usage){usage.hidden=true;usage.style.display='none';usage.setAttribute('aria-hidden','true');}
    $('#rfKpiSearchesCreated')&&($('#rfKpiSearchesCreated').textContent=used);
    $('#rfKpiQualifiedLeads')&&($('#rfKpiQualifiedLeads').textContent=rows.reduce((a,b)=>a+b.qualified,0));
    let covs=rows.filter(x=>x.audited||x.found),avg=covs.length?Math.round(covs.reduce((a,b)=>a+b.evidenceCoverage,0)/covs.length):0;$('#rfKpiEvidenceCoverage')&&($('#rfKpiEvidenceCoverage').textContent=covs.length?pct(avg):'—');
    $('#rfKpiSearchesRemaining')&&($('#rfKpiSearchesRemaining').textContent=rem===Infinity?'Unlimited':rem);
  }
  function setFilters(rows){let m=$('#rfMarketFilter'),n=$('#rfNicheFilter'),mv=m?.value||'all',nv=n?.value||'all',ms=[...new Set(rows.map(x=>tc(x.list.city||x.list.target_city)).filter(Boolean))].sort(),ns=[...new Set(rows.map(x=>tc(x.list.niche||x.list.target_service||x.list.business_type||x.list.businessType)).filter(Boolean))].sort();if(m){m.innerHTML='<option value="all">All cities</option>'+ms.map(x=>`<option>${esc(x)}</option>`).join('');m.value=ms.includes(mv)?mv:'all'}if(n){n.innerHTML='<option value="all">All niches</option>'+ns.map(x=>`<option>${esc(x)}</option>`).join('');n.value=ns.includes(nv)?nv:'all'}}
  function filterRows(rows){let q=low($('#rfSearchQuery')?.value),st=$('#rfStatusFilter')?.value||'all',m=$('#rfMarketFilter')?.value||'all',n=$('#rfNicheFilter')?.value||'all',qu=$('#rfQualityFilter')?.value||'all',da=$('#rfDateFilter')?.value||'month',so=$('#rfSortSelect')?.value||'newest';let out=rows.filter(x=>{let nm=name(x),h=low(nm.primary+' '+nm.sub+' '+x.id);return(!q||h.includes(q))&&(st==='all'||x.status===st)&&(m==='all'||tc(x.list.city||x.list.target_city)===m)&&(n==='all'||tc(x.list.niche||x.list.target_service||x.list.business_type||x.list.businessType)===n)&&(qu==='all'||x.quality.type===qu)&&(da!=='month'||isThisMonth(x.created))&&(da!=='30'||last30(x.created))});let bd=x=>new Date(x.created||0).getTime()||0;out.sort((a,b)=>so==='oldest'?bd(a)-bd(b):so==='qualified'?b.qualified-a.qualified||bd(b)-bd(a):so==='evidence_high'?b.evidenceCoverage-a.evidenceCoverage:so==='evidence_low'?a.evidenceCoverage-b.evidenceCoverage:so==='review'?b.review-a.review:bd(b)-bd(a));return out;}
  function renderRows(rows,p){let tb=$('#rfSearchBatchesTable tbody'),cards=$('#rfSearchCardList'),nf=$('#rfNoFilterResults');if(nf)nf.hidden=rows.length>0;if(!tb||!cards)return;tb.innerHTML=rows.map(x=>{let nm=name(x),dis=!p.csv||!x.qualified;return `<tr data-open-search="${esc(x.id)}"><td><div class="rf-search-title">${esc(nm.primary)}</div><div class="rf-search-subtitle">${esc(nm.sub)}</div></td><td>${badge(x.status)}</td><td><div class="rf-result-counts"><strong>${x.found}</strong> found</div><div class="rf-cell-note">${x.qualified} qualified · ${x.review} review · ${x.rejected} filtered out</div></td><td><div class="rf-evidence-meter"><strong>${pct(x.evidenceCoverage)}</strong><div class="rf-cell-note">${elab(x.evidenceCoverage)}</div><div class="rf-evidence-track"><span class="rf-evidence-fill" style="--coverage:${pct(x.evidenceCoverage)}"></span></div></div></td><td><div class="rf-quality"><strong>${esc(x.quality.title)}</strong><span class="rf-cell-note">${esc(x.quality.note)}</span></div></td><td><div class="rf-usage"><strong>Search used</strong><span class="rf-cell-note">${x.credits} qualified credits counted</span></div></td><td>${esc(fmt(x.created))}</td><td><div class="rf-row-actions"><button class="button ghost" data-action="open" data-id="${esc(x.id)}">Open Prospects</button><button class="button ghost ${dis?'is-disabled':''}" ${dis?'disabled':''} data-action="export" data-id="${esc(x.id)}">${p.csv?'Export Qualified':'Upgrade to Export'}</button><button class="button ghost" data-action="duplicate" data-id="${esc(x.id)}">Duplicate</button><button class="button ghost" data-action="archive" data-id="${esc(x.id)}">Archive</button></div></td></tr>`}).join('');cards.innerHTML='';}
  function actions(rows,p){let w=$('#rfRecommendedActions');if(!w)return;let used=profile().search_batches_used!==undefined?num(profile().search_batches_used):rows.filter(x=>isThisMonth(x.created)).length,rem=p.remaining!=null?p.remaining:(p.limit===Infinity?'unlimited':Math.max(0,p.limit-used)),best=rows.filter(x=>x.qualified).sort((a,b)=>b.qualified-a.qualified)[0],a=[];if(best)a.push([`Open ${name(best).primary}`,`${best.qualified} evidence-backed opportunities are ready.`,'Open Prospects',`open:${best.id}`]);a.push([`${rem} search batches remaining`,p.limit===Infinity?'Unlimited internal search batches.':`Based on your ${p.label} plan this month.`,'Start New Search','new']);w.innerHTML=a.slice(0,4).map(x=>`<article class="rf-action-item"><strong>${esc(x[0])}</strong><p>${esc(x[1])}</p><button class="button ghost small" data-action-run="${esc(x[3])}">${esc(x[2])}</button></article>`).join('');}
  function open(id){let s=state();s.selectedListId=id;save(s);try{sessionStorage.setItem('rankforge-selected-list-id-v1',id);localStorage.setItem('rankforge-selected-list-id-v1',id)}catch{}location.href=`../leads/?list_id=${encodeURIComponent(id)}&search_id=${encodeURIComponent(id)}`;}
  function archive(id){let s=state();s.archivedListIds=[...new Set([...(s.archivedListIds||[]),id])];save(s);render();}
  function exportCsv(x,p){if(!p.csv||!x)return;let rows=x.items.filter(l=>leadStatus(l)==='qualified');if(!rows.length)return;let h=['Company','Website','Email','Phone','SEO Score','Lead Score','Why it matters'],csv=[h.join(','),...rows.map(l=>[l.company||l.company_name,l.website||l.website_url,l.email||l.decision_maker_email,l.phone||l.decision_maker_phone,l.seoScore||l.seo_need_score,l.overallScore||l.overall_lead_score,l.whyItMatters||l.qualification_reason].map(c=>'"'+txt(c).replace(/"/g,'""')+'"').join(','))].join('\n'),u=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),a=document.createElement('a');a.href=u;a.download=(x.id||'search')+'-qualified-leads.csv';a.click();URL.revokeObjectURL(u);}
  function summaries(){let d=allData();let rows=d.lists.map(l=>summary(l,d.lists,d.leads));clearProcessing(rows);return {rows,p:d.p};}
  function render(){let d=summaries(),rows=d.rows,p=d.p;$('#rfSearchLoading')&&($('#rfSearchLoading').hidden=true);$('#rfSearchEmpty')&&($('#rfSearchEmpty').hidden=rows.length>0);setFilters(rows);let fr=filterRows(rows);updatePlan(rows,p);renderRows(fr,p);actions(rows,p);}
  function clear(){['#rfSearchQuery'].forEach(s=>$(s)&&($(s).value=''));['#rfStatusFilter','#rfMarketFilter','#rfNicheFilter','#rfQualityFilter'].forEach(s=>$(s)&&($(s).value='all'));$('#rfDateFilter')&&($('#rfDateFilter').value='month');$('#rfSortSelect')&&($('#rfSortSelect').value='newest');render();}
  function bind(){['#rfSearchQuery','#rfStatusFilter','#rfMarketFilter','#rfNicheFilter','#rfQualityFilter','#rfDateFilter','#rfSortSelect'].forEach(s=>$(s)?.addEventListener(s==='#rfSearchQuery'?'input':'change',render));$('#rfClearFiltersButton')?.addEventListener('click',clear);$('#rfClearFiltersEmptyButton')?.addEventListener('click',clear);document.addEventListener('click',e=>{let b=e.target.closest('[data-action]');if(b){e.preventDefault();e.stopPropagation();let id=b.dataset.id,d=summaries(),x=d.rows.find(r=>r.id===id);if(b.dataset.action==='open')open(id);if(b.dataset.action==='archive')archive(id);if(b.dataset.action==='export')exportCsv(x,d.p);return;}let r=e.target.closest('[data-open-search]');if(r)open(r.dataset.openSearch);let ar=e.target.closest('[data-action-run]');if(ar){let [a,id]=(ar.dataset.actionRun||'').split(':');if(a==='open')open(id);else if(a==='new')location.href='../dashboard/#rfNewSearchCard';}});}
  function init(){if(!document.body.classList.contains('app-page-searches'))return;bind();render();window.addEventListener('rankforge:user-profile-resolved',render);window.addEventListener('storage',e=>{if(e.key===K)render();});setTimeout(render,700);setTimeout(render,1800);setTimeout(render,4000);}
  window.rankforgeSearchesPremium={render,openProspects:open};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();