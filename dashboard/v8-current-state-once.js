(function(){
  'use strict';
  function loadEndpointSync(){
    if (document.querySelector('script[data-rf-current-state-endpoint="true"]')) return;
    var s = document.createElement('script');
    s.src = './v10-current-state-endpoint.js?v=endpoint-2';
    s.defer = true;
    s.setAttribute('data-rf-current-state-endpoint','true');
    document.body.appendChild(s);
  }
  function setPending(){
    var usage = document.querySelector('.usage');
    var used = document.getElementById('creditsUsed');
    var limit = document.getElementById('creditsLimit');
    if (used) used.textContent = '…';
    if (limit) limit.textContent = '';
    if (usage) {
      var small = usage.querySelector('small');
      if (small) small.textContent = 'Plan sync pending';
      var msg = document.getElementById('rfCurrentStateSync');
      if (!msg) {
        msg = document.createElement('div');
        msg.id = 'rfCurrentStateSync';
        msg.style.cssText = 'margin-top:10px;color:#94a3b8;font-size:12px;line-height:1.35';
        usage.appendChild(msg);
      }
      msg.textContent = 'Waiting for n8n current state endpoint';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setPending(); loadEndpointSync(); });
  else { setPending(); loadEndpointSync(); }
})();