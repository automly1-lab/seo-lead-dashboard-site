/* RankForge selected lead URL/storage sync fix v2 */
(function(){
  'use strict';
  var STATE_KEY='rankforge-clean-app-state-v1';
  var LEAD_KEY='rankforge-selected-lead-id-v1';
  var LIST_KEY='rankforge-selected-list-id-v1';
  var PAGE=(document.body&&document.body.dataset&&document.body.dataset.page)||'';
  function clean(v){return String(v==null?'':v).trim();}
  function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function saveSelection(listId,leadId){
    var state=parse(localStorage.getItem(STATE_KEY),{})||{};
    if(listId){state.selectedListId=listId;localStorage.setItem(LIST_KEY,listId);sessionStorage.setItem(LIST_KEY,listId);}
    if(leadId){state.selectedLeadId=leadId;localStorage.setItem(LEAD_KEY,leadId);sessionStorage.setItem(LEAD_KEY,leadId);}
    localStorage.setItem(STATE_KEY,JSON.stringify(state));
  }
  function urlIds(){
    try{var p=new URLSearchParams(location.search||'');return{leadId:clean(p.get('lead_id')||p.get('id')),listId:clean(p.get('list_id')||p.get('search_id'))};}catch(e){return{leadId:'',listId:''};}
  }
  function installListCapture(){
    if(PAGE!=='leads'&&PAGE!=='dashboard')return;
    document.addEventListener('click',function(event){
      var row=event.target.closest('[data-lead-id]');
      var link=event.target.closest('a[href*="lead-detail"]');
      var state=parse(localStorage.getItem(STATE_KEY),{})||{};
      var leadId=row?clean(row.getAttribute('data-lead-id')||row.dataset.leadId):'';
      var listId=row?clean(row.getAttribute('data-list-id')||row.dataset.listId||state.selectedListId):'';
      if(link){
        try{var u=new URL(link.href,location.href);leadId=clean(u.searchParams.get('lead_id')||u.searchParams.get('id')||leadId);listId=clean(u.searchParams.get('list_id')||u.searchParams.get('search_id')||listId||state.selectedListId);if(leadId){u.searchParams.set('lead_id',leadId);if(listId)u.searchParams.set('list_id',listId);link.href=u.toString();}}catch(e){}
      }
      if(leadId)saveSelection(listId,leadId);
    },true);
  }
  function applyUrlSelection(){
    if(PAGE!=='lead-detail')return;
    var ids=urlIds();
    if(ids.leadId||ids.listId)saveSelection(ids.listId,ids.leadId);
  }
  function init(){installListCapture();applyUrlSelection();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
