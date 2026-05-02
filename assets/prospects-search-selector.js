(function(){
  'use strict';
  if(!document.body.classList.contains('app-page-leads')) return;

  function text(v){return String(v==null?'':v).trim();}
  function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(_){return fallback;}}
  function state(){return parse(localStorage.getItem('rankforge-clean-app-state-v1'),{})||{};}
  function escapeHtml(v){return text(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function first(row,keys){for(var i=0;i<keys.length;i++){var v=text(row&&row[keys[i]]);if(v)return v;}return '';}
  function batchId(row){return first(row,['list_id','listId','search_id','search_batch_id','searchBatchId','batch_id']);}
  function batchName(row){return first(row,['search_name','list_name','search_batch_name','batch_name','name']);}
  function batchCity(row){return first(row,['city','target_city','search_city','market_city']);}
  function batchNiche(row){return first(row,['niche','target_service','business_type','service','vertical']);}
  function data(){var s=state();return {leads:[].concat(s.localLeads||[],s.remoteCache&&s.remoteCache.leads||[]).filter(Boolean),lists:[].concat(s.localLists||[],s.remoteCache&&s.remoteCache.lists||[]).filter(Boolean)};}
  function collectSearches(){
    var d=data(), map={};
    d.lists.forEach(function(l){var id=batchId(l)||first(l,['id']);if(!id)return;map[id]=map[id]||{id:id,name:batchName(l)||id,city:batchCity(l),niche:batchNiche(l),count:0};});
    d.leads.forEach(function(l){var id=batchId(l);if(!id)return;map[id]=map[id]||{id:id,name:batchName(l)||id,city:batchCity(l),niche:batchNiche(l),count:0};map[id].count++;if(!map[id].name||map[id].name===id)map[id].name=batchName(l)||id;if(!map[id].city)map[id].city=batchCity(l);if(!map[id].niche)map[id].niche=batchNiche(l);});
    return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return (b.count||0)-(a.count||0)||String(a.name).localeCompare(String(b.name));});
  }
  function selectedValue(){var sel=document.getElementById('rfBatchFilter');return sel?sel.value:'all';}
  function setSelected(value){var sel=document.getElementById('rfBatchFilter');if(!sel)return;sel.value=value||'all';sel.dispatchEvent(new Event('change',{bubbles:true}));render();}
  function ensurePanel(){
    var existing=document.getElementById('rfSearchSelectorPanel');if(existing)return existing;
    var kpis=document.querySelector('.rf-prospect-kpis');var panel=document.createElement('section');panel.id='rfSearchSelectorPanel';panel.className='rf-search-selector-panel';panel.innerHTML='<div class="rf-search-selector-head"><div><p class="rf-eyebrow">Search Results</p><h2>Choose which search batch to review</h2><p>Select all searches or focus the table on one specific search result set.</p></div><span class="rf-search-selector-count" id="rfSearchSelectorCount">Loading searches</span></div><div class="rf-search-selector-list" id="rfSearchSelectorList"></div>';
    if(kpis&&kpis.parentNode)kpis.parentNode.insertBefore(panel,kpis.nextSibling);else document.querySelector('main').prepend(panel);
    return panel;
  }
  function render(){
    var panel=ensurePanel(), list=document.getElementById('rfSearchSelectorList'), count=document.getElementById('rfSearchSelectorCount');if(!list)return;
    var searches=collectSearches(), active=selectedValue(), total=searches.reduce(function(sum,x){return sum+(x.count||0);},0);
    if(count)count.textContent=searches.length?searches.length+' searches · '+total+' prospects':'No searches yet';
    if(!searches.length){list.innerHTML='<div class="rf-search-selector-empty">No search batches are available yet. Start a search from the Dashboard.</div>';return;}
    var html='<button type="button" class="rf-search-selector-option rf-search-selector-all '+(active==='all'?'is-active':'')+'" data-search-id="all"><strong>All searches</strong><span>'+total+' visible prospects across every batch</span></button>';
    html+=searches.map(function(s){var meta=[s.city,s.niche].filter(Boolean).join(' · ')||'Search batch';return '<button type="button" class="rf-search-selector-option '+(active===s.id?'is-active':'')+'" data-search-id="'+escapeHtml(s.id)+'"><strong>'+escapeHtml(s.name||s.id)+'</strong><span>'+escapeHtml(meta)+' · '+(s.count||0)+' prospects</span></button>';}).join('');
    list.innerHTML=html;
  }
  function bind(){document.addEventListener('click',function(e){var btn=e.target.closest('.rf-search-selector-option');if(!btn)return;setSelected(btn.getAttribute('data-search-id')||'all');});document.addEventListener('change',function(e){if(e.target&&e.target.id==='rfBatchFilter')setTimeout(render,40);},true);}
  function init(){ensurePanel();render();bind();[300,900,1800,3500].forEach(function(ms){setTimeout(render,ms);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
