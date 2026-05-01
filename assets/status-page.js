(function(){
  'use strict';
  var FALLBACK={overall:'operational',lastUpdated:'2026-05-02T00:00:00Z',manual:true,components:[
    ['Marketing Site','Homepage, pricing, legal pages, and public navigation.'],['Authentication','Sign up, log in, sessions, and user access.'],['Search Batches','Creating search requests and sending them to the workflow.'],['Website Crawling','Fetching websites and extracting crawlable content.'],['SEO Evidence Analyzer','Converting crawl signals into verified SEO evidence fields.'],['Qualification Gate','Classifying prospects as Qualified, Needs Review, or Rejected.'],['Data Layer','Saving searches, prospects, evidence, and usage records.'],['CSV Export','Exporting contact-ready prospects on eligible plans.'],['Billing & Checkout','Stripe checkout, billing confirmation, and plan activation.'],['Admin Quality Tools','Admin-only crawl, evidence, user, and credit diagnostics.']].map(function(x){return{name:x[0],description:x[1],status:'operational'}}),incidents:[],history:[{date:'2026-05-02',status:'operational',title:'No incidents reported',description:'All systems marked operational.'}]};
  function cls(s){return String(s||'unknown').toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');}
  function label(s){s=cls(s);return ({operational:'Operational',degraded:'Degraded',partial_outage:'Partial outage',outage:'Outage',maintenance:'Maintenance',unknown:'Unknown'})[s]||'Unknown';}
  function overallTitle(s){s=cls(s);return ({operational:'All systems operational',degraded:'Degraded performance',partial_outage:'Partial outage',outage:'Major outage',maintenance:'Maintenance',unknown:'Status data unavailable'})[s]||'Status data unavailable';}
  function icon(s){s=cls(s);if(s==='operational')return'✓';if(s==='maintenance')return'•';if(s==='degraded'||s==='partial_outage')return'!';if(s==='outage')return'×';return'?';}
  function fmtDate(v){try{return new Date(v).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}catch(e){return v||'Unknown';}}
  function safe(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function render(data){
    data=data||FALLBACK;var overall=cls(data.overall);
    var summary=document.querySelector('[data-status-summary]');
    if(summary){summary.innerHTML='<div class="rf-status-icon '+overall+'" aria-hidden="true">'+icon(overall)+'</div><div><div class="rf-summary-top"><h2>'+overallTitle(overall)+'</h2><span class="rf-badge '+overall+'">'+label(overall)+'</span></div><p>Search, evidence analysis, exports, and billing are currently available.</p><div class="rf-meta"><span>'+(data.manual?'Last updated manually':'Last updated')+': '+fmtDate(data.lastUpdated)+'</span><span>Status is currently maintained manually</span></div></div>';}
    var grid=document.querySelector('[data-components]');
    if(grid){grid.innerHTML=(data.components||[]).map(function(c){var st=cls(c.status);return '<article class="rf-component-card"><div class="rf-card-top"><h3>'+safe(c.name)+'</h3><span class="rf-badge '+st+'">'+label(st)+'</span></div><p>'+safe(c.description||'Core RankForge system component.')+'</p><div class="rf-card-meta">Manual status</div></article>';}).join('');}
    var inc=document.querySelector('[data-incidents]');
    if(inc){var items=data.incidents||[];inc.innerHTML=items.length?items.map(function(i){var st=cls(i.status);return '<article class="rf-incident-item"><span class="rf-badge '+st+'">'+label(st)+'</span><h3>'+safe(i.title)+'</h3><p>'+safe(i.description||'Incident update available.')+'</p></article>';}).join(''):'<div class="rf-empty"><strong>No active incidents</strong><p>All monitored systems are currently marked operational.</p></div>';}
    var hist=document.querySelector('[data-history]');
    if(hist){var h=data.history||[];hist.innerHTML=h.length?h.map(function(i){var st=cls(i.status);return '<article class="rf-history-item"><div class="rf-date">'+safe(i.date)+'</div><span class="rf-badge '+st+'">'+label(st)+'</span><h3>'+safe(i.title)+'</h3><p>'+safe(i.description||'Status update.')+'</p></article>';}).join(''):'<div class="rf-empty"><strong>No recent history available</strong><p>Recent history is updated manually.</p></div>';}
    var admin=document.querySelector('[data-admin-status-note]');
    try{var email='';if(window.rankforgeAuth&&window.rankforgeAuth.getSession){var s=window.rankforgeAuth.getSession();email=String(s&&s.email||'').toLowerCase();}if(email==='automly1@gmail.com'&&admin)admin.classList.add('visible');}catch(e){}
  }
  async function load(){try{var res=await fetch('status.json',{cache:'no-store'});if(!res.ok)throw new Error('status json unavailable');render(await res.json());}catch(e){render(FALLBACK);}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
  window.addEventListener('rankforge:session-ready',function(){var admin=document.querySelector('[data-admin-status-note]');try{var s=window.rankforgeAuth&&window.rankforgeAuth.getSession&&window.rankforgeAuth.getSession();if(String(s&&s.email||'').toLowerCase()==='automly1@gmail.com'&&admin)admin.classList.add('visible');}catch(e){}});
})();
