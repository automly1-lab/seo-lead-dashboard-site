(function(){
  'use strict';
  if(((document.body||{}).dataset||{}).page!=='dashboard')return;
  var SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  var ADMIN_EMAIL='automly1@gmail.com';
  function clean(v){return String(v==null?'':v).trim();}
  function low(v){return clean(v).toLowerCase();}
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
  function fetchSheet(sheet){return new Promise(function(resolve){var cb='rfDashKpi_'+sheet.replace(/\W/g,'_')+'_'+Date.now()+'_'+Math.floor(Math.random()*99999),sc=document.createElement('script'),done=false,to=setTimeout(function(){finish([]);},9000);function finish(rows){if(done)return;done=true;clearTimeout(to);try{sc.remove();}catch(e){}try{delete window[cb];}catch(e){}resolve(rows||[]);}window[cb]=function(payload){try{var cols=(payload.table&&payload.table.cols||[]).map(function(c){return c.label||c.id;});var rows=(payload.table&&payload.table.rows||[]).map(function(r,i){var o={_row_index:i+2};(r.c||[]).forEach(function(cell,idx){o[cols[idx]]=cell?clean(cell.f||cell.v||''):'';});return o;});finish(rows);}catch(e){finish([]);}};sc.src='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?sheet='+encodeURIComponent(sheet)+'&tqx=responseHandler:'+cb+'&headers=1&cacheBust='+Date.now();sc.onerror=function(){finish([]);};document.body.appendChild(sc);});}
  function bestCurrent(rows,u,e,admin){return rows.filter(function(r){return match(r,u,e,admin);}).sort(function(a,b){return Date.parse(b.updated_at||b.synced_at||b.created_at||0)-Date.parse(a.updated_at||a.synced_at||a.created_at||0)||Number(b._row_index||0)-Number(a._row_index||0);})[0]||{};}
  async function run(){var u=userId(),e=email(),admin=isAdmin();var result=await Promise.all([fetchSheet('user_current_state'),fetchSheet('final_leads')]);var current=bestCurrent(result[0],u,e,admin);var leads=result[1].filter(function(r){return match(r,u,e,admin);});var qualified=leads.filter(function(l){return leadStatus(l)==='qualified';}).length;var review=leads.filter(function(l){return leadStatus(l)==='review_needed';}).length;var evidenceCount=leads.filter(hasEvidence).length;var limit=num(current.effective_qualified_lead_limit||current.monthly_qualified_lead_credit_limit||profile().monthly_qualified_lead_credit_limit);var used=num(current.qualified_leads_used||profile().qualified_leads_used)||qualified;setText('rfKpiQualified',qualified);setText('rfKpiReview',review);setText('rfKpiEvidence',pct(evidenceCount,leads.length));setText('rfKpiCredits',limit?used+' / '+limit:String(used));}
  window.rankforgeDashboardAuthoritativeKpis=run;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('rankforge:user-profile-resolved',run);
})();