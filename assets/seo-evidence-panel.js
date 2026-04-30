(function(){
  'use strict';

  var PAGE=document.body&&document.body.dataset?document.body.dataset.page:'';
  if(PAGE!=='lead-detail')return;

  var SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var STATE_KEY='rankforge-clean-app-state-v1';
  var SELECTED_LEAD_KEY='rankforge-selected-lead-id-v1';
  var USER_KEY='rankforge-current-user-id-v1';
  var loaded=false;

  function clean(v){return String(v==null?'':v).trim();}
  function safeParse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function esc(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function boolish(v){var t=clean(v).toLowerCase();return ['true','yes','1','verified','high','found','detected','accessible','ok','200'].indexOf(t)>=0;}
  function falseish(v){var t=clean(v).toLowerCase();return ['false','no','0','missing','not_found','not found','blocked','failed','error','none'].indexOf(t)>=0;}
  function num(v){var n=Number(v||0);return Number.isFinite(n)?Math.round(n):0;}
  function getState(){return safeParse(localStorage.getItem(STATE_KEY),{})||{};}
  function currentUserId(){var state=getState();return clean(state.currentUserId||localStorage.getItem(USER_KEY)||'');}
  function selectedLeadId(){try{var p=new URLSearchParams(location.search||'');if(clean(p.get('lead_id')))return clean(p.get('lead_id'));}catch(e){}try{if(clean(sessionStorage.getItem(SELECTED_LEAD_KEY)))return clean(sessionStorage.getItem(SELECTED_LEAD_KEY));}catch(e){}try{if(clean(localStorage.getItem(SELECTED_LEAD_KEY)))return clean(localStorage.getItem(SELECTED_LEAD_KEY));}catch(e){}return clean(getState().selectedLeadId||'');}
  function selectedCompany(){return clean(document.getElementById('detailCompany')&&document.getElementById('detailCompany').textContent);}

  function softenClaim(text){
    var t=clean(text); if(!t)return '';
    t=t.replace(/\bstrongly indicates\b/ig,'may indicate').replace(/\bproves\b/ig,'may suggest').replace(/\bclearly shows\b/ig,'appears to show').replace(/\bshows no accessible SEO signals\b/ig,'did not return accessible SEO signals in the available crawl').replace(/\bThere are no\b/ig,'The available crawl did not confirm').replace(/\bno visible\b/ig,'no confirmed visible').replace(/\bmust\b/ig,'may need to').replace(/\bbad SEO\b/ig,'potential SEO weakness');
    if(!/available crawl|available signals|appears|may|not confirmed|could not confirm|captured/i.test(t)) t='From the available crawl, '+t.charAt(0).toLowerCase()+t.slice(1);
    return t;
  }

  function parseGvizTable(parsed){var cols=((parsed.table&&parsed.table.cols)||[]).map(function(col){return col.label||col.id;});return ((parsed.table&&parsed.table.rows)||[]).map(function(row){var record={};var cells=row.c||[];cols.forEach(function(key,index){var cell=cells[index];record[key]=cell?clean(cell.f||cell.v||''):'';});return record;});}
  function fetchRows(sheetName){return new Promise(function(resolve){var cb='rfSeoEvidence_'+sheetName+'_'+Date.now()+'_'+Math.floor(Math.random()*10000);var script=document.createElement('script');var timeout=setTimeout(function(){cleanup();resolve([]);},12000);function cleanup(){clearTimeout(timeout);script.remove();try{delete window[cb];}catch(e){window[cb]=undefined;}}window[cb]=function(parsed){try{cleanup();resolve(parseGvizTable(parsed));}catch(e){cleanup();resolve([]);}};script.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(sheetName)+'&tqx=responseHandler:'+encodeURIComponent(cb);script.async=true;script.onerror=function(){cleanup();resolve([]);};document.body.appendChild(script);});}
  function idOf(row){return clean(row.lead_id||row.id||row.final_lead_id);}
  function userOf(row){return clean(row.user_id||row.userId);}
  function auditIdOf(row){return clean(row.audit_id||row.auditId);}
  function prospectIdOf(row){return clean(row.prospect_id||row.prospectId);}
  function companyOf(row){return clean(row.company_name||row.company||row.business_name);}
  function findSelected(finalLeads){var id=selectedLeadId();var uid=currentUserId();var company=selectedCompany().toLowerCase();var rows=finalLeads.filter(function(r){return !uid||userOf(r)===uid;});if(id){var exact=rows.find(function(r){return idOf(r)===id;});if(exact)return exact;}if(company&&company!=='no lead selected'){var byCompany=rows.find(function(r){return companyOf(r).toLowerCase()===company;});if(byCompany)return byCompany;}return null;}
  function splitList(value){var raw=clean(value);if(!raw)return [];try{var parsed=JSON.parse(raw);if(Array.isArray(parsed))return parsed.map(clean).filter(Boolean);}catch(e){}return raw.split(/\s*(?:\||;|\n|•)\s*/).map(clean).filter(Boolean).slice(0,10);}
  function field(row,names){for(var i=0;i<names.length;i++){var v=clean(row&&row[names[i]]);if(v)return v;}return '';}
  function combine(lead,audit){return Object.assign({},audit||{},lead||{});}
  function yesNo(v){if(!clean(v))return '';if(boolish(v))return 'Yes';if(falseish(v))return 'No';return clean(v);}

  function addBoolSignal(signals,label,value,positiveText,negativeText,negativeIsIssue){
    if(!clean(value))return;
    if(boolish(value))signals.push({label:label,value:positiveText||'Found',kind:'verified'});
    else signals.push({label:label,value:negativeText||'Not confirmed',kind:negativeIsIssue?'warning':'neutral'});
  }

  function buildEvidence(lead,audit){
    var row=combine(lead,audit);
    var explicitClaims=splitList(field(row,['seo_verified_claims','verified_seo_claims','seo_opportunity_reasons','seo_need_reasons','seo_reasons','seo_top_issues']));
    var summary=field(row,['seo_evidence_summary','seo_summary','audit_summary','qualification_reason']);
    var confidence=field(row,['seo_confidence','crawl_confidence','evidence_confidence'])||'unknown';
    var verifiedRaw=field(row,['seo_claims_verified','claims_verified','seo_verified']);
    var verified=verifiedRaw?boolish(verifiedRaw):false;
    var manualReason=field(row,['seo_manual_review_reason','manual_review_reason','review_reason']);
    var signals=[];

    var crawlAccessible=field(row,['crawl_accessible','site_accessible']);
    var httpStatus=field(row,['http_status','homepage_http_status']);
    var indexability=field(row,['indexability_status','indexable_status']);
    var robotsBlocked=field(row,['robots_blocked']);
    var noindexFound=field(row,['noindex_found']);
    var canonical=field(row,['canonical_url']);
    var title=field(row,['title_tag','homepage_title','page_title','title']);
    var titleHasCity=field(row,['title_has_city']);
    var titleHasService=field(row,['title_has_service']);
    var metaLen=num(field(row,['meta_description_length','meta_len']));
    var metaHasCity=field(row,['meta_has_city']);
    var metaHasService=field(row,['meta_has_service']);
    var wordCount=num(field(row,['homepage_word_count','word_count','content_word_count']));
    var h1Count=num(field(row,['h1_count']));
    var h1Text=field(row,['h1_text']);
    var servicePages=num(field(row,['service_page_count','detected_service_pages','service_pages_found']));
    var locationPages=num(field(row,['location_page_count','detected_location_pages','location_pages_found']));
    var contactPage=field(row,['contact_page_found']);
    var phoneVisible=field(row,['phone_visible']);
    var emailVisible=field(row,['email_visible']);
    var localSchema=field(row,['local_business_schema_found']);
    var orgSchema=field(row,['organization_schema_found']);
    var reviews=field(row,['reviews_signal_found']);
    var blogFound=field(row,['blog_found']);
    var blogLatest=field(row,['blog_latest_date']);
    var freshContent=field(row,['fresh_content_signal']);
    var cityFound=field(row,['target_city_found','city_signal_found','has_city_keyword']);
    var serviceFound=field(row,['target_service_found','service_signal_found','has_service_keyword']);
    var ctaFound=field(row,['contact_cta_found','has_contact_cta']);
    var issueCount=num(field(row,['seo_issue_count']));
    var source=field(row,['evidence_source_url','contact_evidence_url','website_url','final_url']);

    addBoolSignal(signals,'Crawl accessibility',crawlAccessible,'Site was accessible to the crawler','Site was not accessible to the crawler',true);
    if(httpStatus)signals.push({label:'HTTP status',value:httpStatus,kind:String(httpStatus)==='200'?'verified':'warning'});
    if(indexability)signals.push({label:'Indexability',value:indexability,kind:/indexable|ok/i.test(indexability)?'verified':'warning'});
    addBoolSignal(signals,'Robots blocked',robotsBlocked,'Robots block detected','No robots block detected',true);
    addBoolSignal(signals,'Noindex tag',noindexFound,'Noindex tag detected','No noindex tag detected',true);
    if(canonical)signals.push({label:'Canonical URL',value:canonical,kind:'verified'});
    if(title)signals.push({label:'Title tag',value:title,kind:'verified'});
    addBoolSignal(signals,'Title includes city',titleHasCity,'City found in title','City not confirmed in title',true);
    addBoolSignal(signals,'Title includes service',titleHasService,'Service found in title','Service not confirmed in title',true);
    if(metaLen||field(row,['meta_description_length','meta_len']))signals.push({label:'Meta description length',value:metaLen+' characters',kind:(metaLen<80||metaLen>170)?'warning':'verified'});
    addBoolSignal(signals,'Meta includes city',metaHasCity,'City found in meta description','City not confirmed in meta description',true);
    addBoolSignal(signals,'Meta includes service',metaHasService,'Service found in meta description','Service not confirmed in meta description',true);
    if(wordCount)signals.push({label:'Homepage content depth',value:wordCount+' words detected',kind:wordCount<450?'warning':'verified'});
    if(h1Count||field(row,['h1_count']))signals.push({label:'H1 structure',value:h1Count+' H1 tag(s) detected'+(h1Text?': '+h1Text:''),kind:h1Count===1?'verified':'warning'});
    if(servicePages||field(row,['service_page_count','detected_service_pages','service_pages_found']))signals.push({label:'Service pages',value:servicePages+' page(s) detected',kind:servicePages===0?'warning':'verified'});
    if(locationPages||field(row,['location_page_count','detected_location_pages','location_pages_found']))signals.push({label:'Location pages',value:locationPages+' page(s) detected',kind:locationPages===0?'warning':'verified'});
    addBoolSignal(signals,'Contact page',contactPage,'Contact page found','Contact page not confirmed',true);
    addBoolSignal(signals,'Phone visible',phoneVisible,'Phone visible','Phone not confirmed',false);
    addBoolSignal(signals,'Email visible',emailVisible,'Email visible','Email not confirmed',false);
    addBoolSignal(signals,'LocalBusiness schema',localSchema,'LocalBusiness schema detected','LocalBusiness schema not detected',true);
    addBoolSignal(signals,'Organization schema',orgSchema,'Organization schema detected','Organization schema not detected',false);
    addBoolSignal(signals,'Reviews/testimonials signal',reviews,'Reviews/testimonials signal found','Reviews/testimonials not confirmed',false);
    addBoolSignal(signals,'Blog/content hub',blogFound,'Blog/content section found','Blog/content section not confirmed',false);
    if(blogLatest)signals.push({label:'Latest blog/content date',value:blogLatest,kind:'verified'});
    if(freshContent)signals.push({label:'Fresh content signal',value:yesNo(freshContent),kind:boolish(freshContent)?'verified':'warning'});
    addBoolSignal(signals,'Target city signal',cityFound,'Target city found in available crawl','Target city not confirmed in available crawl',true);
    addBoolSignal(signals,'Target service signal',serviceFound,'Target service found in available crawl','Target service not confirmed in available crawl',true);
    addBoolSignal(signals,'Contact CTA',ctaFound,'CTA/contact path found','CTA not confirmed',true);
    if(issueCount)signals.push({label:'SEO issue count',value:issueCount+' issue(s) flagged by analyzer',kind:issueCount>=2?'warning':'verified'});

    var signalCount=signals.length;
    var warningSignals=signals.filter(function(s){return s.kind==='warning';});
    var enoughEvidence=verified&&signalCount>=3;
    var partialEvidence=!verified&&signalCount>=3;
    var safeClaims=[];
    if(verified&&explicitClaims.length){safeClaims=explicitClaims.map(softenClaim).slice(0,6);}
    else if(verified&&warningSignals.length){safeClaims=warningSignals.map(function(s){return s.label+': '+s.value;}).slice(0,6);}
    else if(partialEvidence){safeClaims=warningSignals.map(function(s){return 'Needs review — '+s.label+': '+s.value;}).slice(0,5);}

    return {summary:summary,confidence:confidence,verified:verified,enoughEvidence:enoughEvidence,partialEvidence:partialEvidence,claims:safeClaims,signals:signals,manualReason:manualReason,source:source};
  }

  function ensureStyles(){if(document.getElementById('rfSeoEvidenceStyles'))return;var style=document.createElement('style');style.id='rfSeoEvidenceStyles';style.textContent=['.rf-seo-evidence-panel{margin-top:22px}', '.rf-seo-evidence-card{display:grid;gap:16px;padding:20px;border:1px solid rgba(15,23,42,.09);border-radius:24px;background:linear-gradient(135deg,rgba(21,94,239,.065),rgba(20,184,166,.045)),#fff;box-shadow:0 16px 36px rgba(15,23,42,.055)}', '.rf-seo-evidence-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}', '.rf-seo-evidence-head h3{margin:0;font-size:22px;letter-spacing:-.04em}', '.rf-evidence-badge{display:inline-flex;align-items:center;min-height:30px;padding:6px 10px;border-radius:999px;background:rgba(15,23,42,.06);font-weight:850;font-size:12px;color:#344054}', '.rf-evidence-badge.is-high{background:rgba(16,185,129,.12);color:#047857}.rf-evidence-badge.is-medium{background:rgba(245,158,11,.14);color:#92400e}.rf-evidence-badge.is-low{background:rgba(100,116,139,.12);color:#475569}', '.rf-seo-evidence-summary{margin:0;color:#344054;line-height:1.65}', '.rf-evidence-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}', '.rf-evidence-item{padding:13px;border:1px solid rgba(15,23,42,.08);border-radius:16px;background:rgba(255,255,255,.78)}', '.rf-evidence-item span{display:block;color:#667085;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.rf-evidence-item strong{display:block;margin-top:5px;color:#0f172a;font-size:13px;line-height:1.45;word-break:break-word}', '.rf-claim-list{display:grid;gap:9px;margin:0;padding:0;list-style:none}.rf-claim-list li{padding-left:22px;position:relative;color:#475467;line-height:1.55}.rf-claim-list li:before{content:"";position:absolute;left:0;top:.62em;width:8px;height:8px;border-radius:999px;background:#155eef}', '.rf-evidence-warning{margin:0;padding:13px 14px;border-radius:16px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.24);color:#78350f;line-height:1.55}', '@media(max-width:980px){.rf-evidence-grid{grid-template-columns:1fr}.rf-seo-evidence-head{display:grid}}'].join('\n');document.head.appendChild(style);}
  function ensurePanel(){var existing=document.getElementById('rfSeoEvidencePanel');if(existing)return existing;var anchor=document.getElementById('rfLeadDetailQualityPanel')||document.querySelector('.detail-section:nth-of-type(3)')||document.querySelector('.detail-grid-single article.panel');if(!anchor)return null;var section=document.createElement('section');section.id='rfSeoEvidencePanel';section.className='detail-section rf-seo-evidence-panel';section.innerHTML='<div class="rf-seo-evidence-card"><div class="rf-seo-evidence-head"><div><p class="panel-eyebrow">Verified SEO Evidence</p><h3>SEO opportunity evidence</h3></div><span class="rf-evidence-badge is-low">Checking evidence</span></div><p class="rf-seo-evidence-summary">Loading available SEO evidence…</p><ul class="rf-claim-list"></ul><div class="rf-evidence-grid"></div><p class="rf-evidence-warning" hidden></p></div>';anchor.insertAdjacentElement('afterend',section);return section;}
  function renderEvidence(evidence){ensureStyles();var panel=ensurePanel();if(!panel)return;var badge=panel.querySelector('.rf-evidence-badge');var summary=panel.querySelector('.rf-seo-evidence-summary');var list=panel.querySelector('.rf-claim-list');var grid=panel.querySelector('.rf-evidence-grid');var warning=panel.querySelector('.rf-evidence-warning');var conf=clean(evidence.confidence).toLowerCase();var cls=(evidence.verified&&conf.indexOf('high')>=0)?'is-high':(evidence.verified||conf.indexOf('medium')>=0)?'is-medium':'is-low';badge.className='rf-evidence-badge '+cls;badge.textContent=(evidence.verified?'Verified evidence':evidence.partialEvidence?'Partial evidence':'Manual review')+' · '+(evidence.confidence||'unknown confidence');if(evidence.verified&&evidence.enoughEvidence){summary.textContent=softenClaim(evidence.summary)||'These notes are based on verified signals captured from the available website crawl. Use them as outreach context, not as an absolute SEO diagnosis.';}else if(evidence.partialEvidence){summary.textContent='Some SEO-related signals were captured, but they are not fully verified. Treat this as a review candidate and use cautious language before outreach.';}else{summary.textContent='Not enough verified SEO evidence was available from the crawl to make a strong SEO claim. Review the website manually before using this lead in outreach.';}list.innerHTML=evidence.claims.length?evidence.claims.map(function(c){return '<li>'+esc(c)+'</li>';}).join(''):'<li>No specific SEO issue is shown unless the workflow captured supporting evidence.</li>';grid.innerHTML=evidence.signals.slice(0,12).map(function(s){return '<div class="rf-evidence-item"><span>'+esc(s.label)+'</span><strong>'+esc(s.value)+'</strong></div>';}).join('');var warn='';if(!evidence.enoughEvidence)warn='No verified evidence → no strong claim. Keep this lead in review unless the website is manually checked.';else if(!evidence.verified)warn='Some evidence exists, but claims are not fully verified yet. Keep outreach language cautious: “appears”, “from available signals”, or “worth reviewing”.';if(evidence.manualReason)warn+=(warn?' ':'')+softenClaim(evidence.manualReason);warning.hidden=!warn;warning.textContent=warn;}
  async function run(){if(loaded)return;loaded=true;ensureStyles();ensurePanel();var rows=await Promise.all([fetchRows('final_leads'),fetchRows('seo_audits')]);var finalLeads=rows[0]||[];var audits=rows[1]||[];var lead=findSelected(finalLeads);if(!lead){renderEvidence({confidence:'low',verified:false,enoughEvidence:false,partialEvidence:false,claims:[],signals:[],summary:'',manualReason:'Selected lead evidence could not be found in final_leads.'});return;}var audit=audits.find(function(a){return auditIdOf(a)&&auditIdOf(a)===auditIdOf(lead);})||audits.find(function(a){return prospectIdOf(a)&&prospectIdOf(a)===prospectIdOf(lead);})||{};renderEvidence(buildEvidence(lead,audit));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,1000);});else setTimeout(run,1000);
})();
