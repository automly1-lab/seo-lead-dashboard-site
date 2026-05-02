(function(){
  'use strict';
  if(!document.body.classList.contains('app-page-leads')) return;
  function txt(n){return String((n&&n.textContent)||'').trim();}
  function makeQualified(cell){
    var badge=cell.querySelector('.rf-badge-review');
    if(badge){badge.classList.remove('rf-badge-review');badge.classList.add('rf-badge-qualified');badge.textContent='Qualified';}
    var reason=cell.querySelector('.rf-row-reason');
    if(reason) reason.textContent='Verified evidence + contact path';
  }
  function fixRows(){
    var changed=false;
    document.querySelectorAll('#rfProspectsTable tbody tr').forEach(function(row){
      var decision=row.querySelector('td:nth-child(3)');
      var evidence=row.querySelector('td:nth-child(4)');
      var contact=row.querySelector('td:nth-child(6)');
      if(!decision||!evidence||!contact) return;
      var d=txt(decision), e=txt(evidence), c=txt(contact);
      var hasVerified=/Verified\s*·\s*[0-9]+\s*signals/i.test(e);
      var hasContact=!/Needs enrichment/i.test(c)&&/(Phone|Email|Contact page|CTA)/i.test(c);
      var wronglyReview=/Needs Review|Manual review required/i.test(d);
      if(hasVerified&&hasContact&&wronglyReview){makeQualified(decision);changed=true;}
    });
    if(changed){
      var q=document.querySelectorAll('#rfProspectsTable tbody .rf-badge-qualified').length;
      var r=document.querySelectorAll('#rfProspectsTable tbody .rf-badge-review').length;
      var qn=document.getElementById('rfKpiQualified');
      var rn=document.getElementById('rfKpiReview');
      if(qn) qn.textContent=q;
      if(rn) rn.textContent=r;
    }
  }
  function init(){fixRows();setTimeout(fixRows,500);setTimeout(fixRows,1500);setInterval(fixRows,2500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
