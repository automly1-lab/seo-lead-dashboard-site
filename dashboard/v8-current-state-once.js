(function(){
  'use strict';
  var SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var SHEET_NAME='user_current_state';

  function appState(){ try { if (typeof state !== 'undefined') return state; } catch(e) {} return window.state || null; }
  function c(v){return String(v==null?'':v).trim()}
  function l(v){return c(v).toLowerCase()}
  function n(v,d){var r=c(v);if(/^(unlimited|infinity|∞)$/i.test(r))return 999999;var x=Number(r.replace(/[^0-9.-]/g,''));return Number.isFinite(x)?Math.max(0,Math.round(x)):(d||0)}
  function admin(e){return ['automly1@gmail.com','omrkulaksiz1@gmail.com'].indexOf(l(e))!==-1}
  function planKey(v){var r=l(v).replace(/\s+/g,'_').replace(/-/g,'_');if(r.indexOf('admin')!==-1)return'admin_unlimited';if(['starter','start','basic','starter_plan'].indexOf(r)!==-1)return'starter';if(['growth','pro','founding','founding_plan'].indexOf(r)!==-1)return'growth';if(['agency','agency_intelligence','enterprise'].indexOf(r)!==-1)return'agency_intelligence';return r||'free'}
  function label(p){return({admin_unlimited:'Admin',agency_intelligence:'Agency Intelligence',growth:'Growth',starter:'Starter',free:'Free'})[planKey(p)]||c(p)||'Free'}
  function session(){if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();try{return JSON.parse(localStorage.getItem('rankforge-auth-session-v1')||'null')}catch(e){return null}}
  function value(row,key,index){return c(row[key])||c((row.__v||[])[index])}
  function emailOf(row){return l(value(row,'email',1)||row.user_email||row.customer_email||row.billing_email)}
  function matches(row,s){var email=l(s&&s.email),uid=c(s&&(s.userId||s.id));return(email&&emailOf(row)===email)||(uid&&value(row,'user_id',0)===uid)}
  function dateOf(row){return Date.parse(row.updated_at||row.synced_at||row.created_at||0)||0}
  function pick(row,list,fallback){for(var i=0;i<list.length;i++){var out=value(row,list[i][0],list[i][1]);if(out)return out}return fallback||''}

  function setLoading(){var used=document.getElementById('creditsUsed'),limit=document.getElementById('creditsLimit'),usage=document.querySelector('.usage');if(used&&used.textContent==='0')used.textContent='…';if(limit&&(limit.textContent===' / 0'||limit.textContent===' / 10'))limit.textContent='';var msg=document.getElementById('rfCurrentStateSync');if(!msg&&usage){msg=document.createElement('div');msg.id='rfCurrentStateSync';msg.style.cssText='margin-top:10px;color:#94a3b8;font-size:12px;line-height:1.35';usage.appendChild(msg)}if(msg)msg.textContent='Syncing plan…'}

  function readRows(){return new Promise(function(resolve,reject){var cb='__rfState'+Date.now()+Math.floor(Math.random()*9999),script=document.createElement('script'),done=false;window[cb]=function(payload){if(done)return;done=true;cleanup();try{var cols=(payload.table&&payload.table.cols||[]).map(function(col){return c(col.label||col.id)});var rows=(payload.table&&payload.table.rows||[]).map(function(r){var out={__v:[]};(r.c||[]).forEach(function(cell,i){var v=cell?c(cell.f!=null?cell.f:cell.v):'';out.__v[i]=v;out[cols[i]||('col_'+i)]=v});return out});resolve(rows)}catch(e){reject(e)}};function cleanup(){try{delete window[cb]}catch(e){}if(script.parentNode)script.parentNode.removeChild(script)}script.onerror=function(){if(done)return;done=true;cleanup();reject(new Error('sheet_read_failed'))};script.src='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/gviz/tq?tqx=responseHandler:'+encodeURIComponent(cb)+'&sheet='+encodeURIComponent(SHEET_NAME)+'&tq='+encodeURIComponent('select *')+'&headers=1&cachebust='+Date.now();document.body.appendChild(script);setTimeout(function(){if(done)return;done=true;cleanup();reject(new Error('sheet_timeout'))},10000)})}

  function apply(row,s){
    var st=appState();if(!row||!st)return;
    var em=emailOf(row)||l(s&&s.email),isAdmin=admin(em),p=isAdmin?'admin_unlimited':planKey(pick(row,[['plan',2],['current_plan',2]],'free'));
    var defs={free:{search:1,credits:10,batch:10,csv:false},starter:{search:50,credits:50,batch:25,csv:true},growth:{search:150,credits:250,batch:50,csv:true},agency_intelligence:{search:9999,credits:999999,batch:50,csv:true},admin_unlimited:{search:999999,credits:999999,batch:50,csv:true}}[p]||{search:1,credits:10,batch:10,csv:false};
    var billing=pick(row,[['billing_status',3],['subscription_status',4]],p==='free'?'free':'active');
    var searchLimit=isAdmin?999999:n(pick(row,[['effective_search_limit',9],['effective_search',9],['search_batches_limit',14],['base_search_limit',5]],defs.search),defs.search);
    var creditLimit=isAdmin?999999:n(pick(row,[['effective_qualified_lead_limit',10],['effective_qualified',10],['qualified_lead_credits_limit',12],['qualified_leads_limit',12],['base_qualified_lead_limit',6]],defs.credits),defs.credits);
    var creditUsed=n(pick(row,[['qualified_lead_credits_used',11],['qualified_leads_used',11]],'0'),0);
    var searchUsed=n(pick(row,[['search_batches_used',13],['searches_used_this_month',13]],'0'),0);
    st.user=Object.assign({},st.user||{},{email:em,userId:value(row,'user_id',0)||(s&&s.userId)||'',plan:label(p),billingStatus:billing});
    st.plan=Object.assign({},st.plan||{},{name:label(p),key:p,billingStatus:billing,batchesLimit:searchLimit,batchesUsed:searchUsed,creditsLimit:creditLimit,creditsUsed:creditUsed,maxLeadsPerBatch:isAdmin?50:n(pick(row,[['max_leads_per_batch',15],['max_leads_per',15]],defs.batch),defs.batch),csvExport:isAdmin||/^(true|yes|1|enabled)$/i.test(pick(row,[['csv_export',16]],defs.csv?'true':'false')),unlimited:isAdmin||p==='admin_unlimited'});
    window.state=st;localStorage.setItem('rankforge-user-current-state-v1',JSON.stringify(row));localStorage.setItem('rankforge-selected-plan-v1',p);localStorage.setItem('rankforge-billing-status-v1',billing);localStorage.setItem('rankforge-user-plan-v1',JSON.stringify(st.plan));paint(true);
  }

  function paint(ok){var st=appState()||{},p=st.plan||{},isUnlimited=p.unlimited,used=document.getElementById('creditsUsed'),limit=document.getElementById('creditsLimit'),bar=document.getElementById('creditsBar'),usage=document.querySelector('.usage');if(used)used.textContent=isUnlimited?'Unlimited':String(p.creditsUsed||0);if(limit)limit.textContent=isUnlimited?'':' / '+String(p.creditsLimit||0);if(bar)bar.style.width=isUnlimited?'100%':(p.creditsLimit?Math.min(100,(p.creditsUsed||0)/p.creditsLimit*100)+'%':'0%');if(usage){var small=usage.querySelector('small');if(small)small.textContent= ok ? ('Plan: '+(p.name||'Free')+(p.billingStatus?' · '+p.billingStatus:'')) : 'Plan sync failed';var msg=document.getElementById('rfCurrentStateSync');if(!msg){msg=document.createElement('div');msg.id='rfCurrentStateSync';msg.style.cssText='margin-top:10px;color:#94a3b8;font-size:12px;line-height:1.35';usage.appendChild(msg)}msg.textContent=ok?'Plan synced from user_current_state':'Could not read user_current_state'}var accountStrong=document.querySelector('.account strong');if(accountStrong&&p.name)accountStrong.textContent=isUnlimited?'RankForge Admin':'RankForge '+p.name;}
  async function refresh(){setLoading();var s=session();if(!s||!(s.email||s.userId||s.id)){paint(false);return;}try{var rows=await readRows(),row=rows.filter(function(r){return matches(r,s)}).sort(function(a,b){return dateOf(b)-dateOf(a)})[0];if(row)apply(row,s);else paint(false)}catch(e){console.warn('RankForge current state sync failed',e);paint(false)}}
  window.rankforgeRefreshCurrentState=refresh;window.addEventListener('rankforge:dashboard-session',function(){setTimeout(refresh,500)});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(refresh,1200)});else setTimeout(refresh,1200);
})();