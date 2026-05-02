(function(){
  'use strict';
  const SESSION_KEY='rankforge-auth-session-v1';
  const ONBOARDING_DRAFT='rankforge-onboarding-search-draft-v1';
  const PLAN_KEY='rankforge-selected-plan-v1';
  const BILLING_KEY='rankforge-billing-status-v1';
  function qs(s){return document.querySelector(s)}
  function show(el){if(el)el.hidden=false}
  function hide(el){if(el)el.hidden=true}
  function session(){try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
  async function refresh(){try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.refreshSession==='function')return await window.rankforgeAuth.refreshSession()}catch(e){}return session()}
  function normalizePlan(v){v=String(v||'free').toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');if(v.includes('growth'))return'growth';if(v.includes('starter'))return'starter';if(v.includes('admin'))return'admin';return'free'}
  function billing(){return String(localStorage.getItem(BILLING_KEY)||'').toLowerCase()}
  function setStatus(msg,tone){const box=qs('#onboardingStatus');if(!box)return;box.textContent=msg;box.hidden=false;box.className='rf-status-box'+(tone?' '+tone:'')}
  function setPlanUI(){
    const plan=normalizePlan(localStorage.getItem(PLAN_KEY));
    const pending=billing().includes('pending');
    const title=qs('#planTitle'), copy=qs('#planCopy'), name=qs('#planName'), depth=qs('#planDepth'), csv=qs('#csvStatus'), select=qs('#onboardingDepth');
    let label='Free', max='10', depthText='10 previews', csvText='Paid plans', planCopy='You have 1 test search batch and up to 10 lead previews. CSV export is available on paid plans.';
    if(!pending&&plan==='starter'){label='Starter';max='25';depthText='25 leads';csvText='Enabled';planCopy='You have 5 search batches/month and up to 50 qualified leads/month.'}
    if(!pending&&plan==='growth'){label='Growth';max='50';depthText='50 leads';csvText='Enabled';planCopy='You have 15 search batches/month and up to 250 qualified leads/month.'}
    if(!pending&&plan==='admin'){label='Admin Unlimited';max='50';depthText='50+ leads';csvText='Enabled';planCopy='Admin Unlimited access.'}
    if(title)title.textContent=label==='Free'?'Free test search':label+' plan';
    if(copy)copy.textContent=planCopy;
    if(name)name.textContent=label;
    if(depth)depth.textContent=depthText;
    if(csv)csv.textContent=csvText;
    if(select)select.innerHTML='<option value="'+max+'">Up to '+(max==='10'?'10 previews':max+' leads per batch')+'</option>';
    if(qs('#billingPending')) qs('#billingPending').hidden=!pending;
    if(qs('#stepFourTitle')) qs('#stepFourTitle').textContent=label==='Free'||pending?'Upgrade to export CSV':'Export contact-ready prospects';
    if(qs('#stepFourCopy')) qs('#stepFourCopy').textContent=label==='Free'||pending?'Free users can preview results first.':'Export qualified opportunities on your plan.';
  }
  function validate(){
    const niche=qs('#onboardingNiche'), city=qs('#onboardingCity');
    let ok=true;
    if(qs('#nicheError')) qs('#nicheError').hidden=true;
    if(qs('#cityError')) qs('#cityError').hidden=true;
    if(!niche.value.trim()||niche.value.trim().length<2){if(qs('#nicheError'))qs('#nicheError').hidden=false;ok=false}
    if(!city.value.trim()||city.value.trim().length<2){if(qs('#cityError'))qs('#cityError').hidden=false;ok=false}
    return ok;
  }
  function submit(e){
    e.preventDefault();
    if(!validate())return;
    const s=session();
    const payload={
      niche:qs('#onboardingNiche').value.trim(),
      target_service:qs('#onboardingNiche').value.trim(),
      business_type:qs('#onboardingNiche').value.trim(),
      city:qs('#onboardingCity').value.trim(),
      target_city:qs('#onboardingCity').value.trim(),
      country:(qs('#onboardingCountry').value||'United States').trim(),
      search_depth:qs('#onboardingDepth').value,
      max_results:qs('#onboardingDepth').value,
      qualification_strictness:qs('#onboardingStrictness').value,
      user_id:s&&s.userId||'',
      owner_user_id:s&&s.userId||'',
      email:s&&s.email||'',
      created_at:new Date().toISOString(),
      source:'onboarding'
    };
    localStorage.setItem(ONBOARDING_DRAFT,JSON.stringify(payload));
    setStatus('Creating search batch… RankForge is sending this search to the workflow.','');
    const btn=qs('#startFirstSearchBtn');if(btn){btn.disabled=true;btn.textContent='Creating search batch…'}
    const params=new URLSearchParams({start:'1',niche:payload.niche,city:payload.city,country:payload.country,source:'onboarding'});
    setTimeout(function(){setStatus('Search draft created. Redirecting…','success');location.href='../searches/?'+params.toString()},600);
  }
  async function init(){
    const s=await refresh();
    if(!s||!s.userId){
      hide(qs('#onboardingApp'));show(qs('#onboardingSignedOut'));
      setTimeout(function(){ if(!session()) location.href='../login/?returnTo=/onboarding/'; },450);
      return;
    }
    show(qs('#onboardingApp'));hide(qs('#onboardingSignedOut'));setPlanUI();
    const form=qs('#onboardingSearchForm');if(form)form.addEventListener('submit',submit);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
