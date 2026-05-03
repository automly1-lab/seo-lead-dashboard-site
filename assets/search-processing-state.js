(function(){
  'use strict';
  var PREFIX='rankforge_processing_search_';
  var TERMINAL={completed:1,completed_no_qualified:1,blocked_limit:1,rejected:1,failed:1,no_qualified:1};
  function clean(v){return String(v==null?'':v).trim()}
  function low(v){return clean(v).toLowerCase()}
  function parse(raw,f){try{return raw?JSON.parse(raw):f}catch(_){return f}}
  function idOf(info){return clean(info&&info.list_id)||clean(info&&info.listId)||clean(info&&info.search_id)||clean(info&&info.searchId)||clean(info&&info.id)||clean(info&&info.search_batch_id)||clean(info&&info.batch_id)}
  function now(){return new Date().toISOString()}
  function key(id){return PREFIX+id}
  function normalizeStatus(s){s=low(s).replace(/\s+/g,'_').replace(/-/g,'_');if(/blocked|limit|allowance|credit/.test(s))return'blocked_limit';if(/reject|denied|stopped/.test(s))return'rejected';if(/fail|error/.test(s))return'failed';if(/no_qualified|completed_no_qualified/.test(s))return'completed_no_qualified';if(/complete|done|finished|success|ready/.test(s))return'completed';if(/queued|processing|running|active/.test(s))return'processing';return s}
  function isTerminalStatus(s){return !!TERMINAL[normalizeStatus(s)]}
  function mark(info){info=info||{};var status=normalizeStatus(info.status||'processing'),id=idOf(info);if(!id)return null;if(isTerminalStatus(status)){clear(id);return null}var record={search_id:clean(info.search_id||info.searchId||id),list_id:clean(info.list_id||info.listId||id),niche:clean(info.niche||info.service||info.target_service),city:clean(info.city||info.market||info.target_city),name:clean(info.name||info.search_name),created_at:clean(info.created_at)||now(),expected_ready_after_seconds:Number(info.expected_ready_after_seconds||60),status:'processing'};try{localStorage.setItem(key(id),JSON.stringify(record));localStorage.setItem(key(record.search_id),JSON.stringify(record));if(record.list_id)localStorage.setItem(key(record.list_id),JSON.stringify(record))}catch(_){}return record}
  function get(id){id=clean(id);if(!id)return null;var r=parse(localStorage.getItem(key(id)),null);if(r&&isFinished(id)){clearAllIds(allIds(r));return null}if(r&&ageSeconds(r)>600){clear(idOf(r));return null}return r}
  function all(){var rows=[];try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';if(k.indexOf(PREFIX)!==0)continue;var r=parse(localStorage.getItem(k),null);if(!r)continue;var id=idOf(r);if(isFinished(id)){clearAllIds(allIds(r));continue}if(ageSeconds(r)>600){localStorage.removeItem(k);continue}if(!rows.some(function(x){return idOf(x)===id}))rows.push(r)}}catch(_){}return rows.sort(function(a,b){return new Date(b.created_at||0)-new Date(a.created_at||0)})}
  function clear(id){id=clean(id);if(!id)return;try{localStorage.removeItem(key(id))}catch(_){}}
  function clearAllIds(ids){(ids||[]).forEach(clear)}
  function getFromUrl(){var p=new URLSearchParams(location.search||'');return clean(p.get('list_id'))||clean(p.get('search_id'))||clean(p.get('id'))}
  function state(){return parse(localStorage.getItem('rankforge-clean-app-state-v1'),{})||{}}
  function lists(){var s=state();return [].concat(s.localLists||[],s.remoteCache&&s.remoteCache.lists||[]).filter(Boolean)}
  function leads(){var s=state();return [].concat(s.localLeads||[],s.remoteCache&&s.remoteCache.leads||[]).filter(Boolean)}
  function latestLocalList(){var l=lists();l.sort(function(a,b){return new Date(b.created_at||b.createdAt||b.started_at||b.lastRun||0)-new Date(a.created_at||a.createdAt||a.started_at||a.lastRun||0)});return l[0]||null}
  function idsOf(l){return [l&&l.id,l&&l.search_id,l&&l.list_id,l&&l.searchId,l&&l.listId,l&&l.search_batch_id,l&&l.batch_id,l&&l.saved_list_id].map(clean).filter(Boolean)}
  function allIds(r){return [r&&r.id,r&&r.search_id,r&&r.list_id,r&&r.searchId,r&&r.listId,r&&r.search_batch_id,r&&r.batch_id].map(clean).filter(Boolean)}
  function idMatches(l,id){id=clean(id);return idsOf(l).indexOf(id)>=0}
  function findList(id){id=clean(id);if(!id)return null;return lists().find(function(l){return idMatches(l,id)})||null}
  function listHasCounts(l){if(!l)return false;var keys=['qualified','qualified_count','reviewNeeded','review_needed','needs_review_count','rejected','rejected_count','audited','audited_count','discovered','found','total_found','businesses_found','lead_count','final_leads_count'];return keys.some(function(k){return Number(l[k]||0)>0})}
  function terminalRecordFor(id){var l=findList(id);if(!l)return null;var raw=normalizeStatus(l.status||l.workflow_status||l.search_status||l.processing_status);if(isTerminalStatus(raw)){clearAllIds([id].concat(idsOf(l)));return{status:raw,list:l,reason:clean(l.status_reason||l.rejection_reason||l.limit_block_reason||l.failure_reason)}}if(leadCountFor(id)>0){clearAllIds([id].concat(idsOf(l)));return{status:'completed',list:l,reason:''}}if(listHasCounts(l)&&raw!=='processing'){clearAllIds([id].concat(idsOf(l)));return{status:'completed',list:l,reason:''}}return null}
  function leadCountFor(id){id=clean(id);if(!id)return 0;return leads().filter(function(l){var ids=[l.listId,l.list_id,l.search_id,l.searchId,l.search_batch_id,l.batch_id,l.saved_list_id].map(clean);return ids.indexOf(id)>=0}).length}
  function isFinished(id){id=clean(id);if(!id)return false;if(leadCountFor(id)>0)return true;var l=findList(id);if(!l)return false;var st=normalizeStatus(l.status||l.workflow_status||l.search_status||l.processing_status);return isTerminalStatus(st)||(listHasCounts(l)&&st!=='processing')}
  function ageSeconds(r){var t=new Date(r&&r.created_at||0).getTime();return t?Math.max(0,Math.round((Date.now()-t)/1000)):0}
  function infer(record){if(!record)return'unknown';var id=idOf(record),term=terminalRecordFor(id);if(term)return term.status;var count=leadCountFor(id);if(count>0){clearAllIds(allIds(record));return'results_available'}var l=findList(id);if(l&&listHasCounts(l)){clearAllIds(allIds(record).concat(idsOf(l)));return'results_available'}var age=ageSeconds(record);if(age<120)return'processing';if(age<600)return'still_processing';clearAllIds(allIds(record));return'needs_attention'}
  window.rankforgeProcessingSearch={markSearchProcessing:mark,getProcessingSearch:get,getAllProcessingSearches:all,clearProcessingSearch:clear,getProcessingIdFromUrl:getFromUrl,latestLocalList:latestLocalList,inferSearchStatus:infer,leadCountFor:leadCountFor,ageSeconds:ageSeconds,normalizeStatus:normalizeStatus,isTerminalStatus:isTerminalStatus,terminalRecordFor:terminalRecordFor,findSearchList:findList,isSearchFinished:isFinished,clearAllProcessingIds:clearAllIds};
})();
