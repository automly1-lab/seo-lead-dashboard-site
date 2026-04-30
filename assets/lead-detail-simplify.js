(function(){
  'use strict';
  var PAGE=document.body&&document.body.dataset?document.body.dataset.page:'';
  if(PAGE!=='lead-detail')return;
  function clean(v){return String(v==null?'':v).trim();}
  function human(v){var t=clean(v).toLowerCase();var m={qualified:'Qualified Lead',review_needed:'Needs Review',needs_review:'Needs Review',rejected:'Not a Fit',ready:'Ready',not_ready:'Not Ready'};return m[t]||clean(v).replace(/_/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});}
  function text(id){return clean(document.getElementById(id)&&document.getElementById(id).textContent);}
  function ensure(){
    if(document.querySelector('.rf-simplified-decision-card'))return;
    var hero=document.querySelector('.detail-hero-panel');if(!hero)return;
    var card=document.createElement('section');card.className='rf-simplified-decision-card';
    card.innerHTML='<article class="rf-decision-block"><span>Recommended decision</span><strong id="rfSimpleDecision">Review this lead</strong><p id="rfSimpleDecisionCopy">Use the verified evidence and contact path before outreach.</p></article><article class="rf-decision-block"><span>Best next step</span><strong id="rfSimpleNextStep">Check contact and evidence</strong><p id="rfSimpleNextStepCopy">Do not pitch unless the SEO reason is supported by visible signals.</p></article>';
    hero.insertAdjacentElement('afterend',card);
  }
  function update(){
    ensure();
    var status=human(text('detailStatus'))||'Needs Review';
    var contact=text('detailContactLine');
    var reason=text('detailReason');
    var decision=document.getElementById('rfSimpleDecision');var copy=document.getElementById('rfSimpleDecisionCopy');var step=document.getElementById('rfSimpleNextStep');var stepCopy=document.getElementById('rfSimpleNextStepCopy');
    if(!decision)return;
    if(/Qualified/i.test(status)){decision.textContent='Qualified Lead';copy.textContent='Good enough to consider for outreach, as long as the message references a verified SEO issue.';}
    else if(/Not a Fit|Rejected/i.test(status)){decision.textContent='Not recommended';copy.textContent='This lead should not be used for normal outreach under the current quality rules.';}
    else{decision.textContent='Needs Review';copy.textContent='Potential opportunity, but check the website evidence and contact path before outreach.';}
    step.textContent=contact&&!/No direct contact/i.test(contact)?'Verify contact and prepare outreach':'Confirm contact path first';
    stepCopy.textContent=reason&&reason!=='No qualification reason yet.'?reason:'Use the SEO evidence section below. If evidence is weak, keep this lead in review.';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update);else update();
  setInterval(update,1600);
})();
