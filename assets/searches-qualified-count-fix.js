(function(){
  'use strict';
  if(!document.body || !document.body.classList.contains('app-page-searches')) return;

  var SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  var ADMIN_EMAIL='automly1@gmail.com';
  var MIN_SEO_NEED_FOR_QUALIFIED=40;

  function clean(v){return String(v==null?'':v).trim();}
  function low(v){return clean(v).toLowerCase();}
  function num(v){var n=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):0;}
  function truthy(v){var t=low(v);return ['true','yes','1','found','verified','present','available','pass','passed','qualified','counted','partial'].indexOf(t)>=0;}
  function meaningful(v){var t=clean(v);return !!t&&!/^(false|no|0|null|undefined|none|n\/a|\[\]|\{\})$/i.test(t);}
  function parse(raw,f){try{return raw?JSON.parse(raw):f;}catch(e){return f;}}
  function profile(){return window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),{})||{};}
  function session(){try{return window.rankforgeAuth&&window.rankforgeAuth.getSession?window.rankforgeAuth.getSession():parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};}catch(e){return{};}}
  function userId(){var s=session(),p=profile();return clean(s.userId||s.id||p.user_id||localStorage.getItem('rankforge-current-user-id-v1'));}
  function email(){var s=session(),p=profile();return low(s.email||s.userEmail||p.email);}
  function isAdmin(){return email()===ADMIN_EMAIL||low(profile().plan)==='admin_unlimited'||low(profile().billing_status)==='admin_unlimited';}
  function rowUser(r){return clean(r.user_id||r.userId||r.owner_user_id||r.id);}
  function rowEmail(r){return low(r.email||r.user_email||r.owner_email||r.customer_email||r.billing_email);}
  function match(r){if(isAdmin())return true;var u=userId(),e=email(),ru=rowUser(r),re=rowEmail(r);return (!!u&&ru===u)||(!!e&&re===e)||(!ru&&!re);}
  function leadStatus(l){var s=low(l.qualification_status||l.final_status||l.lead_status||l.status||l.decision||l.recommended_decision).replace(/[\s-]+/g,'_');if(s==='qualified'||s==='qualified_locked'||s==='locked_qualified'||truthy(l.is_qualified)||truthy(l.lead_credit_counted))return'qualified';if(s==='review_needed'||s==='needs_review'||s==='review'||s==='manual_review')return'review_needed';if(s==='rejected'||s==='filtered_out'||s==='filtered'||/not_a_fit|not_fit|skip/.test(s))return'rejected';return'review_needed';}
  function directEvidenceCount(l){return num(l.direct_evidence_count)+num(l.crawl_based_evidence_count)+num(l.seo_verified_issue_count)+num(l.seo_verified_signal_count);}
  function hasEvidence(l){return leadStatus(l)==='qualified'||truthy(l.seo_claims_verified)||truthy(l.verified_seo_evidence)||truthy(l.evidence_status)||truthy(l.crawl_accessible)||directEvidenceCount(l)>0||num(l.seo_evidence_signal_count)>0||meaningful(l.seo_verified_claims)||meaningful(l.seo_evidence_summary)||meaningful(l.seo_evidence_json)||meaningful(l.technical_facts_json)||num(l.crawl_confidence)>0.35;}
  function hasDirectContact(l){return !!(clean(l.email||l.decision_maker_email||l.phone||l.decision_maker_phone)||truthy(l.phone_visible)||truthy(l.email_visible)||truthy(l.contact_page_found)||truthy(l.contact_cta_found));}
  function seoNeed(l){return num(l.seo_need_score||l.seoNeedScore||l.seo_need||l.seo_score||l.overall_lead_score||l.lead_score||l.score);}
  function isQualified(l){return leadStatus(l)==='qualified'||(hasEvidence(l)&&hasDirectContact(l)&&seoNeed(l)>=MIN_SEO_NEED_FOR_QUALIFIED);}
  function isReview(l){return !isQualified(l)&&leadStatus(l)==='review_needed';}
  function isRejected(l){return leadStatus(l)==='rejected';}
  function batchId(r){return clean(r.search_id||r.list_id||r.listId||r.search_batch_id||r.searchBatchId||r.batch_id||r.saved_list_id);}
  function keyParts(r){return [r.search_name,r.list_name,r.niche,r.target_service,r.business_type,r.businessType,r.city,r.target_city].map(low).filter(Boolean).join('|');}
  function fetchSheet(sheet){return new Promise(function(resolve){var cb='rfSearchQualifiedFix_'+sheet+'_'+Date.now()+'_'+Math.floor(Math.random()*99999),sc=document.createElement('script'),done=false,to=setTimeout(function(){finish([]);},10000);function finish(rows){if(done)return;done=true;clearTimeout(to);try{sc.remove();}catch(e){}try{delete window[cb];}catch(e){}resolve(rows||[]);}window[cb]=function(payload){try{var cols=(payload.table&&payload.table.cols||[]).map(function(c){return c.label||c.id;});var rows=(payload.table&&payload.table.rows||[]).map(function(row,i){var o={_row_index:i+2};(row.c||[]).forEach(function(cell,idx){o[cols[idx]]=cell?clean(cell.f||cell.v||''):'';});return o;});finish(rows);}catch(e){finish([]);}};sc.src='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?sheet='+encodeURIComponent(sheet)+'&tqx=responseHandler:'+cb+'&headers=1&cacheBust='+Date.now();sc.onerror=function(){finish([]);};document.body.appendChild(sc);});}
  function relatedLeadsForRow(row,leads){var rid=clean(row.getAttribute('data-search-id'));if(rid){var exact=leads.filter(function(l){return batchId(l)===rid;});if(exact.length)return exact;}if(document.querySelectorAll('#rfSearchBatchesTable tbody tr').length===1)return leads;var title=low(row.querySelector('.rf-search-title')&&row.querySelector('.rf-search-title').textContent);var sub=low(row.querySelector('.rf-search-subtitle')&&row.querySelector('.rf-search-subtitle').textContent);return leads.filter(function(l){var k=keyParts(l);return k&&((title&&k.indexOf(title)>=0)||(sub&&k.indexOf(sub)>=0)||(title&&title.indexOf(k)>=0)||(sub&&sub.indexOf(k)>=0));});}
  function patchRows(leads){var qAll=leads.filter(isQualified).length;var evidenceAll=leads.filter(hasEvidence).length;var total=leads.length;var kpi=document.getElementById('rfKpiQualifiedLeads');if(kpi)kpi.textContent=String(qAll);var ev=document.getElementById('rfKpiEvidenceCoverage');if(ev)ev.textContent=total?Math.round(evidenceAll/total*100)+'%':'—';[].slice.call(document.querySelectorAll('#rfSearchBatchesTable tbody tr[data-search-id]')).forEach(function(row){var rel=relatedLeadsForRow(row,leads);if(!rel.length)return;var q=rel.filter(isQualified).length, review=rel.filter(isReview).length, rejected=rel.filter(isRejected).length, found=rel.length, evidence=rel.filter(hasEvidence).length, coverage=found?Math.round(evidence/found*100):0;var resultCell=row.children&&row.children[2];if(resultCell){resultCell.innerHTML='<div class="rf-result-counts"><strong>'+found+'</strong> found</div><div class="rf-cell-note">'+q+' qualified · '+review+' review · '+rejected+' filtered out</div>';}
      var evidenceCell=row.children&&row.children[3];if(evidenceCell){evidenceCell.innerHTML='<div class="rf-evidence-meter"><strong>'+coverage+'%</strong><div class="rf-cell-note">'+(evidence?'Verified evidence found':'Open Prospects for evidence details')+'</div><div class="rf-evidence-track"><span class="rf-evidence-fill" style="--coverage:'+Math.max(5,coverage)+'%"></span></div></div>';}
      var usage=row.children&&row.children[5];if(usage){usage.innerHTML='<div class="rf-usage"><strong>Search used</strong><span class="rf-cell-note">'+q+' qualified credits counted</span></div>';}
    });}
  async function run(){var leads=(await fetchSheet('final_leads')).filter(match);patchRows(leads);}
  window.rankforgeSearchesQualifiedCountFix=run;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else setTimeout(run,250);
  window.addEventListener('rankforge:user-profile-resolved',run);
  setTimeout(run,1000);setTimeout(run,2500);
})();