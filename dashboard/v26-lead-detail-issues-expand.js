(function(){
  'use strict';
  var ENDPOINT = 'https://lastaccount1907.app.n8n.cloud/webhook/rankforge-search-results';
  var SELECTED = 'rankforge-last-lead';
  var loadedAudits = [];

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function esc(v){ return clean(v).replace(/[&<>"']/g, function(x){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]; }); }
  function key(v){ return clean(v).toLowerCase().replace(/[^a-z0-9]/g,''); }
  function canon(v){ return clean(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\b(the|a|an|was|were|is|are|on|in|from|available|crawl|crawled|confirmed|dedicated|business|page|pages|clearly)\b/g,' ').replace(/\s+/g,' ').trim(); }
  function uniq(arr){ var seen=[]; return (arr||[]).filter(function(x){ x=clean(x); if(!x) return false; var cx=canon(x); if(seen.some(function(s){ return cx===s || cx.indexOf(s)>-1 || s.indexOf(cx)>-1; })) return false; seen.push(cx); return true; }); }
  function obj(v){ if(!v) return {}; if(typeof v === 'object') return v; try { return JSON.parse(clean(v) || '{}'); } catch(e){ return {}; } }
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
    var audit=(loadedAudits||[]).map(function(a){ return flat(a,{}); }).find(function(a){ return same(get(a,['audit_id'],''),get(base,['audit_id'],'')) || same(get(a,['prospect_id'],''),get(base,['prospect_id','id'],'')) || (same(get(a,['search_id'],''),get(base,['search_id'],'')) && domain(a)===d) || (domain(a) && domain(a)===d); });
    return audit ? flat(Object.assign({}, base, audit), {}) : base;
  }
  function issueData(lead){
    var all=uniq([].concat(
      list(get(lead,['seo_top_issues'],'')),
      list(get(lead,['seo_actionable_issues'],'')),
      list(get(lead,['seo_verified_claims'],'')),
      list(get(lead,['seo_need_reasons'],''))
    ));
    var count=Number(get(lead,['seo_issue_count','seo_evidence_signal_count','seo_verified_issue_count'],''));
    return { all: all, count: Number.isFinite(count) && count>0 ? count : all.length };
  }
  function findTopIssuesContainer(){
    var cards=Array.from(document.querySelectorAll('#leadDetailPage .rf25-card'));
    var card=cards.find(function(el){ return clean(el.querySelector('h3') && el.querySelector('h3').textContent).toLowerCase().indexOf('seo need')>-1; });
    if(!card) return null;
    var headings=Array.from(card.querySelectorAll('h3'));
    var h=headings.find(function(el){ return clean(el.textContent).toLowerCase().indexOf('top issues')>-1; });
    return h ? h.parentElement : null;
  }
  function renderExpander(){
    var root=document.getElementById('leadDetailPage'); if(!root || !root.querySelector('.rf25')) return;
    var lead=currentLead(); if(!lead) return;
    var data=issueData(lead), all=data.all, count=data.count;
    var container=findTopIssuesContainer(); if(!container) return;
    var existing=container.querySelector('.rf26-issues-expand'); if(existing) existing.remove();
    var visible=Math.max(0, container.querySelectorAll('.rf25-list li').length);
    if(all.length <= visible && count <= visible) return;
    var wrap=document.createElement('div');
    wrap.className='rf26-issues-expand';
    var label='See all '+Math.max(count, all.length)+' issues';
    var hiddenId='rf26-issues-list';
    wrap.innerHTML='<button type="button" class="rf26-toggle" aria-expanded="false">'+esc(label)+'</button><div class="rf26-panel" id="'+hiddenId+'" hidden><div class="rf26-panel-title">All audit issues</div><ul>'+all.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul></div>';
    container.appendChild(wrap);
    var btn=wrap.querySelector('.rf26-toggle'), panel=wrap.querySelector('.rf26-panel');
    btn.addEventListener('click', function(){
      var open=panel.hasAttribute('hidden');
      if(open){ panel.removeAttribute('hidden'); btn.setAttribute('aria-expanded','true'); btn.textContent='Hide issues'; }
      else { panel.setAttribute('hidden',''); btn.setAttribute('aria-expanded','false'); btn.textContent=label; }
    });
  }
  function session(){ if(window.rankforgeAuth && window.rankforgeAuth.getSession) return window.rankforgeAuth.getSession(); try { return JSON.parse(localStorage.getItem('rankforge-auth-session-v1')||'null'); } catch(e){ return null; } }
  async function loadAudits(){
    var s=session()||{}, ss=st(), ids=(ss.searches||[]).map(function(x){ return x.search_id || x.id; }).filter(Boolean);
    var body=new URLSearchParams();
    body.set('email', s.email || (ss.user && ss.user.email) || '');
    body.set('user_id', s.userId || s.id || (ss.user && ss.user.userId) || '');
    body.set('search_ids', ids.join(','));
    body.set('event','get_search_results_for_lead_detail');
    try {
      var r=await fetch(localStorage.getItem('rankforge-search-results-endpoint-v1') || ENDPOINT, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'}, body:body.toString() });
      var q=await r.json();
      loadedAudits=[].concat(q.seo_audits||[], q.audits||[], q.data && q.data.seo_audits || []);
      renderExpander();
    } catch(e){ console.warn('Lead issue expander audit fetch failed', e); }
  }
  function css(){
    if(document.getElementById('rf26-css')) return;
    var style=document.createElement('style');
    style.id='rf26-css';
    style.textContent='.rf26-issues-expand{margin-top:14px}.rf26-toggle{border:1px solid rgba(96,165,250,.32);background:rgba(37,99,235,.12);color:#bfdbfe;border-radius:999px;padding:8px 12px;font-weight:900;cursor:pointer}.rf26-toggle:hover{background:rgba(37,99,235,.2);color:#fff}.rf26-panel{margin-top:12px;border:1px solid rgba(148,163,184,.14);background:rgba(15,31,52,.72);border-radius:14px;padding:14px}.rf26-panel-title{color:#93c5fd;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px}.rf26-panel ul{margin:0;padding-left:18px;display:grid;gap:10px;color:#dbeafe}.rf26-panel li{line-height:1.55}';
    document.head.appendChild(style);
  }
  var observer;
  function boot(){
    css();
    renderExpander();
    loadAudits();
    var root=document.getElementById('leadDetailPage');
    if(root && !observer){
      observer=new MutationObserver(function(){ window.requestAnimationFrame(renderExpander); });
      observer.observe(root,{childList:true,subtree:true});
    }
    setTimeout(renderExpander,400);
    setTimeout(renderExpander,1100);
    setTimeout(renderExpander,1800);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.rankforgeLeadDetailIssuesExpand=renderExpander;
})();