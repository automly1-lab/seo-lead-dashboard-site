(function(){
  if (typeof state === 'undefined') return;

  const DEFAULT_WEBHOOK_URL = 'https://lastaccount1907.app.n8n.cloud/webhook/rankforge-create-search';
  const DEFAULT_CURRENT_STATE_ENDPOINT = 'https://lastaccount1907.app.n8n.cloud/webhook/rankforge-current-state';
  const WEBHOOK_STORAGE_KEY = 'rankforge-search-submit-webhook-v1';
  const CURRENT_STATE_ENDPOINT_KEY = 'rankforge-current-state-endpoint-v1';

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
  function clean(value){ return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback){ const n = Number(clean(value).replace(/[^0-9.-]/g,'')); return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback; }

  function planKey(value){
    const raw = clean(value).toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');
    if (raw === 'pro' || raw === 'founding' || raw === 'founding_plan') return 'growth';
    if (raw === 'start' || raw === 'basic' || raw === 'starter_plan') return 'starter';
    if (raw === 'agency' || raw === 'enterprise') return 'agency_intelligence';
    if (raw.includes('admin')) return 'admin_unlimited';
    return raw || 'free';
  }
  function planLabel(key){
    return { free:'Free', starter:'Starter', growth:'Growth', agency_intelligence:'Agency Intelligence', admin_unlimited:'Admin' }[planKey(key)] || clean(key) || 'Free';
  }
  function planDefaults(key){
    return {
      free:{batchesLimit:1,creditsLimit:10,maxLeadsPerBatch:10,csvExport:false},
      starter:{batchesLimit:50,creditsLimit:50,maxLeadsPerBatch:25,csvExport:true},
      growth:{batchesLimit:150,creditsLimit:250,maxLeadsPerBatch:50,csvExport:true},
      agency_intelligence:{batchesLimit:9999,creditsLimit:999999,maxLeadsPerBatch:50,csvExport:true},
      admin_unlimited:{batchesLimit:999999,creditsLimit:999999,maxLeadsPerBatch:50,csvExport:true,unlimited:true}
    }[planKey(key)] || {batchesLimit:1,creditsLimit:10,maxLeadsPerBatch:10,csvExport:false};
  }
  function cachedPlan(){
    try { return JSON.parse(localStorage.getItem('rankforge-user-plan-v1') || 'null'); } catch(error) { return null; }
  }
  function normalizePlan(input){
    const key = planKey(input?.key || input?.plan || input?.name || state.plan?.key || state.plan?.name || localStorage.getItem('rankforge-selected-plan-v1'));
    const defaults = planDefaults(key);
    const plan = Object.assign({}, defaults, state.plan || {}, input || {});
    plan.key = key;
    plan.name = planLabel(key);
    plan.billingStatus = clean(input?.billing_status || input?.billingStatus || input?.subscription_status || plan.billingStatus || (key === 'free' ? 'free' : 'active'));
    plan.batchesLimit = toNumber(input?.effective_search_limit || input?.search_batches_limit || input?.search_batch_limit || input?.batchesLimit || plan.batchesLimit, defaults.batchesLimit);
    plan.batchesUsed = toNumber(input?.search_batches_used || input?.batchesUsed || plan.batchesUsed, 0);
    plan.creditsLimit = toNumber(input?.effective_qualified_lead_limit || input?.qualified_lead_credits_limit || input?.qualified_leads_limit || input?.creditsLimit || plan.creditsLimit, defaults.creditsLimit);
    plan.creditsUsed = toNumber(input?.qualified_lead_credits_used || input?.qualified_leads_used || input?.creditsUsed || plan.creditsUsed, 0);
    plan.maxLeadsPerBatch = toNumber(input?.max_leads_per_batch || input?.maxLeadsPerBatch || plan.maxLeadsPerBatch, defaults.maxLeadsPerBatch);
    plan.csvExport = Boolean(input?.csvExport || /^(true|yes|1|enabled)$/i.test(clean(input?.csv_export)) || defaults.csvExport);
    plan.unlimited = Boolean(input?.unlimited || /^(true|yes|1)$/i.test(clean(input?.admin_unlimited)) || key === 'admin_unlimited');
    return plan;
  }
  function saveEffectivePlan(plan){
    state.plan = Object.assign({}, state.plan || {}, plan);
    window.state = state;
    localStorage.setItem('rankforge-user-plan-v1', JSON.stringify(plan));
    localStorage.setItem('rankforge-selected-plan-v1', plan.key);
    localStorage.setItem('rankforge-billing-status-v1', plan.billingStatus || '');
  }
  function readEffectivePlan(){
    const cached = cachedPlan();
    const plan = normalizePlan(cached || state.plan || {});
    saveEffectivePlan(plan);
    return plan;
  }

  function getWebhookUrl(){
    const stored = clean(localStorage.getItem(WEBHOOK_STORAGE_KEY));
    if (stored) return stored;
    localStorage.setItem(WEBHOOK_STORAGE_KEY, DEFAULT_WEBHOOK_URL);
    return DEFAULT_WEBHOOK_URL;
  }
  function getCurrentStateEndpoint(){
    const stored = clean(localStorage.getItem(CURRENT_STATE_ENDPOINT_KEY));
    if (stored) return stored;
    localStorage.setItem(CURRENT_STATE_ENDPOINT_KEY, DEFAULT_CURRENT_STATE_ENDPOINT);
    return DEFAULT_CURRENT_STATE_ENDPOINT;
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
    return { userId: state.user?.userId || '', email: state.user?.email || '' };
  }

  async function fetchFreshPlan(){
    const session = getCurrentUser();
    if (!session.email && !session.userId) return readEffectivePlan();
    const body = new URLSearchParams();
    body.set('email', session.email || '');
    body.set('user_id', session.userId || '');
    body.set('event', 'get_current_state_for_search');
    try {
      const response = await fetch(getCurrentStateEndpoint(), { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'}, body: body.toString() });
      if (!response.ok) throw new Error('current_state_' + response.status);
      const json = await response.json();
      const row = json.current_state || json.user || json.row || json.data || json;
      if (!row || (!row.plan && !row.current_plan && !row.email && !row.user_email)) throw new Error('empty_current_state');
      const plan = normalizePlan(row);
      saveEffectivePlan(plan);
      return plan;
    } catch(error) {
      console.warn('RankForge plan lookup before search failed, using cached plan', error);
      return readEffectivePlan();
    }
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
    node.textContent = message || '';
    node.style.display = message ? '' : 'none';
    node.classList.remove('is-success','is-error','is-loading');
    if (tone) node.classList.add('is-' + tone);
  }

  function buildSearchPayload(plan){
    const session = getCurrentUser();
    const searchId = 'srch_' + Date.now();
    const depth = val('searchDepthInput') || String(plan.maxLeadsPerBatch || 25);
    const maxRequested = depth.replace(/[^0-9]/g, '') || String(plan.maxLeadsPerBatch || 25);
    const email = session.email || state.user?.email || '';
    return {
      search_id: searchId,
      user_id: session.userId || state.user?.userId || '',
      email: email,
      user_email: email,
      owner_email: email,
      admin_unlimited: plan.unlimited ? 'true' : 'false',
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
      discovery_query_limit: plan.key === 'free' ? '1' : '4',
      discovery_page_limit: plan.key === 'free' ? '1' : '2',
      max_results_requested: maxRequested,
      contact_requirement: 'either',
      exclude_chains_franchises: 'true',
      qualification_mode: val('qualificationModeInput') || 'Strict evidence',
      min_audit_score: val('seoThresholdInput') || '60',
      min_lead_score: val('leadThresholdInput') || '70',
      plan: plan.key,
      current_plan: plan.key,
      billing_status: plan.billingStatus || (plan.key === 'free' ? 'free' : 'active'),
      search_batch_limit: String(plan.batchesLimit),
      search_batches_limit: String(plan.batchesLimit),
      search_batches_used: String(plan.batchesUsed || 0),
      effective_search_limit: String(plan.batchesLimit),
      qualified_lead_credits_limit: String(plan.creditsLimit),
      qualified_leads_limit: String(plan.creditsLimit),
      qualified_lead_credits_used: String(plan.creditsUsed || 0),
      qualified_leads_used: String(plan.creditsUsed || 0),
      effective_qualified_lead_limit: String(plan.creditsLimit),
      max_leads_per_batch: String(plan.maxLeadsPerBatch || 25),
      csv_export: plan.csvExport ? 'true' : 'false',
      plan_source: 'dashboard_current_state_endpoint',
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
    state.activity.unshift('New search batch created: ' + payload.search_name);
  }

  async function createBatchV4(){
    setStatus('', '');
    const submitButton = document.getElementById('createBatch');
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Start Search Batch'; }

    try {
      const plan = await fetchFreshPlan();
      if (!plan.unlimited && plan.batchesLimit > 0 && plan.batchesUsed >= plan.batchesLimit) {
        setStatus('Your search batch allowance is used up for this plan.', 'error');
        return;
      }
      if (!plan.unlimited && plan.creditsLimit > 0 && plan.creditsUsed >= plan.creditsLimit) {
        setStatus('Your qualified lead credits are used up for this plan.', 'error');
        return;
      }

      const payload = buildSearchPayload(plan);
      if (!payload.search_name || !payload.niche || !payload.city || !payload.country || !payload.primary_keyword) {
        setStatus('Please fill Market name, Niche, City, Country, and Primary keyword.', 'error');
        return;
      }

      await sendSearchToWebhook(payload);
      addLocalRunningBatch(payload);
      if (typeof render === 'function') render();
      setTimeout(function(){ const modal = document.getElementById('modal'); if (modal) modal.classList.remove('open'); openView('searches'); }, 250);
    } catch (error) {
      console.error('RankForge webhook error', error);
      setStatus('Search could not be started. Please try again.', 'error');
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
    setStatus('', '');
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
  bindV4Controls(); ensureStatusNode(); setStatus('', ''); window.leadDetailPage();
})();