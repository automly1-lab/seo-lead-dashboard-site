(function(){
  if (typeof state === 'undefined') return;

  function loadScriptOnce(src, marker, callback){
    if(document.querySelector('script[data-'+marker+'="true"]')){ if(callback) callback(); return; }
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    script.setAttribute('data-'+marker,'true');
    script.onload=function(){ if(callback) callback(); };
    document.body.appendChild(script);
  }

  function loadSupabaseBridge(){
    document.body.dataset.auth='protected';
    loadScriptOnce('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','rf-supabase-cdn',function(){
      loadScriptOnce('../assets/supabase-config.js?v=supabase-auth-2','rf-supabase-config',function(){
        loadScriptOnce('../assets/auth.js?v=supabase-dashboard-1','rf-auth-js',function(){
          loadScriptOnce('./v6-supabase-bridge.js?v=supabase-dashboard-1','rf-dashboard-bridge');
        });
      });
    });
  }

  function clearStaticDummyText(){
    document.querySelectorAll('.account strong').forEach(node=>{ if(node.textContent.includes('Crestline Ops')) node.textContent='Workspace'; });
    document.querySelectorAll('.account small').forEach(node=>{ if(node.textContent.includes('automly1@gmail.com')) node.textContent='Checking session'; });
    document.querySelectorAll('.settings-card input').forEach(input=>{ if(['Crestline Ops','crestline-ops','automly1@gmail.com'].includes(input.value)) input.value=''; });
    document.querySelectorAll('.settings-stats strong').forEach(node=>{ node.textContent='0'; });
  }

  function addStyles(){
    if (document.getElementById('rf-search-batches-v5-style')) return;
    const style = document.createElement('style');
    style.id = 'rf-search-batches-v5-style';
    style.textContent = `
      .empty-cell{padding:36px!important;text-align:center!important;color:var(--muted);white-space:normal!important}.empty-card{grid-column:1/-1;color:var(--muted)}
      .search-batches-layout{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:20px;align-items:start}.search-batch-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
      .search-batch-card{padding:22px;background:rgba(10,25,44,.78);border:1px solid rgba(148,163,184,.14);border-radius:16px;box-shadow:0 18px 70px rgba(0,0,0,.2);cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease}.search-batch-card:hover{transform:translateY(-1px);border-color:rgba(37,99,235,.42);background:rgba(12,31,58,.86)}.search-batch-card.selected{border-color:rgba(37,99,235,.72);box-shadow:0 18px 70px rgba(37,99,235,.15)}
      .search-batch-card h3{margin:8px 0 6px;font-size:20px;letter-spacing:-.02em}.search-batch-card p{margin:0;color:var(--muted);line-height:1.5}.search-batch-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .batch-status{display:inline-flex;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:800;background:rgba(37,99,235,.14);color:#a9c3ff;white-space:nowrap}.batch-status.completed{background:rgba(5,150,105,.14);color:#5ee0b4}.batch-status.running{background:rgba(245,158,11,.14);color:#ffd166}.batch-status.review{background:rgba(20,184,166,.14);color:#7ee7d7}
      .batch-mini-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.batch-mini-metrics div{background:rgba(255,255,255,.035);border:1px solid rgba(148,163,184,.1);border-radius:12px;padding:12px}.batch-mini-metrics small{display:block;color:var(--muted);font-size:11px}.batch-mini-metrics strong{font-size:22px}
      .search-batch-detail{padding:0;overflow:hidden;position:sticky;top:104px}.search-batch-detail-head{padding:22px;border-bottom:1px solid rgba(148,163,184,.12)}.search-batch-detail-head h2{margin:8px 0 6px;font-size:26px;letter-spacing:-.03em}.search-batch-detail-head p{margin:0;color:var(--muted);line-height:1.5}.search-batch-detail-body{padding:22px;display:grid;gap:16px}
      .batch-stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.batch-stat-grid article{background:rgba(255,255,255,.035);border:1px solid rgba(148,163,184,.1);border-radius:14px;padding:14px}.batch-stat-grid small{display:block;color:var(--muted);font-size:12px}.batch-stat-grid strong{font-size:26px;display:block;margin-top:6px}
      .batch-field{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid rgba(148,163,184,.1);padding:12px 0}.batch-field span{color:var(--muted)}.batch-field strong{text-align:right;max-width:58%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.batch-terms{background:rgba(255,255,255,.035);border:1px solid rgba(148,163,184,.1);border-radius:14px;padding:14px}.batch-terms small{display:block;color:var(--muted);margin-bottom:8px}.batch-terms p{margin:0;color:#dbeafe;line-height:1.55}
      .batch-detail-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.batch-detail-actions button{height:44px;border-radius:10px;border:1px solid rgba(148,163,184,.25);background:rgba(255,255,255,.04);color:white;font-weight:800}.batch-detail-actions .primary{border:0}
      @media(max-width:1200px){.search-batches-layout{grid-template-columns:1fr}.search-batch-detail{position:static}.search-batch-list{grid-template-columns:1fr 1fr}}@media(max-width:760px){.search-batch-list,.batch-stat-grid{grid-template-columns:1fr}.batch-detail-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function title(batch){return batch.name || batch.search_name || `${batch.niche || 'Search'} in ${batch.city || 'Unknown city'}`;}
  function cleanStatus(batch){return String(batch.status || 'Running').trim() || 'Running';}
  function statusClass(batch){const s=cleanStatus(batch).toLowerCase(); if(s.includes('complete')) return 'completed'; if(s.includes('run')||s.includes('queue')) return 'running'; if(s.includes('review')) return 'review'; return '';}
  function stats(batch){const raw=Number(batch.raw??batch.discovered??batch.total??0)||0;const audited=Number(batch.audited??0)||0;const qualified=Number(batch.qualified??0)||0;const rejected=Number(batch.rejected??Math.max(0,raw&&audited?audited-qualified:0))||0;const review=Number(batch.review??batch.needsReview??Math.max(0,audited-qualified-rejected))||0;const contacts=Number(batch.enriched??batch.contacts??0)||0;return{raw,audited,qualified,rejected,review,contacts};}
  function selectedIndex(){if(!state.searches||!state.searches.length)return-1;const stored=Number(state.selectedBatchIndex||0);if(Number.isFinite(stored)&&stored>=0&&stored<state.searches.length)return stored;state.selectedBatchIndex=0;return 0;}

  function renderDetail(){
    const detail=document.getElementById('searchBatchDetail'); if(!detail) return;
    const batch=state.searches[selectedIndex()];
    if(!batch){detail.innerHTML=`<div class="search-batch-detail-head"><span class="batch-status">Empty</span><h2>No search selected</h2><p>Create a new search batch to see details here.</p></div>`;return;}
    const s=stats(batch);
    detail.innerHTML=`<div class="search-batch-detail-head"><span class="batch-status ${statusClass(batch)}">${cleanStatus(batch)}</span><h2>${title(batch)}</h2><p>${batch.niche||'No niche'} • ${batch.city||'No city'} • ${batch.country||'No country'}</p></div><div class="search-batch-detail-body"><div class="batch-stat-grid"><article><small>Raw leads</small><strong>${s.raw}</strong></article><article><small>Audited</small><strong>${s.audited}</strong></article><article><small>Qualified</small><strong class="good">${s.qualified}</strong></article><article><small>Needs Review</small><strong class="warn">${s.review}</strong></article><article><small>Rejected</small><strong class="bad">${s.rejected}</strong></article><article><small>Contacts found</small><strong>${s.contacts}</strong></article></div><div><div class="batch-field"><span>Primary keyword</span><strong>${batch.keyword||batch.primary_keyword||batch.niche||'Not set'}</strong></div><div class="batch-field"><span>Search depth</span><strong>${batch.depth||batch.search_depth||batch.limit||'Not set'}</strong></div><div class="batch-field"><span>Strictness</span><strong>${batch.mode||batch.qualification_mode||'Strict evidence'}</strong></div><div class="batch-field"><span>Business type</span><strong>${batch.businessType||batch.business_type||'local service business'}</strong></div><div class="batch-field"><span>SEO threshold</span><strong>${batch.seoThreshold||batch.minSeoScore||'60'}</strong></div><div class="batch-field"><span>Lead threshold</span><strong>${batch.leadThreshold||batch.minLeadScore||'70'}</strong></div><div class="batch-field"><span>Created</span><strong>${batch.created||batch.lastRun||'No date'}</strong></div></div><div class="batch-terms"><small>Include terms</small><p>${batch.include||batch.include_terms||'No include terms set'}</p></div><div class="batch-terms"><small>Exclude terms</small><p>${batch.exclude||batch.exclude_terms||'No exclude terms set'}</p></div><div class="batch-detail-actions"><button class="primary" id="batchOpenProspects">Open Prospects</button><button id="batchRerunSearch">Rerun Search</button></div></div>`;
  }

  function renderSearchBatchExplorer(){
    addStyles(); clearStaticDummyText();
    const container=document.getElementById('batchCards'); if(!container) return;
    if(!Array.isArray(state.searches)) state.searches=[];
    const current=selectedIndex(); container.className='search-batches-layout';
    if(!state.searches.length){container.innerHTML=`<div class="search-batch-list"><article class="search-batch-card selected"><div class="search-batch-top"><small>No batches yet</small><span class="batch-status">Empty</span></div><h3>Create your first search</h3><p>Search batches you send to n8n will appear here.</p><div class="batch-mini-metrics"><div><small>Raw</small><strong>0</strong></div><div><small>Audited</small><strong>0</strong></div><div><small>Qualified</small><strong>0</strong></div></div></article></div><aside class="panel search-batch-detail" id="searchBatchDetail"></aside>`; renderDetail(); return;}
    container.innerHTML=`<div class="search-batch-list">${state.searches.map(function(batch,index){const s=stats(batch);return`<article class="search-batch-card ${index===current?'selected':''}" data-batch-index="${index}"><div class="search-batch-top"><small>${batch.created||batch.lastRun||'No date'}</small><span class="batch-status ${statusClass(batch)}">${cleanStatus(batch)}</span></div><h3>${title(batch)}</h3><p>${batch.niche||'No niche'} in ${batch.city||'No city'}, ${batch.country||'No country'}</p><div class="batch-mini-metrics"><div><small>Raw</small><strong>${s.raw}</strong></div><div><small>Audited</small><strong>${s.audited}</strong></div><div><small>Qualified</small><strong>${s.qualified}</strong></div></div></article>`;}).join('')}</div><aside class="panel search-batch-detail" id="searchBatchDetail"></aside>`;
    renderDetail();
  }

  const previousRender=window.render;
  if(typeof previousRender==='function'&&!window.__rfSearchBatchRenderPatched){window.__rfSearchBatchRenderPatched=true;window.render=function(){previousRender();setTimeout(renderSearchBatchExplorer,0);};}
  window.searches=renderSearchBatchExplorer;

  document.body.addEventListener('click',function(event){
    const card=event.target.closest&&event.target.closest('[data-batch-index]');
    if(card){event.preventDefault();state.selectedBatchIndex=Number(card.dataset.batchIndex||0);renderSearchBatchExplorer();return;}
    if(event.target.id==='batchOpenProspects'){event.preventDefault();document.querySelector('[data-view="prospects"]')?.click();return;}
    if(event.target.id==='batchRerunSearch'){
      event.preventDefault();const batch=state.searches[selectedIndex()];const modal=document.getElementById('modal');
      if(batch&&modal){modal.classList.add('open');const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value||'';};set('searchNameInput',title(batch));set('nicheInput',batch.niche||'');set('cityInput',batch.city||'');set('countryInput',batch.country||'');set('keywordSeedInput',batch.keyword||batch.primary_keyword||batch.niche||'');set('includeTermsInput',batch.include||batch.include_terms||'');set('excludeTermsInput',batch.exclude||batch.exclude_terms||'');set('qualificationModeInput',batch.mode||batch.qualification_mode||'Strict evidence');const depth=document.getElementById('searchDepthInput');if(depth)depth.value=String(batch.depth||batch.search_depth||'25').replace(/[^0-9]/g,'')||'25';}
    }
  },true);
  document.body.addEventListener('click',function(event){const nav=event.target.closest&&event.target.closest('[data-view="searches"]');if(nav)setTimeout(renderSearchBatchExplorer,40);});

  loadSupabaseBridge();
  setTimeout(()=>{clearStaticDummyText();renderSearchBatchExplorer();},0);
})();