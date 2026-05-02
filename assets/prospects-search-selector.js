(function(){
  'use strict';
  if(!document.body.classList.contains('app-page-leads')) return;

  function text(v){return String(v==null?'':v).trim();}
  function escapeHtml(v){return text(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function batchSelect(){return document.getElementById('rfBatchFilter');}
  function selectedValue(){var sel=batchSelect();return sel?sel.value:'all';}
  function optionLabel(opt){return text(opt&&opt.textContent)||text(opt&&opt.value)||'Search batch';}
  function currentOptions(){
    var sel=batchSelect();
    if(!sel) return [];
    return Array.from(sel.options||[]).filter(function(opt){return text(opt.value);}).map(function(opt){return {id:text(opt.value),name:optionLabel(opt),count:0};});
  }
  function ensurePanel(){
    var existing=document.getElementById('rfSearchSelectorPanel');if(existing)return existing;
    var kpis=document.querySelector('.rf-prospect-kpis');
    var panel=document.createElement('section');
    panel.id='rfSearchSelectorPanel';
    panel.className='rf-search-selector-panel';
    panel.innerHTML='<div class="rf-search-selector-head"><div><p class="rf-eyebrow">Search Results</p><h2>Choose which search batch to review</h2><p>Select all searches or focus the table on one specific search result set.</p></div><span class="rf-search-selector-count" id="rfSearchSelectorCount">Loading searches</span></div><div class="rf-search-selector-list" id="rfSearchSelectorList"></div>';
    if(kpis&&kpis.parentNode)kpis.parentNode.insertBefore(panel,kpis.nextSibling);else document.querySelector('main').prepend(panel);
    return panel;
  }
  function setSelected(value){
    var sel=batchSelect();
    if(!sel) return;
    value=text(value)||'all';
    var exists=Array.from(sel.options||[]).some(function(opt){return opt.value===value;});
    if(!exists) value='all';
    if(sel.value!==value) sel.value=value;
    sel.dispatchEvent(new Event('change',{bubbles:true}));
    render();
  }
  function render(){
    ensurePanel();
    var list=document.getElementById('rfSearchSelectorList');
    var count=document.getElementById('rfSearchSelectorCount');
    if(!list) return;
    var options=currentOptions();
    var active=selectedValue();
    var searchOptions=options.filter(function(o){return o.id!=='all';});
    if(count) count.textContent=searchOptions.length?searchOptions.length+' searches available':'No searches yet';
    if(!options.length){
      list.innerHTML='<div class="rf-search-selector-empty">Search batches are loading. If none appear, start a search from the Dashboard.</div>';
      return;
    }
    var html=options.map(function(o){
      var all=o.id==='all';
      var activeClass=active===o.id?' is-active':'';
      var sub=all?'Show prospects from every search batch':'Show only this search batch';
      return '<button type="button" class="rf-search-selector-option '+(all?'rf-search-selector-all ':'')+activeClass+'" data-search-id="'+escapeHtml(o.id)+'"><strong>'+escapeHtml(o.name)+'</strong><span>'+escapeHtml(sub)+'</span></button>';
    }).join('');
    list.innerHTML=html;
  }
  function bind(){
    document.addEventListener('click',function(e){
      var btn=e.target.closest('.rf-search-selector-option');
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      setSelected(btn.getAttribute('data-search-id')||'all');
    },true);
    document.addEventListener('change',function(e){
      if(e.target&&e.target.id==='rfBatchFilter') setTimeout(render,30);
    },true);
  }
  function init(){
    ensurePanel();
    render();
    bind();
    [250,700,1200,2200,4000].forEach(function(ms){setTimeout(render,ms);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
