(function(){
  'use strict';
  if(!document.body.classList.contains('app-page-leads')) return;

  var MIN_SEO_NEED_FOR_QUALIFIED = 40;
  var running = false;
  var scheduled = false;

  function text(node){return String((node&&node.textContent)||'').replace(/\s+/g,' ').trim();}
  function verified(node){var t=text(node);return /Verified/i.test(t)&&/(signal|evidence)/i.test(t);}
  function hasDirectContact(node){var t=text(node);return /(Phone|Email)/i.test(t)&&!/Needs enrichment|missing|not found/i.test(t);}
  function seoNeed(cell){
    var t=text(cell);
    var nums=t.match(/\b(\d{1,3})\b/g);
    if(nums&&nums.length){
      var best=Math.max.apply(null,nums.map(function(x){return Math.max(0,Math.min(100,Number(x)));}));
      if(Number.isFinite(best)) return best;
    }
    if(/High need/i.test(t)) return 80;
    if(/Good need/i.test(t)) return 65;
    if(/Medium|Review/i.test(t)) return 40;
    return 0;
  }

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
    if(running) return;
    running = true;
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
      var nums=cardText.match(/\b(\d{1,3})\b/g);
      var need=nums&&nums.length?Math.max.apply(null,nums.map(Number)):0;
      if(/High need/i.test(cardText)) need=Math.max(need,80);
      if(/Good need/i.test(cardText)) need=Math.max(need,65);
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
    running = false;
  }

  function schedule(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(function(){scheduled=false;fixRows();});
  }

  function observe(){
    var target=document.getElementById('rfProspectsTable') || document.getElementById('rfProspectCards') || document.body;
    if(!target || target.dataset.rfDecisionFixObserved==='true') return;
    target.dataset.rfDecisionFixObserved='true';
    new MutationObserver(schedule).observe(target,{childList:true,subtree:true});
  }

  function init(){
    fixRows();
    observe();
    [150,600,1400].forEach(function(ms){setTimeout(fixRows,ms);});
    document.addEventListener('input',function(){setTimeout(fixRows,80);},true);
    document.addEventListener('change',function(){setTimeout(fixRows,80);},true);
    document.addEventListener('click',function(){setTimeout(fixRows,120);},true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
