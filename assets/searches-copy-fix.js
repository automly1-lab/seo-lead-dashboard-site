(()=>{
  function $(selector){ return document.querySelector(selector); }
  function set(selector, value){ const el=$(selector); if(el) el.textContent=value; }
  function patchStaticCopy(){
    set('#rfSearchUsageBadge', ($('#rfSearchUsageBadge')?.textContent || '').replace(/searches/gi,'batches').replace(/search/gi,'batch'));
    set('#rfKpiSearchesCreated', $('#rfKpiSearchesCreated')?.textContent || '—');
    const firstKpi = document.querySelector('.rf-search-kpis .rf-kpi-card:first-child span');
    if (firstKpi) firstKpi.textContent = 'Batches Created';
    const firstKpiNote = document.querySelector('.rf-search-kpis .rf-kpi-card:first-child p');
    if (firstKpiNote) firstKpiNote.textContent = 'Monthly batches used';
    const fourthKpiTitle = document.querySelector('.rf-search-kpis .rf-kpi-card:nth-child(4) span');
    if (fourthKpiTitle) fourthKpiTitle.textContent = 'Remaining This Month';
    const fourthKpiNote = document.querySelector('.rf-search-kpis .rf-kpi-card:nth-child(4) p');
    if (fourthKpiNote) fourthKpiNote.textContent = 'Based on your current plan';
    const createCard = document.getElementById('rfSearchCreateCard');
    if (createCard) createCard.remove();
    document.querySelectorAll('.rf-searches-header-actions a.button.primary').forEach((button)=>button.remove());
  }

  function patchAfterRender(){
    const usage = document.getElementById('rfSearchUsageBadge');
    if (usage) usage.textContent = usage.textContent.replace(/Unlimited searches/i,'Unlimited batches').replace(/searches left/i,'batches left').replace(/search left/i,'batch left');
    const loading = document.getElementById('rfSearchLoading');
    if (loading) loading.hidden = true;
    const createCard = document.getElementById('rfSearchCreateCard');
    if (createCard) createCard.remove();
  }

  function install(){
    patchStaticCopy();
    patchAfterRender();
    const original = window.rankforgeSearchesPremium && window.rankforgeSearchesPremium.render;
    if (typeof original === 'function' && !original.__copyFixed) {
      const wrapped = function(){ const result = original.apply(this, arguments); patchStaticCopy(); patchAfterRender(); return result; };
      wrapped.__copyFixed = true;
      window.rankforgeSearchesPremium.render = wrapped;
    }
    setInterval(patchAfterRender, 1000);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', install) : install();
})();
