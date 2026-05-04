(function(){
  'use strict';
  function st(){ try { if (typeof state !== 'undefined') return state; } catch(e) {} return window.state || null; }
  function clean(v){ return String(v == null ? '' : v).trim(); }
  function esc(v){ return clean(v).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];}); }
  function num(v){ var n=Number(v); return Number.isFinite(n)?Math.round(n):0; }
  function first(obj, keys, fallback){ for(var i=0;i<keys.length;i++){ var v=obj && obj[keys[i]]; if(clean(v)) return clean(v); } return fallback||''; }
  function splitList(v){
    if (Array.isArray(v)) return v.map(clean).filter(Boolean);
    var raw=clean(v); if(!raw) return [];
    try { var parsed=JSON.parse(raw); if(Array.isArray(parsed)) return parsed.map(function(x){ return typeof x==='string'?x:JSON.stringify(x); }).map(clean).filter(Boolean); } catch(e) {}
    return raw.split(/\s*\|\s*|\s*,\s*|\n+/).map(clean).filter(Boolean).slice(0,12);
  }
  function parseJson(v){ try { return JSON.parse(clean(v)||'null'); } catch(e){ return null; } }
  function lead(){ var s=st(); if(!s) return null; return (s.leads||[]).find(function(l){ return l.id===s.selected || l.lead_id===s.selected; }) || (s.leads||[])[0] || null; }
  function metric(label,value,hint){ return '<article class="rf-detail-metric"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong>'+(hint?'<span>'+esc(hint)+'</span>':'')+'</article>'; }
  function field(label,value){ if(!clean(value)) return ''; return '<div class="rf-field"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>'; }
  function listBlock(items,empty){ items=(items||[]).filter(Boolean).slice(0,8); return items.length?'<ul class="rf-list">'+items.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'<p class="muted">'+esc(empty||'No data yet')+'</p>'; }
  function boolLabel(v){ var raw=clean(v).toLowerCase(); if(['true','yes','1','found','detected','verified'].indexOf(raw)!==-1) return 'Yes'; if(['false','no','0','missing','not found'].indexOf(raw)!==-1) return 'No'; return clean(v)||'—'; }
  function evidenceItems(l){
    var items=[];
    splitList(first(l,['seo_actionable_issues','seo_top_issues','seo_verified_claims','seo_claims_verified'])).forEach(function(x){items.push(x);});
    var json=parseJson(l.seo_evidence_json); if(Array.isArray(json)) json.forEach(function(x){ items.push(clean(x.issue||x.claim||x.signal||x.summary||JSON.stringify(x))); });
    if(clean(l.title_tag)) items.push('Title tag: '+clean(l.title_tag));
    if(clean(l.meta_description_length)) items.push('Meta description length: '+clean(l.meta_description_length));
    if(clean(l.homepage_word_count)) items.push('Homepage word count: '+clean(l.homepage_word_count));
    if(clean(l.service_page_count)) items.push('Service pages found: '+clean(l.service_page_count));
    if(clean(l.location_page_count)) items.push('Location pages found: '+clean(l.location_page_count));
    return Array.from(new Set(items.filter(Boolean))).slice(0,10);
  }
  function render(){
    var root=document.getElementById('leadDetailPage'); if(!root) return;
    var l=lead();
    if(!l){ root.innerHTML='<div class="panel detail-section"><h3>No lead selected</h3><p>Create or select a lead to see details.</p></div>'; return; }
    var company=first(l,['business','company_name','name'],'Untitled lead');
    var domain=first(l,['domain','display_domain','website_url','clean_website_url'],'No domain');
    var location=first(l,['location','city'],'No location');
    var status=first(l,['status','qualification_status'],'Needs Review');
    var seo=num(first(l,['seo','seo_need_score','audit_score','seo_score']));
    var commercial=num(first(l,['commercial','commercial_fit_score','overall_lead_score','lead_score']));
    var contact=num(first(l,['contact','contact_confidence_score','contact_email_confidence','contact_phone_confidence']));
    var evidenceCount=num(first(l,['evidence','seo_evidence_signal_count','seo_verified_issue_count','direct_evidence_count','crawl_based_evidence_count']));
    var qualification=first(l,['qualification_reason','reason','seo_evidence_summary','summary'],'No qualification reason yet.');
    var outreach=first(l,['outreach_angle','angle','recommended_offer','client_value_hypothesis'],'No outreach angle yet.');
    var primaryProblem=first(l,['primary_problem','problem'],'Not set');
    var secondaryProblem=first(l,['secondary_problem'],'Not set');
    var contactEmail=first(l,['email','decision_maker_email','contact_primary_email','contact_emails'],'Not found');
    var contactPhone=first(l,['phone','decision_maker_phone','contact_primary_phone','contact_phones'],'Not found');
    var evidence=evidenceItems(l);
    var technical=[
      'Crawl accessible: '+boolLabel(l.crawl_accessible),
      'HTTP status: '+(clean(l.http_status)||'—'),
      'Indexability: '+(clean(l.indexability_status)||'—'),
      'Target city found: '+boolLabel(l.target_city_found),
      'Target service found: '+boolLabel(l.target_service_found),
      'Contact CTA found: '+boolLabel(l.contact_cta_found),
      'LocalBusiness schema: '+boolLabel(l.local_business_schema_found),
      'Reviews signal: '+boolLabel(l.reviews_signal_found),
      'Fresh content signal: '+boolLabel(l.fresh_content_signal)
    ];
    var contactEvidence=[
      field('Decision maker', [l.decision_maker_name,l.decision_maker_role].filter(Boolean).join(' — ')),
      field('Email', contactEmail),
      field('Phone', contactPhone),
      field('Contact source', first(l,['contact_source','contact_source_summary'],'Not set')),
      field('Evidence URL', first(l,['contact_evidence_url','evidence_source_url','contact_page_fetched_url'],'Not set')),
      field('Pages checked', first(l,['contact_pages_checked'],'0'))
    ].join('');
    root.innerHTML='<div class="rf-rich-detail">'
      +'<section class="rf-detail-hero panel"><div><span class="badge">'+esc(status)+'</span><h2>'+esc(company)+'</h2><p>'+esc(domain)+' • '+esc(location)+'</p></div><a class="rf-site-link" target="_blank" rel="noopener" href="'+esc(first(l,['website_url','clean_website_url'],''))+'">Open website</a></section>'
      +'<section class="rf-detail-metrics">'+metric('SEO need',seo+'/100','crawl based')+metric('Commercial fit',commercial+'/100','market value')+metric('Contact confidence',contact+'/100','outreach data')+metric('Evidence signals',evidenceCount,'verified')+'</section>'
      +'<section class="rf-detail-grid"><article class="panel rf-section"><h3>Why this lead matters</h3><p>'+esc(qualification)+'</p><div class="rf-mini-grid">'+field('Primary problem',primaryProblem)+field('Secondary problem',secondaryProblem)+field('Recommended offer',first(l,['recommended_offer'],'Not set'))+field('Recommended channel',first(l,['recommended_channel'],'Not set'))+'</div></article>'
      +'<article class="panel rf-section"><h3>Outreach angle</h3><p>'+esc(outreach)+'</p><p class="muted">'+esc(first(l,['first_line_personalization'],'No personalization line yet.'))+'</p></article>'
      +'<article class="panel rf-section"><h3>SEO audit evidence</h3>'+listBlock(evidence,'No SEO evidence returned yet.')+'</article>'
      +'<article class="panel rf-section"><h3>Technical crawl facts</h3>'+listBlock(technical,'No crawl facts returned yet.')+'</article>'
      +'<article class="panel rf-section"><h3>Contact evidence</h3><div class="rf-mini-grid">'+contactEvidence+'</div></article>'
      +'<article class="panel rf-section"><h3>Discovery context</h3><div class="rf-mini-grid">'+field('Organic position',l.organic_position)+field('Maps position',l.maps_position)+field('Rating',l.rating)+field('Review count',l.review_count)+field('Paid ads detected',boolLabel(l.paid_ads_detected))+field('Visibility gap',l.visibility_gap_score)+'</div></article></section></div>';
  }
  function styles(){ if(document.getElementById('rf-rich-lead-detail-style')) return; var s=document.createElement('style'); s.id='rf-rich-lead-detail-style'; s.textContent='.rf-rich-detail{display:grid;gap:18px}.rf-detail-hero{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:24px}.rf-detail-hero h2{font-size:34px;margin:12px 0 8px;letter-spacing:-.04em}.rf-detail-hero p,.muted{color:var(--muted);line-height:1.55}.rf-site-link{border:1px solid rgba(148,163,184,.22);border-radius:12px;padding:10px 14px;text-decoration:none;color:#dbeafe;font-weight:800;white-space:nowrap}.rf-detail-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.rf-detail-metric{background:rgba(12,26,45,.8);border:1px solid rgba(148,163,184,.14);border-radius:18px;padding:18px}.rf-detail-metric small{color:var(--muted);display:block}.rf-detail-metric strong{font-size:28px;display:block;margin:8px 0}.rf-detail-metric span{color:#93c5fd;font-size:12px}.rf-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.rf-section{padding:22px}.rf-section h3{margin:0 0 12px;font-size:20px}.rf-section p{line-height:1.65}.rf-list{display:grid;gap:10px;margin:0;padding-left:18px;color:#dbeafe}.rf-list li{line-height:1.45}.rf-mini-grid{display:grid;gap:10px}.rf-field{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid rgba(148,163,184,.11);padding:10px 0}.rf-field span{color:var(--muted)}.rf-field strong{text-align:right;max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:980px){.rf-detail-metrics,.rf-detail-grid{grid-template-columns:1fr}.rf-detail-hero{display:block}.rf-site-link{display:inline-flex;margin-top:12px}}'; document.head.appendChild(s); }
  window.rankforgeRenderLeadDetail=function(){ styles(); render(); };
  window.leadDetailPage=window.rankforgeRenderLeadDetail;
  document.body.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('tr[data-id]')) setTimeout(window.rankforgeRenderLeadDetail,0); if(e.target.closest&&e.target.closest('[data-view="leadDetail"]')) setTimeout(window.rankforgeRenderLeadDetail,50); },true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ styles(); setTimeout(render,250); }); else { styles(); setTimeout(render,250); }
})();