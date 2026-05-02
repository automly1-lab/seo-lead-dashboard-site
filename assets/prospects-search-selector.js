(function(){
  'use strict';
  if(!document.body.classList.contains('app-page-leads')) return;

  function text(v){return String(v==null?'':v).trim();}
  function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(_){return fallback;}}
  function state(){return parse(localStorage.getItem('rankforge-clean-app-state-v1'),{})||{};}
  function escapeHtml(v){return text(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function batchSelect(){return document.getElementById('rfBatchFilter');}
  function selectedValue(){var sel=batchSelect();return sel?sel.value:'all';}
  function optionLabel(opt){return text(opt&&opt.textContent)||text(opt&&opt.value)||'Search batch';}
  function first(row,keys){for(var i=0;i<keys.length;i++){var v=text(row&&row[keys[i]]);if(v)return v;}return '';}
  function batchId(row){return first(row,['list_id','listId','search_id','search_batch_id','searchBatchId','batch_id','id']);}
  function batchName(row){return first(row,['search_name','list_name','search_batch_name','batch_name','name']);}
  function batchCity(row){return first(row,['city','target_city','search_city','market_city','location_city']);}
  function batchNiche(row){return first(row,['niche','target_service','business_type','service','vertical','category']);}
  function batchDate(row){return first(row,['created_at','createdAt','search_created_at','list_created_at','started_at','timestamp','run_at','updated_at']);}
  function isTechnicalId(v){return /^srch[_-]/i.test(text(v)) || /^search[_-]/i.test(text(v));}
  function formatDate(raw){
    var value=text(raw); if(!value) return '';
    var d=new Date(value); if(Number.isNaN(d.getTime())) return '';
    try{return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);}catch(_){return value;}
  }
  function data(){var s=state();return {leads:[].concat(s.localLeads||[],s.remoteCache&&s.remoteCache.leads||[]).filter(Boolean),lists:[].concat(s.localLists||[],s.remoteCache&&s.remoteCache.lists||[]).filter(Boolean)};}
  function makeTitle(info, fallbackLabel){
    var city=text(info&&info.city), niche=text(info&&info.niche), name=text(info&&info.name), fallback=text(fallbackLabel);
    if(niche&&city) return niche+' · '+city;
    if(name&&!isTechnicalId(name)) return name;
    if(city) return city;
    if(niche) return niche;
    if(fallback&&!isTechnicalId(fallback)) return fallback;
    return 'Search batch';
  }
  function makeSubtitle(info, isAll){
    if(isAll) return 'Show prospects from every search batch';
    var parts=[];
    var date=formatDate(info&&info.date);
    if(date) parts.push(date);
    if(info&&Number(info.count)>0) parts.push(Number(info.count)+' prospects');
    if(!parts.length) parts.push('Show only this search batch');
    return parts.join(' · ');
  }
  function batchInfoMap(){
    var d=data(), map={};
    function ensure(id){id=text(id);if(!id)return null;map[id]=map[id]||{id:id,name:'',city:'',niche:'',date:'',count:0};return map[id];}
    d.lists.forEach(function(row){var id=batchId(row);var item=ensure(id);if(!item)return;item.name=item.name||batchName(row);item.city=item.city||batchCity(row);item.niche=item.niche||batchNiche(row);item.date=item.date||batchDate(row);});
    d.leads.forEach(function(row){var id=batchId(row);var item=ensure(id);if(!item)return;item.count+=1;item.name=item.name||batchName(row);item.city=item.city||batchCity(row);item.niche=item.niche||batchNiche(row);item.date=item.date||batchDate(row);});
    return map;
  }
  function currentOptions(){
    var sel=batchSelect();
    if(!sel) return [];
    var map=batchInfoMap();
    return Array.from(sel.options||[]).filter(function(opt){return text(opt.value);}).map(function(opt){
      var id=text(opt.value), label=optionLabel(opt), all=id==='all', info=all?{count:0}:map[id]||{};
      return {id:id,title:all?'All searches':makeTitle(info,label),subtitle:makeSubtitle(info,all),count:Number(info.count||0)};
    });
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
    var totalProspects=searchOptions.reduce(function(sum,o){return sum+(Number(o.count)||0);},0);
    if(count) count.textContent=searchOptions.length?searchOptions.length+' searches · '+totalProspects+' prospects':'No searches yet';
    if(!options.length){
      list.innerHTML='<div class="rf-search-selector-empty">Search batches are loading. If none appear, start a search from the Dashboard.</div>';
      return;
    }
    var html=options.map(function(o){
      var all=o.id==='all';
      var activeClass=active===o.id?' is-active':'';
      return '<button type="button" class="rf-search-selector-option '+(all?'rf-search-selector-all ':'')+activeClass+'" data-search-id="'+escapeHtml(o.id)+'"><strong>'+escapeHtml(o.title)+'</strong><span>'+escapeHtml(o.subtitle)+'</span></button>';
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
