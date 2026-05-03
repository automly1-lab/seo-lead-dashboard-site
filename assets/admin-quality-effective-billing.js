(()=>{
  'use strict';

  const ADMIN='automly1@gmail.com';
  const SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const clean=v=>String(v==null?'':v).trim();
  const low=v=>clean(v).toLowerCase();
  const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const parse=(raw,f)=>{try{return raw?JSON.parse(raw):f}catch{return f}};
  const isEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v));
  const first=(...vals)=>vals.map(clean).find(Boolean)||'';
  const number=v=>{if(/^(infinity|unlimited|∞)$/i.test(clean(v)))return Infinity;const n=Number(clean(v).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):0};

  const PLAN_RULES={
    free:{label:'Free',searches:2,credits:10,depth:10,csv:false},
    starter:{label:'Starter',searches:50,credits:50,depth:25,csv:true},
    growth:{label:'Growth',searches:150,credits:250,depth:50,csv:true},
    stacked:{label:'Stacked Paid',searches:0,credits:0,depth:50,csv:true},
    admin:{label:'Admin Unlimited',searches:Infinity,credits:Infinity,depth:Infinity,csv:true}
  };

  let model={users:[],loaded:false};
  let rendering=false;

  function session(){
    if(window.rankforgeAuth?.getSession){const s=window.rankforgeAuth.getSession();if(s)return s;}
    try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!/^sb-.+-auth-token$/.test(k))continue;const p=parse(localStorage.getItem(k),{}),u=p.user||p.currentSession?.user||p.session?.user;if(u?.id)return{userId:u.id,email:u.email||''};}}catch{}
    return parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};
  }
  function isAdmin(){return low(session().email||session().userEmail)===ADMIN;}
  function status(msg,t='ok'){const el=$('#rfAdminStatus');if(!el)return;el.textContent=msg;el.className='rf-pill '+(t==='error'?'rf-badge-error':t==='warn'?'rf-badge-warning':'rf-badge-ok');}
  function parseGvizTable(payload){const cols=(payload.table?.cols||[]).map(c=>c.label||c.id);return (payload.table?.rows||[]).map((row,i)=>{const o={_row_index:i+2};(row.c||[]).forEach((cell,idx)=>o[cols[idx]]=cell?clean(cell.f||cell.v||''):'');return o;});}
  function fetchSheet(sheet){return new Promise(resolve=>{const cb='rfEffectiveAdmin_'+sheet+'_'+Date.now()+'_'+Math.floor(Math.random()*99999);const script=document.createElement('script');let done=false;const timer=setTimeout(()=>finish([]),12000);function finish(rows){if(done)return;done=true;clearTimeout(timer);try{script.remove()}catch{}try{delete window[cb]}catch{}resolve(rows||[]);}window[cb]=p=>{try{finish(parseGvizTable(p))}catch{finish([])}};script.src='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?sheet='+encodeURIComponent(sheet)+'&tqx=responseHandler:'+cb+'&headers=1&cacheBust='+Date.now();script.async=true;script.onerror=()=>finish([]);document.body.appendChild(script);});}
  function normalizePlan(v){const raw=low(v).replace(/\s+/g,'_').replace(/-/g,'_');if(/admin|unlimited/.test(raw))return'admin';if(/stack|bundle|combined|multi/.test(raw))return'stacked';if(raw==='growth'||raw==='pro')return'growth';if(raw==='starter'||raw==='basic')return'starter';return'free';}
  function normalizeBilling(v){const raw=low(v).replace(/\s+/g,'_').replace(/-/g,'_');if(/admin|unlimited/.test(raw))return'admin_unlimited';if(/active|paid|trialing|complete|checkout_complete|subscription_active|subscription/.test(raw))return'active';if(/pending|incomplete/.test(raw))return'pending';if(/past/.test(raw))return'past_due';if(/cancel/.test(raw))return'canceled';if(/free/.test(raw))return'free';return raw||'unknown';}
  function rowEmails(r){const vals=[r.email,r.user_email,r.account_email,r.customer_email,r.billing_email,r.stripe_customer_email];if(isEmail(r.user_id))vals.push(r.user_id);if(isEmail(r.userId))vals.push(r.userId);return vals.map(low).filter(Boolean);}
  function rowEmail(r){return rowEmails(r)[0]||'';}
  function rowUserId(r){const raw=first(r.user_id,r.userId,r.owner_user_id,r.id);return raw&&!isEmail(raw)?raw:'';}
  function canonicalKey(r){return rowEmail(r)||rowUserId(r)||first(r.user_id,r.id,r.customer_id)||('row_'+(r._row_index||''));}
  function rowSource(r){return low(first(r.source,r.profile_source,r.admin_override,r.override_active));}
  function rowPlan(r){return normalizePlan(first(r.plan_override,r.plan,r.current_plan,r.plan_name,r.subscription_plan,r.package,r.tier));}
  function rowBilling(r){return normalizeBilling(first(r.billing_status_override,r.billing_status,r.subscription_status,r.payment_status));}
  function rowTime(r){const t=Date.parse(first(r.updated_at,r.synced_at,r.created_at,lastActivity(r)));return Number.isFinite(t)?t:0;}
  function isOverride(r){const s=rowSource(r);return s==='admin_override'||s==='true'||s.indexOf('admin')>=0;}
  function hasPaidSource(r){const s=rowSource(r);return s.indexOf('stripe')>=0||s.indexOf('checkout')>=0||s.indexOf('billing')>=0||s.indexOf('subscription')>=0;}
  function isPaidRow(r){return rowPlan(r)!=='free'&&(hasPaidSource(r)||rowBilling(r)==='active'||rowBilling(r)==='admin_unlimited');}
  function priority(r){if(isOverride(r))return 40;if(isPaidRow(r))return 30;if(rowPlan(r)!=='free')return 15;return 0;}
  function tie(r){if(isOverride(r))return 3;if(rowSource(r).indexOf('stack')>=0)return 3;if(hasPaidSource(r))return 2;if(rowBilling(r)==='active'&&rowPlan(r)!=='free')return 1;return 0;}
  function choose(rows){return rows.slice().sort((a,b)=>priority(b)-priority(a)||tie(b)-tie(a)||rowTime(b)-rowTime(a)||Number(b._row_index||0)-Number(a._row_index||0))[0]||null;}
  function limitFromRow(r,type,plan){const rule=PLAN_RULES[plan]||PLAN_RULES.free;const raw=type==='search'?first(r.effective_search_limit,r.monthly_search_limit,r.search_batches_limit,r.base_search_limit):first(r.effective_qualified_lead_limit,r.monthly_qualified_lead_credit_limit,r.qualified_lead_credits_limit,r.base_qualified_lead_limit);const val=raw?number(raw):0;if(raw&&val>0)return val;if(raw&&val===Infinity)return Infinity;return type==='search'?rule.searches:rule.credits;}
  function lastActivity(r){return first(r.last_active_at,r.last_login_at,r.updated_at,r.synced_at,r.created_at,r.lastRun,r.createdAt);}
  function idSearch(r){return first(r.search_id,r.list_id,r.search_batch_id,r.batch_id,r.saved_list_id,r.listId,r.id);}
  function qstatus(r){return low(r.qualification_status||r.status||r.decision||'review_needed');}
  function creditAmount(r){const s=qstatus(r);if(s!=='qualified')return 0;if(r.lead_credit_counted!==undefined&&!/^(true|yes|1|counted)$/i.test(clean(r.lead_credit_counted)))return 0;const amount=number(r.lead_credit_amount);return amount||1;}
  function matchUserRow(row,user){const em=rowEmail(row), uid=rowUserId(row), userEmail=user.email_key, userId=user.user_id;return (em&&userEmail&&em===userEmail)||(uid&&userId&&uid===userId)||(!em&&row.user_id&&clean(row.user_id)===clean(userId));}
  function buildModel(usersRows,searchRows,leadRows,feedbackRows){
    const groups={};usersRows.forEach(r=>{const k=canonicalKey(r);if(!groups[k])groups[k]=[];groups[k].push(r);});
    const output=Object.entries(groups).map(([key,rows])=>{const best=choose(rows)||rows[0]||{};const effectiveBilling=rowBilling(best);let effectivePlan=rowPlan(best);if(low(rowEmail(best))===ADMIN||effectiveBilling==='admin_unlimited')effectivePlan='admin';if(effectiveBilling!=='active'&&effectiveBilling!=='admin_unlimited'&&effectivePlan!=='admin')effectivePlan='free';return{key,user_id:first(rowUserId(best),best.user_id,best.userId,key),email_key:rowEmail(best),email:rowEmail(best)||first(best.email,best.user_email,'No email recorded'),plan:effectivePlan,billing_status:effectiveBilling,source:first(best.source,''),priority:priority(best),source_row_index:best._row_index,search_limit:limitFromRow(best,'search',effectivePlan),credit_limit:limitFromRow(best,'credit',effectivePlan),review:0,searches:0,credits:0,leads:0,feedback:0,last_active_at:first(lastActivity(best),'')}});
    function findUser(row){return output.find(u=>matchUserRow(row,u));}
    const seenSearches=new Set();searchRows.forEach(r=>{const u=findUser(r);if(!u)return;const sid=idSearch(r)||('search_'+Math.random());const key=u.key+'|'+sid;if(!seenSearches.has(key)){seenSearches.add(key);u.searches++;}const d=lastActivity(r);if(d&&(!u.last_active_at||new Date(d)>new Date(u.last_active_at)))u.last_active_at=d;});
    leadRows.forEach(r=>{const u=findUser(r);if(!u)return;u.leads++;u.credits+=creditAmount(r);if(['review_needed','needs_review','review'].includes(qstatus(r)))u.review++;const d=lastActivity(r);if(d&&(!u.last_active_at||new Date(d)>new Date(u.last_active_at)))u.last_active_at=d;});
    feedbackRows.forEach(r=>{const u=findUser(r);if(u)u.feedback++;});
    return output.sort((a,b)=>(a.email==='No email recorded')-(b.email==='No email recorded')||a.email.localeCompare(b.email));
  }
  function fmtLimit(v){return v===Infinity?'∞':String(v);}
  function remaining(used,limit){return limit===Infinity?'Unlimited':String(Math.max(0,Number(limit||0)-used));}
  function badgeBilling(v){const b=normalizeBilling(v);const cls=b==='active'||b==='admin_unlimited'?'rf-badge-active':b==='pending'||b==='past_due'?'rf-badge-warning':b==='canceled'?'rf-badge-error':'rf-badge-free';return `<span class="rf-badge ${cls}">${esc(b)}</span>`;}
  function planLabel(p){return (PLAN_RULES[p]||PLAN_RULES.free).label;}
  function date(v){const d=new Date(v||'');return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d);}
  function renderUsers(){const tbody=$('#usersTable tbody');if(!tbody||rendering)return;rendering=true;const q=low($('#userSearch')?.value), pf=$('#userPlanFilter')?.value||'all', bf=$('#userBillingFilter')?.value||'all';const rows=model.users.filter(u=>(!q||low(u.email+' '+u.user_id).includes(q))&&(pf==='all'||u.plan===pf)&&(bf==='all'||normalizeBilling(u.billing_status)===bf));tbody.innerHTML=rows.length?rows.map(u=>`<tr data-effective-billing-row="true"><td><strong>${esc(u.email)}</strong><span class="rf-mono rf-user-id">${esc(u.user_id)}</span><span class="rf-muted">source: ${esc(u.source||'—')} · row ${esc(u.source_row_index||'—')}</span></td><td><strong>${esc(u.email)}</strong></td><td><span class="rf-badge rf-badge-plan">${esc(planLabel(u.plan))}</span></td><td>${badgeBilling(u.billing_status)}</td><td>${u.searches} / ${fmtLimit(u.search_limit)}</td><td>${u.credits} / ${fmtLimit(u.credit_limit)}</td><td>${u.review}</td><td>${u.leads}</td><td>${date(u.last_active_at)}</td><td><button class="button small ghost" data-view-user="${esc(u.user_id)}">View User</button> <button class="button small ghost" data-copy-user="${esc(u.user_id)}">Copy ID</button></td></tr>`).join(''):'<tr><td colspan="10" class="rf-muted">No effective users found.</td></tr>';rendering=false;}
  function renderBilling(){const tbody=$('#billingTable tbody');if(!tbody||rendering)return;rendering=true;tbody.innerHTML=model.users.length?model.users.map(u=>`<tr data-effective-billing-row="true" data-base-search-used="${u.searches}" data-base-credit-used="${u.credits}"><td><strong>${esc(u.email)}</strong><span class="rf-mono rf-user-id">${esc(u.user_id)}</span><span class="rf-muted">effective: ${esc(u.source||'users_sheet')} · priority ${u.priority} · row ${esc(u.source_row_index||'—')}</span></td><td><select data-plan="${esc(u.user_id)}"><option value="free" ${u.plan==='free'?'selected':''}>Free</option><option value="starter" ${u.plan==='starter'?'selected':''}>Starter</option><option value="growth" ${u.plan==='growth'?'selected':''}>Growth</option><option value="stacked" ${u.plan==='stacked'?'selected':''}>Stacked Paid</option><option value="admin" ${u.plan==='admin'?'selected':''}>Admin Unlimited</option></select></td><td><select data-billing="${esc(u.user_id)}"><option value="free" ${u.billing_status==='free'?'selected':''}>free</option><option value="active" ${u.billing_status==='active'?'selected':''}>active</option><option value="pending" ${u.billing_status==='pending'?'selected':''}>pending</option><option value="canceled" ${u.billing_status==='canceled'?'selected':''}>canceled</option><option value="past_due" ${u.billing_status==='past_due'?'selected':''}>past_due</option><option value="admin_unlimited" ${u.billing_status==='admin_unlimited'?'selected':''}>admin_unlimited</option></select></td><td>${u.searches} / ${fmtLimit(u.search_limit)}<br><span class="rf-muted">${remaining(u.searches,u.search_limit)} remaining</span></td><td>${u.credits} / ${fmtLimit(u.credit_limit)}<br><span class="rf-muted">${remaining(u.credits,u.credit_limit)} remaining</span></td><td>${u.review}<br><span class="rf-muted">Does not use credits</span></td><td><input data-search-adjust="${esc(u.user_id)}" placeholder="Search +/-"><input data-lead-adjust="${esc(u.user_id)}" placeholder="Lead +/-"></td><td><input data-note="${esc(u.user_id)}" placeholder="Reason / note"></td><td><button class="button small primary" data-copy-override="${esc(u.user_id)}">Copy Override JSON</button></td></tr>`).join(''):'<tr><td colspan="9" class="rf-muted">No effective users found.</td></tr>';rendering=false;setTimeout(()=>document.dispatchEvent(new Event('change')),50);}
  function activeTab(){return (location.hash||'#command-center').replace('#','');}
  function renderForTab(){if(!model.loaded)return;const tab=activeTab();if(tab==='users')renderUsers();if(tab==='billing')renderBilling();}
  async function load(){if(!isAdmin())return;status('Refreshing effective billing data…','warn');const [usersRows,searchRows,leadRows,feedbackRows]=await Promise.all([fetchSheet('users'),fetchSheet('searches'),fetchSheet('final_leads'),fetchSheet('lead_feedback')]);model.users=buildModel(usersRows,searchRows,leadRows,feedbackRows);model.loaded=true;window.rankforgeAdminEffectiveBilling=model;renderForTab();status('Effective billing data synced','ok');}
  function bind(){['#userSearch','#userPlanFilter','#userBillingFilter'].forEach(sel=>$(sel)?.addEventListener(sel==='#userSearch'?'input':'change',()=>{if(activeTab()==='users')renderUsers();}));$$('.rf-admin-tabs a').forEach(a=>a.addEventListener('click',()=>setTimeout(renderForTab,250)));$('#refreshAdminData')?.addEventListener('click',()=>setTimeout(load,700));const obs=new MutationObserver(()=>{if(model.loaded)setTimeout(renderForTab,120);});const usersBody=$('#usersTable tbody'),billingBody=$('#billingTable tbody');if(usersBody)obs.observe(usersBody,{childList:true});if(billingBody)obs.observe(billingBody,{childList:true});}
  function start(){bind();setTimeout(load,1500);}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
