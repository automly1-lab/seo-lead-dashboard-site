(function(){
  'use strict';
  var ADMIN_EMAIL='automly1@gmail.com';
  var SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var SESSION_KEY='rankforge-auth-session-v1';
  var KNOWN_USER_EMAILS={
    '95a6a7cf-6fef-45af-8b63-6b6a2cae7cd3':'automly1@gmail.com',
    '105ac365-6bde-47d9-a669-c0b23bea92e0':'automly2@gmail.com'
  };
  function clean(v){return String(v==null?'':v).trim();}
  function safeParse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function getSession(){if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();return safeParse(localStorage.getItem(SESSION_KEY),null);}
  function isAdmin(){var s=getSession();return clean(s&&(s.email||s.userEmail)).toLowerCase()===ADMIN_EMAIL;}
  function userId(row){return clean(row.user_id||row.userId||row.owner_user_id||row.workspace_user_id||row.id);}
  function norm(v){return clean(v).toLowerCase().replace(/[\s-]+/g,'_');}
  function statusText(row){return [row.qualification_status,row.status,row.lead_status,row.final_status,row.lead_priority,row.qualification,row.admin_review_status,row.lead_credit_status,row.is_qualified,row.lead_credit_counted].map(norm).filter(Boolean).join(' ');}
  function isQualified(row){var text=statusText(row);if(/not_counted|review_needed|needs_review|review|rejected|hidden|duplicate|unqualified/.test(text))return false;if(/qualified|approved|ready|counted|true|yes/.test(text))return true;return false;}
  function isReview(row){var text=statusText(row);if(/review_needed|needs_review|review/.test(text))return true;return false;}
  function parseDate(row){var raw=clean(row.created_at||row.createdAt||row.scored_at||row.updated_at||row.updatedAt||row.finalized_at||row.enriched_at||row.timestamp);if(!raw)return null;var d=new Date(raw);return Number.isNaN(d.getTime())?null:d;}
  function inCurrentMonthOrUnknown(row){var d=parseDate(row);if(!d)return true;var now=new Date();return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();}
  function parseGvizTable(parsed){var cols=((parsed.table&&parsed.table.cols)||[]).map(function(col){return col.label||col.id;});return ((parsed.table&&parsed.table.rows)||[]).map(function(row){var record={};var cells=row.c||[];cols.forEach(function(key,index){var cell=cells[index];record[key]=cell?clean(cell.f||cell.v||''):'';});return record;});}
  function fetchSheetRows(sheetName){return new Promise(function(resolve){var cb='rankforgeCreditFix_'+sheetName+'_'+Date.now()+'_'+Math.floor(Math.random()*10000);var script=document.createElement('script');var timeout=setTimeout(function(){cleanup();resolve([]);},15000);function cleanup(){clearTimeout(timeout);script.remove();try{delete window[cb];}catch(e){window[cb]=undefined;}}window[cb]=function(parsed){try{cleanup();resolve(parseGvizTable(parsed));}catch(e){cleanup();resolve([]);}};script.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?sheet='+encodeURIComponent(sheetName)+'&tqx=responseHandler:'+encodeURIComponent(cb);script.async=true;script.onerror=function(){cleanup();resolve([]);};document.body.appendChild(script);});}
  function planLimitsForRow(tr){var plan=(tr.querySelector('.admin-plan-select')&&tr.querySelector('.admin-plan-select').value)||'free';if(plan==='admin_unlimited')return{lead:'∞'};if(plan==='growth')return{lead:'250'};if(plan==='starter')return{lead:'50'};if(plan==='agency_intelligence')return{lead:'750'};return{lead:'10'};}
  function applyCounts(counts){document.querySelectorAll('#adminUserControlsTable tbody tr[data-user-id]').forEach(function(tr){var id=tr.getAttribute('data-user-id');var c=counts[id]||{qualified:0,review:0};var cells=tr.querySelectorAll('td');if(cells.length<6)return;var limit=planLimitsForRow(tr).lead;var remaining=limit==='∞'?'∞':String(Math.max(0,Number(limit)-c.qualified));cells[4].innerHTML='<strong>'+c.qualified+' / '+limit+'</strong><br><small>Remaining: '+remaining+'</small>';
      cells[5].innerHTML=String(c.review)+'<br><small>Does not use credits</small>';
    });
    var status=document.getElementById('adminUserControlsStatus');
    if(status)status.textContent='User billing controls loaded. Qualified credit counts refreshed from final_leads.';
  }
  async function run(){if(!isAdmin())return;var rows=await fetchSheetRows('final_leads');var counts={};rows.forEach(function(row){var id=userId(row);if(!id||!inCurrentMonthOrUnknown(row))return;if(!counts[id])counts[id]={qualified:0,review:0};if(isQualified(row))counts[id].qualified+=1;else if(isReview(row))counts[id].review+=1;});applyCounts(counts);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,1800);});else setTimeout(run,1800);
  setTimeout(run,4500);
})();
