(function(){
  'use strict';

  var SELECTED='rankforge-last-lead';
  var COPY_OK_MS=1400;
  var retryTimer=null;
  var retryCount=0;

  function clean(v){return String(v==null?'':v).trim()}
  function lower(v){return clean(v).toLowerCase()}
  function esc(v){return clean(v).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]})}
  function json(v){if(!v)return{};if(typeof v==='object')return v;try{return JSON.parse(clean(v)||'{}')}catch(e){return{}}}
  function flat(o,r,p){r=r||{};p=p||'';Object.keys(o||{}).forEach(function(k){var v=o[k],n=p?p+'_'+k:k;if(v&&typeof v==='object'&&!Array.isArray(v))flat(v,r,n);else{r[k]=v;r[n]=v}});return r}
  function key(v){return clean(v).toLowerCase().replace(/[^a-z0-9]/g,'')}
  function get(o,names,fb){var map={};Object.keys(o||{}).forEach(function(k){map[key(k)]=o[k]});for(var i=0;i<names.length;i++){var direct=o&&o[names[i]];if(clean(direct))return clean(direct);var mapped=map[key(names[i])];if(clean(mapped))return clean(mapped)}return fb||''}
  function num(o,names){for(var i=0;i<names.length;i++){var raw=get(o,[names[i]],''),n=Number(String(raw).replace(/[^0-9.-]/g,''));if(Number.isFinite(n))return Math.max(0,Math.round(n))}return 0}
  function selectedLead(){
    var s=window.state||{leads:[]},id=sessionStorage.getItem(SELECTED)||s.selected;
    var l=(s.leads||[]).find(function(x){return clean(x.id||x.lead_id)===clean(id)})||(s.leads||[])[0];
    return l?flat(Object.assign({},l,json(l.lead_record),json(l.audit_record),json(l.contact_record),json(l.seo_audit),json(l.audit),json(l.contact),json(l.raw_json)),{}):null;
  }
  function textAfterLabel(label){
    var rows=document.querySelectorAll('#leadDetailPage .rf25-row');
    for(var i=0;i<rows.length;i++){
      var small=rows[i].querySelector('small'),strong=rows[i].querySelector('strong');
      if(small&&strong&&small.textContent.toLowerCase().indexOf(label.toLowerCase())>-1)return clean(strong.textContent);
    }
    return '';
  }
  function domLead(){
    var root=document.getElementById('leadDetailPage');
    if(!root)return null;
    var business=clean((root.querySelector('.rf25-head h2')||{}).textContent)||textAfterLabel('Business Name');
    if(!business)return null;
    var loc=textAfterLabel('Location'),parts=loc.split(',').map(clean);
    return {business:business,name:business,niche:textAfterLabel('Industry'),city:parts[0]||'',country:parts.slice(1).join(', '),rating:textAfterLabel('Google Rating'),review_count:textAfterLabel('Reviews'),homepage_primary_email:textAfterLabel('Email'),homepage_primary_phone:textAfterLabel('Website Phone')||textAfterLabel('Business Phone'),website_accessible:textAfterLabel('Website')?'confirmed':'',status:clean((document.querySelector('#statusFilter option:checked')||{}).textContent)||'Needs Review'};
  }
  function industry(niche){var x=lower(niche),map={roofer:'roofing',plumber:'plumbing',dentist:'dental','hvac contractor':'HVAC',hvac:'HVAC',lawyer:'legal',attorney:'legal','personal injury lawyer':'personal injury legal','estate agent':'real estate'};return map[x]||clean(niche)||'local service'}
  function boolText(v){var x=lower(v);if(['true','yes','1','found','accessible','indexable','200','confirmed','success','ok'].indexOf(x)>-1)return'confirmed';if(['false','no','0','none','missing','blocked','not found','not_found'].indexOf(x)>-1)return'not confirmed';return clean(v)||'not returned'}
  function hasValue(v){var x=lower(v);return !!x&&x!=='not found'&&x!=='none'&&x!=='null'&&x!=='undefined'&&x!=='not returned'}
  function serviceLocationFacts(l){
    var servicePages=num(l,['service_page_count','service_pages_count','dedicated_service_page_count']);
    var locationPages=num(l,['location_page_count','location_pages_count','dedicated_location_page_count']);
    var topIssues=lower([get(l,['seo_top_issues'],''),get(l,['seo_actionable_issues'],''),get(l,['seo_need_reasons'],''),get(l,['seo_evidence_summary'],''),get(l,['reason'],'')].join(' '));
    var serviceIssue=/no_service|service page|target service|main service|service not found|dedicated service|service pages were not confirmed/.test(topIssues);
    var locationIssue=/no_location|location page|service area|target city|city not found|location targeting|dedicated location|location pages were not confirmed/.test(topIssues);
    return {servicePages:servicePages,locationPages:locationPages,serviceIssue:serviceIssue,locationIssue:locationIssue};
  }
  function serviceLocationLine(l){
    var f=serviceLocationFacts(l);
    if(f.servicePages>0||f.locationPages>0)return 'Available crawl fields show '+f.servicePages+' service page(s) and '+f.locationPages+' location page(s).';
    if(f.serviceIssue&&f.locationIssue)return 'Dedicated service or location pages were not confirmed in the available crawl evidence.';
    if(f.serviceIssue)return 'Dedicated service pages were not confirmed in the available crawl evidence.';
    if(f.locationIssue)return 'Dedicated location or service-area pages were not confirmed in the available crawl evidence.';
    if(f.servicePages===0&&f.locationPages===0)return 'Dedicated service or location pages were not confirmed in the available fields.';
    return 'Service/location page coverage was not confirmed in the available fields.';
  }
  function contactFacts(l){
    var email=get(l,['homepage_primary_email','email','best_email','contact_email','decision_maker_email'],'');
    var phone=get(l,['homepage_primary_phone','place_phone','phone','best_phone','contact_phone','decision_maker_phone'],'');
    var contact=get(l,['contact_page_url','contact_url','contact_path'],'');
    return {email:hasValue(email),phone:hasValue(phone),contactPage:hasValue(contact),emailValue:email,phoneValue:phone,contactValue:contact};
  }
  function contactPath(l){
    var c=contactFacts(l),confidence=get(l,['contact_confidence','contact_confidence_score','contact'],''),parts=[];
    if(c.email)parts.push('email found');
    if(c.phone)parts.push('phone found');
    if(c.contactPage)parts.push('contact page/path found');
    if(confidence)parts.push('contact confidence '+confidence);
    return parts.length?parts.join('; '):'contact path was not confirmed in the available fields';
  }
  function trustFacts(l){var rating=get(l,['rating','google_rating','place_rating'],'');var reviews=num(l,['review_count','reviews','google_reviews','place_reviews']);return {rating:hasValue(rating),ratingValue:rating,reviews:reviews}}
  function trustLine(l){
    var t=trustFacts(l);
    if(t.rating&&t.reviews)return 'Google rating/review signal found: rating '+t.ratingValue+' with '+t.reviews+' review(s).';
    if(t.rating)return 'Google rating signal found: '+t.ratingValue+'; review count was not returned.';
    if(t.reviews)return 'Review signal found: '+t.reviews+' review(s); rating was not returned.';
    return 'Google rating/review signal was not returned.';
  }
  function nextAction(status,contact){
    var s=lower(status);
    if(s==='rejected')return 'Do not contact unless manually requalified.';
    if(!contact.email&&!contact.phone&&!contact.contactPage)return 'Find a contact path before outreach.';
    if(contact.phone&&!contact.email)return 'Use phone-first outreach or export for manual research.';
    if(s==='qualified')return 'Review the evidence summary, then contact this business using the suggested opener.';
    return 'Manually verify the evidence before outreach.';
  }
  function marketLine(business,city,niche){var out=[];if(business)out.push(business);if(city||niche)out.push('serves the '+[city,industry(niche)].filter(Boolean).join(' ')+' market');return out.length?out.join(' ') + '.':'Market and industry fields were not fully returned.'}
  function buildOpener(ctx){
    var lines=[];
    lines.push('Hi '+ctx.business+', I noticed you serve the '+(ctx.city||'local')+' '+ctx.industryText+' market.');
    var reviewParts=[];
    if(ctx.serviceIssueText)reviewParts.push(ctx.serviceIssueText);
    if(ctx.trust.rating||ctx.trust.reviews)reviewParts.push('Since you already have visible local trust signals, this may be a useful area to review for local SEO visibility.');
    if(ctx.website==='confirmed'&&!ctx.serviceIssueText&&!(ctx.trust.rating||ctx.trust.reviews))reviewParts.push('While reviewing visible website signals, I found crawl evidence worth manually checking before outreach.');
    if(reviewParts.length)lines.push(reviewParts.join(' '));else lines.push('While reviewing visible website signals, I found a few items that may be worth manually checking before outreach.');
    lines.push('Would it be worth sending over a quick opportunity snapshot?');
    return lines.join('\n\n');
  }
  function chip(label,value,tone){return {label:label,value:value,tone:tone||'neutral'}}
  function build(l){
    var business=get(l,['company_name','business','business_name','name'],'this business'),city=get(l,['city'],''),country=get(l,['country'],''),niche=get(l,['niche','industry','business_type'],'local service'),industryText=industry(niche),market=[city,country].filter(Boolean).join(', '),signals=num(l,['evidence','evidence_count','seo_evidence_signal_count','seo_verified_issue_count','seo_issue_count','signal_count']),website=boolText(get(l,['website_accessible','crawl_accessible','http_status','indexability_status'],'')),service=serviceLocationFacts(l),serviceLine=serviceLocationLine(l),contact=contactFacts(l),contactLine=contactPath(l),trust=trustFacts(l),trustText=trustLine(l),status=get(l,['status','qualification_status','lead_status'],'Needs Review');
    var serviceIssueText='';
    if(service.servicePages===0&&service.locationPages===0)serviceIssueText='While reviewing visible website signals, I couldn’t confirm dedicated service or location pages.';else if(service.servicePages===0)serviceIssueText='While reviewing visible website signals, I couldn’t confirm dedicated service pages.';else if(service.locationPages===0)serviceIssueText='While reviewing visible website signals, I couldn’t confirm dedicated location pages.';
    var why=[marketLine(business,city,niche),serviceLine,'Contact path: '+contactLine+'.','Website accessibility/crawl status: '+website+'.',trustText,'Evidence signals available: '+signals+'.'];
    var visible=['Website crawl '+(website==='confirmed'?'completed successfully.':website==='not confirmed'?'was not confirmed.':'status was not returned.'),signals+' SEO-related signal(s) were detected.'];
    if(trust.rating||trust.reviews)visible.push(trustText);
    if(contact.email||contact.phone||contact.contactPage)visible.push('Contact path found: '+contactLine+'.');else visible.push('Contact path was not confirmed in the available fields.');
    if(service.servicePages===0||service.locationPages===0)visible.push('Dedicated service/location pages were not confirmed in the available fields.');else visible.push('Dedicated service/location page counts returned: '+service.servicePages+' service page(s), '+service.locationPages+' location page(s).');
    var chips=[chip('Website','Accessible',website==='confirmed'?'good':'neutral'),chip('Signals',String(signals),signals?'good':'neutral'),chip('Phone',contact.phone?'Found':'Missing',contact.phone?'good':'warn'),chip('Reviews',trust.reviews?String(trust.reviews):'Not returned',trust.reviews?'good':'neutral'),chip('Service pages',String(service.servicePages),service.servicePages?'good':'warn'),chip('Location pages',String(service.locationPages),service.locationPages?'good':'warn')];
    var ctx={business:business,city:city,industryText:industryText,website:website,serviceIssueText:serviceIssueText,trust:trust};
    var opener=buildOpener(ctx),action=nextAction(status,contact);
    var brief='Agency Lead Brief\n\nWhy this lead may be worth outreach:\n- '+why.join('\n- ')+'\n\nVisible evidence found:\n- '+visible.join('\n- ')+'\n\nSuggested Outreach Opener:\n'+opener+'\n\nRecommended Next Action:\n'+action+'\n\nNote: Use evidence-backed language and verify details before outreach.';
    return {business:business,why:why,visible:visible,chips:chips,opener:opener,action:action,brief:brief,status:status,market:market};
  }
  function renderList(items){return '<ul>'+items.map(function(x){return'<li>'+esc(x)+'</li>'}).join('')+'</ul>'}
  function renderChips(items){return '<div class="agency-brief-chip-grid">'+items.map(function(x){return'<div class="agency-brief-chip '+esc(x.tone)+'"><span>'+esc(x.label)+'</span><b>'+esc(x.value)+'</b></div>'}).join('')+'</div>'}
  function render(){
    var root=document.getElementById('leadDetailPage');if(!root)return false;
    var scores=root.querySelector('.rf25-scores');if(!scores)return false;
    var l=selectedLead()||domLead();if(!l)return false;
    var data=build(l),existing=root.querySelector('#agencyLeadBrief');
    var signature=[data.business,data.status,data.why.join('|'),data.visible.join('|'),data.chips.map(function(m){return m.label+m.value}).join('|'),data.opener,data.action].join('::');
    if(existing&&existing.getAttribute('data-brief-signature')===signature){window.RankForgeAgencyLeadBrief={data:data,render:render,build:build};return true;}
    var html='<section class="rf25-card agency-lead-brief agency-brief-v2" id="agencyLeadBrief" data-brief-signature="'+esc(signature)+'"><div class="agency-brief-head"><div><h3>🔎 Agency Lead Brief</h3><p>Evidence-backed outreach summary</p></div><span>Evidence-Backed</span></div><div class="agency-brief-topgrid"><div class="agency-brief-panel safe"><h4>✅ Why this lead may be worth outreach</h4>'+renderList(data.why)+'</div><div class="agency-brief-panel evidence"><h4>🔢 Evidence Summary</h4><p class="agency-brief-subtitle">Visible evidence found:</p>'+renderList(data.visible)+renderChips(data.chips)+'</div></div><div class="agency-brief-wide opener"><div><h4>💬 Suggested Outreach Opener</h4><p>'+esc(data.opener).replace(/\n/g,'<br>')+'</p></div><button type="button" data-agency-copy="opener">Copy Outreach Opener</button></div><div class="agency-brief-wide action"><div><h4>🟨 Recommended Next Action</h4><p>'+esc(data.action)+'</p></div><button type="button" data-agency-copy="brief">Copy Lead Brief</button></div><p class="agency-brief-note">Use evidence-backed language and verify details before outreach.</p><small id="agencyBriefCopied" aria-live="polite" class="agency-brief-copied"></small></section>';
    if(existing)existing.outerHTML=html;else scores.insertAdjacentHTML('afterend',html);
    window.RankForgeAgencyLeadBrief={data:data,render:render,build:build};return true;
  }
  function copyText(text){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);var ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);return Promise.resolve()}
  document.addEventListener('click',function(ev){var btn=ev.target&&ev.target.closest&&ev.target.closest('[data-agency-copy]');if(btn){var data=window.RankForgeAgencyLeadBrief&&window.RankForgeAgencyLeadBrief.data;if(!data)return;var text=btn.dataset.agencyCopy==='brief'?data.brief:data.opener;copyText(text).then(function(){var n=document.getElementById('agencyBriefCopied');if(n){n.textContent='Copied';setTimeout(function(){n.textContent=''},COPY_OK_MS)}}).catch(function(){var n=document.getElementById('agencyBriefCopied');if(n)n.textContent='Copy failed'});return;}if(ev.target&&ev.target.closest&&ev.target.closest('[data-view="leadDetail"],#openLeadDetailBtn,tr[data-id]'))startRetry();},true);
  function startRetry(){if(retryTimer)clearInterval(retryTimer);retryCount=0;retryTimer=setInterval(function(){retryCount++;var ok=render();if(ok||retryCount>=8){clearInterval(retryTimer);retryTimer=null;}},250)}
  document.addEventListener('rankforge:rendered',function(){setTimeout(render,100)});
  window.addEventListener('rankforge:dashboard-session',startRetry);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startRetry);else startRetry();
})();
