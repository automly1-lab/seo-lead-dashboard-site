(()=>{
  const OVERRIDE_KEY='rankforge-admin-overrides-v1';
  const ACTIVITY_KEY='rankforge-admin-activity-v1';
  const STATE_KEY='rankforge-clean-app-state-v1';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const clean=v=>String(v==null?'':v).trim();
  const parse=(r,f)=>{try{return r?JSON.parse(r):f}catch{return f}};
  const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v));
  const userName=email=>emailOk(email)?clean(email).split('@')[0]:'';
  const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function readEmailMap(){
    const state=parse(localStorage.getItem(STATE_KEY),{})||{};
    const buckets=[state.users,state.localUsers,state.remoteUsers,state.remoteCache&&state.remoteCache.users,state.profile,state.profiles].filter(Boolean);
    const map={};
    buckets.flat().forEach(row=>{
      if(!row||typeof row!=='object')return;
      const id=clean(row.user_id||row.owner_user_id||row.userId||row.id||row.uid);
      const email=clean(row.email||row.user_email||row.owner_email||row.account_email||row.billing_email);
      const name=clean(row.username||row.user_name||row.display_name||row.full_name||row.name)||userName(email);
      if(id&&!map[id])map[id]={email:'',name:''};
      if(id&&emailOk(email))map[id].email=email;
      if(id&&name)map[id].name=name;
    });
    return map;
  }

  function idFromCell(cell){return clean(cell?.querySelector('.rf-mono')?.textContent||cell?.querySelector('.rf-user-id')?.textContent||'')}
  function fixUserCells(){
    const map=readEmailMap();
    $$('#usersTable tbody tr').forEach(row=>{
      if(!row.cells||row.cells.length<2)return;
      const id=idFromCell(row.cells[0]); if(!id)return;
      const existing=clean(row.cells[1].textContent);
      const email=map[id]?.email||emailOk(existing)&&existing||'No email recorded';
      const name=map[id]?.name||userName(email)||id.slice(0,16)||'Unknown user';
      row.cells[0].innerHTML=`<strong>${esc(name)}</strong><span class="rf-muted">${esc(email)}</span><span class="rf-mono rf-user-id">${esc(id)}</span>${emailOk(email)?'':'<span class="rf-badge rf-badge-warning">Identity missing</span>'}`;
      row.cells[1].textContent=email;
    });
    $$('#billingTable tbody tr').forEach(row=>{
      if(!row.cells||!row.cells[0])return;
      const id=idFromCell(row.cells[0]); if(!id)return;
      const email=map[id]?.email||clean(row.cells[0].querySelector('.rf-muted')?.textContent)||'No email recorded';
      const name=map[id]?.name||userName(email)||id.slice(0,16)||'Unknown user';
      row.cells[0].innerHTML=`<strong>${esc(name)}</strong><span class="rf-muted">${esc(email)}</span><span class="rf-mono rf-user-id">${esc(id)}</span>${emailOk(email)?'':'<span class="rf-badge rf-badge-warning">Identity missing</span>'}`;
    });
  }

  function usage(cell){const m=clean(cell?.textContent).match(/(-?\d+)\s*\/\s*(-?\d+|∞|custom)/i);return{used:m?Number(m[1])||0:0,limit:m?m[2]:'0'}}
  function firstInput(row,word){return Array.from(row.querySelectorAll('input')).find(i=>new RegExp(word,'i').test(i.placeholder))}
  function save(row,id){
    const sels=$$('select',row), inputs=$$('input',row);
    const plan=row.querySelector('[data-plan]')?.value||sels[0]?.value||'';
    const billing=row.querySelector('[data-billing]')?.value||sels[1]?.value||'';
    const searchAdj=clean(row.querySelector('[data-search-adjust]')?.value||firstInput(row,'Search')?.value);
    const leadAdj=clean(row.querySelector('[data-lead-adjust]')?.value||firstInput(row,'Lead')?.value);
    const note=clean(row.querySelector('[data-note]')?.value||inputs.find(i=>/note|reason/i.test(i.placeholder))?.value);
    const username=clean(row.cells[0].querySelector('strong')?.textContent);
    const email=clean(row.cells[0].querySelector('.rf-muted')?.textContent);
    const payload={user_id:id,username,email,plan_override:plan,billing_status_override:billing,search_credit_adjustment:searchAdj,lead_credit_adjustment:leadAdj,note,updated_at:new Date().toISOString(),source:'rankforge_admin_quality'};
    const overrides=parse(localStorage.getItem(OVERRIDE_KEY),{})||{};
    const acts=parse(localStorage.getItem(ACTIVITY_KEY),[])||[];
    overrides[id]=payload;
    acts.unshift({timestamp:new Date().toISOString(),user_id:id,user_display:`${username} · ${email}`,reason:note||'Manual override saved',summary:`Plan ${plan||'unchanged'} · Billing ${billing||'unchanged'} · Search ${searchAdj||0} · Lead ${leadAdj||0}`});
    localStorage.setItem(OVERRIDE_KEY,JSON.stringify(overrides));
    localStorage.setItem(ACTIVITY_KEY,JSON.stringify(acts.slice(0,100)));
    applyUsage(row,searchAdj,leadAdj);
    renderActivity(acts);
    const st=$('#rfAdminStatus'); if(st){st.textContent='Override saved locally. Apply through the configured admin workflow or Sheets update flow.';st.className='rf-pill rf-badge-ok'}
  }
  function applyUsage(row,sa,la){
    const s=usage(row.cells[3]), l=usage(row.cells[4]);
    const sn=Math.max(0,s.used+(Number(sa)||0)), ln=Math.max(0,l.used+(Number(la)||0));
    const sr=/^\d+$/.test(String(s.limit))?Math.max(0,Number(s.limit)-sn):s.limit;
    const lr=/^\d+$/.test(String(l.limit))?Math.max(0,Number(l.limit)-ln):l.limit;
    row.cells[3].innerHTML=`${sn} / ${esc(s.limit)}<br><span class="rf-muted">${esc(sr)} remaining</span><br><span class="rf-badge rf-badge-ok">Saved ${Number(sa)||0}</span>`;
    row.cells[4].innerHTML=`${ln} / ${esc(l.limit)}<br><span class="rf-muted">${esc(lr)} remaining</span><br><span class="rf-badge rf-badge-ok">Saved ${Number(la)||0}</span>`;
  }
  function renderActivity(acts=parse(localStorage.getItem(ACTIVITY_KEY),[])||[]){
    const box=$('#adminActivity'); if(!box||!acts.length)return;
    box.innerHTML=acts.slice(0,20).map(a=>`<article><strong>${esc(a.user_display||a.user_id)}</strong><p class="rf-muted">${esc(a.reason||'Override saved')}</p><span class="rf-mono">${esc(a.summary||'')}</span><div class="rf-muted">${esc(new Date(a.timestamp).toLocaleString())}</div></article>`).join('');
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-polish-save],[data-save-override]'); if(!btn)return;
    e.preventDefault(); e.stopPropagation();
    const row=btn.closest('tr'); const id=btn.dataset.polishSave||btn.dataset.saveOverride||idFromCell(row?.cells?.[0]);
    if(row&&id)save(row,id);
  },true);
  function init(){fixUserCells();renderActivity();setInterval(fixUserCells,1500)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();