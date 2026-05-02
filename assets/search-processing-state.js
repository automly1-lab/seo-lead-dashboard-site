(function(){
  'use strict';
  var PREFIX='rankforge_processing_search_';
  var TERMINAL={completed:1,completed_no_qualified:1,blocked_limit:1,rejected:1,failed:1,no_qualified:1};
  function clean(v){return String(v==null?'':v).trim()}
  function low(v){return clean(v).toLowerCase()}
  function parse(raw,f){try{return raw?JSON.parse(raw):f}catch(_){return f}}
  function idOf(info){return clean(info&&info.list_id)||clean(info&&info.listId)||clean(info&&info.search_id)||clean(info&&info.searchId)||clean(info&&info.id)}
  function now(){return new Date().toISOString()}
  function key(id){return PREFIX+id}
  function normalizeStatus(s){s=low(s).replace(/\s+/g,'_').replace(/-/g,'_');if(/blocked|limit|allowance|credit/.test(s))return'blocked_limit';if(/reject|denied|stopped/.test(s))return'rejected';if(/fail|error/.test(s))return'failed';if(/no_qualified|completed_no_qualified/.test(s))return'completed_no_qualified';if(/complete|done|finished/.test(s))return'completed';if(/queued|processing|running|active/.test(s))return'processing';return s}
  function isTerminalStatus(s){return !!TERMINAL[normalizeStatus(s)]}
  function mark(info){info=info||{};var status=normalizeStatus(info.status||'processing'),id=idOf(info);if(!id)return null;if(isTerminalStatus(status)){clear(id);return null}var record={search_id:clean(info.search_id||info.searchId||id),list_id:clean(info.list_id||info.listId||id),niche:clean(info.niche||info.service||info.target_service),city:clean(info.city||info.market||info.target_city),name:clean(info.name||info.search_name),created_at:clean(info.created_at)||now(),expected_ready_after_seconds:Number(info.expected_ready_after_seconds||60),status:'processing'};try{localStorage.setItem(key(id),JSON.stringify(record));localStorage.setItem(key(record.search_id),JSON.stringify(record));if(record.list_id)localStorage.setItem(key(record.list_id),JSON.stringify(record))}catch(_){}return record}
  function get(id){id=clean(id);if(!id)return null;var r=parse(localStorage.getItem(key(id)),null);if(r&&ageSeconds(r)>600){clear(idOf(r));return null}return r}
  function all(){var rows=[];try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';if(k.indexOf(PREFIX)!==0)continue;var r=parse(localStorage.getItem(k),null);if(!r)continue;if(ageSeconds(r)>600){localStorage.removeItem(k);continue}var id=idOf(r);if(!rows.some(function(x){return idOf(x)===id}))rows.push(r)}}catch(_){}return rows.sort(function(a,b){return new Date(b.created_at||0)-new Date(a.created_at||0)})}
  function clear(id){id=clean(id);if(!id)return;try{localStorage.removeItem(key(id))}catch(_){}}
  function clearAllIds(ids){(ids||[]).forEach(clear)}
  function getFromUrl(){var p=new URLSearchParams(location.search||'');return clean(p.get('list_id'))||clean(p.get('search_id'))||clean(p.get('id'))}
  function state(){return parse(localStorage.getItem('rankforge-clean-app-state-v1'),{})||{}}
  function lists(){var s=state();return [].concat(s.localLists||[],s.remoteCache&&s.remoteCache.lists||[]).filter(Boolean)}
  function latestLocalList(){var l=lists();l.sort(function(a,b){return new Date(b.created_at||b.createdAt||b.started_at||b.lastRun||0)-new Date(a.created_at||a.createdAt||a.started_at||a.lastRun||0)});return l[0]||null}
  function idMatches(l,id){return [l&&l.id,l&&l.search_id,l&&l.list_id,l&&l.searchId,l&&l.listId,l&&l.search_batch_id,l&&l.batch_id].map(clean).includes(clean(id))}
  function findList(id){id=clean(id);if(!id)return null;return lists().find(function(l){return idMatches(l,id)})||null}
  function terminalRecordFor(id){var l=findList(id);if(!l)return null;var raw=normalizeStatus(l.status||l.workflow_status||l.search_status);if(isTerminalStatus(raw)){clearAllIds([id,l.id,l.search_id,l.list_id,l.searchId,l.listId,l.search_batch_id,l.batch_id]);return{status:raw,list:l,reason:clean(l.status_reason||l.rejection_reason||l.limit_block_reason||l.failure_reason)}}return null}
  function leadCountFor(id){id=clean(id);var s=state(),leads=[].concat(s.localLeads||[],s.remoteCache&&s.remoteCache.leads||[]).filter(Boolean);return leads.filter(function(l){var lid=clean(l.listId||l.list_id||l.search_id||l.searchId||l.search_batch_id||l.batch_id);return lid===id}).length}
  function ageSeconds(r){var t=new Date(r&&r.created_at||0).getTime();return t?Math.max(0,Math.round((Date.now()-t)/1000)):0}
  function infer(record){if(!record)return'unknown';var id=idOf(record),term=terminalRecordFor(id);if(term)return term.status;var count=leadCountFor(id);if(count>0){clear(id);return'results_available'}var age=ageSeconds(record);if(age<120)return'processing';if(age<600)return'still_processing';clear(id);return'needs_attention'}
  window.rankforgeProcessingSearch={markSearchProcessing:mark,getProcessingSearch:get,getAllProcessingSearches:all,clearProcessingSearch:clear,getProcessingIdFromUrl:getFromUrl,latestLocalList:latestLocalList,inferSearchStatus:infer,leadCountFor:leadCountFor,ageSeconds:ageSeconds,normalizeStatus:normalizeStatus,isTerminalStatus:isTerminalStatus,terminalRecordFor:terminalRecordFor,findSearchList:findList};
})();
