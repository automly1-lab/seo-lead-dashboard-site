(function(){
  'use strict';

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function safeJson(v, fallback){ try { return JSON.parse(v || ''); } catch(e){ return fallback; } }
  function st(){ try { return state; } catch(e){ return window.state || null; } }
  function session(){ if(window.rankforgeAuth && window.rankforgeAuth.getSession) return window.rankforgeAuth.getSession(); return safeJson(localStorage.getItem('rankforge-auth-session-v1'), null) || {}; }
  function userKey(){ var s=session()||{}, stateObj=st()||{}, email=clean(s.email || (stateObj.user && stateObj.user.email)).toLowerCase(), id=clean(s.userId || s.id || (stateObj.user && stateObj.user.userId)); return id || email || 'anonymous'; }
  function storeKey(){ return 'rankforge-dashboard-data-v2::' + userKey(); }
  function idOfSearch(batch){ return clean(batch && (batch.search_id || batch.id || batch.searchId || batch.name)); }
  function titleOf(batch){ return clean(batch && (batch.name || batch.search_name || ((batch.niche || 'Search') + ' in ' + (batch.city || 'Unknown city')))); }
  function selectedIndex(){ var stateObj=st(); if(!stateObj || !Array.isArray(stateObj.searches) || !stateObj.searches.length) return -1; var i=Number(stateObj.selectedBatchIndex || 0); return Number.isFinite(i) && i >= 0 && i < stateObj.searches.length ? i : 0; }
  function persistAfterDelete(deletedSearchId, deletedSearchTitle){
    var data=safeJson(localStorage.getItem(storeKey()), { searches:[], leads:[], exports:[] });
    data.searches=(data.searches||[]).filter(function(batch){
      var id=idOfSearch(batch);
      return !(id && deletedSearchId && id === deletedSearchId) && !(deletedSearchTitle && titleOf(batch) === deletedSearchTitle);
    });
    data.leads=(data.leads||[]).filter(function(lead){ return clean(lead.search_id || lead.searchId) !== deletedSearchId; });
    var deletedLeadIds={};
    (data.leads||[]).forEach(function(lead){ deletedLeadIds[clean(lead.id || lead.lead_id)] = true; });
    data.exports=(data.exports||[]).filter(function(id){ return deletedLeadIds[clean(id)] !== false; });
    data.updated_at=new Date().toISOString();
    localStorage.setItem(storeKey(), JSON.stringify(data));
  }
  function deleteBatch(index){
    var stateObj=st();
    if(!stateObj || !Array.isArray(stateObj.searches) || !stateObj.searches[index]) return;
    var batch=stateObj.searches[index];
    var searchId=idOfSearch(batch);
    var title=titleOf(batch);
    var ok=window.confirm('Delete this search batch from the dashboard?\n\n' + title + '\n\nThis removes the batch and its linked leads from this browser dashboard cache. It will not delete n8n or Sheets history.');
    if(!ok) return;

    var removedLeadIds=[];
    stateObj.searches.splice(index,1);
    if(searchId){
      stateObj.leads=(stateObj.leads||[]).filter(function(lead){
        var match=clean(lead.search_id || lead.searchId) === searchId;
        if(match) removedLeadIds.push(clean(lead.id || lead.lead_id));
        return !match;
      });
    }
    if(stateObj.exports && typeof stateObj.exports.delete === 'function') removedLeadIds.forEach(function(id){ stateObj.exports.delete(id); });
    stateObj.selectedBatchIndex=Math.max(0, Math.min(Number(stateObj.selectedBatchIndex || 0), stateObj.searches.length-1));
    if(stateObj.selected && removedLeadIds.indexOf(clean(stateObj.selected)) > -1) stateObj.selected=(stateObj.leads && stateObj.leads[0] && stateObj.leads[0].id) || null;

    persistAfterDelete(searchId, title);
    try { if(window.rankforgeDashboardData && window.rankforgeDashboardData.persist) window.rankforgeDashboardData.persist(); } catch(e){}
    try { if(typeof render === 'function') render(); } catch(e){}
    setTimeout(addDeleteButtons, 80);
  }
  function addDeleteButtons(){
    var cards=Array.from(document.querySelectorAll('#batchCards .search-batch-card[data-batch-index]'));
    cards.forEach(function(card){
      if(card.querySelector('.rf30-delete-batch')) return;
      var top=card.querySelector('.search-batch-top') || card;
      var index=card.getAttribute('data-batch-index');
      var btn=document.createElement('button');
      btn.type='button';
      btn.className='rf30-delete-batch';
      btn.setAttribute('data-delete-batch-index', index);
      btn.setAttribute('aria-label','Delete search batch');
      btn.textContent='Delete';
      top.appendChild(btn);
    });
    var detailActions=document.querySelector('#searchBatchDetail .batch-detail-actions');
    if(detailActions && !detailActions.querySelector('.rf30-delete-selected')){
      var d=document.createElement('button');
      d.type='button';
      d.className='rf30-delete-selected';
      d.textContent='Delete Batch';
      detailActions.appendChild(d);
    }
  }
  function injectCss(){
    if(document.getElementById('rf30-delete-css')) return;
    var style=document.createElement('style');
    style.id='rf30-delete-css';
    style.textContent='.search-batch-top{align-items:flex-start}.rf30-delete-batch{margin-left:auto;border:1px solid rgba(248,113,113,.28);background:rgba(127,29,29,.18);color:#fecaca;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:900;cursor:pointer}.rf30-delete-batch:hover{background:rgba(220,38,38,.22);border-color:rgba(248,113,113,.48);color:#fff}.rf30-delete-selected{border:1px solid rgba(248,113,113,.32)!important;background:rgba(127,29,29,.2)!important;color:#fecaca!important}.rf30-delete-selected:hover{background:rgba(220,38,38,.24)!important;color:#fff!important}';
    document.head.appendChild(style);
  }
  document.addEventListener('click', function(ev){
    var deleteBtn=ev.target.closest && ev.target.closest('[data-delete-batch-index]');
    if(deleteBtn){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); deleteBatch(Number(deleteBtn.getAttribute('data-delete-batch-index'))); return; }
    var selectedBtn=ev.target.closest && ev.target.closest('.rf30-delete-selected');
    if(selectedBtn){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); deleteBatch(selectedIndex()); }
  }, true);
  function patch(){
    if(window.__rf30BatchDeletePatched) return;
    window.__rf30BatchDeletePatched=true;
    var prevSearches=window.searches;
    if(typeof prevSearches === 'function'){
      window.searches=function(){ prevSearches(); setTimeout(addDeleteButtons, 30); };
    }
    var prevRender=window.render;
    if(typeof prevRender === 'function'){
      window.render=function(){ prevRender(); setTimeout(addDeleteButtons, 50); };
    }
  }
  function boot(){ injectCss(); patch(); setTimeout(addDeleteButtons,100); setTimeout(addDeleteButtons,600); setTimeout(addDeleteButtons,1400); }
  document.addEventListener('click', function(ev){ if(ev.target.closest && ev.target.closest('[data-view="searches"]')) setTimeout(addDeleteButtons,80); }, true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();