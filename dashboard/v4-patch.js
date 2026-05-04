(function(){
  if (typeof state === 'undefined') return;

  const DEFAULT_WEBHOOK_URL = 'https://lastaccount1907.app.n8n.cloud/webhook/rankforge-create-search';
  const WEBHOOK_STORAGE_KEY = 'rankforge-search-submit-webhook-v1';

  const PRESETS = {
    phoenix:{name:'Phoenix Plumbers',niche:'plumber',city:'Phoenix',country:'United States',keyword:'emergency plumber',include:'drain cleaning, water heater, sewer repair',exclude:'yelp, angi, homeadvisor, directory'},
    austin:{name:'Austin Dentists',niche:'dentist',city:'Austin',country:'United States',keyword:'family dentist',include:'cosmetic dentistry, dental implants, emergency dentist',exclude:'zocdoc, healthgrades, directory'},
    miami:{name:'Miami Roofers',niche:'roofer',city:'Miami',country:'United States',keyword:'roof repair',include:'storm damage, metal roofing, roof replacement',exclude:'yelp, angi, homeadvisor, directory'},
    denver:{name:'Denver HVAC Companies',niche:'hvac contractor',city:'Denver',country:'United States',keyword:'ac repair',include:'furnace repair, air conditioning, heat pump',exclude:'yelp, angi, homeadvisor, directory'},
    chicago:{name:'Chicago Personal Injury Lawyers',niche:'personal injury lawyer',city:'Chicago',country:'United States',keyword:'car accident lawyer',include:'injury attorney, accident lawyer, workers comp',exclude:'avvo, justia, findlaw, directory'},
    london:{name:'London Estate Agents',niche:'estate agent',city:'London',country:'United Kingdom',keyword:'estate agent',include:'lettings, property management, valuation',exclude:'rightmove, zoopla, directory'}
  };

  const val = (id) => (document.getElementById(id)?.value || '').trim();
  const setVal = (id, value) => { const el = document.getElementById(id); if (el) { el.value = value || ''; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } };

  function getLead(){ return state.leads.find(l => l.id === state.selected) || state.leads[0]; }

  function planKey(value){
    const raw = String(value || '').toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');
    if (raw === 'pro' || raw === 'founding' || raw === 'founding_plan') return 'growth';
    if (raw === 'start' || raw === 'basic' || raw === 'starter_plan') return 'starter';
    if (raw === 'agency' || raw === 'enterprise') return 'agency_intelligence';
    if (raw.includes('admin')) return 'admin_unlimited';
    return raw || 'free';
  }
  function cachedPlan(){
    try { return JSON.parse(localStorage.getItem('rankforge-user-plan-v1') || 'null'); } catch(error) { return null; }
  }
  function readEffectivePlan(){
    const cached = cachedPlan() || {};
    const key = planKey(cached.key || cached.name || state.plan?.key || state.plan?.name || localStorage.getItem('rankforge-selected-plan-v1'));
    const defaults = {
      free:{batchesLimit:1,creditsLimit:10,maxLeadsPerBatch:10},
      starter:{batchesLimit:50,creditsLimit:50,maxLeadsPerBatch:25},
      growth:{batchesLimit:150,creditsLimit:250,maxLeadsPerBatch:50},
      agency_intelligence:{batchesLimit:9999,creditsLimit:999999,maxLeadsPerBatch:50},
      admin_unlimited:{batchesLimit:999999,creditsLimit:999999,maxLeadsPerBatch:50,unlimited:true}
    }[key] || {batchesLimit:1,creditsLimit:10,maxLeadsPerBatch:10};
    const plan = Object.assign({}, defaults, state.plan || {}, cached || {});
    plan.key = key;
    plan.name = cached.name || state.plan?.name || key;
    plan.batchesLimit = Number(plan.batchesLimit || plan.searchLimit || defaults.batchesLimit || 0);
    plan.batchesUsed = Number(plan.batchesUsed || 0);
    plan.creditsLimit = Number(plan.creditsLimit || defaults.creditsLimit || 0);
    plan.creditsUsed = Number(plan.creditsUsed || 0);
    plan.unlimited = Boolean(plan.unlimited || key === 'admin_unlimited');
    state.plan = Object.assign({}, state.plan || {}, plan);
    window.state = state;
    return plan;
  }

  function getWebhookUrl(){
    const stored = (localStorage.getItem(WEBHOOK_STORAGE_KEY) || '').trim();
    if (stored) return stored;
    localStorage.setItem(WEBHOOK_STORAGE_KEY, DEFAULT_WEBHOOK_URL);
    return DEFAULT_WEBHOOK_URL;
  }

  function getCurrentUser(){
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === 'function') {
      const session = window.rankforgeAuth.getSession();
      if (session && (session.userId || session.email)) return session;
    }
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index) || '';
        if (!/^sb-.+-auth-token$/.test(key)) continue;
        const parsed = JSON.parse(localStorage.getItem(key) || '{}');
        const user = parsed?.user || parsed?.currentSession?.user || parsed?.session?.user;
        if (user?.id) return { userId: user.id, email: user.email || '' };
      }
    } catch {}
    return { userId: '', email: state.user?.email || '' };
  }

  function ensureStatusNode(){
    let node = document.getElementById('createSearchStatus');
    const summary = document.getElementById('createSummary');
    if (!node && summary) {
      node = document.createElement('div');
      node.id = 'createSearchStatus';
      node.className = 'create-status';
      summary.insertAdjacentElement('afterend', node);
    }
    return node;
  }

  function setStatus(message, tone){
    const node = ensureStatusNode();
    if (!node) return;
    node.textContent = message;
    node.classList.remove('is-success','is-error','is-loading');
    if (tone) node.classList.add('is-' + tone);
  }

  function buildSearchPayload(){
    const session = getCurrentUser();
    const plan = readEffectivePlan();
    const searchId = 'srch_' + Date.now();
    const depth = val('searchDepthInput') || String(plan.maxLeadsPerBatch || 25);
    return {
      search_id: searchId,
      user_id: session.userId || '',
      user_email: session.email || state.user?.email || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active',
      search_name: val('searchNameInput'),
      niche: val('nicheInput'),
      business_type: val('businessTypeInput') || 'local service business',
      city: val('cityInput'),
      country: val('countryInput'),
      primary_keyword: val('keywordSeedInput') || val('nicheInput'),
      secondary_keywords: val('includeTermsInput'),
      include_terms: val('includeTermsInput'),
      exclude_terms: val('excludeTermsInput'),
      search_depth: depth,
      discovery_query_limit: '1',
      discovery_page_limit: '1',
      max_results_requested: depth.replace(/[^0-9]/g, '') || String(plan.maxLeadsPerBatch || 25),
      qualification_mode: val('qualificationModeInput') || 'Strict evidence',
      min_audit_score: val('seoThresholdInput') || '60',
      min_lead_score: val('leadThresholdInput') || '70',
      started_at: '', completed_at: '', failed_at: '', failure_reason: ''
    };
  }

  async function sendSearchToWebhook(payload){
    const body = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => body.set(key, value == null ? '' : String(value)));
    await fetch(getWebhookUrl(), { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: body.toString() });
  }

  function addLocalRunningBatch(payload){
    state.searches.unshift({ id: payload.search_id, name: payload.search_name, niche: payload.niche, city: payload.city, country: payload.country, keyword: payload.primary_keyword, include: payload.include_terms, exclude: payload.exclude_terms, depth: payload.max_results_requested, mode: payload.qualification_mode, businessType: payload.business_type, seoThreshold: payload.min_audit_score, leadThreshold: payload.min_lead_score, status: 'Running', raw: 0, audited: 0, qualified: 0, created: 'now' });
    state.plan.batchesUsed = Number(state.plan.batchesUsed || 0) + 1;
    state.activity.unshift('New search batch sent to n8n: ' + payload.search_name);
  }

  async function createBatchV4(){
    const plan = readEffectivePlan();
    if (!plan.unlimited && plan.batchesLimit > 0 && plan.batchesUsed >= plan.batchesLimit) {
      setStatus('Your search batch allowance is used up for this plan.', 'error');
      return;
    }
    if (!plan.unlimited && plan.creditsLimit > 0 && plan.creditsUsed >= plan.creditsLimit) {
      setStatus('Your qualified lead credits are used up for this plan.', 'error');
      return;
    }

    const payload = buildSearchPayload();
    if (!payload.search_name || !payload.niche || !payload.city || !payload.country || !payload.primary_keyword) {
      setStatus('Please fill Market name, Niche, City, Country, and Primary keyword.', 'error');
      return;
    }

    setStatus('Sending search to n8n...', 'loading');
    const submitButton = document.getElementById('createBatch');
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Sending to n8n...'; }

    try {
      await sendSearchToWebhook(payload);
      addLocalRunningBatch(payload);
      setStatus('Search sent to n8n. Batch added as Running.', 'success');
      if (typeof render === 'function') render();
      setTimeout(function(){ const modal = document.getElementById('modal'); if (modal) modal.classList.remove('open'); openView('searches'); }, 350);
    } catch (error) {
      console.error('RankForge webhook error', error);
      setStatus('Webhook send failed. Check the n8n URL or network settings.', 'error');
    } finally {
      if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Start Search Batch'; }
    }
  }

  function fillPreset(key){
    const p = PRESETS[key]; if (!p) return;
    setVal('searchNameInput', p.name); setVal('nicheInput', p.niche); setVal('cityInput', p.city); setVal('countryInput', p.country); setVal('keywordSeedInput', p.keyword); setVal('includeTermsInput', p.include); setVal('excludeTermsInput', p.exclude);
    const depth = document.getElementById('searchDepthInput'); if (depth && !depth.value) depth.value = '25';
    const summary = document.getElementById('createSummary');
    if (summary) summary.innerHTML = `<strong>${p.name}</strong><span>${p.keyword} in ${p.city}, ${p.country} • ${(document.getElementById('qualificationModeInput')?.value || 'Strict evidence')}</span>`;
    setStatus('Preset loaded. Review the search and start the batch.', 'success');
  }

  state.leads.forEach(function(l){ if (!l.verifiedSignals) l.verifiedSignals = [['Title tag issue','Detected'],['Meta description issue','Detected'],['H1 / heading opportunity','Detected'],['Service page depth','Partial'],['Location page quality','Weak'],['LocalBusiness schema','Missing'],['Content depth','Needs work']]; });

  window.leadDetailPage = function(){
    const root = document.getElementById('leadDetailPage'); if (!root) return;
    const l = getLead();
    if (!l) { root.innerHTML = '<div class="panel detail-section"><h3>No lead selected</h3><p>Create or select a lead to see details.</p></div>'; return; }
    root.innerHTML = `<div class="lead-detail-layout"><main><section class="lead-hero"><div class="lead-hero-top"><div><span class="pill">${l.source}</span><h2>${l.business}</h2><p>${l.domain} • ${l.location}</p></div>${badge(l.status)}</div><div class="lead-score-grid"><article><small>SEO Score</small><strong>${l.seo}</strong></article><article><small>Commercial Fit</small><strong>${l.commercial}</strong></article><article><small>Contact Confidence</small><strong>${l.contact}%</strong></article><article><small>Evidence</small><strong>${l.evidence}</strong></article></div></section></main></div>`;
  };

  function openView(view){ const btn = document.querySelector(`[data-view="${view}"]`); if (btn) btn.click(); }
  function bindV4Controls(){
    document.querySelectorAll('[data-preset]').forEach(function(button){ button.onclick = function(event){ event.preventDefault(); event.stopPropagation(); fillPreset(button.dataset.preset); }; });
    const submit = document.getElementById('createBatch'); if (submit) submit.onclick = function(event){ event.preventDefault(); event.stopPropagation(); createBatchV4(); };
  }
  document.body.addEventListener('click', function(e){
    const preset = e.target.closest && e.target.closest('[data-preset]'); if (preset) { e.preventDefault(); e.stopPropagation(); fillPreset(preset.dataset.preset); return; }
    if (e.target.id === 'createBatch') { e.preventDefault(); e.stopPropagation(); createBatchV4(); return; }
    if (e.target.id === 'openLeadDetailBtn') { e.preventDefault(); e.stopPropagation(); openView('leadDetail'); window.leadDetailPage(); return; }
    if (e.target.id === 'backToOverviewBtn' || e.target.dataset.backOverview) { e.preventDefault(); e.stopPropagation(); openView('overview'); return; }
    if (e.target.id === 'detailAddExportBtn') { e.preventDefault(); e.stopPropagation(); state.exports.add(state.selected); if (typeof exports === 'function') exports(); if (typeof finals === 'function') finals(); alert('Added to export queue.'); return; }
    if (e.target.dataset.markQualifiedPage) { e.preventDefault(); e.stopPropagation(); const l=getLead(); if(l.status !== 'Qualified'){ l.status='Qualified'; l.stage='New'; state.plan.creditsUsed++; state.activity.unshift('Lead detail page qualification consumed 1 credit: '+l.business); if(typeof render==='function') render(); } return; }
    if (e.target.dataset.rejectPage) { e.preventDefault(); e.stopPropagation(); const l=getLead(); l.status='Rejected'; l.stage='Rejected'; state.activity.unshift('Lead rejected from detail page: '+l.business); if(typeof render==='function') render(); return; }
  }, true);
  document.body.addEventListener('click', function(e){ const row = e.target.closest && e.target.closest('tr[data-id]'); if (row && !e.target.matches('input')) setTimeout(window.leadDetailPage, 0); });
  bindV4Controls(); ensureStatusNode(); window.leadDetailPage();
})();