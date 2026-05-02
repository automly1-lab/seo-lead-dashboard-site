(()=>{
  'use strict';
  const OVERRIDE_KEY='rankforge-admin-overrides-v2';
  const ACTIVITY_KEY='rankforge-admin-activity-v2';
  const planRules={free:{label:'Free',searches:2,credits:10},starter:{label:'Starter',searches:50,credits:50},growth:{label:'Growth',searches:150,credits:250},launch:{label:'Launch Plan',searches:'custom',credits:'custom'},admin:{label:'Admin Unlimited',searches:'Unlimited',credits:'Unlimited'}};
  const clean=v=>String(v==null?'':v).trim();
  const num=v=>{const n=Number(String(v||0).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.round(n):0};
  const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const parse=(raw,fallback)=>{try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

  function status(msg,type='ok'){
    const el=$('#rfAdminStatus');
    if(!el)return;
    el.textContent=msg;
    el.className='rf-pill '+(type==='error'?'rf-badge-error':'rf-badge-ok');
  }
  function rowUserId(row){return clean(row?.querySelector('.rf-user-id')?.textContent||row?.querySelector('.rf-mono')?.textContent||'')}
  function baseUsed(row,type){
    const attr=type==='search'?'baseSearchUsed':'baseCreditUsed';
    if(row?.dataset&&row.dataset[attr]!==undefined)return num(row.dataset[attr]);
    const idx=type==='search'?3:4;
    const text=clean(row?.cells?.[idx]?.textContent||'');
    const match=text.match(/^\s*(-?\d+)/);
    return match?num(match[1]):0;
  }
  function selectedPlan(row){return clean(row?.querySelector('[data-plan]')?.value||'free')||'free'}
  function selectedBilling(row){return clean(row?.querySelector('[data-billing]')?.value||'free')||'free'}
  function adjustment(row,type){
    const selector=type==='search'?'[data-search-adjust]':'[data-lead-adjust]';
    return num(row?.querySelector(selector)?.value||0);
  }
  function effectiveUsed(row,type){return Math.max(0,baseUsed(row,type)+adjustment(row,type))}
  function limitFor(row,type){
    const rule=planRules[selectedPlan(row)]||planRules.free;
    return type==='search'?rule.searches:rule.credits;
  }
  function formatLimit(limit){return limit==='Unlimited'?'∞':String(limit)}
  function remaining(used,limit){
    if(typeof limit==='number')return String(Math.max(0,limit-used));
    if(limit==='Unlimited')return 'Unlimited';
    return 'custom';
  }
  function renderUsageCell(row,type){
    const idx=type==='search'?3:4;
    const label=type==='search'?'Search batches':'Qualified credits';
    const used=effectiveUsed(row,type);
    const limit=limitFor(row,type);
    const adj=adjustment(row,type);
    const savedBadge=adj?`<br><span class="rf-badge rf-badge-ok">Adjustment ${adj>0?'+':''}${adj}</span>`:'';
    row.cells[idx].innerHTML=`<strong>${esc(used)} / ${esc(formatLimit(limit))}</strong><br><span class="rf-muted">${esc(remaining(used,limit))} remaining</span>${savedBadge}<span class="rf-sr-only">${esc(label)}</span>`;
  }
  function hydrateRows(){
    $$('#billingTable tbody tr').forEach(row=>{
      if(!row.cells||row.cells.length<9)return;
      if(row.dataset.rfBillingReady==='1')return;
      row.dataset.rfBillingReady='1';
      row.dataset.baseSearchUsed=String(baseUsed(row,'search'));
      row.dataset.baseCreditUsed=String(baseUsed(row,'credit'));
      renderUsageCell(row,'search');
      renderUsageCell(row,'credit');
    });
  }
  function updateRow(row){
    if(!row||!row.cells||row.cells.length<9)return;
    if(row.dataset.rfBillingReady!=='1')hydrateRows();
    renderUsageCell(row,'search');
    renderUsageCell(row,'credit');
  }
  function overrideJSON(row){
    const userId=rowUserId(row);
    const email=clean(row.cells[0]?.querySelector('strong')?.textContent||row.cells[0]?.querySelector('.rf-muted')?.textContent||'');
    const searchUsed=effectiveUsed(row,'search');
    const creditUsed=effectiveUsed(row,'credit');
    return {
      user_id:userId,
      email,
      plan_override:selectedPlan(row),
      billing_status_override:selectedBilling(row),
      search_batches_used_override:searchUsed,
      qualified_leads_used_override:creditUsed,
      search_credit_adjustment:adjustment(row,'search'),
      lead_credit_adjustment:adjustment(row,'credit'),
      monthly_search_limit:limitFor(row,'search'),
      monthly_qualified_lead_credit_limit:limitFor(row,'credit'),
      note:clean(row.querySelector('[data-note]')?.value||''),
      updated_at:new Date().toISOString(),
      source:'rankforge_admin_quality'
    };
  }
  function saveLocal(row){
    const payload=overrideJSON(row);
    if(!payload.user_id){status('User ID missing; cannot save override','error');return;}
    const overrides=parse(localStorage.getItem(OVERRIDE_KEY),{})||{};
    const activities=parse(localStorage.getItem(ACTIVITY_KEY),[])||[];
    overrides[payload.user_id]=payload;
    activities.unshift({timestamp:new Date().toISOString(),user_id:payload.user_id,email:payload.email,summary:`${payload.plan_override} · ${payload.billing_status_override} · searches ${payload.search_batches_used_override}/${payload.monthly_search_limit} · credits ${payload.qualified_leads_used_override}/${payload.monthly_qualified_lead_credit_limit}`,note:payload.note});
    localStorage.setItem(OVERRIDE_KEY,JSON.stringify(overrides));
    localStorage.setItem(ACTIVITY_KEY,JSON.stringify(activities.slice(0,100)));
    status('Override saved locally and copied as JSON','ok');
    copy(JSON.stringify(payload,null,2));
    renderActivity();
  }
  async function copy(text){try{await navigator.clipboard.writeText(text)}catch{}}
  function renderActivity(){
    const box=$('#adminActivity');
    if(!box)return;
    const activities=parse(localStorage.getItem(ACTIVITY_KEY),[])||[];
    if(!activities.length)return;
    box.innerHTML=activities.slice(0,20).map(a=>`<article><strong>${esc(a.email||a.user_id)}</strong><p class="rf-muted">${esc(a.note||'Admin override')}</p><span class="rf-mono">${esc(a.summary||'')}</span><div class="rf-muted">${esc(new Date(a.timestamp).toLocaleString())}</div></article>`).join('');
  }
  document.addEventListener('change',e=>{
    const input=e.target.closest('#billingTable select,#billingTable input');
    if(!input)return;
    const row=input.closest('tr');
    updateRow(row);
  });
  document.addEventListener('input',e=>{
    const input=e.target.closest('#billingTable [data-search-adjust],#billingTable [data-lead-adjust]');
    if(!input)return;
    updateRow(input.closest('tr'));
  });
  document.addEventListener('click',e=>{
    const copyBtn=e.target.closest('#billingTable [data-copy-override]');
    if(copyBtn){e.preventDefault();const row=copyBtn.closest('tr');updateRow(row);copy(JSON.stringify(overrideJSON(row),null,2));status('Override JSON copied','ok');return;}
    const saveBtn=e.target.closest('#billingTable [data-save-override]');
    if(saveBtn){e.preventDefault();const row=saveBtn.closest('tr');updateRow(row);saveLocal(row);}
  });
  const observer=new MutationObserver(()=>{clearTimeout(window.__rfSafeBillingTimer);window.__rfSafeBillingTimer=setTimeout(hydrateRows,80)});
  function init(){observer.observe(document.body,{childList:true,subtree:true});hydrateRows();renderActivity();}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
