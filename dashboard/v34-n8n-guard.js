(function(){
  'use strict';
  var ALLOW_MS=30000;
  var HOST='lastaccount1907'+'.app.n8n.cloud';
  function t(){return Date.now()}
  function allow(reason){window.rankforgeN8nAllowUntil=t()+ALLOW_MS;window.rankforgeN8nAllowReason=reason||'user_action'}
  function ok(){return Number(window.rankforgeN8nAllowUntil||0)>t()}
  function urlOf(input){try{return typeof input==='string'?input:(input&&input.url)||''}catch(e){return''}}
  function isRf(url){return url.indexOf(HOST)>-1&&url.indexOf('/webhook/rankforge-')>-1}
  function isCreate(url){return url.indexOf('/webhook/rankforge-create-search')>-1}
  document.addEventListener('click',function(e){var x=e.target;if(!x||!x.closest)return;if(x.closest('#refreshResultsBtn'))allow('manual_refresh');if(x.closest('#createBatch'))allow('new_search')},true);
  if(window.fetch&&!window.fetch.__rfN8nGuarded){var f=window.fetch.bind(window);var g=function(input,init){var u=urlOf(input);if(!isRf(u)||isCreate(u)||ok())return f(input,init);console.warn('RankForge blocked automatic n8n call:',u);return Promise.reject(new Error('rankforge_auto_n8n_blocked'))};g.__rfN8nGuarded=true;window.fetch=g}
  function css(){if(document.getElementById('rf34-n8n-guard-css'))return;var s=document.createElement('style');s.id='rf34-n8n-guard-css';s.textContent='#overview .workspace{display:block!important;grid-template-columns:none!important}#overview #detail{display:none!important}#overview .table-panel{width:100%!important;max-width:100%!important;overflow-x:auto!important}#overview .panel-head{align-items:flex-start;flex-wrap:wrap;gap:16px}#overview .panel-head>div:last-child{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;align-items:center;max-width:100%}#overview .panel-head>div:last-child button{margin-left:0!important;white-space:nowrap}#overview .table-panel table{width:100%;min-width:1320px}#overview .table-panel th:nth-child(9),#overview .table-panel td:nth-child(9){display:table-cell!important;width:190px!important;max-width:none!important;overflow:visible!important;text-overflow:clip!important;white-space:nowrap!important}#refreshResultsBtn{border-color:rgba(20,184,166,.35)!important;color:#cffff8!important}#refreshResultsBtn:disabled{opacity:.55;cursor:not-allowed}@media(max-width:900px){#overview .panel-head>div:last-child{justify-content:flex-start}}';document.head.appendChild(s)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',css);else css();
  window.rankforgeN8nGuard={allow:allow,isAllowed:ok};
})();
