(function(){
  'use strict';

  var pendingDeleteIndex = null;

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function safeJson(v, fallback){ try { return JSON.parse(v || ''); } catch(e){ return fallback; } }
  function st(){ try { return state; } catch(e){ return window.state || null; } }
  function session(){ if(window.rankforgeAuth && window.rankforgeAuth.getSession) return window.rankforgeAuth.getSession(); return safeJson(localStorage.getItem('rankforge-auth-session-v1'), null) || {}; }
  function userKey(){ var s=session()||{}, stateObj=st()||{}, email=clean(s.email || (stateObj.user && stateObj.user.email)).toLowerCase(), id=clean(s.userId || s.id || (stateObj.user && stateObj.user.userId)); return id || email || 'anonymous'; }
  function storeKey(){ return 'rankforge-dashboard-data-v2::' + userKey(); }
  function idOfSearch(batch){ return clean(batch && (batch.search_id || batch.id || batch.searchId || batch.name)); }
  function titleOf(batch){ return clean(batch && (batch.name || batch.search_name || ((batch.niche || 'Search') + ' in ' + (batch.city || 'Unknown city')))); }
  function selectedIndex(){ var stateObj=st(); if(!stateObj || !Array.isArray(stateObj.searches) || !stateObj.searches.length) return -1; var i=Number(stateObj.selectedBatchIndex || 0); return Number.isFinite(i) && i >= 0 && i < stateObj.searches.length ? i : 0; }
  function stats(batch){ var raw=Number(batch && (batch.raw ?? batch.discovered ?? batch.total ?? batch.max_results_requested ?? 0))||0; var audited=Number(batch && (batch.audited ?? batch.pages_checked ?? batch.audit_count ?? 0))||0; var qualified=Number(batch && (batch.qualified ?? batch.qualified_leads ?? 0))||0; var rejected=Number(batch && (batch.rejected ?? 0))||0; var review=Number(batch && (batch.review ?? batch.needsReview ?? batch.needs_review ?? 0))||0; return {raw:raw,audited:audited,qualified:qualified,rejected:rejected,review:review}; }
  function displayStatus(batch){
    var s=clean(batch && batch.status).toLowerCase();
    var x=stats(batch);
    if(s.indexOf('blocked')>-1 || s.indexOf('limit')>-1) return 'Blocked';
    if(s.indexOf('complete')>-1 || s.indexOf('done')>-1 || s.indexOf('finished')>-1) return 'Completed';
    if(x.raw > 0 && x.audited >= x.raw) return 'Completed';
    if(x.raw > 0 && (x.qualified + x.review + x.rejected) >= x.raw) return 'Completed';
    if(s.indexOf('review')>-1) return 'Needs Review';
    if(s.indexOf('queue')>-1) return 'Queued';
    if(s.indexOf('run')>-1 || !s) return 'Running';
    return clean(batch.status).replace(/_/g,' ').replace(/\b\w/g,function(m){return m.toUpperCase();});
  }
  function statusClass(label){ var s=clean(label).toLowerCase(); if(s.indexOf('complete')>-1) return 'completed'; if(s.indexOf('block')>-1) return 'blocked'; if(s.indexOf('run')>-1 || s.indexOf('queue')>-1) return 'running'; if(s.indexOf('review')>-1) return 'review'; return ''; }
  function persistAfterDelete(deletedSearchId, deletedSearchTitle){
    var data=safeJson(localStorage.getItem(storeKey()), { searches:[], leads:[], exports:[] });
    data.searches=(data.searches||[]).filter(function(batch){
      var id=idOfSearch(batch);
      return !(id && deletedSearchId && id === deletedSearchId) && !(deletedSearchTitle && titleOf(batch) === deletedSearchTitle);
    });
    data.leads=(data.leads||[]).filter(function(lead){ return clean(lead.search_id || lead.searchId) !== deletedSearchId; });
    var remainingLeadIds={};
    (data.leads||[]).forEach(function(lead){ remainingLeadIds[clean(lead.id || lead.lead_id)] = true; });
    data.exports=(data.exports||[]).filter(function(id){ return !!remainingLeadIds[clean(id)]; });
    data.updated_at=new Date().toISOString();
    localStorage.setItem(storeKey(), JSON.stringify(data));
  }
  function performDelete(index){
    var stateObj=st();
    if(!stateObj || !Array.isArray(stateObj.searches) || !stateObj.searches[index]) return;
    var batch=stateObj.searches[index];
    var searchId=idOfSearch(batch);
    var title=titleOf(batch);

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
    closeDeleteModal();
    setTimeout(refreshBatchUi, 80);
  }
  function ensureDeleteModal(){
    if(document.getElementById('rf30DeleteModal')) return;
    var div=document.createElement('div');
    div.id='rf30DeleteModal';
    div.className='rf30-modal';
    div.innerHTML='<div class="rf30-modal-card" role="dialog" aria-modal="true" aria-labelledby="rf30DeleteTitle"><div class="rf30-modal-icon">!</div><div><h2 id="rf30DeleteTitle">Delete search batch?</h2><p id="rf30DeleteText">This removes the batch from your dashboard cache.</p></div><div class="rf30-modal-actions"><button type="button" class="rf30-cancel" id="rf30CancelDelete">Cancel</button><button type="button" class="rf30-confirm" id="rf30ConfirmDelete">Delete batch</button></div></div>';
    document.body.appendChild(div);
  }
  function openDeleteModal(index){
    var stateObj=st(); if(!stateObj || !stateObj.searches || !stateObj.searches[index]) return;
    pendingDeleteIndex=index;
    ensureDeleteModal();
    var batch=stateObj.searches[index];
    var text=document.getElementById('rf30DeleteText');
    if(text) text.innerHTML='<strong>'+escapeHtml(titleOf(batch))+'</strong><br><span>This removes the batch and its linked leads from this dashboard cache. n8n and Sheets history will stay untouched.</span>';
    var modal=document.getElementById('rf30DeleteModal');
    if(modal) modal.classList.add('open');
  }
  function closeDeleteModal(){ pendingDeleteIndex=null; var modal=document.getElementById('rf30DeleteModal'); if(modal) modal.classList.remove('open'); }
  function escapeHtml(v){ return clean(v).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]}); }
  function polishStatuses(){
    var stateObj=st(); if(!stateObj || !Array.isArray(stateObj.searches)) return;
    Array.from(document.querySelectorAll('#batchCards .search-batch-card[data-batch-index]')).forEach(function(card){
      var batch=stateObj.searches[Number(card.getAttribute('data-batch-index')||0)]; if(!batch) return;
      var label=displayStatus(batch); var pill=card.querySelector('.batch-status');
      if(pill){ pill.textContent=label; pill.className='batch-status '+statusClass(label); }
    });
    var idx=selectedIndex(); var selected=stateObj.searches[idx]; var detailPill=document.querySelector('#searchBatchDetail .batch-status');
    if(detailPill && selected){ var d=displayStatus(selected); detailPill.textContent=d; detailPill.className='batch-status '+statusClass(d); }
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
  function refreshBatchUi(){ addDeleteButtons(); polishStatuses(); }
  function injectCss(){
    if(document.getElementById('rf30-delete-css')) return;
    var style=document.createElement('style');
    style.id='rf30-delete-css';
    style.textContent='.search-batch-top{align-items:flex-start}.rf30-delete-batch{margin-left:auto;border:1px solid rgba(248,113,113,.28);background:rgba(127,29,29,.18);color:#fecaca;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:900;cursor:pointer}.rf30-delete-batch:hover{background:rgba(220,38,38,.22);border-color:rgba(248,113,113,.48);color:#fff}.rf30-delete-selected{border:1px solid rgba(248,113,113,.32)!important;background:rgba(127,29,29,.2)!important;color:#fecaca!important}.rf30-delete-selected:hover{background:rgba(220,38,38,.24)!important;color:#fff!important}.batch-status.blocked{background:rgba(248,113,113,.14)!important;color:#fecaca!important}.rf30-modal{position:fixed;inset:0;display:none;place-items:center;background:rgba(2,6,23,.72);backdrop-filter:blur(8px);z-index:9999;padding:20px}.rf30-modal.open{display:grid}.rf30-modal-card{width:min(460px,100%);background:#0b1a2d;border:1px solid rgba(148,163,184,.18);border-radius:22px;box-shadow:0 32px 100px rgba(0,0,0,.45);padding:24px;color:#fff;display:grid;gap:16px}.rf30-modal-icon{width:42px;height:42px;border-radius:14px;background:rgba(248,113,113,.16);color:#fecaca;display:grid;place-items:center;font-weight:900;font-size:22px}.rf30-modal-card h2{margin:0;font-size:22px;letter-spacing:-.03em}.rf30-modal-card p{margin:8px 0 0;color:#a7c7ed;line-height:1.55}.rf30-modal-card p strong{display:block;color:#fff;margin-bottom:4px}.rf30-modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:4px}.rf30-modal-actions button{height:42px;border-radius:12px;padding:0 16px;font-weight:900;cursor:pointer}.rf30-cancel{background:rgba(255,255,255,.04);border:1px solid rgba(148,163,184,.22);color:#dbeafe}.rf30-confirm{background:linear-gradient(135deg,#dc2626,#991b1b);border:0;color:#fff;box-shadow:0 12px 30px rgba(220,38,38,.25)}';
    document.head.appendChild(style);
  }
  document.addEventListener('click', function(ev){
    var deleteBtn=ev.target.closest && ev.target.closest('[data-delete-batch-index]');
    if(deleteBtn){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); openDeleteModal(Number(deleteBtn.getAttribute('data-delete-batch-index'))); return; }
    var selectedBtn=ev.target.closest && ev.target.closest('.rf30-delete-selected');
    if(selectedBtn){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); openDeleteModal(selectedIndex()); return; }
    if(ev.target && ev.target.id === 'rf30CancelDelete'){ ev.preventDefault(); closeDeleteModal(); return; }
    if(ev.target && ev.target.id === 'rf30ConfirmDelete'){ ev.preventDefault(); if(pendingDeleteIndex !== null) performDelete(pendingDeleteIndex); return; }
    if(ev.target && ev.target.id === 'rf30DeleteModal'){ closeDeleteModal(); }
  }, true);
  document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape') closeDeleteModal(); });
  function patch(){
    if(window.__rf30BatchDeletePatched) return;
    window.__rf30BatchDeletePatched=true;
    var prevSearches=window.searches;
    if(typeof prevSearches === 'function'){
      window.searches=function(){ prevSearches(); setTimeout(refreshBatchUi, 30); };
    }
    var prevRender=window.render;
    if(typeof prevRender === 'function'){
      window.render=function(){ prevRender(); setTimeout(refreshBatchUi, 50); };
    }
  }
  function boot(){ injectCss(); ensureDeleteModal(); patch(); setTimeout(refreshBatchUi,100); setTimeout(refreshBatchUi,600); setTimeout(refreshBatchUi,1400); }
  document.addEventListener('click', function(ev){ if(ev.target.closest && ev.target.closest('[data-view="searches"]')) setTimeout(refreshBatchUi,80); }, true);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();