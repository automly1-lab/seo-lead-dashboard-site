(function(){
  'use strict';
  var appliedHash='';
  function c(v){return String(v==null?'':v).trim()}
  function n(v){var x=Number(c(v).replace(/[^0-9.-]/g,''));return Number.isFinite(x)?Math.max(0,Math.round(x)):0}
  function st(){try{return state}catch(e){return window.state||null}}
  function safe(v,f){try{return JSON.parse(v||'')}catch(e){return f}}
  function sess(){if(window.rankforgeAuth&&window.rankforgeAuth.getSession)return window.rankforgeAuth.getSession();return safe(localStorage.getItem('rankforge-auth-session-v1'),null)||{}}
  function key(v){return c(v).toLowerCase().replace(/[^a-z0-9]/g,'')}
  function get(o,names,fb){var m={};Object.keys(o||{}).forEach(function(k){m[key(k)]=o[k]});for(var i=0;i<names.length;i++){if(c(o&&o[names[i]]))return c(o[names[i]]);var v=m[key(names[i])];if(c(v))return c(v)}return fb||''}
  function domain(o){return get(o,['display_domain','domain','clean_website_url','website_url','final_url','url'],'').replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].toLowerCase()}
  function same(a,b){return !!a&&!!b&&c(a).toLowerCase()===c(b).toLowerCase()}
  function evidenceCount(o){
    var direct=n(get(o,['direct_evidence_count'],''));
    var crawl=n(get(o,['crawl_based_evidence_count'],''));
    var weak=n(get(o,['weak_evidence_count'],''));
    var signal=n(get(o,['seo_evidence_signal_count','seo_verified_issue_count','seo_issue_count','evidence_count','signal_count','evidence'],''));
    var claims=get(o,['seo_verified_claims','seo_top_issues','seo_actionable_issues','seo_need_reasons'],'');
    var claimCount=0;
    if(claims){
      try{var j=JSON.parse(claims);claimCount=Array.isArray(j)?j.length:Object.keys(j||{}).length}catch(e){claimCount=claims.split(/\n|\s*\|\s*|;\s*/).filter(Boolean).length}
    }
    return Math.max(direct+Math.max(crawl,0), signal, claimCount, weak?direct+crawl:0);
  }
  function normalizeLeadEvidence(leads,audits){
    audits=(audits||[]).map(function(a){return Object.assign({},a)});
    var changed=false;
    (leads||[]).forEach(function(l){
      var d=domain(l), audit=audits.find(function(a){return same(get(a,['audit_id'],''),get(l,['audit_id'],''))||same(get(a,['prospect_id'],''),get(l,['prospect_id','id'],''))||(same(get(a,['search_id'],''),get(l,['search_id'],''))&&domain(a)===d)||(domain(a)&&domain(a)===d)});
      var count=Math.max(evidenceCount(l), audit?evidenceCount(audit):0);
      if(count && n(l.evidence)!==count){l.evidence=count;changed=true}
      if(audit){['seo_evidence_signal_count','seo_verified_issue_count','seo_issue_count','direct_evidence_count','crawl_based_evidence_count','weak_evidence_count'].forEach(function(k){if(c(audit[k])&&!c(l[k]))l[k]=audit[k]})}
    });
    return changed;
  }
  function userKey(){var s=sess()||{}, stateObj=st()||{}, email=c(s.email||(stateObj.user&&stateObj.user.email)).toLowerCase(), id=c(s.userId||s.id||(stateObj.user&&stateObj.user.userId));return id||email||'anonymous'}
  function storeKey(){return 'rankforge-dashboard-data-v2::'+userKey()}
  function localAudits(){return (safe(localStorage.getItem(storeKey()),{})||{}).audits||[]}
  function persist(audits){
    var data=safe(localStorage.getItem(storeKey()),{searches:[],leads:[],audits:[]});
    data.audits=audits||data.audits||[];
    normalizeLeadEvidence(data.leads||[],data.audits||[]);
    data.updated_at=new Date().toISOString();
    localStorage.setItem(storeKey(),JSON.stringify(data));
  }
  function apply(audits){
    var stateObj=st();if(!stateObj)return;
    audits=audits||[];
    var hash=JSON.stringify((stateObj.leads||[]).map(function(l){return [l.id,l.lead_id,l.domain,l.evidence,get(l,['seo_evidence_signal_count','seo_issue_count','direct_evidence_count','crawl_based_evidence_count'],'')]}))+JSON.stringify(audits.map(function(a){return [get(a,['audit_id'],''),get(a,['prospect_id'],''),domain(a),evidenceCount(a)]}));
    if(hash===appliedHash)return;
    var changed=normalizeLeadEvidence(stateObj.leads||[],audits);
    appliedHash=hash;
    persist(audits);
    if(changed){try{if(typeof render==='function')render()}catch(e){}}
  }
  function sync(){apply(localAudits())}
  function boot(){sync()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.rankforgeDashboardEvidenceFix={sync:sync,apply:apply};
})();