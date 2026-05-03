(function(){
  'use strict';
  if(!document.body.classList.contains('app-page-leads')) return;

  var SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  var sheetSearches=[];
  var sheetLeads=[];
  var loadedSheets=false;
  var bound=false;

  function text(v){return String(v==null?'':v).trim();}
  function low(v){return text(v).toLowerCase();}
  function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(_){return fallback;}}
  function state(){return parse(localStorage.getItem('rankforge-clean-app-state-v1'),{})||{};}
  function profile(){return window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),{})||{};}
  function session(){try{return window.rankforgeAuth&&window.rankforgeAuth.getSession?window.rankforgeAuth.getSession():parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};}catch(e){return{};}}
  function currentUserId(){var s=session(),p=profile();return text(s.userId||s.id||p.user_id);}
  function currentEmail(){var s=session(),p=profile();return low(s.email||s.userEmail||p.email);}
  function escapeHtml(v){return text(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function batchSelect(){return document.getElementById('rfBatchFilter');}
  function selectedValue(){var sel=batchSelect();return sel?sel.value:'all';}
  function first(row,keys){for(var i=0;i<keys.length;i++){var v=text(row&&row[keys[i]]);if(v)return v;}return '';}
  function rowUser(row){return first(row,['user_id','userId','owner_user_id','id']);}
  function rowEmail(row){return low(first(row,['email','user_email','owner_email','customer_email','billing_email']));}
  function owned(row){var uid=currentUserId(),email=currentEmail();var ru=rowUser(row),re=rowEmail(row);return (!ru&&!re)||(uid&&ru===uid)||(email&&re===email);}
  function batchId(row){return first(row,['search_id','list_id','listId','search_batch_id','searchBatchId','batch_id','saved_list_id','id']);}
  function leadBatchId(row){return first(row,['search_id','list_id','listId','search_batch_id','searchBatchId','batch_id','saved_list_id']);}
  function batchName(row){return first(row,['search_name','list_name','search_batch_name','batch_name','name','description']);}
  function batchCity(row){return first(row,['city','target_city','search_city','market_city','location_city','search_context_city']);}
  function batchNiche(row){return first(row,['niche','target_service','business_type','businessType','service','vertical','category','search_context_niche','search_context_service']);}
  function batchDate(row){return first(row,['created_at','createdAt','search_created_at','list_created_at','started_at','timestamp','run_at','updated_at']);}
  function companySignal(row){return first(row,['business_name','company_name','company','website_url','clean_website_url','domain']);}
  function isTechnicalId(v){return /^srch[_-]/i.test(text(v)) || /^search[_-]/i.test(text(v)) || /^[a-f0-9-]{10,}$/i.test(text(v));}
  function formatDate(raw){var value=text(raw);if(!value)return'';var d=new Date(value);if(Number.isNaN(d.getTime()))return'';try{return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);}catch(_){return value;}}
  function dateMs(v){var t=Date.parse(text(v));return Number.isFinite(t)?t:0;}
  function parseRows(parsed){var cols=((parsed.table&&parsed.table.cols)||[]).map(function(x){return x.label||x.id;});return ((parsed.table&&parsed.table.rows)||[]).map(function(r,i){var o={_row_index:i+2};(r.c||[]).forEach(function(cell,idx){o[cols[idx]]=cell?text(cell.f||cell.v||''):'';});return o;});}
  function fetchSheet(name){return new Promise(function(resolve){var cb='rf_selector_'+name+'_'+Date.now()+'_'+Math.floor(Math.random()*99999),sc=document.createElement('script'),to=setTimeout(done,9000);function done(v){clearTimeout(to);try{sc.remove();}catch(e){}try{delete window[cb];}catch(e){}resolve(v||[]);}window[cb]=function(payload){try{done(parseRows(payload));}catch(e){done([]);}};sc.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(name)+'&tqx=responseHandler:'+encodeURIComponent(cb)+'&headers=1&cacheBust='+Date.now();sc.async=true;sc.onerror=function(){done([]);};document.body.appendChild(sc);});}
  function localLists(){var s=state();return [].concat(s.localLists||[],s.remoteCache&&s.remoteCache.lists||[]).filter(Boolean);}
  function localLeads(){var s=state();return [].concat(s.localLeads||[],s.remoteCache&&s.remoteCache.leads||[]).filter(Boolean);}
  function allSearchRows(){return [].concat(sheetSearches,localLists()).filter(Boolean).filter(owned);}
  function allLeadRows(){return [].concat(sheetLeads,localLeads()).filter(Boolean).filter(owned);}
  function leadKey(row){return [first(row,['search_name','list_name']),batchNiche(row),batchCity(row)].map(low).filter(Boolean).join('|');}
  function searchKey(row){return [batchName(row),batchNiche(row),batchCity(row)].map(low).filter(Boolean).join('|');}
  function relatedLeads(search,searches,leads){var id=batchId(search);var exact=id?leads.filter(function(l){return leadBatchId(l)===id;}):[];if(exact.length)return exact;if(searches.length===1&&leads.length)return leads;var sk=searchKey(search);if(sk){var fuzzy=leads.filter(function(l){var lk=leadKey(l);return lk&&(sk.indexOf(lk)>=0||lk.indexOf(sk)>=0||lk.split('|').some(function(part){return part&&sk.indexOf(part)>=0;}));});if(fuzzy.length)return fuzzy;}return [];}
  function unique(arr,fn){var seen={};return arr.filter(function(x){var k=fn(x);if(!k||seen[k])return false;seen[k]=true;return true;});}
  function splitDropdownLabel(label){var v=text(label);if(!v||/^Search batch$/i.test(v)||isTechnicalId(v))return{};var parts=v.split(/\s+—\s+|\s+-\s+/);return{title:text(parts[0]),subtitle:text(parts.slice(1).join(' · '))};}
  function titleFromInfo(info,fallback,index){var city=text(info&&info.city),niche=text(info&&info.niche),name=text(info&&info.name),split=splitDropdownLabel(fallback);if(niche&&city)return niche+' · '+city;if(split.title&&!isTechnicalId(split.title))return split.title;if(name&&!isTechnicalId(name)&&!/^Search batch$/i.test(name))return name;if(city)return city;if(niche)return niche;return 'Search batch '+index;}
  function subtitleFromInfo(info,fallback,isAll){if(isAll)return'Show prospects from every search batch';var split=splitDropdownLabel(fallback);var parts=[];var date=formatDate(info&&info.date);if(date)parts.push(date);if(info&&Number(info.count)>0)parts.push(Number(info.count)+' prospects');if(!parts.length&&split.subtitle)parts.push(split.subtitle);if(!parts.length)parts.push('Show only this search batch');return parts.join(' · ');}
  function fallbackSearchFromLeads(leads){var firstLead=leads[0]||{};return {search_id:leadBatchId(firstLead)||'current-search',search_name:first(firstLead,['search_name','list_name'])||'Latest search',niche:batchNiche(firstLead),city:batchCity(firstLead),created_at:first(firstLead,['created_at','updated_at'])};}
  function buildOptions(){
    var searches=unique(allSearchRows(),batchId).sort(function(a,b){return dateMs(batchDate(b))-dateMs(batchDate(a));});
    var leads=allLeadRows();
    if(!searches.length&&leads.length)searches=[fallbackSearchFromLeads(leads)];
    var options=[{id:'all',title:'All searches',subtitle:'Show prospects from every search batch',count:leads.length}];
    searches.forEach(function(row,index){var id=batchId(row)||('search-'+(index+1));var rel=relatedLeads(row,searches,leads);var info={id:id,name:batchName(row),city:batchCity(row),niche:batchNiche(row),date:batchDate(row),count:rel.length};options.push({id:id,title:titleFromInfo(info,batchName(row),index+1),subtitle:subtitleFromInfo(info,batchName(row),false),count:rel.length});});
    return options;
  }
  function ensureSelectOptions(options){var sel=batchSelect();if(!sel)return;var active=sel.value||'all';sel.innerHTML=options.map(function(o){return '<option value="'+escapeHtml(o.id)+'">'+escapeHtml(o.title)+'</option>';}).join('');if(!options.some(function(o){return o.id===active;}))active='all';sel.value=active;}
  function ensurePanel(){var existing=document.getElementById('rfSearchSelectorPanel');if(existing)return existing;var kpis=document.querySelector('.rf-prospect-kpis');var panel=document.createElement('section');panel.id='rfSearchSelectorPanel';panel.className='rf-search-selector-panel';panel.innerHTML='<div class="rf-search-selector-head"><div><p class="rf-eyebrow">Search Results</p><h2>Choose which search batch to review</h2><p>Select all searches or focus the table on one specific search result set.</p></div><span class="rf-search-selector-count" id="rfSearchSelectorCount">Loading searches</span></div><div class="rf-search-selector-list" id="rfSearchSelectorList"></div>';if(kpis&&kpis.parentNode)kpis.parentNode.insertBefore(panel,kpis.nextSibling);else document.querySelector('main').prepend(panel);return panel;}
  function setSelected(value){var sel=batchSelect();if(!sel)return;value=text(value)||'all';var exists=Array.from(sel.options||[]).some(function(opt){return opt.value===value;});if(!exists)value='all';if(sel.value!==value)sel.value=value;sel.dispatchEvent(new Event('change',{bubbles:true}));render();}
  function render(){ensurePanel();var list=document.getElementById('rfSearchSelectorList'),count=document.getElementById('rfSearchSelectorCount');if(!list)return;var options=buildOptions(),active=selectedValue(),searchOptions=options.filter(function(o){return o.id!=='all';});ensureSelectOptions(options);var total=options[0]?options[0].count:0;if(count)count.textContent=searchOptions.length?searchOptions.length+' searches · '+total+' prospects':'No searches yet';if(!searchOptions.length){list.innerHTML='<div class="rf-search-selector-empty">No search batches found yet. Start a search from the Dashboard.</div>';return;}list.innerHTML=options.map(function(o){var all=o.id==='all';return '<button type="button" class="rf-search-selector-option '+(all?'rf-search-selector-all ':'')+(active===o.id?'is-active':'')+'" data-search-id="'+escapeHtml(o.id)+'"><strong>'+escapeHtml(o.title)+'</strong><span>'+escapeHtml(o.subtitle)+'</span></button>';}).join('');}
  function bind(){if(bound)return;bound=true;document.addEventListener('click',function(e){var btn=e.target.closest('.rf-search-selector-option');if(!btn)return;e.preventDefault();e.stopPropagation();setSelected(btn.getAttribute('data-search-id')||'all');},true);document.addEventListener('change',function(e){if(e.target&&e.target.id==='rfBatchFilter')setTimeout(render,30);},true);window.addEventListener('rankforge:user-profile-resolved',function(){loadSheets(true);});}
  function loadSheets(force){if(loadedSheets&&!force)return Promise.resolve();loadedSheets=true;return Promise.all([fetchSheet('searches'),fetchSheet('final_leads')]).then(function(results){sheetSearches=results[0]||[];sheetLeads=results[1]||[];render();});}
  function init(){ensurePanel();bind();render();setTimeout(function(){loadSheets(false);},250);setTimeout(render,900);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();