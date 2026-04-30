(function(){
  'use strict';
  var PAGE=document.body&&document.body.dataset?document.body.dataset.page:'';
  if(PAGE!=='lead-detail')return;
  function clean(v){return String(v==null?'':v).trim();}
  function human(v){var t=clean(v).toLowerCase();var m={qualified:'Qualified Lead',review_needed:'Needs Review',needs_review:'Needs Review',rejected:'Not a Fit',ready:'Ready',not_ready:'Not Ready'};return m[t]||clean(v).replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});}
  function text(id){return clean(document.getElementById(id)&&document.getElementById(id).textContent);}
  function ensure(){
    if(document.querySelector('.rf-simplified-decision-card'))return;
    var hero=document.querySelector('.detail-hero-panel');if(!hero)return;
    var card=document.createElement('section');card.className='rf-simplified-decision-card';
    card.innerHTML='<article class="rf-decision-block"><span>Recommended decision</span><strong id="rfSimpleDecision">Review this lead</strong><p id="rfSimpleDecisionCopy">Use the verified evidence and contact path before outreach.</p></article><article class="rf-decision-block"><span>Best next step</span><strong id="rfSimpleNextStep">Check contact and evidence</strong><p id="rfSimpleNextStepCopy">Do not pitch unless the SEO reason is supported by visible signals.</p></article>';
    hero.insertAdjacentElement('afterend',card);
  }
  function installAngleStyles(){
    if(document.getElementById('rfAgencyAngleStyles'))return;
    var style=document.createElement('style');
    style.id='rfAgencyAngleStyles';
    style.textContent='.rf-agency-angle-card{display:grid;gap:14px;margin:0 0 18px;padding:18px;border:1px solid rgba(21,94,239,.18);border-radius:20px;background:linear-gradient(135deg,rgba(21,94,239,.075),rgba(20,184,166,.055)),#fff}.rf-agency-angle-card .panel-eyebrow{margin:0}.rf-agency-angle-card h3{margin:0;font-size:20px;letter-spacing:-.035em}.rf-agency-angle-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.rf-agency-angle-box{padding:13px;border:1px solid rgba(15,23,42,.08);border-radius:16px;background:rgba(255,255,255,.76)}.rf-agency-angle-box span{display:block;color:#667085;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.rf-agency-angle-box p{margin:6px 0 0;color:#344054;line-height:1.55}.rf-safe-line{padding:13px 14px;border-radius:16px;background:rgba(16,185,129,.10);border:1px solid rgba(16,185,129,.18);color:#064e3b;line-height:1.55}@media(max-width:900px){.rf-agency-angle-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }
  function topSeoIssues(){
    var panel=document.getElementById('rfSeoEvidencePanel');
    if(!panel)return [];
    return Array.from(panel.querySelectorAll('.rf-issue')).map(function(card){
      var type=clean((card.querySelector('.rf-meta span:nth-child(2)')||{}).textContent).toLowerCase();
      var label=clean((card.querySelector('strong')||{}).textContent);
      var evidence=clean((card.querySelector('p')||{}).textContent);
      if(!label||/contact_path|contact page|contact cta/i.test(type+' '+label))return null;
      return {type:type,label:label,evidence:evidence};
    }).filter(Boolean).slice(0,6);
  }
  function classifyAngle(issues){
    var text=issues.map(function(i){return i.type+' '+i.label;}).join(' ').toLowerCase();
    if(/target_city|title_missing_city|h1_missing_city|location_pages|service-area/.test(text))return 'Local SEO city/service targeting cleanup';
    if(/service_pages|target_service|title_missing_service|h1_missing_service/.test(text))return 'Service-page expansion and search-intent alignment';
    if(/schema|local_business/.test(text))return 'Local trust and structured-data cleanup';
    if(/https|noindex|mobile/.test(text))return 'Technical SEO cleanup';
    if(/thin|content|blog|stale/.test(text))return 'Content depth and topical relevance review';
    return 'Local SEO opportunity review';
  }
  function agencyWhy(issues){
    var labels=issues.map(function(i){return i.label;}).join(' | ').toLowerCase();
    if(/city|location|service-area/.test(labels))return 'The site may not clearly reinforce the target city or service area in the crawl signals, which gives an agency a practical local SEO angle to review.';
    if(/service/.test(labels))return 'The crawl suggests room to improve service-intent targeting, especially around pages or headings that match high-intent local searches.';
    if(/https|technical|noindex|mobile/.test(labels))return 'The evidence includes technical signals that are easy for an agency to verify and explain during outreach.';
    return 'The crawl captured enough signals to support a cautious review conversation, but claims should stay tied to the visible evidence.';
  }
  function safeLine(issues){
    var location=text('detailLocation').split(',')[0]||'your target area';
    var issueText=issues.map(function(i){return i.type+' '+i.label;}).join(' ').toLowerCase();
    if(/service_pages|location_pages|target_city|title_missing_city|h1_missing_city/.test(issueText))return 'Noticed your site may have room to strengthen '+location+'-focused local SEO signals, especially around city/service targeting and dedicated service or location pages.';
    if(/target_service|title_missing_service|h1_missing_service/.test(issueText))return 'Noticed your site may have room to make its core services clearer in key on-page signals like headings, title tags, and service-focused pages.';
    if(/schema|local_business/.test(issueText))return 'Noticed your site may have room to strengthen local trust signals, including structured business information that search engines can read more easily.';
    return 'Noticed a few SEO signals worth reviewing from the available crawl, and thought there may be room to improve local search visibility.';
  }
  function ensureAgencyAngle(){
    installAngleStyles();
    var panel=document.getElementById('rfSeoEvidencePanel');
    if(!panel)return;
    var card=document.getElementById('rfAgencySalesAngle');
    if(!card){
      card=document.createElement('section');
      card.id='rfAgencySalesAngle';
      card.className='rf-agency-angle-card';
      card.innerHTML='<div><p class="panel-eyebrow">Agency Sales Angle</p><h3 id="rfAgencyAngleTitle">Recommended outreach angle</h3></div><div class="rf-agency-angle-grid"><div class="rf-agency-angle-box"><span>Why this lead may be interesting</span><p id="rfAgencyWhy">Waiting for verified SEO evidence.</p></div><div class="rf-agency-angle-box"><span>Best agency offer</span><p id="rfAgencyOffer">Local SEO audit</p></div></div><div class="rf-safe-line" id="rfAgencySafeLine">Use cautious wording and reference only verified crawl signals.</div>';
      panel.querySelector('.rf-seo-v4-card,.rf-seo-v3-card,.rf-seo-evidence-card')?.insertAdjacentElement('afterbegin',card);
    }
    var issues=topSeoIssues();
    var title=document.getElementById('rfAgencyAngleTitle');
    var why=document.getElementById('rfAgencyWhy');
    var offer=document.getElementById('rfAgencyOffer');
    var line=document.getElementById('rfAgencySafeLine');
    if(!issues.length){
      title.textContent='Manual SEO review recommended';
      why.textContent='The panel does not show enough strong SEO evidence yet. Keep this lead as review-needed.';
      offer.textContent='Manual website review';
      line.textContent='Safe outreach line: “I noticed a few items worth reviewing, but would want to confirm them manually before making recommendations.”';
      return;
    }
    var angle=classifyAngle(issues);
    title.textContent=angle;
    why.textContent=agencyWhy(issues);
    offer.textContent=/technical/i.test(angle)?'Technical SEO cleanup audit':(/service-page|service/i.test(angle)?'Service-page and local SEO audit':'Local SEO opportunity audit');
    line.textContent='Safe outreach line: “'+safeLine(issues)+'”';
  }
  function update(){
    ensure();
    var status=human(text('detailStatus'))||'Needs Review';
    var contact=text('detailContactLine');
    var reason=text('detailReason');
    var decision=document.getElementById('rfSimpleDecision');var copy=document.getElementById('rfSimpleDecisionCopy');var step=document.getElementById('rfSimpleNextStep');var stepCopy=document.getElementById('rfSimpleNextStepCopy');
    if(decision){
      if(/Qualified/i.test(status)){decision.textContent='Qualified Lead';copy.textContent='Good enough to consider for outreach, as long as the message references a verified SEO issue.';}
      else if(/Not a Fit|Rejected/i.test(status)){decision.textContent='Not recommended';copy.textContent='This lead should not be used for normal outreach under the current quality rules.';}
      else{decision.textContent='Needs Review';copy.textContent='Potential opportunity, but check the website evidence and contact path before outreach.';}
      step.textContent=contact&&!/No direct contact/i.test(contact)?'Verify contact and prepare outreach':'Confirm contact path first';
      stepCopy.textContent=reason&&reason!=='No qualification reason yet.'?reason:'Use the SEO evidence section below. If evidence is weak, keep this lead in review.';
    }
    ensureAgencyAngle();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update);else update();
  setInterval(update,1600);
})();
