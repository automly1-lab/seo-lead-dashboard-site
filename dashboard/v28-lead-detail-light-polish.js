(function(){
  'use strict';
  var ENDPOINT = 'https://lastaccount1907.app.n8n.cloud/webhook/rankforge-search-results';
  var SELECTED = 'rankforge-last-lead';
  var audits = [];
  var issuesOpen = false;

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function esc(v){ return clean(v).replace(/[&<>"']/g, function(x){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]; }); }
  function key(v){ return clean(v).toLowerCase().replace(/[^a-z0-9]/g,''); }
  function canon(v){ return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\b(the|a|an|was|were|is|are|on|in|from|available|crawl|crawled|confirmed|dedicated|business|page|pages|clearly)\b/g,' ').replace(/\s+/g,' ').trim(); }
  function uniq(arr){ var seen=[]; return (arr||[]).filter(function(x){ x=clean(x); if(!x) return false; var cx=canon(x); if(seen.some(function(s){ return cx===s || cx.indexOf(s)>-1 || s.indexOf(cx)>-1; })) return false; seen.push(cx); return true; }); }
  function obj(v){ if(!v) return {}; if(typeof v === 'object') return v; try { return JSON.parse(clean(v)||'{}'); } catch(e){ return {}; } }
  function flat(o,r,p){ r=r||{}; p=p||''; Object.keys(o||{}).forEach(function(k){ var v=o[k], n=p?p+'_'+k:k; if(v && typeof v==='object' && !Array.isArray(v)) flat(v,r,n); else { r[k]=v; r[n]=v; } }); return r; }
  function get(o,names,fb){ var m={}; Object.keys(o||{}).forEach(function(k){ m[key(k)] = o[k]; }); for(var i=0;i<names.length;i++){ if(clean(o && o[names[i]])) return clean(o[names[i]]); var v=m[key(names[i])]; if(clean(v)) return clean(v); } return fb || ''; }
  function title(v){ return clean(v).replace(/_/g,' ').replace(/-/g,' ').replace(/\s+/g,' ').replace(/\b\w/g,function(m){ return m.toUpperCase(); }); }
  function pretty(v){ var s=clean(v), x=s.toLowerCase(); var map={true:'Yes',false:'No',none:'Not found',weak:'Needs improvement',medium:'Needs review',strong:'Strong',high:'Strong',low:'Low',indexable_from_available_signals:'Indexable from available signals',maps_position_6_12_opportunity_zone_maps_deep_pool:'Ranks outside the strongest local map positions',local_seo_opportunity_audit:'Local SEO opportunity identified from the audit'}; if(map[x]) return map[x]; if(/^[a-z0-9_\-]+$/.test(s) && s.indexOf('_')>-1) return title(s); return s; }
  function issue(v){
    var raw=clean(v), parts=raw.split(':'), code=parts[0], detail=parts.slice(1).join(':').trim();
    var map={
      no_service_pages_found:'This business does not have dedicated service pages.',
      no_location_pages_found:'This business does not have dedicated location or service area pages.',
      target_service_not_found:'Their homepage does not mention the target service clearly.',
      target_city_not_found:'Their homepage does not mention the target city clearly.',
      title_missing_service:'The title tag does not mention the main service.',
      title_missing_city:'The title tag does not mention the city.',
      no_local_business_schema:'LocalBusiness schema was not detected.',
      weak_meta_description:'The meta description needs improvement.',
      thin_content:'The homepage content looks too thin.',
      low_content_depth:'The site needs deeper service content.',
      no_reviews_signal:'Review signals were not confirmed on the website.',
      no_contact_cta_found:'A clear contact call to action was not detected.',
      low_internal_linking:'The site needs stronger internal linking.'
    };
    var main=map[code] || pretty(code), extra=detail ? pretty(detail) : '';
    return extra && canon(main)!==canon(extra) && main.toLowerCase().indexOf(extra.toLowerCase())<0 ? main+' '+extra : main;
  }
  function list(v){
    var out=[];
    if(Array.isArray(v)) out=v.map(issue);
    else {
      var raw=clean(v); if(!raw) return [];
      try {
        var j=JSON.parse(raw);
        if(Array.isArray(j)) out=j.map(function(x){ return issue(typeof x==='string' ? x : (x.issue || x.claim || x.signal || x.fact || x.summary || JSON.stringify(x))); });
        else if(j && typeof j==='object') out=Object.keys(j).map(function(k){ return title(k)+': '+pretty(j[k]); });
      } catch(e){ out=raw.split(/\n|\s*\|\s*|;\s*/).map(issue); }
    }
    return uniq(out);
  }
  function st(){ try { return state; } catch(e){ return window.state || {leads:[], searches:[]}; } }
  function domain(o){ return get(o,['display_domain','domain','clean_website_url','website_url','final_url'],'').replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].toLowerCase(); }
  function same(a,b){ return !!a && !!b && clean(a).toLowerCase() === clean(b).toLowerCase(); }
  function currentLead(){
    var s=st(), id=sessionStorage.getItem(SELECTED) || s.selected;
    var l=(s.leads||[]).find(function(x){ return x.id===id || x.lead_id===id; }) || (s.leads||[])[0];
    if(!l) return null;
    var base=flat(Object.assign({}, l, obj(l.lead_record), obj(l.audit_record), obj(l.contact_record), obj(l.seo_audit), obj(l.audit), obj(l.contact), obj(l.raw_json)), {});
    var d=domain(base);
    var audit=(audits||[]).map(function(a){ return flat(a,{}); }).find(function(a){ return same(get(a,['audit_id'],''),get(base,['audit_id'],'')) || same(get(a,['prospect_id'],''),get(base,['prospect_id','id'],'')) || (same(get(a,['search_id'],''),get(base,['search_id'],'')) && domain(a)===d) || (domain(a) && domain(a)===d); });
    return audit ? flat(Object.assign({}, base, audit), {}) : base;
  }
  function issueData(lead){
    var all=uniq([].concat(list(get(lead,['seo_top_issues'],'')), list(get(lead,['seo_actionable_issues'],'')), list(get(lead,['seo_verified_claims'],'')), list(get(lead,['seo_need_reasons'],''))));
    var count=Number(get(lead,['seo_issue_count','seo_evidence_signal_count','seo_verified_issue_count'],''));
    return { all: all, count: Number.isFinite(count) && count>0 ? count : all.length };
  }
  function findMini(label){
    return Array.from(document.querySelectorAll('#leadDetailPage .rf25-mini')).find(function(card){ return clean(card.querySelector('small') && card.querySelector('small').textContent).toLowerCase().indexOf(label.toLowerCase()) > -1; });
  }
  function setTooltip(label, text){ var card=findMini(label); if(card) card.setAttribute('title', text); }
  function setBadge(label, value, cls, tooltip){ var card=findMini(label); if(!card) return; if(tooltip) card.setAttribute('title', tooltip); var s=card.querySelector('strong'); if(s) s.innerHTML='<span class="rf25-badge '+cls+'">'+esc(value)+'</span>'; }
  function numberFrom(label){ var card=findMini(label); if(!card) return null; var m=clean(card.querySelector('strong') && card.querySelector('strong').textContent).match(/\d+/); return m ? Number(m[0]) : null; }
  function polishContent(){
    setTooltip('Indexability','Search engines can likely index this site based on detected signals.');
    setTooltip('Title Tag Quality','Title doesn’t include target keyword.');
    setTooltip('Meta Description Quality','Missing clear service intent.');
    setTooltip('Local SEO Quality','No schema or location markup detected.');
    setTooltip('Content Depth','Checks whether the page has enough useful SEO content.');
    var words=numberFrom('Homepage Word Count'), wc=findMini('Homepage Word Count');
    if(Number.isFinite(words) && wc){ var strong=wc.querySelector('strong'); if(strong) strong.textContent=words+' / 1500 target words'; var bar=wc.querySelector('.rf25-bar i'); if(bar) bar.style.width=Math.min(100,Math.round(words/1500*100))+'%'; }
    ['Service Pages','Location Pages'].forEach(function(label){ var n=numberFrom(label); if(n===0){ setBadge(label,'0 pages found','rf25-bad', label==='Service Pages'?'No dedicated service pages detected.':'No dedicated location pages detected.'); } });
    var depth=findMini('Content Depth'); if(depth){ var raw=clean(depth.querySelector('strong') && depth.querySelector('strong').textContent); if(!raw || raw==='Not found' || raw==='Not returned' || raw==='0') setBadge('Content Depth','Not enough content detected','rf25-warn','The page does not appear to have enough useful content for strong SEO targeting.'); }
  }
  function topIssuesBox(){
    var cards=Array.from(document.querySelectorAll('#leadDetailPage .rf25-card'));
    var card=cards.find(function(el){ return clean(el.querySelector('h3') && el.querySelector('h3').textContent).toLowerCase().indexOf('seo need')>-1; });
    if(!card) return null;
    var h=Array.from(card.querySelectorAll('h3')).find(function(el){ return clean(el.textContent).toLowerCase().indexOf('top issues')>-1; });
    return h ? h.parentElement : null;
  }
  function renderIssues(){
    var box=topIssuesBox(), lead=currentLead(); if(!box || !lead) return;
    var data=issueData(lead), all=data.all, count=Math.max(data.count, all.length), visible=box.querySelectorAll('.rf25-list li').length;
    var old=box.querySelector('.rf28-issues'); if(old) old.remove();
    if(count<=visible || all.length<=visible) return;
    var wrap=document.createElement('div');
    wrap.className='rf28-issues';
    wrap.innerHTML='<button type="button" class="rf28-toggle" aria-expanded="false">See all '+count+' issues</button><div class="rf28-panel" hidden><div class="rf28-title">All audit issues</div><ul>'+all.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul></div>';
    box.appendChild(wrap);
    applyIssueState();
  }
  function applyIssueState(){
    var wrap=document.querySelector('#leadDetailPage .rf28-issues'); if(!wrap) return;
    var btn=wrap.querySelector('.rf28-toggle'), panel=wrap.querySelector('.rf28-panel'); if(!btn || !panel) return;
    if(issuesOpen){ panel.removeAttribute('hidden'); btn.textContent='Hide issues'; btn.setAttribute('aria-expanded','true'); }
    else { panel.setAttribute('hidden',''); if(btn.textContent==='Hide issues') btn.textContent=btn.dataset.label || 'See all issues'; btn.setAttribute('aria-expanded','false'); }
    if(!btn.dataset.label) btn.dataset.label=btn.textContent;
  }
  document.addEventListener('click', function(ev){
    var btn=ev.target.closest && ev.target.closest('.rf28-toggle'); if(!btn) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    issuesOpen=!issuesOpen;
    applyIssueState();
  }, true);
  function css(){
    if(document.getElementById('rf28-css')) return;
    var s=document.createElement('style'); s.id='rf28-css';
    s.textContent='.rf28-issues{margin-top:14px}.rf28-toggle{border:1px solid rgba(96,165,250,.36)!important;background:linear-gradient(135deg,rgba(37,99,235,.22),rgba(29,78,216,.15))!important;color:#bfdbfe!important;border-radius:999px!important;padding:8px 12px!important;font-weight:900!important;cursor:pointer!important}.rf28-toggle:hover{background:linear-gradient(135deg,rgba(37,99,235,.32),rgba(29,78,216,.22))!important;color:#fff!important}.rf28-panel{margin-top:12px;border:1px solid rgba(148,163,184,.14);background:rgba(15,31,52,.72);border-radius:14px;padding:14px}.rf28-title{color:#93c5fd;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px}.rf28-panel ul{margin:0;padding-left:18px;display:grid;gap:10px;color:#dbeafe}.rf28-panel li{line-height:1.55}.rf25-helper{margin-top:8px;color:#9cc3ee;font-size:12px;line-height:1.4}';
    document.head.appendChild(s);
  }
  function run(){ css(); polishContent(); renderIssues(); }
  function session(){ if(window.rankforgeAuth && window.rankforgeAuth.getSession) return window.rankforgeAuth.getSession(); try { return JSON.parse(localStorage.getItem('rankforge-auth-session-v1')||'null'); } catch(e){ return null; } }
  async function loadAudits(){
    var s=session()||{}, ss=st(), ids=(ss.searches||[]).map(function(x){ return x.search_id || x.id; }).filter(Boolean);
    var body=new URLSearchParams(); body.set('email', s.email || (ss.user && ss.user.email) || ''); body.set('user_id', s.userId || s.id || (ss.user && ss.user.userId) || ''); body.set('search_ids', ids.join(',')); body.set('event','get_search_results_for_lead_detail');
    try { var r=await fetch(localStorage.getItem('rankforge-search-results-endpoint-v1') || ENDPOINT,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'},body:body.toString()}); var q=await r.json(); audits=[].concat(q.seo_audits||[], q.audits||[], q.data && q.data.seo_audits || []); run(); } catch(e){ console.warn('Lead detail light polish fetch failed', e); }
  }
  function schedule(){ setTimeout(run,120); setTimeout(run,650); setTimeout(run,1400); }
  document.addEventListener('click', function(ev){ if(ev.target.closest && (ev.target.closest('[data-view="leadDetail"]') || ev.target.closest('tr[data-id]') || ev.target.id==='openLeadDetailBtn')) schedule(); }, true);
  function boot(){ schedule(); loadAudits(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();