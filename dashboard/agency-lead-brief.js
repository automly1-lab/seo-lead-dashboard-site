(function(){
  'use strict';

  var SELECTED='rankforge-last-lead';
  var COPY_OK_MS=1400;

  function clean(v){return String(v==null?'':v).trim()}
  function lower(v){return clean(v).toLowerCase()}
  function esc(v){return clean(v).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})}
  function json(v){if(!v)return{};if(typeof v==='object')return v;try{return JSON.parse(clean(v)||'{}')}catch(e){return{}}}
  function flat(o,r,p){r=r||{};p=p||'';Object.keys(o||{}).forEach(function(k){var v=o[k],n=p?p+'_'+k:k;if(v&&typeof v==='object'&&!Array.isArray(v))flat(v,r,n);else{r[k]=v;r[n]=v}});return r}
  function key(v){return clean(v).toLowerCase().replace(/[^a-z0-9]/g,'')}
  function get(o,names,fb){var map={};Object.keys(o||{}).forEach(function(k){map[key(k)]=o[k]});for(var i=0;i<names.length;i++){var direct=o&&o[names[i]];if(clean(direct))return clean(direct);var mapped=map[key(names[i])];if(clean(mapped))return clean(mapped)}return fb||''}
  function num(o,names){for(var i=0;i<names.length;i++){var raw=get(o,[names[i]],''),n=Number(String(raw).replace(/[^0-9.-]/g,''));if(Number.isFinite(n))return Math.round(n)}return 0}
  function selectedLead(){
    var s=window.state||{leads:[]},id=sessionStorage.getItem(SELECTED)||s.selected;
    var l=(s.leads||[]).find(function(x){return clean(x.id||x.lead_id)===clean(id)})||(s.leads||[])[0];
    return l?flat(Object.assign({},l,json(l.lead_record),json(l.audit_record),json(l.contact_record),json(l.seo_audit),json(l.audit),json(l.contact),json(l.raw_json)),{}):null;
  }
  function industry(niche){var x=lower(niche),map={roofer:'roofing',plumber:'plumbing',dentist:'dental','hvac contractor':'HVAC',hvac:'HVAC',lawyer:'legal',attorney:'legal','personal injury lawyer':'personal injury legal','estate agent':'real estate'};return map[x]||clean(niche)||'local service'}
  function boolText(v){var x=lower(v);if(['true','yes','1','found','accessible','indexable','200'].indexOf(x)>-1)return'confirmed';if(['false','no','0','none','missing','blocked','not found'].indexOf(x)>-1)return'not confirmed';return clean(v)||'not returned'}
  function hasAny(o,names){return names.some(function(n){return !!get(o,[n],'')})}
  function serviceLocationLine(l){
    var servicePages=num(l,['service_page_count','service_pages_count']);
    var locationPages=num(l,['location_page_count','location_pages_count']);
    var topIssues=lower([get(l,['seo_top_issues'],''),get(l,['seo_actionable_issues'],''),get(l,['seo_need_reasons'],''),get(l,['seo_evidence_summary'],'')].join(' '));
    var serviceIssue=/no_service|service page|target service|main service|service not found/.test(topIssues);
    var locationIssue=/no_location|location page|service area|target city|city not found|location targeting/.test(topIssues);
    if(servicePages>0||locationPages>0){return 'Available crawl fields show '+servicePages+' service page(s) and '+locationPages+' location page(s).'}
    if(serviceIssue&&locationIssue)return 'Dedicated service and location pages were not confirmed in the available crawl evidence.';
    if(serviceIssue)return 'Dedicated service pages were not confirmed in the available crawl evidence.';
    if(locationIssue)return 'Dedicated location or service-area pages were not confirmed in the available crawl evidence.';
    return 'Service/location page coverage was not confirmed in the available fields.';
  }
  function contactPath(l){
    var email=get(l,['homepage_primary_email','email','best_email','contact_email'],''),phone=get(l,['homepage_primary_phone','place_phone','phone','best_phone','contact_phone'],''),contact=get(l,['contact_page_url','contact_url','contact_path'],''),confidence=get(l,['contact_confidence','contact_confidence_score','contact'],''),parts=[];
    if(email)parts.push('email found');
    if(phone)parts.push('phone found');
    if(contact)parts.push('contact page/path found');
    if(confidence)parts.push('contact confidence '+confidence);
    return parts.length?parts.join('; '):'contact path was not confirmed in the available fields';
  }
  function trustLine(l){
    var rating=get(l,['rating','google_rating','place_rating'],''),reviews=get(l,['review_count','reviews','google_reviews','place_reviews'],'');
    if(rating&&reviews)return 'Local trust signal available: rating '+rating+' with '+reviews+' review(s).';
    if(rating)return 'Local trust signal available: rating '+rating+'; review count was not returned.';
    if(reviews)return 'Local trust signal available: '+reviews+' review(s); rating was not returned.';
    return 'Local rating/review signal was not returned.';
  }
  function nextAction(status){var s=lower(status);if(s==='qualified')return'Review evidence, then start outreach.';if(s==='rejected')return'Do not contact unless manually requalified.';return'Manually verify evidence before outreach.'}
  function build(l){
    var business=get(l,['company_name','business','business_name','name'],'this business'),city=get(l,['city'],''),country=get(l,['country'],''),niche=get(l,['niche','industry','business_type'],'local service'),market=[city,country].filter(Boolean).join(', '),industryText=industry(niche),signals=num(l,['evidence','evidence_count','seo_evidence_signal_count','seo_verified_issue_count','seo_issue_count','signal_count']),website=boolText(get(l,['website_accessible','crawl_accessible','http_status','indexability_status'],'')),serviceLine=serviceLocationLine(l),contact=contactPath(l),trust=trustLine(l),status=get(l,['status','qualification_status','lead_status'],'Needs Review');
    var evidence=[
      'Evidence signals available: '+signals+'.',
      serviceLine,
      'Website accessibility/crawl status: '+website+'.',
      'Contact path: '+contact+'.',
      trust
    ];
    var angle='Available crawl evidence suggests there may be a local SEO outreach opportunity for '+business+(market?' in '+market:'')+'. '+serviceLine+' Manual review recommended before outreach.';
    var opener='Hi, I noticed '+business+' serves the '+(city||'local')+' '+industryText+' market. While reviewing visible website signals, I couldn’t confirm dedicated service or location pages. Would it be worth sending over a quick local SEO opportunity snapshot?';
    var action=nextAction(status);
    var brief='Agency Lead Brief\n\nEvidence Summary:\n- '+evidence.join('\n- ')+'\n\nSafe Outreach Angle:\n'+angle+'\n\nSuggested Opener:\n'+opener+'\n\nRecommended Next Action:\n'+action+'\n\nNote: Use evidence-backed language and verify details before outreach.';
    return {business:business,evidence:evidence,angle:angle,opener:opener,action:action,brief:brief,status:status};
  }
  function block(title,body){return '<div class="agency-brief-block"><h4>'+esc(title)+'</h4>'+body+'</div>'}
  function render(){
    var root=document.getElementById('leadDetailPage');
    if(!root)return;
    var center=root.querySelector('.rf25-center'),scores=root.querySelector('.rf25-scores');
    if(!center||!scores)return;
    var l=selectedLead();
    if(!l)return;
    var data=build(l),existing=root.querySelector('#agencyLeadBrief');
    var html='<section class="rf25-card agency-lead-brief" id="agencyLeadBrief"><div class="agency-brief-head"><div><h3>Agency Lead Brief</h3><p>Evidence-backed outreach summary</p></div><span>'+esc(data.status||'Needs Review')+'</span></div><div class="agency-brief-grid">'
      +block('Evidence Summary','<ul>'+data.evidence.map(function(x){return'<li>'+esc(x)+'</li>'}).join('')+'</ul>')
      +block('Safe Outreach Angle','<p>'+esc(data.angle)+'</p>')
      +block('Suggested Opener','<p>'+esc(data.opener)+'</p>')
      +block('Recommended Next Action','<p>'+esc(data.action)+'</p>')
      +'</div><div class="agency-brief-actions"><button type="button" data-agency-copy="opener">Copy opener</button><button type="button" data-agency-copy="brief">Copy lead brief</button><small id="agencyBriefCopied" aria-live="polite"></small></div><p class="agency-brief-note">Use evidence-backed language and verify details before outreach.</p></section>';
    if(existing)existing.outerHTML=html;else scores.insertAdjacentHTML('afterend',html);
    window.RankForgeAgencyLeadBrief={data:data,render:render,build:build};
  }
  function copyText(text){
    if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);
    var ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);return Promise.resolve();
  }
  document.addEventListener('click',function(ev){
    var btn=ev.target&&ev.target.closest&&ev.target.closest('[data-agency-copy]');
    if(!btn)return;
    var data=window.RankForgeAgencyLeadBrief&&window.RankForgeAgencyLeadBrief.data;
    if(!data)return;
    var text=btn.dataset.agencyCopy==='brief'?data.brief:data.opener;
    copyText(text).then(function(){var n=document.getElementById('agencyBriefCopied');if(n){n.textContent='Copied';setTimeout(function(){n.textContent=''},COPY_OK_MS)}}).catch(function(){var n=document.getElementById('agencyBriefCopied');if(n)n.textContent='Copy failed'});
  },true);
  function schedule(){setTimeout(render,40)}
  document.addEventListener('rankforge:rendered',schedule);
  window.addEventListener('rankforge:dashboard-session',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
  var mo=new MutationObserver(function(muts){if(muts.some(function(m){return Array.prototype.some.call(m.addedNodes||[],function(n){return n.nodeType===1&&(n.id==='leadDetailPage'||(n.querySelector&&n.querySelector('.rf25-scores')))}}))schedule()});
  if(document.body)mo.observe(document.body,{childList:true,subtree:true});
})();
