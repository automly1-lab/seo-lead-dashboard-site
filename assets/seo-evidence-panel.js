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
  function esc(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function safeParse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function num(v){var n=Number(v||0);return Number.isFinite(n)?Math.round(n):0;}
  function boolish(v){var t=clean(v).toLowerCase();return ['true','yes','1','verified','high','found','detected','accessible','ok','200'].indexOf(t)>=0;}
  function falseish(v){var t=clean(v).toLowerCase();return ['false','no','0','missing','not_found','not found','blocked','failed','error','none'].indexOf(t)>=0;}
  function getState(){return safeParse(localStorage.getItem(STATE_KEY),{})||{};}
  function currentUserId(){var state=getState();return clean(state.currentUserId||localStorage.getItem(USER_KEY)||'');}
  function selectedLeadId(){
    try{var p=new URLSearchParams(location.search||'');if(clean(p.get('lead_id')))return clean(p.get('lead_id'));}catch(e){}
    try{if(clean(sessionStorage.getItem(SELECTED_LEAD_KEY)))return clean(sessionStorage.getItem(SELECTED_LEAD_KEY));}catch(e){}
    try{if(clean(localStorage.getItem(SELECTED_LEAD_KEY)))return clean(localStorage.getItem(SELECTED_LEAD_KEY));}catch(e){}
    return clean(getState().selectedLeadId||'');
  }
  function selectedCompany(){return clean(document.getElementById('detailCompany')&&document.getElementById('detailCompany').textContent);}
  function field(row,names){for(var i=0;i<names.length;i++){var v=clean(row&&row[names[i]]);if(v)return v;}return '';}
  function combine(lead,audit){return Object.assign({},audit||{},lead||{});}
  function asBoolLabel(v){if(!clean(v))return '';if(boolish(v))return 'Yes';if(falseish(v))return 'No';return clean(v);}
  function parseGvizTable(parsed){
    var cols=((parsed.table&&parsed.table.cols)||[]).map(function(col){return col.label||col.id;});
    return ((parsed.table&&parsed.table.rows)||[]).map(function(row){
      var record={};var cells=row.c||[];
      cols.forEach(function(key,index){var cell=cells[index];record[key]=cell?clean(cell.f||cell.v||''):'';});
      return record;
    });
  }
  function fetchRows(sheetName){
    return new Promise(function(resolve){
      var cb='rfSeoEvidence_'+sheetName+'_'+Date.now()+'_'+Math.floor(Math.random()*10000);
      var script=document.createElement('script');
      var timeout=setTimeout(function(){cleanup();resolve([]);},12000);
      function cleanup(){clearTimeout(timeout);script.remove();try{delete window[cb];}catch(e){window[cb]=undefined;}}
      window[cb]=function(parsed){try{cleanup();resolve(parseGvizTable(parsed));}catch(e){cleanup();resolve([]);}};
      script.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(sheetName)+'&tqx=responseHandler:'+encodeURIComponent(cb);
      script.async=true;script.onerror=function(){cleanup();resolve([]);};
      document.body.appendChild(script);
    });
  }

  function idOf(row){return clean(row.lead_id||row.id||row.final_lead_id);}
  function userOf(row){return clean(row.user_id||row.userId);}
  function auditIdOf(row){return clean(row.audit_id||row.auditId);}
  function prospectIdOf(row){return clean(row.prospect_id||row.prospectId);}
  function companyOf(row){return clean(row.company_name||row.company||row.business_name);}
  function findSelected(finalLeads){
    var id=selectedLeadId();var uid=currentUserId();var company=selectedCompany().toLowerCase();
    var rows=finalLeads.filter(function(r){return !uid||userOf(r)===uid;});
    if(id){var exact=rows.find(function(r){return idOf(r)===id;});if(exact)return exact;}
    if(company&&company!=='no lead selected'){
      var byCompany=rows.find(function(r){return companyOf(r).toLowerCase()===company;});
      if(byCompany)return byCompany;
    }
    return null;
  }

  function softenClaim(text){
    var t=clean(text);if(!t)return '';
    t=t.replace(/\bstrongly indicates\b/ig,'may indicate')
       .replace(/\bproves\b/ig,'may suggest')
       .replace(/\bclearly shows\b/ig,'appears to show')
       .replace(/\bbad SEO\b/ig,'potential SEO weakness')
       .replace(/\bmust\b/ig,'may need to');
    return t;
  }

  function parseJsonArray(raw){
    raw=clean(raw);
    if(!raw)return [];
    var direct=safeParse(raw,null);
    if(Array.isArray(direct))return direct;
    if(direct&&typeof direct==='object')return [direct];
    // Sometimes Google Sheets stores JSON with doubled quotes or visible line breaks.
    var normalized=raw.replace(/^\s*"/,'').replace(/"\s*$/,'').replace(/""/g,'"');
    var parsed=safeParse(normalized,null);
    if(Array.isArray(parsed))return parsed;
    if(parsed&&typeof parsed==='object')return [parsed];
    return [];
  }

  function splitIssues(raw){
    raw=clean(raw);
    if(!raw)return [];
    return raw.split(/\s*\|\s*/).map(function(part){
      part=clean(part);
      if(!part)return null;
      var bits=part.split(':');
      var key=clean(bits.shift()||'');
      var label=clean(bits.join(':')||part);
      return {type:key||'seo_issue',label:label,evidence:'',severity:'medium',source_url:'',verified:true};
    }).filter(Boolean).slice(0,12);
  }

  var NON_ISSUE_TYPES={
    robots_blocked:1,
    noindex_found:1,
    noindex_tag:1,
    canonical_url:1,
    crawl_accessible:1,
    http_status:1,
    indexability_status:1
  };

  function normalizeIssue(issue,row){
    if(!issue||typeof issue!=='object')return null;
    var type=clean(issue.type||issue.key||issue.issue||issue.id||'seo_issue');
    var label=clean(issue.label||issue.title||issue.message||issue.name||issue.description||'');
    var evidence=clean(issue.evidence||issue.detail||issue.value||issue.source_text||'');
    var severity=clean(issue.severity||issue.priority||'medium').toLowerCase();
    var source=clean(issue.source_url||issue.url||field(row,['evidence_source_url','clean_website_url','website_url','final_url']));
    var verified=issue.verified==null?true:boolish(issue.verified);
    if(!label)return null;
    if(NON_ISSUE_TYPES[type]&&!/detected|blocked|noindex/i.test(label+' '+evidence))return null;
    return {type:type,label:softenClaim(label),evidence:softenClaim(evidence),severity:severity||'medium',source_url:source,verified:verified};
  }

  function buildFallbackIssues(row){
    var raw=field(row,['seo_actionable_issues','seo_top_issues','seo_verified_claims']);
    var fromText=splitIssues(raw).map(function(i){return normalizeIssue(i,row);}).filter(Boolean);
    if(fromText.length)return fromText;

    var issues=[];
    function push(cond,type,label,evidence,severity){
      if(cond)issues.push(normalizeIssue({type:type,label:label,evidence:evidence,severity:severity||'medium',verified:true},row));
    }
    push(field(row,['title_has_city'])&&falseish(field(row,['title_has_city'])),'title_missing_city','Title tag does not confirm the target city',field(row,['title_tag']),'medium');
    push(field(row,['title_has_service'])&&falseish(field(row,['title_has_service'])),'title_missing_service','Title tag does not confirm the target service',field(row,['title_tag']),'medium');
    var metaLen=num(field(row,['meta_description_length']));
    push(metaLen>0&&(metaLen<80||metaLen>170),'weak_meta_description','Meta description is missing or outside a useful length range',metaLen+' characters','medium');
    push(field(row,['meta_has_city'])&&falseish(field(row,['meta_has_city'])),'meta_missing_city','Meta description does not confirm the target city',field(row,['meta_description']),'low');
    push(field(row,['meta_has_service'])&&falseish(field(row,['meta_has_service'])),'meta_missing_service','Meta description does not confirm the target service',field(row,['meta_description']),'low');
    push(num(field(row,['homepage_word_count']))>0&&num(field(row,['homepage_word_count']))<450,'thin_homepage_content','Homepage content appears thin for a local service business',num(field(row,['homepage_word_count']))+' words detected','high');
    push(field(row,['h1_count'])&&num(field(row,['h1_count']))!==1,'weak_h1_structure','H1 structure is missing or unclear',num(field(row,['h1_count']))+' H1 tag(s) detected','medium');
    push(field(row,['service_page_count'])&&num(field(row,['service_page_count']))===0,'no_service_pages_found','Dedicated service pages were not confirmed','0 service page(s) detected','high');
    push(field(row,['location_page_count'])&&num(field(row,['location_page_count']))===0,'no_location_pages_found','Dedicated location or service-area pages were not confirmed','0 location page(s) detected','high');
    push(field(row,['target_city_found'])&&falseish(field(row,['target_city_found'])),'target_city_not_found','Target city was not confirmed in the available crawl','','high');
    push(field(row,['target_service_found'])&&falseish(field(row,['target_service_found'])),'target_service_not_found','Target service was not confirmed in the available crawl','','high');
    push(field(row,['local_business_schema_found'])&&falseish(field(row,['local_business_schema_found'])),'no_local_business_schema','LocalBusiness structured data was not detected',field(row,['schema_types_found'])||'No LocalBusiness schema detected','medium');
    push(field(row,['contact_page_found'])&&falseish(field(row,['contact_page_found'])),'no_contact_page_found','Contact page was not confirmed','','medium');
    push(field(row,['contact_cta_found'])&&falseish(field(row,['contact_cta_found'])),'weak_contact_cta','Clear contact CTA was not confirmed','','low');
    push(field(row,['reviews_signal_found'])&&falseish(field(row,['reviews_signal_found'])),'no_review_signal','Review or testimonial signals were not confirmed','','low');
    push(field(row,['mobile_viewport_found'])&&falseish(field(row,['mobile_viewport_found'])),'mobile_viewport_missing','Mobile viewport tag was not detected','','medium');
    push(field(row,['ssl_https_found'])&&falseish(field(row,['ssl_https_found'])),'https_not_confirmed','HTTPS was not confirmed on the final URL',field(row,['clean_website_url','website_url']),'high');
    return issues.filter(Boolean);
  }

  function normalizeFact(label,value,kind){
    value=clean(value);
    if(!value)return null;
    return {label:label,value:value,kind:kind||'neutral'};
  }

  function buildTechnicalFacts(row){
    var facts=parseJsonArray(field(row,['technical_facts_json'])).map(function(f){
      if(!f||typeof f!=='object')return null;
      return normalizeFact(f.label||f.type||f.key,f.value||f.evidence||f.status,f.kind||'neutral');
    }).filter(Boolean);

    if(facts.length)return facts;
    return [
      normalizeFact('Crawl source',field(row,['crawl_source_field'])||'unknown','neutral'),
      normalizeFact('HTML analyzed',field(row,['homepage_html_bytes_analyzed'])?field(row,['homepage_html_bytes_analyzed'])+' bytes':'','neutral'),
      normalizeFact('Text analyzed',field(row,['homepage_text_words_analyzed'])?field(row,['homepage_text_words_analyzed'])+' words':'','neutral'),
      normalizeFact('HTTP status',field(row,['http_status']),'neutral'),
      normalizeFact('Indexability',field(row,['indexability_status']),'neutral'),
      normalizeFact('Robots blocked',asBoolLabel(field(row,['robots_blocked'])),'neutral'),
      normalizeFact('Noindex tag',asBoolLabel(field(row,['noindex_found'])),'neutral'),
      normalizeFact('Canonical URL',field(row,['canonical_url']),'neutral'),
      normalizeFact('Mobile viewport',asBoolLabel(field(row,['mobile_viewport_found'])),'neutral'),
      normalizeFact('HTTPS',asBoolLabel(field(row,['ssl_https_found'])),'neutral')
    ].filter(Boolean);
  }

  function buildEvidence(lead,audit){
    var row=combine(lead,audit);
    var evidenceJson=parseJsonArray(field(row,['seo_evidence_json']));
    var issues=evidenceJson.map(function(i){return normalizeIssue(i,row);}).filter(Boolean);
    if(!issues.length)issues=buildFallbackIssues(row);

    var crawlSource=field(row,['crawl_source_field']);
    var htmlBytes=num(field(row,['homepage_html_bytes_analyzed']));
    var textWords=num(field(row,['homepage_text_words_analyzed','homepage_word_count']));
    var crawlAccessible=boolish(field(row,['crawl_accessible'])) || htmlBytes>500 || textWords>50;
    var verifiedField=field(row,['seo_claims_verified']);
    var verifiedIssueCount=num(field(row,['seo_verified_issue_count'])) || issues.filter(function(i){return i.verified;}).length;
    var verified=(verifiedField?boolish(verifiedField):false) || (crawlAccessible && verifiedIssueCount>=2 && textWords>=60);
    var confidence=field(row,['seo_confidence']) || (verified?'verified':'review');
    var source=field(row,['evidence_source_url','clean_website_url','website_url','final_url']);
    var summary=field(row,['seo_evidence_summary']);
    if(verified&&issues.length){
      summary='From the available crawl, this site has '+verifiedIssueCount+' actionable SEO issue(s) worth reviewing before outreach.';
    }else if(crawlAccessible&&issues.length){
      summary='Some SEO-related issues were captured, but the evidence is still best treated as a review candidate.';
    }else{
      summary='The crawl did not capture enough actionable SEO evidence for a strong claim.';
    }

    return {
      row:row,
      source:source,
      verified:verified,
      confidence:confidence,
      issues:issues.slice(0,10),
      facts:buildTechnicalFacts(row).slice(0,12),
      crawlSource:crawlSource,
      htmlBytes:htmlBytes,
      textWords:textWords,
      verifiedIssueCount:verifiedIssueCount,
      summary:summary,
      manualReason:field(row,['seo_manual_review_reason']),
      debug:field(row,['crawl_debug'])
    };
  }

  function ensureStyles(){
    if(document.getElementById('rfSeoEvidenceStylesV3'))return;
    var style=document.createElement('style');
    style.id='rfSeoEvidenceStylesV3';
    style.textContent=[
      '.rf-seo-evidence-panel{margin-top:22px}',
      '.rf-seo-v3-card{display:grid;gap:18px;padding:22px;border:1px solid rgba(15,23,42,.09);border-radius:24px;background:linear-gradient(135deg,rgba(21,94,239,.06),rgba(20,184,166,.04)),#fff;box-shadow:0 16px 36px rgba(15,23,42,.055)}',
      '.rf-seo-v3-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}',
      '.rf-seo-v3-head h3{margin:0;font-size:24px;letter-spacing:-.045em}',
      '.rf-seo-v3-summary{margin:0;color:#344054;line-height:1.65;font-size:15px}',
      '.rf-evidence-badge{display:inline-flex;align-items:center;min-height:30px;padding:6px 10px;border-radius:999px;background:rgba(15,23,42,.06);font-weight:850;font-size:12px;color:#344054;white-space:nowrap}',
      '.rf-evidence-badge.is-verified{background:rgba(16,185,129,.13);color:#047857}.rf-evidence-badge.is-review{background:rgba(245,158,11,.15);color:#92400e}.rf-evidence-badge.is-low{background:rgba(100,116,139,.12);color:#475569}',
      '.rf-issue-list{display:grid;gap:10px;margin:0;padding:0;list-style:none}',
      '.rf-issue-card{display:grid;gap:5px;padding:14px 15px;border-radius:18px;border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.82)}',
      '.rf-issue-card strong{color:#0f172a;font-size:15px}.rf-issue-card p{margin:0;color:#475467;line-height:1.55;font-size:13px}',
      '.rf-issue-meta{display:flex;gap:8px;flex-wrap:wrap;color:#667085;font-size:11px;font-weight:850;text-transform:uppercase;letter-spacing:.07em}',
      '.rf-severity-high{color:#b42318}.rf-severity-medium{color:#b54708}.rf-severity-low{color:#475467}',
      '.rf-facts-wrap{display:grid;gap:10px}',
      '.rf-facts-title{margin:2px 0 0;color:#344054;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:.08em}',
      '.rf-facts-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
      '.rf-fact{padding:12px 13px;border:1px solid rgba(15,23,42,.08);border-radius:16px;background:rgba(255,255,255,.7)}',
      '.rf-fact span{display:block;color:#667085;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.rf-fact strong{display:block;margin-top:5px;color:#0f172a;font-size:13px;line-height:1.45;word-break:break-word}',
      '.rf-evidence-warning{margin:0;padding:13px 14px;border-radius:16px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.24);color:#78350f;line-height:1.55}',
      '.rf-evidence-source{font-size:12px;color:#667085;word-break:break-word}',
      '@media(max-width:980px){.rf-facts-grid{grid-template-columns:1fr}.rf-seo-v3-head{display:grid}.rf-evidence-badge{white-space:normal}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function ensurePanel(){
    var existing=document.getElementById('rfSeoEvidencePanel');
    if(existing)return existing;
    var anchor=document.getElementById('rfLeadDetailQualityPanel')||document.querySelector('.detail-section:nth-of-type(3)')||document.querySelector('.detail-grid-single article.panel');
    if(!anchor)return null;
    var section=document.createElement('section');
    section.id='rfSeoEvidencePanel';
    section.className='detail-section rf-seo-evidence-panel';
    section.innerHTML=[
      '<div class="rf-seo-v3-card">',
        '<div class="rf-seo-v3-head">',
          '<div><p class="panel-eyebrow">Verified SEO Evidence</p><h3>Actionable SEO opportunity evidence</h3></div>',
          '<span class="rf-evidence-badge is-low">Checking evidence</span>',
        '</div>',
        '<p class="rf-seo-v3-summary">Loading available SEO evidence…</p>',
        '<ul class="rf-issue-list"></ul>',
        '<p class="rf-evidence-warning" hidden></p>',
        '<div class="rf-facts-wrap"><p class="rf-facts-title">Technical crawl facts</p><div class="rf-facts-grid"></div></div>',
        '<div class="rf-evidence-source"></div>',
      '</div>'
    ].join('');
    anchor.insertAdjacentElement('afterend',section);
    return section;
  }

  function renderEvidence(evidence){
    ensureStyles();
    var panel=ensurePanel();if(!panel)return;
    var badge=panel.querySelector('.rf-evidence-badge');
    var summary=panel.querySelector('.rf-seo-v3-summary');
    var list=panel.querySelector('.rf-issue-list');
    var warning=panel.querySelector('.rf-evidence-warning');
    var facts=panel.querySelector('.rf-facts-grid');
    var source=panel.querySelector('.rf-evidence-source');

    badge.className='rf-evidence-badge '+(evidence.verified?'is-verified':(evidence.issues.length?'is-review':'is-low'));
    badge.textContent=(evidence.verified?'Verified actionable issues':'Review candidate')+' · '+evidence.verifiedIssueCount+' issue(s)';
    summary.textContent=evidence.summary;

    if(evidence.issues.length){
      list.innerHTML=evidence.issues.map(function(issue){
        var sev=clean(issue.severity||'medium').toLowerCase();
        return '<li class="rf-issue-card">'+
          '<div class="rf-issue-meta"><span class="rf-severity-'+esc(sev)+'">'+esc(sev||'medium')+'</span><span>'+esc(issue.type||'seo_issue')+'</span></div>'+
          '<strong>'+esc(issue.label)+'</strong>'+
          (issue.evidence?'<p>'+esc(issue.evidence)+'</p>':'')+
        '</li>';
      }).join('');
    }else{
      list.innerHTML='<li class="rf-issue-card"><strong>No actionable SEO issue confirmed yet</strong><p>The crawler did not capture enough evidence to make a specific SEO claim. Keep this lead in review.</p></li>';
    }

    var warn='';
    if(!evidence.verified)warn='No verified SEO claim should be used yet. Use this as a review candidate until the site is manually checked or the crawler captures stronger evidence.';
    if(evidence.manualReason)warn+=(warn?' ':'')+softenClaim(evidence.manualReason);
    warning.hidden=!warn;
    warning.textContent=warn;

    facts.innerHTML=evidence.facts.map(function(f){
      return '<div class="rf-fact"><span>'+esc(f.label)+'</span><strong>'+esc(f.value)+'</strong></div>';
    }).join('');

    source.textContent=[
      evidence.source?'Evidence source: '+evidence.source:'',
      evidence.debug?'Debug: '+evidence.debug:''
    ].filter(Boolean).join(' · ');
  }

  async function run(){
    if(loaded)return;loaded=true;
    ensureStyles();ensurePanel();
    var rows=await Promise.all([fetchRows('final_leads'),fetchRows('seo_audits')]);
    var finalLeads=rows[0]||[];var audits=rows[1]||[];
    var lead=findSelected(finalLeads);
    if(!lead){
      renderEvidence({verified:false,verifiedIssueCount:0,issues:[],facts:[],summary:'Selected lead evidence could not be found in final_leads.',source:'',debug:''});
      return;
    }
    var audit=audits.find(function(a){return auditIdOf(a)&&auditIdOf(a)===auditIdOf(lead);})||
              audits.find(function(a){return prospectIdOf(a)&&prospectIdOf(a)===prospectIdOf(lead);})||{};
    renderEvidence(buildEvidence(lead,audit));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,1000);});
  else setTimeout(run,1000);
})();
