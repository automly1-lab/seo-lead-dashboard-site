(function(){
  'use strict';
  var PLAN_KEY='rankforge-selected-plan-v1';
  var BILLING_KEY='rankforge-billing-status-v1';
  var PLANS={
    free:{name:'Free',price:'$0',summary:'1 search batch · up to 10 qualified lead previews',description:'Try RankForge with one free focused search before choosing a paid plan.',status:'Free includes one test search batch. Paid features activate only after checkout confirmation.'},
    starter:{name:'Starter',price:'$29/month',summary:'5 search batches/month · up to 50 qualified leads/month · max 25 per batch',description:'This selection is saved for checkout. Paid access activates only after payment confirmation.',status:'After signup, continue to checkout to activate this paid plan.'},
    growth:{name:'Growth',price:'$79/month',summary:'15 search batches/month · up to 250 qualified leads/month · max 50 per batch',description:'This selection is saved for checkout. Paid access activates only after payment confirmation.',status:'After signup, continue to checkout to activate this paid plan.'},
    agency_intelligence:{name:'Agency Intelligence',price:'Coming soon',summary:'More search batches · 750+ qualified leads/month · detailed SEO analysis',description:'Agency Intelligence is coming soon. This saves your interest without activating paid access.',status:'Agency Intelligence is coming soon. Signup saves your interest and opens the workspace.'}
  };
  function clean(v){return String(v==null?'':v).trim()}
  function normalize(v){var raw=clean(v).toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');if(raw==='growth'||raw==='pro')return'growth';if(raw==='starter'||raw==='start'||raw==='basic')return'starter';if(raw==='agency'||raw==='agency_intelligence')return'agency_intelligence';return'free'}
  function getPlan(){try{return normalize(new URLSearchParams(location.search||'').get('plan')||'free')}catch(e){return'free'}}
  function removeLegacyDuplicates(){var legacy=[].slice.call(document.querySelectorAll('.signup-selected-plan'));legacy.forEach(function(node){node.remove()});var cards=[].slice.call(document.querySelectorAll('.rf-selected-plan-card'));cards.slice(1).forEach(function(node){node.remove()})}
  function updateCard(plan){var card=document.querySelector('.rf-selected-plan-card,.plan-card');if(!card)return;card.innerHTML='<div><span>Selected plan</span><strong>'+plan.name+'</strong><p>'+plan.price+' · '+plan.summary+'</p></div><p>'+plan.description+'</p>'}
  function loadUserSync(){if(document.querySelector('script[data-rf-signup-user-sync="true"]'))return;var s=document.createElement('script');s.src='../assets/signup-user-sync.js?v=user-sync-1';s.defer=true;s.setAttribute('data-rf-signup-user-sync','true');document.body.appendChild(s)}
  function init(){var form=document.getElementById('signupForm');if(!form)return;removeLegacyDuplicates();var key=getPlan();var plan=PLANS[key]||PLANS.free;try{localStorage.setItem(PLAN_KEY,key);localStorage.setItem(BILLING_KEY,key==='agency_intelligence'?'waitlist':(key==='free'?'free':'pending_payment'))}catch(e){}updateCard(plan);var status=document.getElementById('authFormStatus');if(status)status.textContent=plan.status;loadUserSync();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setTimeout(init,250);
  setTimeout(init,900);
})();
