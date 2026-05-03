(function(){
  'use strict';
  if(((document.body||{}).dataset||{}).page!=='leads')return;
  var SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  var ADMIN_EMAIL='automly1@gmail.com';
  var finalLeads=[];
  var running=false;
  function clean(v){return String(v==null?'':v).trim();}
  function low(v){return clean(v).toLowerCase();}
  function esc(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function parse(raw,f){try{return raw?JSON.parse(raw):f;}catch(e){return f;}}
  function profile(){return window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),{})||{};}
  function session(){try{return window.rankforgeAuth&&window.rankforgeAuth.getSession?window.rankforgeAuth.getSession():parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};}catch(e){return{};}}
  function userId(){var s=session(),p=profile();return clean(s.userId||s.id||p.user_id||localStorage.getItem('rankforge-current-user-id-v1'));}
  function userEmail(){var s=session(),p=profile();return low(s.email||s.userEmail||p.email);}
  function isAdmin(){return userEmail()===ADMIN_EMAIL||low(profile().plan)==='admin_unlimited'||low(profile().billing_status)==='admin_unlimited';}
  function num(v){var n=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):0;}
  function truthy(v){var t=low(v);return ['true','yes','1','qualified','counted'].indexOf(t)>=0;}
  function rowUser(r){return clean(r.user_id||r.userId||r.owner_user_id||r.id);}
  function rowEmail(r){return low(r.email||r.user_email||r.owner_email||r.customer_email||r.billing_email);}
  function matchUser(r){var uid=userId(),em=userEmail();if(isAdmin())return true;var ru=rowUser(r),re=rowEmail(r);return (!!uid&&ru===uid)||(!!em&&re===em)||(!ru&&!re);}
  function leadId(r){return clean(r.lead_id||r.id||r.final_lead_id||r.row_id);}
  function website(r){var v=clean(r.clean_website_url||r.website_url||r.final_url||r.website||r.url||r.domain);return v.replace(/^https?:\/\//i,'').replace(/^www\./i,'').replace(/\/.*$/,'').toLowerCase();}
  function company(r){return low(r.business_name||r.company_name||r.company||r.name);}
  function batchId(r){return clean(r.list_id||r.listId||r.search_id||r.search_batch_id||r.searchBatchId||r.batch_id||r.saved_list_id);}
  function rawStatus(r){return low(r.qualification_status||r.final_status||r.lead_status||r.status||r.decision||r.recommended_decision).replace(/[\s-]+/g,'_');}
  function canonical(r){var s=rawStatus(r);if(s==='qualified'||s==='qualified_locked'||s==='locked_qualified'||truthy(r.is_qualified)||truthy(r.lead_credit_counted))return'qualified';if(s==='review_needed'||s==='needs_review'||s==='review'||s==='manual_review')return'review';if(/rejected|not_a_fit|not_fit|skip|filtered/.test(s))return'rejected';return'';}
  function hasEvidence(r){var st=canonical(r);return st==='qualified'||truthy(r.seo_claims_verified)||truthy(r.verified_seo_evidence)||num(r.seo_evidence_signal_count)>0||num(r.direct_evidence_count)>0||clean(r.seo_verified_claims)||clean(r.seo_evidence_summary)||clean(r.seo_evidence_json)||clean(r.technical_facts_json);}
  function hasContact(r){return !!(clean(r.email||r.decision_maker_email||r.phone||r.decision_maker_phone)||truthy(r.phone_visible)||truthy(r.email_visible)||truthy(r.contact_page_found)||truthy(r.contact_cta_found));}
  function fetchSheet(sheet){return new Promise(function(resolve){var cb='rfProspectAuth_'+sheet+'_'+Date.now()+'_'+Math.floor(Math.random()*99999),sc=document.createElement('script'),done=false,to=setTimeout(function(){finish([]);},10000);function finish(rows){if(done)return;done=true;clearTimeout(to);try{sc.remove();}catch(e){}try{delete window[cb];}catch(e){}resolve(rows||[]);}window[cb]=function(payload){try{var cols=(payload.table&&payload.table.cols||[]).map(function(c){return c.label||c.id;});var rows=(payload.table&&payload.table.rows||[]).map(function(row,i){var o={_row_index:i+2};(row.c||[]).forEach(function(cell,idx){o[cols[idx]]=cell?clean(cell.f||cell.v||''):'';});return o;});finish(rows);}catch(e){finish([]);}};sc.src='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?sheet='+encodeURIComponent(sheet)+'&tqx=responseHandler:'+cb+'&headers=1&cacheBust='+Date.now();sc.onerror=function(){finish([]);};document.body.appendChild(sc);});}
  function activeRows(){var active=(document.getElementById('rfBatchFilter')||{}).value||'all';return finalLeads.filter(matchUser).filter(function(r){return active==='all'||batchId(r)===active;});}
  function leadMap(rows){var map={};rows.forEach(function(r){var keys=[leadId(r),website(r),company(r)].filter(Boolean);keys.forEach(function(k){map[k]=r;});});return map;}
  function setKpis(){var rows=activeRows();var qualified=rows.filter(function(r){return canonical(r)==='qualified';}).length;var review=rows.filter(function(r){return canonical(r)==='review';}).length;var evidence=rows.filter(hasEvidence).length;var contact=rows.filter(hasContact).length;var q=document.getElementById('rfKpiQualified'),rv=document.getElementById('rfKpiReview'),ev=document.getElementById('rfKpiEvidence'),ct=document.getElementById('rfKpiContact');if(q)q.textContent=qualified;if(rv)rv.textContent=review;if(ev)ev.textContent=evidence;if(ct)ct.textContent=contact;var ctx=document.getElementById('rfBatchContext');if(ctx){var active=(document.getElementById('rfBatchFilter')||{}).value||'all';ctx.textContent=active==='all'?'Showing all visible prospects · '+rows.length+' total prospects.':'Showing selected search batch · '+rows.length+' total prospects.';}}
  function patchTableRows(){var rows=activeRows(),map=leadMap(rows);[].slice.call(document.querySelectorAll('#rfProspectsTable tbody tr[data-id]')).forEach(function(tr){var key=clean(tr.dataset.id),lead=map[key];if(!lead){var domainEl=tr.querySelector('.rf-business-sub');var nameEl=tr.querySelector('.rf-business-name');lead=map[low(domainEl&&domainEl.textContent).replace(/^https?:\/\//i,'').replace(/^www\./i,'').replace(/\/.*$/,'')]||map[low(nameEl&&nameEl.textContent)];}if(!lead)return;var st=canonical(lead);if(!st)return;var decision=tr.children&&tr.children[2];if(!decision)return;var label=st==='qualified'?'Qualified':st==='review'?'Needs Review':'Rejected';var cls=st==='qualified'?'rf-badge rf-badge-qualified':st==='review'?'rf-badge rf-badge-review':'rf-badge rf-badge-rejected';var reason=st==='qualified'?'Verified qualified lead':st==='review'?'Needs manual review':'Rejected or filtered';decision.innerHTML='<span class="'+cls+'">'+esc(label)+'</span><div class="rf-row-reason">'+esc(reason)+'</div>';});}
  function run(){if(running)return;running=true;try{setKpis();patchTableRows();}finally{running=false;}}
  async function load(){finalLeads=(await fetchSheet('final_leads')).filter(matchUser);run();}
  window.rankforgeProspectsAuthoritativeStatus={run:run,reload:load};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='rfBatchFilter')setTimeout(run,50);},true);
  document.addEventListener('click',function(e){if(e.target&&/rf-page|rf-view|rf-search-selector/.test(e.target.className||''))setTimeout(run,80);},true);
  window.addEventListener('rankforge:user-profile-resolved',function(){load();});
  var observer=new MutationObserver(function(){setTimeout(run,30);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){observer.observe(document.body,{childList:true,subtree:true});});else observer.observe(document.body,{childList:true,subtree:true});
})();