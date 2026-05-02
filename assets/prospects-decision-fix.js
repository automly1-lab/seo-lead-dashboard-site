(function(){
  'use strict';
  if(!document.body.classList.contains('app-page-leads')) return;

  function text(node){return String((node&&node.textContent)||'').replace(/\s+/g,' ').trim();}
  function verified(node){var t=text(node);return /Verified/i.test(t)&&/(signal|evidence)/i.test(t);}
  function usableContact(node){var t=text(node);return !/Needs enrichment|missing|not found/i.test(t)&&/(Phone|Email|Contact page|CTA|Contact)/i.test(t);}

  function makeQualified(cell){
    if(!cell) return false;
    var changed=false;
    var badge=cell.querySelector('.rf-badge-review,.rf-badge-warning,.rf-badge-muted,.rf-badge');
    if(badge && !/Qualified/i.test(text(badge))){
      badge.classList.remove('rf-badge-review','rf-badge-warning','rf-badge-muted');
      badge.classList.add('rf-badge-qualified');
      badge.textContent='Qualified';
      changed=true;
    }
    var reason=cell.querySelector('.rf-row-reason');
    if(reason && text(reason)!=='Verified evidence + contact path'){
      reason.textContent='Verified evidence + contact path';
      changed=true;
    }
    return changed;
  }

  function fixRows(){
    var changed=false;
    document.querySelectorAll('#rfProspectsTable tbody tr').forEach(function(row){
      var cells=row.children;
      if(!cells || cells.length<6) return;
      var decision=cells[2];
      var evidence=cells[3];
      var contact=cells[5];
      var decisionText=text(decision);
      if(/Qualified/i.test(decisionText)) return;
      if(!/Needs Review|Manual review|required|Review/i.test(decisionText)) return;
      if(verified(evidence) && usableContact(contact)) changed=makeQualified(decision)||changed;
    });

    document.querySelectorAll('.rf-prospect-card').forEach(function(card){
      var cardText=text(card);
      if(/Qualified/i.test(cardText)) return;
      if(!/Needs Review|Manual review|required|Review/i.test(cardText)) return;
      if(verified(card) && /(Phone|Email|Contact page|CTA)/i.test(cardText)) changed=makeQualified(card)||changed;
    });

    if(changed){
      var q=document.querySelectorAll('#rfProspectsTable tbody .rf-badge-qualified').length;
      var r=document.querySelectorAll('#rfProspectsTable tbody .rf-badge-review').length;
      var qn=document.getElementById('rfKpiQualified');
      var rn=document.getElementById('rfKpiReview');
      if(qn && q>0) qn.textContent=q;
      if(rn) rn.textContent=r;
    }
  }

  function observe(){
    var target=document.getElementById('rfProspectsTable') || document.getElementById('rfProspectCards') || document.body;
    if(!target || target.dataset.rfDecisionFixObserved==='true') return;
    target.dataset.rfDecisionFixObserved='true';
    new MutationObserver(function(){fixRows();}).observe(target,{childList:true,subtree:true,characterData:true});
  }

  function init(){
    fixRows();
    observe();
    [100,300,700,1200,2000,3500,6000].forEach(function(ms){setTimeout(fixRows,ms);});
    setInterval(fixRows,1500);
    document.addEventListener('input',function(){setTimeout(fixRows,80);},true);
    document.addEventListener('change',function(){setTimeout(fixRows,80);},true);
    document.addEventListener('click',function(){setTimeout(fixRows,120);},true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
