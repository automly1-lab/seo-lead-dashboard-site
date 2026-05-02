(function(){
  'use strict';
  if(!document.body.classList.contains('app-page-leads')) return;

  var MIN_SEO_NEED_FOR_QUALIFIED = 40;

  function text(node){return String((node&&node.textContent)||'').replace(/\s+/g,' ').trim();}
  function verified(node){var t=text(node);return /Verified/i.test(t)&&/(signal|evidence)/i.test(t);}
  function hasDirectContact(node){var t=text(node);return /(Phone|Email)/i.test(t)&&!/Needs enrichment|missing|not found/i.test(t);}
  function seoNeed(cell){var m=text(cell).match(/\b(\d{1,3})\b/);return m?Math.max(0,Math.min(100,Number(m[1]))):0;}

  function setDecision(cell,label,cls,reasonText){
    if(!cell) return false;
    var changed=false;
    var badge=cell.querySelector('.rf-badge-qualified,.rf-badge-review,.rf-badge-warning,.rf-badge-muted,.rf-badge-rejected,.rf-badge');
    if(badge && text(badge)!==label){
      badge.classList.remove('rf-badge-qualified','rf-badge-review','rf-badge-warning','rf-badge-muted','rf-badge-rejected');
      badge.classList.add(cls);
      badge.textContent=label;
      changed=true;
    }
    var reason=cell.querySelector('.rf-row-reason');
    if(reason && text(reason)!==reasonText){
      reason.textContent=reasonText;
      changed=true;
    }
    return changed;
  }
  function makeQualified(cell){return setDecision(cell,'Qualified','rf-badge-qualified','Verified evidence + direct contact');}
  function makeReview(cell,reason){return setDecision(cell,'Needs Review','rf-badge-review',reason||'Needs manual review');}
  function makeRejected(cell){return setDecision(cell,'Rejected','rf-badge-rejected','No phone or email found');}

  function fixRows(){
    var changed=false;
    document.querySelectorAll('#rfProspectsTable tbody tr').forEach(function(row){
      var cells=row.children;
      if(!cells || cells.length<6) return;
      var decision=cells[2];
      var evidence=cells[3];
      var seo=cells[4];
      var contact=cells[5];
      var need=seoNeed(seo);
      var directContact=hasDirectContact(contact);
      if(!directContact){changed=makeRejected(decision)||changed;return;}
      if(need < MIN_SEO_NEED_FOR_QUALIFIED){changed=makeReview(decision,'SEO need below qualified threshold')||changed;return;}
      if(verified(evidence) && directContact){changed=makeQualified(decision)||changed;return;}
      changed=makeReview(decision,'Needs manual review')||changed;
    });

    document.querySelectorAll('.rf-prospect-card').forEach(function(card){
      var cardText=text(card);
      var scoreMatch=cardText.match(/SEO\s*(\d{1,3})/i) || cardText.match(/\b(\d{1,3})\b/);
      var need=scoreMatch?Number(scoreMatch[1]):0;
      var directContact=/(Phone|Email)/i.test(cardText)&&!/Needs enrichment|missing|not found/i.test(cardText);
      if(!directContact){changed=makeRejected(card)||changed;return;}
      if(need < MIN_SEO_NEED_FOR_QUALIFIED){changed=makeReview(card,'SEO need below qualified threshold')||changed;return;}
      if(verified(card) && directContact){changed=makeQualified(card)||changed;return;}
      changed=makeReview(card,'Needs manual review')||changed;
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
