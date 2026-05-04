(function(){
  'use strict';
  function clean(v){return String(v==null?'':v).trim()}
  function lower(v){return clean(v).toLowerCase()}
  function safe(v,f){try{return JSON.parse(v||'')}catch(e){return f}}
  function markReady(){try{document.body&&document.body.classList.add('rf-ready')}catch(e){}}
  function session(){if(window.rankforgeAuth&&window.rankforgeAuth.getSession)return window.rankforgeAuth.getSession();return safe(localStorage.getItem('rankforge-auth-session-v1'),null)||{}}
  function st(){try{return state}catch(e){return null}}
  function key(){var s=session()||{},x=st()||{},email=lower(s.email||(x.user&&x.user.email)),id=clean(s.userId||s.id||(x.user&&x.user.userId));return id||email||'anonymous'}
  function latestStore(){
    var exact='rankforge-dashboard-data-v2::'+key(),data=safe(localStorage.getItem(exact),null);
    if(data)return data;
    var best=null,bestTime=0;
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i)||'';
      if(k.indexOf('rankforge-dashboard-data-v2::')!==0)continue;
      var v=safe(localStorage.getItem(k),null);if(!v)continue;
      var t=Date.parse(v.updated_at||0)||0;
      if(t>=bestTime){best=v;bestTime=t}
    }
    return best||{searches:[],leads:[],audits:[]};
  }
  function idLead(x){return clean(x&&(x.id||x.lead_id||x.leadId||x.prospect_id||x.domain||x.display_domain||x.business||x.company_name))}
  function idSearch(x){return clean(x&&(x.id||x.search_id||x.searchId||x.name))}
  function merge(a,b,idfn){var m=new Map();(a||[]).forEach(function(x){var id=idfn(x);if(id)m.set(id,Object.assign({},x))});(b||[]).forEach(function(x){var id=idfn(x);if(id)m.set(id,Object.assign({},m.get(id)||{},x))});return Array.from(m.values())}
  function domain(o){return clean(o&&(o.display_domain||o.domain||o.clean_website_url||o.website_url||o.final_url||'')).replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].toLowerCase()}
  function mergeAudits(leads,audits){audits=audits||[];return (leads||[]).map(function(l){var d=domain(l);var a=audits.find(function(x){return clean(x.audit_id)&&clean(x.audit_id)===clean(l.audit_id)||clean(x.prospect_id)&&clean(x.prospect_id)===clean(l.prospect_id||l.id)||domain(x)&&domain(x)===d});return a?Object.assign({},l,a):l})}
  function apply(){var s=st();if(!s){markReady();return;}var data=latestStore();var leads=mergeAudits(data.leads||[],data.audits||data.seo_audits||[]);if((data.searches||[]).length)s.searches=merge(s.searches||[],data.searches,idSearch);if(leads.length){s.leads=merge(s.leads||[],leads,idLead);var selected=sessionStorage.getItem('rankforge-last-lead');if(selected&&s.leads.some(function(l){return l.id===selected||l.lead_id===selected}))s.selected=selected;if(!s.selected&&s.leads[0])s.selected=s.leads[0].id||s.leads[0].lead_id||idLead(s.leads[0])}try{if(typeof render==='function')render()}catch(e){}try{if(window.rankforgeLeadDetailAudit)window.rankforgeLeadDetailAudit()}catch(e){}markReady()}
  apply();
  setTimeout(markReady,1200);
  window.rankforgeFastHydrate=apply;
})();