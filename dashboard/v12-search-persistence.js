(function(){
  'use strict';

  var RESULTS_ENDPOINT_KEY = 'rankforge-search-results-endpoint-v1';
  var DEFAULT_RESULTS_ENDPOINT = 'https://lastaccount1907.app.n8n.cloud/webhook/rankforge-search-results';
  var LAST_SYNC_KEY = 'rankforge-last-results-sync-v1';

  function st(){ try { if (typeof state !== 'undefined') return state; } catch(e) {} return window.state || null; }
  function clean(v){ return String(v == null ? '' : v).trim(); }
  function lower(v){ return clean(v).toLowerCase(); }
  function safeJson(value, fallback){ try { return JSON.parse(value || ''); } catch(e){ return fallback; } }
  function endpoint(){
    var saved = clean(localStorage.getItem(RESULTS_ENDPOINT_KEY));
    if (saved) return saved;
    localStorage.setItem(RESULTS_ENDPOINT_KEY, DEFAULT_RESULTS_ENDPOINT);
    return DEFAULT_RESULTS_ENDPOINT;
  }
  function session(){
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === 'function') return window.rankforgeAuth.getSession();
    try { return JSON.parse(localStorage.getItem('rankforge-auth-session-v1') || 'null'); } catch(e){ return null; }
  }
  function userKey(){
    var s = session() || {};
    var stateObj = st() || {};
    var email = lower(s.email || (stateObj.user && stateObj.user.email));
    var id = clean(s.userId || s.id || (stateObj.user && stateObj.user.userId));
    return id || email || 'anonymous';
  }
  function storeKey(){ return 'rankforge-dashboard-data-v2::' + userKey(); }
  function allData(){ return safeJson(localStorage.getItem(storeKey()), { searches:[], leads:[], exports:[], updated_at:'' }); }
  function saveData(data){ data.updated_at = new Date().toISOString(); localStorage.setItem(storeKey(), JSON.stringify(data)); }
  function idOfSearch(item){ return clean(item && (item.id || item.search_id || item.searchId || item.name)); }
  function idOfLead(item){ return clean(item && (item.id || item.lead_id || item.leadId || item.business_id || item.domain || item.business)); }
  function mergeById(existing, incoming, idFn){
    var map = new Map();
    (existing || []).forEach(function(item){ var id = idFn(item); if (id) map.set(id, Object.assign({}, item)); });
    (incoming || []).forEach(function(item){ var id = idFn(item); if (id) map.set(id, Object.assign({}, map.get(id) || {}, item)); });
    return Array.from(map.values()).sort(function(a,b){ return Date.parse(b.updated_at || b.created_at || b.created || 0) - Date.parse(a.updated_at || a.created_at || a.created || 0); });
  }
  function searchFromPayload(payload){
    return {
      id: payload.search_id || payload.id,
      search_id: payload.search_id || payload.id,
      name: payload.search_name || payload.name,
      niche: payload.niche,
      city: payload.city,
      country: payload.country,
      keyword: payload.primary_keyword || payload.keyword,
      include: payload.include_terms || payload.include,
      exclude: payload.exclude_terms || payload.exclude,
      depth: payload.max_results_requested || payload.search_depth || payload.depth,
      mode: payload.qualification_mode || payload.mode,
      businessType: payload.business_type || payload.businessType,
      seoThreshold: payload.min_audit_score || payload.seoThreshold,
      leadThreshold: payload.min_lead_score || payload.leadThreshold,
      status: payload.status === 'active' ? 'Running' : (payload.status || 'Running'),
      raw: Number(payload.raw || payload.raw_count || payload.discovered_count || 0),
      audited: Number(payload.audited || payload.audited_count || 0),
      qualified: Number(payload.qualified || payload.qualified_count || 0),
      review: Number(payload.review || payload.needs_review_count || 0),
      rejected: Number(payload.rejected || payload.rejected_count || 0),
      contacts: Number(payload.contacts || payload.contacts_count || 0),
      created: payload.created || payload.created_at || 'now',
      updated_at: payload.updated_at || new Date().toISOString()
    };
  }
  function normalizeSearch(item){
    return searchFromPayload(Object.assign({}, item, {
      search_id: item.search_id || item.id,
      search_name: item.search_name || item.name,
      primary_keyword: item.primary_keyword || item.keyword,
      include_terms: item.include_terms || item.include,
      exclude_terms: item.exclude_terms || item.exclude
    }));
  }
  function numeric(){
    for (var i=0;i<arguments.length;i++) {
      var n = Number(arguments[i]);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  }
  function normalizeLead(item){
    var business = clean(item.business || item.business_name || item.name || item.company || item.title || item.company_name);
    var domain = clean(item.domain || item.website || item.url || item.business_domain || item.display_domain || item.website_url);
    var status = clean(item.status || item.qualification_status || item.lead_status || 'Needs Review');
    var lead = Object.assign({}, item, {
      id: clean(item.id || item.lead_id || item.business_id || item.prospect_id || domain || business || ('lead_' + Date.now() + Math.random())),
      search_id: clean(item.search_id || item.searchId),
      business: business || 'Untitled lead',
      source: clean(item.source || item.discovery_source || item.source_type || 'n8n'),
      location: clean(item.location || [item.city,item.state,item.country].filter(Boolean).join(', ')),
      domain: domain || '—',
      seo: numeric(item.seo, item.seo_score, item.audit_score, item.seo_need_score),
      commercial: numeric(item.commercial, item.commercial_fit, item.lead_score, item.commercial_fit_score, item.overall_lead_score),
      evidence: numeric(item.evidence, item.evidence_count, item.signal_count, item.seo_evidence_signal_count, item.seo_verified_issue_count, item.direct_evidence_count, item.crawl_based_evidence_count),
      contact: numeric(item.contact, item.contact_confidence, item.contact_confidence_score, item.contact_email_confidence, item.contact_phone_confidence),
      email: clean(item.email || item.best_email || item.contact_email || item.decision_maker_email || item.contact_primary_email),
      phone: clean(item.phone || item.best_phone || item.contact_phone || item.decision_maker_phone || item.contact_primary_phone),
      status: status,
      stage: clean(item.stage || 'New'),
      owner: clean(item.owner || 'Unassigned'),
      priority: clean(item.priority || item.lead_priority || 'Medium'),
      reason: clean(item.reason || item.qualification_reason || item.summary || item.seo_evidence_summary),
      problem: clean(item.problem || item.primary_problem || item.secondary_problem),
      angle: clean(item.angle || item.outreach_angle || item.recommendation || item.recommended_offer),
      added: clean(item.added || item.created_at || item.updated_at || 'now'),
      updated_at: clean(item.updated_at || item.created_at || new Date().toISOString())
    });
    return lead;
  }
  function applyLocalData(){
    var stateObj = st(); if (!stateObj) return;
    var data = allData();
    if (Array.isArray(data.searches) && data.searches.length) stateObj.searches = mergeById(stateObj.searches || [], data.searches.map(normalizeSearch), idOfSearch);
    if (Array.isArray(data.leads) && data.leads.length) {
      stateObj.leads = mergeById(stateObj.leads || [], data.leads.map(normalizeLead), idOfLead);
      if (!stateObj.selected && stateObj.leads[0]) stateObj.selected = stateObj.leads[0].id;
    }
    try { if (typeof render === 'function') render(); } catch(e) {}
    try { if (typeof searches === 'function') searches(); } catch(e) {}
    try { if (typeof window.rankforgeRenderLeadDetail === 'function') window.rankforgeRenderLeadDetail(); } catch(e) {}
  }
  function persistCurrent(){
    var stateObj = st(); if (!stateObj) return;
    var data = allData();
    data.searches = mergeById(data.searches || [], stateObj.searches || [], idOfSearch);
    data.leads = mergeById(data.leads || [], stateObj.leads || [], idOfLead);
    saveData(data);
  }
  function saveSearch(payload){
    var stateObj = st();
    var search = normalizeSearch(searchFromPayload(payload));
    if (stateObj) stateObj.searches = mergeById(stateObj.searches || [], [search], idOfSearch);
    var data = allData();
    data.searches = mergeById(data.searches || [], [search], idOfSearch);
    saveData(data);
    try { if (typeof render === 'function') render(); } catch(e) {}
    return search;
  }
  function extractArray(json, names){
    for (var i=0;i<names.length;i++) {
      var value = names[i].split('.').reduce(function(obj,key){ return obj && obj[key]; }, json);
      if (Array.isArray(value)) return value;
    }
    return [];
  }
  async function syncResults(){
    var s = session() || {};
    var stateObj = st() || {};
    var searchesList = (stateObj.searches || []).map(function(x){ return x.search_id || x.id; }).filter(Boolean);
    if (!s.email && !s.userId && !searchesList.length) return;
    var body = new URLSearchParams();
    body.set('email', s.email || (stateObj.user && stateObj.user.email) || '');
    body.set('user_id', s.userId || s.id || (stateObj.user && stateObj.user.userId) || '');
    body.set('search_ids', searchesList.join(','));
    body.set('event', 'get_search_results');
    try {
      var res = await fetch(endpoint(), { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'}, body: body.toString() });
      if (!res.ok) throw new Error('search_results_' + res.status);
      var json = await res.json();
      var incomingSearches = extractArray(json, ['searches','batches','search_batches','data.searches','data.batches','results.searches']).map(normalizeSearch);
      var incomingLeads = extractArray(json, ['leads','prospects','results','raw_prospects','final_leads','data.leads','data.prospects','data.results']).map(normalizeLead);
      if (!incomingSearches.length && json.current_search) incomingSearches = [normalizeSearch(json.current_search)];
      if (!incomingSearches.length && json.search) incomingSearches = [normalizeSearch(json.search)];
      if (!incomingLeads.length && Array.isArray(json.rows)) incomingLeads = json.rows.map(normalizeLead);
      if (!incomingSearches.length && !incomingLeads.length) return;
      var stateNow = st();
      if (stateNow) {
        stateNow.searches = mergeById(stateNow.searches || [], incomingSearches, idOfSearch);
        stateNow.leads = mergeById(stateNow.leads || [], incomingLeads, idOfLead);
        if (!stateNow.selected && stateNow.leads[0]) stateNow.selected = stateNow.leads[0].id;
      }
      var data = allData();
      data.searches = mergeById(data.searches || [], incomingSearches, idOfSearch);
      data.leads = mergeById(data.leads || [], incomingLeads, idOfLead);
      saveData(data);
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      try { if (typeof render === 'function') render(); } catch(e) {}
      try { if (typeof window.rankforgeRenderLeadDetail === 'function') window.rankforgeRenderLeadDetail(); } catch(e) {}
    } catch(error) { console.warn('RankForge search results sync failed', error); }
  }
  function loadLeadDetail(){
    if (document.querySelector('script[data-rf-rich-lead-detail="true"]')) return;
    var script = document.createElement('script');
    script.src = './v14-lead-detail-rich.js?v=detail-1';
    script.defer = true;
    script.setAttribute('data-rf-rich-lead-detail','true');
    document.body.appendChild(script);
  }
  function boot(){
    loadLeadDetail();
    applyLocalData();
    setTimeout(applyLocalData, 250);
    setTimeout(syncResults, 900);
    setTimeout(syncResults, 5000);
    setInterval(function(){ persistCurrent(); }, 2500);
  }
  window.rankforgeDashboardData = { saveSearch: saveSearch, persist: persistCurrent, hydrate: applyLocalData, syncResults: syncResults };
  window.addEventListener('rankforge:dashboard-session', function(){ setTimeout(boot, 250); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();