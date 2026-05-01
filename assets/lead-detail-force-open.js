(function(){
  'use strict';
  if(((document.body||{}).dataset||{}).page!=='lead-detail')return;
  var SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var cache=null,lastRow=null,lastGoodName='';
  function c(v){return String(v==null?'':v).trim();}
  function bad(v){return /^(undefined|null|nan|\[object object\]|-|no lead selected)$/i.test(c(v));}
  function clean(v){v=c(v);return bad(v)?'':v;}
  function esc(v){return clean(v).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[x];});}
  function parse(raw,f){try{return raw?JSON.parse(raw):f;}catch(e){return f;}}
  function n(v){var x=Number(String(v||'').replace(/[^0-9.-]/g,''));return Number.isFinite(x)?Math.max(0,Math.round(x)):0;}
  function yes(v){return ['true','yes','1','verified','found','detected','available','ok','200'].indexOf(c(v).toLowerCase())>=0;}
  function get(r,keys){for(var i=0;i<keys.length;i++){var v=clean(r&&r[keys[i]]);if(v)return v;}return '';}
  function id(r){return get(r,['lead_id','id','final_lead_id','row_id']);}
  function auditId(r){return get(r,['audit_id','auditId']);}
  function prospectId(r){return get(r,['prospect_id','prospectId']);}
  function company(r){return get(r,['business_name','company_name','company','name']);}
  function domainFrom(url){url=clean(url);if(!url)return '';try{return new URL(/^https?:\/\//i.test(url)?url:'https://'+url).hostname.replace(/^www\./i,'').toLowerCase();}catch(e){return url.replace(/^https?:\/\//i,'').replace(/^www\./i,'').split('/')[0].toLowerCase();}}
  function domain(r){return domainFrom(get(r,['display_domain','domain','clean_website_url','website_url','final_url','website','url']));}
  function setText(id,v){var el=document.getElementById(id);if(el)el.textContent=clean(v)||'';}
  function setHtml(id,v){var el=document.getElementById(id);if(el)el.innerHTML=v;}
  function cls(id,v){var el=document.getElementById(id);if(el)el.className=v;}
  function parseRows(parsed){var cols=((parsed.table&&parsed.table.cols)||[]).map(function(x){return x.label||x.id;});return ((parsed.table&&parsed.table.rows)||[]).map(function(r){var o={};(r.c||[]).forEach(function(cell,i){o[cols[i]]=cell?c(cell.f||cell.v||''):'';});return o;});}
  function fetchSheet(name){return new Promise(function(resolve){var cb='rfforce_'+name+'_'+Date.now()+'_'+Math.floor(Math.random()*99999),sc=document.createElement('script'),to=setTimeout(done,12000);function done(v){clearTimeout(to);try{sc.remove();}catch(e){}try{delete window[cb];}catch(e){}resolve(v||[]);}window[cb]=function(p){try{done(parseRows(p));}catch(e){done([]);}};sc.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(name)+'&tqx=responseHandler:'+encodeURIComponent(cb);sc.async=true;sc.onerror=function(){done([]);};document.body.appendChild(sc);});}
  function merge(a,b){var o={},k;a=a||{};b=b||{};for(k in a)o[k]=a[k];for(k in b){if(!clean(o[k])&&clean(b[k]))o[k]=b[k];}
    ['seo_claims_verified','seo_verified_claims','seo_top_issues','seo_evidence_summary','seo_evidence_signal_count','seo_issue_count','seo_need_score','commercial_fit_score','contact_confidence_score','overall_lead_score','crawl_source_field','homepage_html_bytes_analyzed','homepage_text_words_analyzed','crawl_debug','target_city','target_service','city','niche','business_type','lead_credit_counted','phone','email','decision_maker_phone','decision_maker_email','contact_phone','contact_email','phone_visible','email_visible','contact_page_found','contact_page_url','contact_url','contact_cta_found'].forEach(function(key){if(clean(b[key]))o[key]=b[key];});return o;}
  function selected(){var p=new URLSearchParams(location.search||''),snap=parse(sessionStorage.getItem('rankforge-selected-lead-snapshot-v1')||localStorage.getItem('rankforge-selected-lead-snapshot-v1'),{})||{};return {id:clean(p.get('lead_id')||p.get('id')||snap.lead_id||sessionStorage.getItem('rankforge-selected-lead-id-v1')||localStorage.getItem('rankforge-selected-lead-id-v1')),domain:domainFrom(p.get('domain')||snap.domain||snap.display_domain||sessionStorage.getItem('rankforge-selected-lead-domain-v1')||localStorage.getItem('rankforge-selected-lead-domain-v1')),name:clean(p.get('name')||snap.business_name||snap.company_name||sessionStorage.getItem('rankforge-selected-lead-name-v1')||localStorage.getItem('rankforge-selected-lead-name-v1')),snap:snap};}
  function load(){if(cache)return Promise.resolve(cache);return Promise.all([fetchSheet('final_leads'),fetchSheet('seo_audits')]).then(function(rs){cache={leads:rs[0]||[],audits:rs[1]||[]};return cache;});}
  function findRow(data){var sel=selected(),leads=data.leads||[],audits=data.audits||[];var lead=null;
    if(sel.id)lead=leads.find(function(r){return id(r)===sel.id||auditId(r)===sel.id||prospectId(r)===sel.id;});
    if(!lead&&sel.domain)lead=leads.find(function(r){return domain(r)===sel.domain;});
    if(!lead&&sel.name)lead=leads.find(function(r){return company(r).toLowerCase()===sel.name.toLowerCase();});
    if(!lead&&sel.snap&&Object.keys(sel.snap).length)lead=sel.snap;
    if(!lead)return null;
    var a=null,ldom=domain(lead),lname=company(lead).toLowerCase(),lid=id(lead),laid=auditId(lead),lpid=prospectId(lead);
    if(laid)a=audits.find(function(r){return auditId(r)===laid;});
    if(!a&&lpid)a=audits.find(function(r){return prospectId(r)===lpid;});
    if(!a&&lid)a=audits.find(function(r){return id(r)===lid||get(r,['lead_id'])===lid;});
    if(!a&&ldom)a=audits.find(function(r){return domain(r)===ldom;});
    if(!a&&lname)a=audits.find(function(r){return company(r).toLowerCase()===lname;});
    return merge(lead,a||{});
  }
  function list(raw){raw=clean(raw);if(!raw)return [];var p=parse(raw,null);if(Array.isArray(p))return p.map(function(x){return typeof x==='string'?x:clean(x.label||x.title||x.message||x.description||'');}).filter(Boolean);return raw.split('|').map(function(x){return x.replace(/^[a-z0-9_]+:\s*/i,'').trim();}).filter(Boolean);}
  function issues(row){var arr=list(get(row,['seo_verified_claims','seo_top_issues','seo_evidence_summary']));return arr.slice(0,6);}
  function scoreLabel(x){x=n(x);if(x>=80)return ['Strong','strong'];if(x>=65)return ['Good','good'];if(x>=40)return ['Needs Review','review'];return ['Weak','weak'];}
  function normalizeUrl(url,base){url=clean(url);if(!url)return '';if(/^https?:\/\//i.test(url))return url;if(url.charAt(0)==='/'&&base)return 'https://'+domainFrom(base)+url;return 'https://'+url;}
  function contactValue(row,type,web){
    if(type==='phone')return get(row,['phone','decision_maker_phone','contact_phone','business_phone','primary_phone','phone_number']);
    if(type==='email')return get(row,['email','decision_maker_email','contact_email','business_email','primary_email']);
    if(type==='page')return get(row,['contact_page_url','contact_url','contact_page','contact_link']);
    return '';
  }
  function contactSignal(label,ok,value,kind,web){
    var detail='';
    if(value){
      if(kind==='email')detail='<a class="rf-contact-value" href="mailto:'+esc(value)+'">'+esc(value)+'</a>';
      else if(kind==='phone')detail='<a class="rf-contact-value" href="tel:'+esc(value).replace(/[^0-9+]/g,'')+'">'+esc(value)+'</a>';
      else if(kind==='page'){var href=normalizeUrl(value,web);detail='<a class="rf-contact-value" href="'+esc(href)+'" target="_blank" rel="noreferrer">'+esc(value)+'</a>';}
      else detail='<span class="rf-contact-value">'+esc(value)+'</span>';
    }else if(ok){
      detail='<span class="rf-contact-value muted">Detected, value not captured</span>';
    }else{
      detail='<span class="rf-contact-value muted">Not found</span>';
    }
    return '<div class="rf-contact-signal"><div><span>'+esc(label)+'</span>'+detail+'</div><span class="rf-badge '+(ok?'rf-badge-success':'rf-badge-muted')+'">'+(ok?'Available':'Missing')+'</span></div>';
  }
  function dl(items){return items.filter(function(x){return clean(x[1]);}).map(function(x){return '<div><dt>'+esc(x[0])+'</dt><dd>'+esc(x[1])+'</dd></div>';}).join('')||'<div><dt>Status</dt><dd>Not available</dd></div>';}
  function render(row){
    if(!row)return;
    var sel=selected();
    var name=company(row)||sel.name||company(sel.snap)||'Selected lead';
    if(clean(name))lastGoodName=name;
    var web=get(row,['clean_website_url','website_url','final_url','website','url']),dom=domain(row)||sel.domain,city=get(row,['city','target_city'])||get(sel.snap,['city','target_city'])||'City not set',niche=get(row,['niche','business_type','target_service'])||get(sel.snap,['niche','business_type','target_service'])||'Niche not set';
    lastRow=row;
    var page=document.getElementById('rfLeadDetailPage'),empty=document.getElementById('rfLeadEmptyState');if(page){page.hidden=false;page.style.display='block';}if(empty){empty.hidden=true;empty.style.display='none';}
    var seo=n(get(row,['seo_need_score','seo_score'])),fit=n(get(row,['commercial_fit_score','commercial_score'])),contact=n(get(row,['contact_confidence_score','contact_score'])),overall=n(get(row,['overall_lead_score','lead_score','score']));
    var iss=issues(row),signals=n(get(row,['seo_evidence_signal_count','seo_issue_count','signals','issues']))||iss.length,verified=yes(get(row,['seo_claims_verified']))||signals>=3;
    setText('detailCompany',name);setText('rfLeadCity',city);setText('rfLeadNiche',niche);var a=document.getElementById('detailWebsite');if(a){a.textContent=dom||web||'Website not available';a.href=web||'#';}
    var phoneValue=contactValue(row,'phone',web),emailValue=contactValue(row,'email',web),contactPageValue=contactValue(row,'page',web);
    var phone=yes(get(row,['phone_visible']))||!!phoneValue,email=yes(get(row,['email_visible']))||!!emailValue,cp=yes(get(row,['contact_page_found']))||!!contactPageValue,cta=yes(get(row,['contact_cta_found']));
    var qualified=verified&&signals>=3&&(contact>=60||phone||email||cp||cta);
    cls('rfStatusBadge','rf-badge '+(qualified?'rf-badge-qualified':'rf-badge-review'));setText('rfStatusBadge',qualified?'Qualified':'Needs Review');
    cls('rfEvidenceBadge','rf-badge '+(verified?'rf-badge-verified':signals?'rf-badge-warning':'rf-badge-muted'));setText('rfEvidenceBadge',verified?'Verified evidence · '+signals+' signals':signals?'Partial evidence':'No verified evidence');
    cls('rfCreditBadge','rf-badge '+(qualified?'rf-badge-primary':'rf-badge-muted'));setText('rfCreditBadge',qualified?'Credit counted':'No credit used');
    setText('detailNextAction',qualified?'Contact this business with a local SEO visibility offer.':'Review this lead manually before outreach.');
    setText('rfDecisionReason',verified?'This lead has available crawl signals. Use the verified evidence below before outreach.':'No verified evidence means no strong SEO claim. Keep this lead in Needs Review unless manually checked.');
    cls('rfEvidenceConfidenceBadge','rf-badge '+(verified?'rf-badge-success':signals?'rf-badge-warning':'rf-badge-muted'));setText('rfEvidenceConfidenceBadge',verified?'Evidence confidence: Verified':signals?'Partial evidence available':'No verified evidence');
    setHtml('rfEvidenceState','<div class="rf-evidence-state '+(verified?'verified':signals?'partial':'no-evidence')+'"><h3>'+esc(verified?'Verified crawl evidence found':signals?'Partial evidence available':'No verified SEO evidence yet')+'</h3><p>'+esc(verified?'From the available crawl, this lead has evidence-backed SEO issue(s) worth reviewing before outreach.':signals?'Some crawl signals were found, but review manually before making strong SEO claims.':'We could not verify specific SEO issues from the available crawl. Keep this lead in Needs Review unless the website is manually checked.')+'</p></div>');
    setHtml('rfEvidenceList',iss.map(function(x){return '<li class="rf-evidence-item"><span class="rf-evidence-icon">✓</span><span class="rf-evidence-text"><strong>'+esc(x)+'</strong></span></li>';}).join(''));
    setText('rfEvidenceSource',web?'Evidence source: '+web:'');
    setHtml('rfScoreList',[['SEO Need','Potential SEO gap.',seo],['Commercial Fit','Likely agency value.',fit],['Contact Path','Reachability quality.',contact],['Overall Lead Score','Prioritization score.',overall]].map(function(s){var st=scoreLabel(s[2]);return '<div class="rf-score-row"><div><span class="rf-score-label">'+esc(s[0])+'</span><span class="rf-score-desc">'+esc(s[1])+'</span></div><div class="rf-score-value"><strong class="rf-score-number">'+s[2]+'</strong><span class="rf-score-status"><i class="rf-score-dot '+st[1]+'"></i>'+st[0]+'</span></div></div>';}).join(''));
    setHtml('rfContactPathList',contactSignal('Phone visible',phone,phoneValue,'phone',web)+contactSignal('Email visible',email,emailValue,'email',web)+contactSignal('Contact page found',cp,contactPageValue,'page',web)+contactSignal('Contact CTA found',cta,cta?'Detected':'','cta',web));
    setText('detailContactChannel',phone?'Call first':email?'Email':cp?'Contact form':'Manual enrichment needed');
    setHtml('rfBusinessDetails',dl([['Business name',name],['Website',web],['Domain',dom],['Phone',phoneValue || (phone?'Visible, number not captured':'')],['Email',emailValue || (email?'Visible, email not captured':'')],['Contact page',contactPageValue],['City',city],['Niche',niche],['Business type',get(row,['business_type'])]]));
    setHtml('rfSearchContext',dl([['Search batch/list ID',get(row,['search_id','list_id','listId'])],['Target city',get(row,['target_city','city'])],['Target service',get(row,['target_service','niche','business_type'])],['Qualification status',qualified?'Qualified':'Needs Review'],['Lead credit counted',qualified?'Yes':'No']]));
    setText('detailAngle',verified?'From the available crawl, the site appears to have local SEO signals worth reviewing. A local SEO visibility audit may be a relevant offer.':'No evidence-backed outreach angle is available yet. Review the site manually before contacting this business.');
    setText('detailPersonalization',verified?'I noticed your website may have room to strengthen local search signals from the available page data.':'Use cautious wording only after manual review.');
    setText('detailOffer','Local SEO visibility audit focused on service pages, location targeting, and Google Business Profile alignment.');
  }
  function run(){load().then(function(data){var row=findRow(data);if(row)render(row);});}
  function repairIfOverwritten(){var el=document.getElementById('detailCompany');if(!el)return;if(lastRow&&(bad(el.textContent)||/no lead selected/i.test(el.textContent)||!clean(el.textContent))){render(lastRow);}else if(lastGoodName&&/no lead selected/i.test(el.textContent)){el.textContent=lastGoodName;}}
  [0,200,500,900,1400,2200,3500,5500,8000,12000,18000,25000,35000].forEach(function(ms){setTimeout(function(){run();setTimeout(repairIfOverwritten,80);},ms);});
  setInterval(repairIfOverwritten,700);
  try{new MutationObserver(repairIfOverwritten).observe(document.body,{subtree:true,childList:true,characterData:true});}catch(e){}
})();
