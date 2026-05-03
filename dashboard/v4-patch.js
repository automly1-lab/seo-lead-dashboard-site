(function(){
  if (typeof state === 'undefined' || typeof $ === 'undefined') return;

  const PRESETS = {
    phoenix:{name:'Phoenix Plumbers',niche:'plumber',city:'Phoenix',country:'United States',keyword:'emergency plumber',include:'drain cleaning, water heater, sewer repair',exclude:'yelp, angi, homeadvisor, directory'},
    austin:{name:'Austin Dentists',niche:'dentist',city:'Austin',country:'United States',keyword:'family dentist',include:'cosmetic dentistry, dental implants, emergency dentist',exclude:'zocdoc, healthgrades, directory'},
    miami:{name:'Miami Roofers',niche:'roofer',city:'Miami',country:'United States',keyword:'roof repair',include:'storm damage, metal roofing, roof replacement',exclude:'yelp, angi, homeadvisor, directory'},
    denver:{name:'Denver HVAC Companies',niche:'hvac contractor',city:'Denver',country:'United States',keyword:'ac repair',include:'furnace repair, air conditioning, heat pump',exclude:'yelp, angi, homeadvisor, directory'},
    chicago:{name:'Chicago Personal Injury Lawyers',niche:'personal injury lawyer',city:'Chicago',country:'United States',keyword:'car accident lawyer',include:'injury attorney, accident lawyer, workers comp',exclude:'avvo, justia, findlaw, directory'},
    london:{name:'London Estate Agents',niche:'estate agent',city:'London',country:'United Kingdom',keyword:'estate agent',include:'lettings, property management, valuation',exclude:'rightmove, zoopla, directory'}
  };

  function getLead(){ return state.leads.find(l => l.id === state.selected) || state.leads[0]; }

  state.leads.forEach(function(l){
    if (!l.verifiedSignals) {
      l.verifiedSignals = [['Title tag issue','Detected'],['Meta description issue','Detected'],['H1 / heading opportunity','Detected'],['Service page depth','Partial'],['Location page quality','Weak'],['LocalBusiness schema','Missing'],['Content depth','Needs work']];
    }
  });

  window.leadDetailPage = function(){
    const root = $('#leadDetailPage');
    if (!root) return;
    const l = getLead();
    root.innerHTML = `<div class="lead-detail-layout"><main><section class="lead-hero"><div class="lead-hero-top"><div><span class="pill">${l.source}</span><h2>${l.business}</h2><p>${l.domain} • ${l.location}</p></div>${badge(l.status)}</div><div class="lead-score-grid"><article><small>SEO Score</small><strong>${l.seo}</strong></article><article><small>Commercial Fit</small><strong>${l.commercial}</strong></article><article><small>Contact Confidence</small><strong>${l.contact}%</strong></article><article><small>Evidence</small><strong>${l.evidence}</strong></article></div></section><div class="detail-section-grid"><section class="detail-section"><h3>Verified Evidence</h3><div class="signal-list">${l.verifiedSignals.map(s=>`<div><span>${s[0]}</span><b>${s[1]}</b></div>`).join('')}</div></section><section class="detail-section"><h3>Contact Evidence</h3><div class="signal-list"><div><span>Email</span><b>${l.email||'Not found'}</b></div><div><span>Phone</span><b>${l.phone||'Not found'}</b></div><div><span>Contact Confidence</span><b>${l.contact}%</b></div><div><span>Contact path</span><b>${l.contact>65?'Usable':'Needs review'}</b></div></div></section><section class="detail-section full"><h3>Qualification Reason</h3><p class="reason">${l.reason}</p></section><section class="detail-section full"><h3>Outreach Context</h3><div class="signal-list"><div><span>Primary problem</span><b>${l.problem}</b></div><div><span>Recommended angle</span><b>${l.angle}</b></div><div><span>Next action</span><b>${l.nextAction || 'Review before outreach'}</b></div></div></section></div></main><aside class="side-stack"><section class="panel detail-section"><h3>Lead Summary</h3><div class="field-row"><span>Status</span><strong>${l.status}</strong></div><div class="field-row"><span>Stage</span><strong>${l.stage || 'New'}</strong></div><div class="field-row"><span>Owner</span><strong>${l.owner || 'Unassigned'}</strong></div><div class="field-row"><span>Priority</span><strong>${l.priority || 'Medium'}</strong></div></section><section class="panel detail-section next-actions"><h3>Next Actions</h3><button class="primary" data-mark-qualified-page="true">Mark Qualified</button><button data-reject-page="true">Reject Lead</button><button data-add-export>Send to Export</button><button data-back-overview>Back to Overview</button></section></aside></div>`;
  };

  function openView(view){
    const btn = document.querySelector(`[data-view="${view}"]`);
    if (btn) btn.click();
  }

  function fillPreset(key){
    const p = PRESETS[key];
    if (!p) return;
    $('#searchNameInput').value = p.name;
    $('#nicheInput').value = p.niche;
    $('#cityInput').value = p.city;
    $('#countryInput').value = p.country;
    $('#keywordSeedInput').value = p.keyword;
    $('#includeTermsInput').value = p.include;
    $('#excludeTermsInput').value = p.exclude;
    const summary = $('#createSummary');
    if (summary) summary.innerHTML = `<strong>${p.name}</strong><span>${p.keyword} in ${p.city}, ${p.country} • ${$('#qualificationModeInput').value}</span>`;
  }

  function createBatchV4(){
    if (state.plan.batchesUsed >= state.plan.batchesLimit) return alert('Search batch allowance exhausted.');
    if (state.plan.creditsUsed >= state.plan.creditsLimit) return alert('Qualified lead credits exhausted.');
    const city = ($('#cityInput') && $('#cityInput').value) || 'Phoenix';
    const niche = ($('#nicheInput') && $('#nicheInput').value) || 'plumber';
    const name = ($('#searchNameInput') && $('#searchNameInput').value) || `${city} ${niche}`;
    state.searches.unshift({
      name,
      niche,
      city,
      country: ($('#countryInput') && $('#countryInput').value) || 'United States',
      keyword: ($('#keywordSeedInput') && $('#keywordSeedInput').value) || 'emergency plumber',
      include: ($('#includeTermsInput') && $('#includeTermsInput').value) || '',
      exclude: ($('#excludeTermsInput') && $('#excludeTermsInput').value) || '',
      depth: ($('#searchDepthInput') && $('#searchDepthInput').value) || '25',
      mode: ($('#qualificationModeInput') && $('#qualificationModeInput').value) || 'Strict evidence',
      businessType: ($('#businessTypeInput') && $('#businessTypeInput').value) || 'local service business',
      seoThreshold: ($('#seoThresholdInput') && $('#seoThresholdInput').value) || '60',
      leadThreshold: ($('#leadThresholdInput') && $('#leadThresholdInput').value) || '70',
      status:'Running', raw:0, audited:0, qualified:0, created:'now'
    });
    state.plan.batchesUsed++;
    state.activity.unshift('New search batch created: ' + name);
    const modal = $('#modal');
    if (modal) modal.classList.remove('open');
    if (typeof render === 'function') render();
    openView('searches');
  }

  document.body.addEventListener('click', function(e){
    const preset = e.target.closest && e.target.closest('[data-preset]');
    if (preset) { e.preventDefault(); e.stopPropagation(); fillPreset(preset.dataset.preset); return; }
    if (e.target.id === 'openLeadDetailBtn') { e.preventDefault(); e.stopPropagation(); openView('leadDetail'); window.leadDetailPage(); return; }
    if (e.target.id === 'backToOverviewBtn' || e.target.dataset.backOverview) { e.preventDefault(); e.stopPropagation(); openView('overview'); return; }
    if (e.target.id === 'detailAddExportBtn') { e.preventDefault(); e.stopPropagation(); state.exports.add(state.selected); if (typeof exports === 'function') exports(); if (typeof finals === 'function') finals(); alert('Added to export queue.'); return; }
    if (e.target.dataset.markQualifiedPage) { e.preventDefault(); e.stopPropagation(); const l=getLead(); if(l.status !== 'Qualified'){ l.status='Qualified'; l.stage='New'; state.plan.creditsUsed++; state.activity.unshift('Lead detail page qualification consumed 1 credit: '+l.business); if(typeof render==='function') render(); } return; }
    if (e.target.dataset.rejectPage) { e.preventDefault(); e.stopPropagation(); const l=getLead(); l.status='Rejected'; l.stage='Rejected'; state.activity.unshift('Lead rejected from detail page: '+l.business); if(typeof render==='function') render(); return; }
    if (e.target.id === 'createBatch') { e.preventDefault(); e.stopPropagation(); createBatchV4(); return; }
  }, true);

  document.body.addEventListener('click', function(e){
    const row = e.target.closest && e.target.closest('tr[data-id]');
    if (row && !e.target.matches('input')) setTimeout(window.leadDetailPage, 0);
  });

  window.leadDetailPage();
})();