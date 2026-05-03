(function(){
  'use strict';

  var ADMIN_EMAIL='automly1@gmail.com';
  var STATE_KEY='rankforge-clean-app-state-v1';
  var USER_KEY='rankforge-current-user-id-v1';
  var PLAN_KEY='rankforge-plan-v1';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  var renderTimer=null;
  var lastRenderSignature='';
  var initialFallbackTimer=null;

  function text(v){return String(v==null?'':v).trim();}
  function lower(v){return text(v).toLowerCase();}
  function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(_){return fallback;}}
  function state(){return parse(localStorage.getItem(STATE_KEY),{})||{};}
  function session(){try{return window.rankforgeAuth&&window.rankforgeAuth.getSession?window.rankforgeAuth.getSession():parse(localStorage.getItem('rankforge-auth-session-v1'),null);}catch(_){return null;}}
  function currentUserId(){var s=session()||{};return text(s.userId||s.id||localStorage.getItem(USER_KEY));}
  function bool(v){var t=lower(v);return ['true','yes','1','qualified','counted'].indexOf(t)>=0;}
  function num(v){var n=Number(String(v||0).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):0;}
  function escapeHtml(v){return text(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function profile(){return window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),null)||{};}
  function hasResolvedProfile(prof){return !!(prof&&prof.resolved_at&&(prof.profile_source==='users_sheet'||prof.profile_source==='force_users_sheet'||prof.profile_source==='default'||prof.profile_source==='cached_preserved'||prof.profile_source==='checkout_success'));}
  function shouldWaitForResolvedProfile(){var prof=profile();if(hasResolvedProfile(prof))return false;if(window.rankforgeResolveEffectiveUserProfile)return true;var s=session();return !!(s&&(s.email||s.userEmail||s.userId||s.id));}
  function renderLoadingCard(){
    var main=document.querySelector('.rf-dashboard-main');if(!main)return;
    var header=document.querySelector('.rf-dashboard-header');var card=document.getElementById('rfMvpUsageCard');
    if(!card){card=document.createElement('section');card.id='rfMvpUsageCard';card.className='rf-mvp-usage-card is-loading';if(header&&header.parentNode)header.parentNode.insertBefore(card,header.nextSibling);else main.prepend(card);}else card.classList.add('is-loading');
    var html='<div class="rf-mvp-usage-head"><div><p class="rf-eyebrow">Plan & Usage</p><h2>Plan loading</h2><p>Loading your current plan, usage, and qualified lead credits.</p></div><span class="rf-mvp-pill">Loading</span></div>';
    if(card.innerHTML!==html)card.innerHTML=html;
    var planBadge=document.getElementById('rfPlanBadge')||document.getElementById('rfProspectPlanBadge');if(planBadge)planBadge.textContent='Plan loading';
    var creditBadge=document.getElementById('rfCreditBadge')||document.getElementById('rfProspectCreditBadge');if(creditBadge)creditBadge.textContent='Credits loading';
  }
  function limitValue(v,fallback){var raw=text(v);if(!raw)return fallback;if(/infinity|unlimited|∞/i.test(raw))return Infinity;var n=Number(raw.replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):fallback;}
  function getRows(){var s=state();return {lists:[].concat(s.localLists||[],s.remoteCache&&s.remoteCache.lists||[]).filter(Boolean),leads:[].concat(s.localLeads||[],s.remoteCache&&s.remoteCache.leads||[]).filter(Boolean)};}
  function owner(row){return text(row&& (row.userId||row.user_id||row.owner_user_id));}
  function owned(row){var u=currentUserId();var o=owner(row);return !u||!o||u===o;}
  function isAdmin(user,prof){var s=session()||{};prof=prof||profile();var email=lower((user&&user.email)||(prof&&prof.email)||s.email||s.userEmail);var plan=lower((prof&&prof.plan)||(prof&&prof.plan_name)||localStorage.getItem(PLAN_KEY));var billing=lower(prof&&prof.billing_status);return email===ADMIN_EMAIL||billing==='admin_unlimited'||(email===ADMIN_EMAIL&&(plan==='admin_unlimited'||plan==='admin unlimited'||plan==='admin'||plan==='unlimited'));}
  function planDefaults(key){
    if(key==='admin'||key==='admin_unlimited')return {key:'admin',name:'Admin Unlimited',searchLimit:Infinity,creditLimit:Infinity,previewLimit:Infinity,maxBatch:50,csv:true,cta:'',ctaHref:'../quality/'};
    if(key==='stacked')return {key:'stacked',name:'Stacked Paid',searchLimit:0,creditLimit:0,previewLimit:Infinity,maxBatch:50,csv:true,cta:'View pricing',ctaHref:'../pricing/#plans'};
    if(key==='growth')return {key:'growth',name:'Growth',searchLimit:150,creditLimit:250,previewLimit:Infinity,maxBatch:50,csv:true,cta:'Join Agency Intelligence waitlist',ctaHref:'../pricing/#plans'};
    if(key==='starter')return {key:'starter',name:'Starter',searchLimit:50,creditLimit:50,previewLimit:Infinity,maxBatch:25,csv:true,cta:'Upgrade to Growth',ctaHref:'../pricing/'};
    return {key:'free',name:'Free',searchLimit:2,creditLimit:10,previewLimit:10,maxBatch:10,csv:false,cta:'Upgrade to Starter',ctaHref:'../pricing/'};
  }
  function keyFromPlan(raw){raw=lower(raw).replace(/\s+/g,'_').replace(/-/g,'_');return /stack|bundle|combined|multi/.test(raw)?'stacked':/growth/.test(raw)?'growth':/starter/.test(raw)?'starter':/admin|unlimited/.test(raw)?'admin':'free';}
  function paidEntitlement(prof,key){return key!=='free'&&(prof.paid_managed||prof.admin_managed||prof.csv_export===true||String(prof.csv_export).toLowerCase()==='true'||limitValue(prof.monthly_search_limit,0)>2||limitValue(prof.monthly_qualified_lead_credit_limit,0)>10||/stripe|checkout|billing|subscription|override/i.test(text(prof.source_row_source)));}
  function planInfo(){
    var prof=profile();
    if(window.rankforgeGetEffectivePlan){var eff=window.rankforgeGetEffectivePlan();if(eff&&eff.ready){var ep=planDefaults(eff.isAdmin?'admin':eff.plan);ep.name=eff.name||ep.name;ep.searchLimit=eff.searchLimit===Infinity?Infinity:limitValue(eff.searchLimit,ep.searchLimit);ep.creditLimit=eff.creditLimit===Infinity?Infinity:limitValue(eff.creditLimit,ep.creditLimit);ep.maxBatch=eff.maxBatch===Infinity?Infinity:limitValue(eff.maxBatch,ep.maxBatch);ep.csv=!!eff.csv;return ep;}}
    if(isAdmin(null,prof))return planDefaults('admin');
    var hasProfile=hasResolvedProfile(prof);
    var raw=hasProfile?prof.plan:(localStorage.getItem(PLAN_KEY)||localStorage.getItem('rankforge-current-plan-v1')||'free');
    var key=keyFromPlan(raw);
    var billing=lower(hasProfile?prof.billing_status:(localStorage.getItem('rankforge-billing-status-v1')||''));
    var active=(billing==='active'||billing==='admin_unlimited'||billing==='trialing'||billing==='paid');
    var explicitlyInactive=/canceled|cancelled|past_due|unpaid|pending|incomplete/.test(billing);
    if(!active&&!paidEntitlement(prof,key)&&explicitlyInactive)key='free';
    if(!active&&!paidEntitlement(prof,key)&&!hasProfile)key='free';
    var p=planDefaults(key);
    if(hasProfile){
      p.searchLimit=limitValue(prof.monthly_search_limit,p.searchLimit);
      p.creditLimit=limitValue(prof.monthly_qualified_lead_credit_limit,p.creditLimit);
      p.maxBatch=limitValue(prof.max_leads_per_batch,p.maxBatch);
      if(prof.csv_export!==undefined)p.csv=(prof.csv_export===true||String(prof.csv_export).toLowerCase()==='true');
    }else{
      p.searchLimit=limitValue(localStorage.getItem('rankforge-monthly-search-limit-v1'),p.searchLimit);
      p.creditLimit=limitValue(localStorage.getItem('rankforge-monthly-qualified-credit-limit-v1'),p.creditLimit);
      p.maxBatch=limitValue(localStorage.getItem('rankforge-max-leads-per-batch-v1'),p.maxBatch);
    }
    return p;
  }
  function status(row){var s=lower(row&&(row.qualification_status||row.status||row.decision));if(s==='qualified')return 'qualified';if(s==='qualified_locked'||s==='locked_qualified'||s==='qualified locked')return 'qualified_locked';if(s==='rejected'||s==='filtered_out'||s==='filtered out')return 'rejected';return 'review_needed';}
  function creditCounted(row){if(status(row)!=='qualified')return false;if(row&&row.lead_credit_counted!==undefined)return bool(row.lead_credit_counted);return true;}
  function creditAmount(row){if(!creditCounted(row))return 0;var amount=num(row&&row.lead_credit_amount);return amount||1;}
  function usage(){var p=planInfo();var data=getRows();var lists=data.lists.filter(owned);var leads=data.leads.filter(owned);var qualified=leads.filter(function(l){return status(l)==='qualified';});var locked=leads.filter(function(l){return status(l)==='qualified_locked';});var review=leads.filter(function(l){return status(l)==='review_needed';});var rejected=leads.filter(function(l){return status(l)==='rejected';});var credits=p.key==='admin'?0:qualified.reduce(function(sum,l){return sum+creditAmount(l);},0);credits=p.creditLimit===Infinity?credits:Math.min(credits,p.creditLimit);return {plan:p,searchUsed:lists.length,creditUsed:credits,qualified:qualified.length,locked:locked.length,review:review.length,rejected:rejected.length,total:leads.length};}
  function remaining(used,limit){return limit===Infinity?'Unlimited':String(Math.max(0,limit-used));}
  function percent(used,limit){return limit===Infinity?0:Math.min(100,Math.round((used/Math.max(1,limit))*100));}
  function tone(used,limit){var p=percent(used,limit);return p>=100?'danger':p>=80?'warn':'';}
  function modal(title,body,primary,href,secondary){var old=document.getElementById('rfMvpCreditModal');if(old)old.remove();var wrap=document.createElement('div');wrap.id='rfMvpCreditModal';wrap.className='rf-mvp-modal-backdrop';wrap.innerHTML='<div class="rf-mvp-modal" role="dialog" aria-modal="true" aria-labelledby="rfMvpCreditModalTitle"><h2 id="rfMvpCreditModalTitle">'+escapeHtml(title)+'</h2><p>'+escapeHtml(body)+'</p><div class="rf-mvp-modal-actions"><button class="button ghost" type="button" data-rf-mvp-close>'+escapeHtml(secondary||'Maybe later')+'</button><a class="button primary" href="'+escapeHtml(href||'../pricing/')+'">'+escapeHtml(primary||'Upgrade')+'</a></div></div>';document.body.appendChild(wrap);wrap.addEventListener('click',function(e){if(e.target===wrap||e.target.closest('[data-rf-mvp-close]'))wrap.remove();});}
  function meter(label,used,limit,sub){var p=percent(used,limit);return '<div class="rf-mvp-meter '+tone(used,limit)+'"><div class="rf-mvp-meter-top"><span>'+escapeHtml(label)+'</span><span class="rf-mvp-meter-value">'+(limit===Infinity?escapeHtml('Unlimited'):escapeHtml(used+' / '+limit))+'</span></div><div class="rf-mvp-bar"><span style="width:'+p+'%"></span></div><p class="rf-mvp-note">'+escapeHtml(sub)+'</p></div>';}
  function renderUsageCard(){var main=document.querySelector('.rf-dashboard-main');if(!main)return;var header=document.querySelector('.rf-dashboard-header');var card=document.getElementById('rfMvpUsageCard');if(!card){card=document.createElement('section');card.id='rfMvpUsageCard';card.className='rf-mvp-usage-card';if(header&&header.parentNode)header.parentNode.insertBefore(card,header.nextSibling);else main.prepend(card);}card.classList.remove('is-loading');var u=usage(),p=u.plan;var creditSub='1 credit = 1 qualified lead. Needs Review and Rejected prospects use 0 credits.';var csvSub=p.csv?'CSV export enabled.':'No CSV export on Free.';var action=p.cta?'<a class="button primary" href="'+escapeHtml(p.ctaHref)+'">'+escapeHtml(p.cta)+'</a>':'';var remainingText=p.key==='admin'?'Unlimited access':escapeHtml(remaining(u.creditUsed,p.creditLimit))+' credits remaining';var html='<div class="rf-mvp-usage-head"><div><p class="rf-eyebrow">Plan & Usage</p><h2>'+escapeHtml(p.name)+' Plan</h2><p>1 credit = 1 qualified lead. Only qualified leads consume credits. Needs Review and Rejected prospects use 0 credits.</p></div><span class="rf-mvp-pill">'+remainingText+'</span></div><div class="rf-mvp-usage-grid">'+meter('Search batches',u.searchUsed,p.searchLimit,p.key==='free'?'2 free test searches.':'Search batches help you test markets.')+meter('Qualified lead credits',u.creditUsed,p.creditLimit,creditSub)+meter('CSV export',p.csv?1:0,1,csvSub)+'</div><div class="rf-mvp-actions">'+action+'</div>';
    if(card.innerHTML!==html)card.innerHTML=html;
  }
  function updateHeaderAndExistingUsage(){var u=usage(),p=u.plan;var planBadge=document.getElementById('rfPlanBadge')||document.getElementById('rfProspectPlanBadge');if(planBadge)planBadge.textContent=p.name+' Plan';var creditBadge=document.getElementById('rfCreditBadge')||document.getElementById('rfProspectCreditBadge');if(creditBadge)creditBadge.textContent=p.key==='admin'?'Unlimited qualified lead credits':remaining(u.creditUsed,p.creditLimit)+' credits remaining';var kpi=document.getElementById('rfKpiCredits');if(kpi)kpi.textContent=p.key==='admin'?'Unlimited':u.creditUsed+' / '+p.creditLimit;}
  function guardReason(){var u=usage(),p=u.plan;if(p.key==='admin')return null;if(p.searchLimit!==Infinity&&u.searchUsed>=p.searchLimit)return {title:'Search batch limit reached',body:p.key==='starter'?'You’ve used your Starter search batches this month. Upgrade to Growth for more search batches.':p.key==='growth'?'You’ve reached your Growth search batches this month. Join the Agency Intelligence waitlist for custom volume.':p.key==='stacked'?'You’ve used your stacked search batches for this period.':'Your free test searches have been used. Upgrade to Starter to run more search batches.',cta:p.key==='growth'?'Join Agency Intelligence waitlist':p.key==='starter'?'Upgrade to Growth':p.key==='stacked'?'View pricing':'Upgrade to Starter',href:'../pricing/'};if(p.creditLimit!==Infinity&&u.creditUsed>=p.creditLimit)return {title:'Qualified lead credits used',body:'You’ve used your monthly qualified lead credits. Upgrade to unlock more qualified leads.',cta:p.key==='growth'?'Join Agency Intelligence waitlist':p.key==='starter'?'Upgrade to Growth':p.key==='stacked'?'View pricing':'Upgrade to Starter',href:'../pricing/'};return null;}
  function patchSearchGuard(){if(!window.rankforgeApp||typeof window.rankforgeApp.createSearch!=='function'||window.rankforgeApp.__mvpCreditGuard)return;var original=window.rankforgeApp.createSearch;window.rankforgeApp.createSearch=function(event){var block=guardReason();if(block){if(event)event.preventDefault();modal(block.title,block.body,block.cta,block.href,'Close');return false;}return original.apply(this,arguments);};window.rankforgeApp.__mvpCreditGuard=true;}
  function patchExportGuard(){document.addEventListener('click',function(e){var target=e.target.closest('#rfExportCsvButton,#rfBulkExport,.rf-export-one');if(!target)return;var p=planInfo();if(p.csv||p.key==='admin')return;e.preventDefault();e.stopPropagation();modal('CSV export is available on paid plans','Upgrade to Starter to export contact-ready qualified leads.','Upgrade to Starter','../pricing/','Maybe later');},true);}
  function patchWarnings(){var u=usage(),p=u.plan;if(percent(u.creditUsed,p.creditLimit)>=80&&u.creditUsed<p.creditLimit){var b=document.getElementById('rfCreditBadge');if(b)b.textContent='80% of credits used';}}
  function hideBuyCredits(){Array.from(document.querySelectorAll('a,button')).forEach(function(el){if(/buy credits|credit pack|purchase credits/i.test(el.textContent||'')){el.classList.add('rf-mvp-hidden');}});}
  function labelCreditBadges(){Array.from(document.querySelectorAll('[data-status],.status-pill,.rf-pill')).forEach(function(el){var s=lower(el.textContent);if(s==='qualified locked'||s==='qualified_locked')el.textContent='Qualified — locked';});}
  function renderAll(){if(shouldWaitForResolvedProfile()){renderLoadingCard();return;}var u=usage(),p=u.plan;var sig=[p.key,p.name,p.searchLimit,p.creditLimit,p.maxBatch,p.csv,u.searchUsed,u.creditUsed,u.qualified,u.review,u.locked,u.rejected].join('|');if(sig===lastRenderSignature)return;lastRenderSignature=sig;renderUsageCard();updateHeaderAndExistingUsage();patchWarnings();hideBuyCredits();labelCreditBadges();}
  function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(renderAll,120);}
  function init(){patchExportGuard();patchSearchGuard();renderLoadingCard();scheduleRender();if(window.rankforgeResolveEffectiveUserProfile){window.rankforgeResolveEffectiveUserProfile({force:true,reason:'mvp_credit_wait_for_profile'}).then(scheduleRender).catch(function(){initialFallbackTimer=setTimeout(scheduleRender,2500);});}else{initialFallbackTimer=setTimeout(scheduleRender,2500);}window.addEventListener('rankforge:user-profile-resolved',function(){if(initialFallbackTimer)clearTimeout(initialFallbackTimer);scheduleRender();});window.addEventListener('storage',function(e){if(e.key===PROFILE_KEY||e.key===STATE_KEY)scheduleRender();});}
  window.rankforgeMvpCredits={planInfo:planInfo,usage:usage,isAdmin:isAdmin,showUpgradeModal:modal,status:status,refresh:scheduleRender};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();