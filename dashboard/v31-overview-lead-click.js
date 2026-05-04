(function(){
  'use strict';

  function hideOverviewDetailPanel(){
    var styleId = 'rf31-overview-lead-click-css';
    if (!document.getElementById(styleId)) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = '\n        #overview .workspace{grid-template-columns:1fr!important;}\n        #overview #detail{display:none!important;}\n        #overview .table-panel{min-width:0;}\n      ';
      document.head.appendChild(style);
    }
  }

  function setLeadDetailView(){
    try { sessionStorage.setItem('rankforge-last-view', 'leadDetail'); } catch(e) {}
    document.querySelectorAll('.nav').forEach(function(btn){
      btn.classList.toggle('active', btn.dataset && btn.dataset.view === 'leadDetail');
    });
    document.querySelectorAll('.view').forEach(function(view){
      view.classList.toggle('active', view.id === 'leadDetail');
    });
  }

  function openLeadDetailForRow(row){
    if (!row) return;
    var leadId = row.getAttribute('data-id');
    if (!leadId) return;

    try { sessionStorage.setItem('rankforge-last-lead', leadId); } catch(e) {}
    try { if (typeof state !== 'undefined') state.selected = leadId; } catch(e) {}

    setLeadDetailView();

    window.requestAnimationFrame(function(){
      try { if (typeof table === 'function') table(); } catch(e) {}
      try { if (window.rankforgeLeadDetailAudit) window.rankforgeLeadDetailAudit(); } catch(e) {}
      try { if (window.leadDetailPage) window.leadDetailPage(); } catch(e) {}
      try { if (window.rankforgeLeadDetailSeoPolish) window.rankforgeLeadDetailSeoPolish(); } catch(e) {}
      try { if (window.rankforgeLeadDetailIssuesExpand) window.rankforgeLeadDetailIssuesExpand(); } catch(e) {}
    });
  }

  document.addEventListener('click', function(event){
    var target = event.target;
    if (!target) return;
    if (target.closest('input, button, select, textarea, a, label')) return;

    var row = target.closest('#leadRows tr[data-id]');
    if (!row) return;

    event.preventDefault();
    openLeadDetailForRow(row);
  }, true);

  function boot(){
    hideOverviewDetailPanel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();