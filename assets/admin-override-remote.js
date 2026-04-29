(function(){
  'use strict';
  var ADMIN_EMAIL='automly1@gmail.com';
  function clean(v){return String(v==null?'':v).trim();}
  function safeParse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function session(){if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();return safeParse(localStorage.getItem('rankforge-auth-session-v1'),null);}
  function adminOk(){var s=session();return clean(s&&(s.email||s.userEmail)).toLowerCase()===ADMIN_EMAIL;}
  function webhookUrl(){
    var stored=clean(localStorage.getItem('rankforge-admin-override-webhook-v1'));
    if(stored)return stored;
    var search=clean(localStorage.getItem('rankforge-search-submit-webhook-v1'));
    if(search&&/\/webhook\//.test(search))return search.replace(/\/webhook\/[^/?#]+/,'/webhook/rankforge-admin-user-override');
    return 'https://lastaccount1907.app.n8n.cloud/webhook/rankforge-admin-user-override';
  }
  function rowPayload(tr){
    var s=session()||{};
    return {
      user_id: clean(tr.getAttribute('data-user-id')),
      email: clean(tr.querySelector('td strong')&&tr.querySelector('td strong').textContent),
      plan: clean(tr.querySelector('.admin-plan-select')&&tr.querySelector('.admin-plan-select').value),
      billing_status: clean(tr.querySelector('.admin-status-select')&&tr.querySelector('.admin-status-select').value),
      extra_search_credits: Number(clean(tr.querySelector('.admin-extra-search')&&tr.querySelector('.admin-extra-search').value)||0),
      extra_qualified_lead_credits: Number(clean(tr.querySelector('.admin-extra-lead')&&tr.querySelector('.admin-extra-lead').value)||0),
      admin_note: clean(tr.querySelector('.admin-note')&&tr.querySelector('.admin-note').value),
      updated_by: ADMIN_EMAIL,
      updated_by_email: ADMIN_EMAIL,
      updated_by_user_id: clean(s.userId),
      updated_at: new Date().toISOString(),
      source: 'admin_portal'
    };
  }
  function setStatus(text,tone){var node=document.getElementById('adminUserControlsStatus');if(!node)return;node.textContent=text;node.classList.remove('is-error','is-success');if(tone==='error')node.classList.add('is-error');if(tone==='success')node.classList.add('is-success');}
  async function send(tr){
    if(!adminOk())return;
    var payload=rowPayload(tr);
    if(!payload.user_id)return;
    setStatus('Saving override to n8n...', '');
    try{
      var res=await fetch(webhookUrl(),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
      var json={};try{json=await res.json();}catch(e){}
      if(!res.ok||json.ok===false)throw new Error(json.message||json.failure_reason||('HTTP '+res.status));
      setStatus('Override saved to users tab for '+payload.email+'.','success');
    }catch(error){
      console.warn('RankForge admin override remote save failed',error);
      setStatus('Local override saved, but n8n save failed: '+(error&&error.message?error.message:'unknown error'),'error');
    }
  }
  document.addEventListener('click',function(event){
    var button=event.target.closest&&event.target.closest('.admin-save-user');
    if(!button)return;
    var tr=button.closest('tr[data-user-id]');
    if(!tr)return;
    setTimeout(function(){send(tr);},120);
  },true);
})();
