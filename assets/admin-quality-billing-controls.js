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
    el.className='rf-pill '+(type==='error'?'rf-badge-error':type==='warn'?'rf-badge-warning':'rf-badge-ok');
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
  function rootWebhook(path){
    const stored=clean(localStorage.getItem('rankforge-search-submit-webhook-v1'));
    if(stored&&/\/webhook\//.test(stored))return stored.replace(/\/webhook\/[^/?#]+/,'/webhook/'+path);
    return 'https://lastaccount1907.app.n8n.cloud/webhook/'+path;
  }
  async function postJson(url,payload){
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
    if(!res.ok)throw new Error('HTTP '+res.status);
    return res;
  }
  async function persistRemote(payload){
    const adminPayload={...payload,plan:payload.plan_override,billing_status:payload.billing_status_override,admin_override:true,source:'rankforge_admin_quality_override'};
    try{
      await postJson(rootWebhook('rankforge-admin-user-override'),adminPayload);
      return {ok:true,endpoint:'rankforge-admin-user-override'};
    }catch(firstError){
      await postJson(rootWebhook('rankforge-user-sync'),{
        user_id:payload.user_id,
        email:payload.email,
        plan:payload.plan_override,
        billing_status:payload.billing_status_override,
        monthly_search_limit:payload.monthly_search_limit,
        monthly_qualified_lead_credit_limit:payload.monthly_qualified_lead_credit_limit,
        search_batches_used:payload.search_batches_used_override,
        qualified_leads_used:payload.qualified_leads_used_override,
        admin_override:true,
        override_note:payload.note,
        source:'rankforge_admin_quality_override',
        synced_at:new Date().toISOString()
      });
      return {ok:true,endpoint:'rankforge-user-sync'};
    }
  }
  function renderUsageCell(row,type){
    const idx=type==='search'?3:4;
    if(!row.cells[idx])return;
    const label=type==='search'?'Search batches':'Qualified credits';
    const used=effectiveUsed(row,type);
    const limit=limitFor(row,type);
    const adj=adjustment(row,type);
    const adjLine=adj?`<span class="rf-badge rf-badge-ok">${adj>0?'+':''}${adj} adjustment</span>`:'';
    const html=`<div class="rf-usage-cell"><strong>${esc(used)} / ${esc(formatLimit(limit))}</strong><span>${esc(remaining(used,limit))} remaining</span><small>${esc(label)}</small>${adjLine}</div>`;
    if(row.cells[idx].innerHTML!==html)row.cells[idx].innerHTML=html;
  }
  function buildControls(row){
    if(!row||!row.cells||row.cells.length<9)return;
    if(row.dataset.rfControlsReady==='1')return;
    const userId=rowUserId(row);
    const searchVal=clean(row.querySelector('[data-search-adjust]')?.value||'');
    const leadVal=clean(row.querySelector('[data-lead-adjust]')?.value||'');
    const noteVal=clean(row.querySelector('[data-note]')?.value||'');
    row.cells[6].innerHTML=`<div class="rf-adjust-stack"><label><span>Search +/-</span><input data-search-adjust="${esc(userId)}" type="number" step="1" placeholder="0" value="${esc(searchVal)}"></label><label><span>Credit +/-</span><input data-lead-adjust="${esc(userId)}" type="number" step="1" placeholder="0" value="${esc(leadVal)}"></label><div class="rf-billing-actions rf-billing-actions-inline"><button class="button small primary" type="button" data-save-override="${esc(userId)}">Save Override</button><button class="button small ghost" type="button" data-copy-override="${esc(userId)}">Copy JSON</button></div></div>`;
    row.cells[7].innerHTML=`<textarea data-note="${esc(userId)}" rows="3" placeholder="Reason / note">${esc(noteVal)}</textarea>`;
    row.cells[8].innerHTML=`<div class="rf-muted" style="font-size:12px;line-height:18px">Save writes through admin webhook.</div>`;
    row.dataset.rfControlsReady='1';
  }
  function hydrateRows(){
    $$('#billingTable tbody tr').forEach(row=>{
      if(!row.cells||row.cells.length<9)return;
      if(row.dataset.rfBillingReady!=='1'){
        row.dataset.rfBillingReady='1';
        row.dataset.baseSearchUsed=String(baseUsed(row,'search'));
        row.dataset.baseCreditUsed=String(baseUsed(row,'credit'));
      }
      buildControls(row);
      renderUsageCell(row,'search');
      renderUsageCell(row,'credit');
    });
  }
  function updateRow(row){
    if(!row||!row.cells||row.cells.length<9)return;
    if(row.dataset.rfBillingReady!=='1'){
      row.dataset.rfBillingReady='1';
      row.dataset.baseSearchUsed=String(baseUsed(row,'search'));
      row.dataset.baseCreditUsed=String(baseUsed(row,'credit'));
    }
    buildControls(row);
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
  async function copy(text){try{await navigator.clipboard.writeText(text)}catch{}}
  function renderActivity(){
    const box=$('#adminActivity');
    if(!box)return;
    const activities=parse(localStorage.getItem(ACTIVITY_KEY),[])||[];
    if(!activities.length)return;
    box.innerHTML=activities.slice(0,20).map(a=>`<article><strong>${esc(a.email||a.user_id)}</strong><p class="rf-muted">${esc(a.note||'Admin override')}</p><span class="rf-mono">${esc(a.summary||'')}</span><div class="rf-muted">${esc(new Date(a.timestamp).toLocaleString())}</div></article>`).join('');
  }
  function saveLocalPayload(payload){
    const overrides=parse(localStorage.getItem(OVERRIDE_KEY),{})||{};
    const activities=parse(localStorage.getItem(ACTIVITY_KEY),[])||[];
    overrides[payload.user_id]=payload;
    activities.unshift({timestamp:new Date().toISOString(),user_id:payload.user_id,email:payload.email,summary:`${payload.plan_override} · ${payload.billing_status_override} · searches ${payload.search_batches_used_override}/${payload.monthly_search_limit} · credits ${payload.qualified_leads_used_override}/${payload.monthly_qualified_lead_credit_limit}`,note:payload.note});
    localStorage.setItem(OVERRIDE_KEY,JSON.stringify(overrides));
    localStorage.setItem(ACTIVITY_KEY,JSON.stringify(activities.slice(0,100)));
    renderActivity();
  }
  async function saveOverride(row){
    updateRow(row);
    const payload=overrideJSON(row);
    const btn=row.querySelector('[data-save-override]');
    if(!payload.user_id){status('User ID missing; cannot save override','error');return;}
    if(btn){btn.textContent='Saving…';btn.disabled=true;}
    saveLocalPayload(payload);
    try{
      const remote=await persistRemote(payload);
      await copy(JSON.stringify(payload,null,2));
      if(btn){btn.textContent='Saved to Sheets ✓';setTimeout(()=>{btn.textContent='Save Override';btn.disabled=false},1600)}
      status('Override saved through '+remote.endpoint,'ok');
    }catch(error){
      await copy(JSON.stringify(payload,null,2));
      if(btn){btn.textContent='Local only';setTimeout(()=>{btn.textContent='Save Override';btn.disabled=false},1800)}
      status('Webhook save failed. JSON copied; apply through n8n/Sheets.', 'warn');
      console.warn('RankForge admin override webhook failed',error);
    }
  }
  document.addEventListener('change',e=>{
    const input=e.target.closest('#billingTable select,#billingTable input,#billingTable textarea');
    if(!input)return;
    updateRow(input.closest('tr'));
  });
  document.addEventListener('input',e=>{
    const input=e.target.closest('#billingTable [data-search-adjust],#billingTable [data-lead-adjust]');
    if(!input)return;
    renderUsageCell(input.closest('tr'),input.matches('[data-search-adjust]')?'search':'credit');
  });
  document.addEventListener('click',e=>{
    const saveBtn=e.target.closest('#billingTable [data-save-override]');
    if(saveBtn){e.preventDefault();e.stopPropagation();saveOverride(saveBtn.closest('tr'));return;}
    const copyBtn=e.target.closest('#billingTable [data-copy-override]');
    if(copyBtn){e.preventDefault();e.stopPropagation();const row=copyBtn.closest('tr');updateRow(row);copy(JSON.stringify(overrideJSON(row),null,2));status('Override JSON copied','ok');return;}
  },true);
  const observer=new MutationObserver(mutations=>{
    const shouldHydrate=mutations.some(m=>Array.from(m.addedNodes||[]).some(n=>n.nodeType===1&&(n.matches?.('#billingTable tbody tr')||n.querySelector?.('#billingTable tbody tr'))));
    if(shouldHydrate){clearTimeout(window.__rfSafeBillingTimer);window.__rfSafeBillingTimer=setTimeout(hydrateRows,100)}
  });
  function init(){observer.observe(document.body,{childList:true,subtree:true});hydrateRows();renderActivity();}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
