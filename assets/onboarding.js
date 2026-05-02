(function(){
  'use strict';
  const SESSION_KEY='rankforge-auth-session-v1';
  const ONBOARDING_DRAFT='rankforge-onboarding-search-draft-v1';
  const PLAN_KEY='rankforge-selected-plan-v1';
  const BILLING_KEY='rankforge-billing-status-v1';
  const ADMIN='automly1@gmail.com';
  function qs(s){return document.querySelector(s)}
  function qsa(s){return Array.from(document.querySelectorAll(s))}
  function show(el){if(el)el.hidden=false}
  function hide(el){if(el)el.hidden=true}
  function safe(v){return String(v||'').trim()}
  function session(){try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
  async function refresh(){try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.refreshSession==='function')return await window.rankforgeAuth.refreshSession()}catch(e){}return session()}
  function normalizePlan(v){v=String(v||'free').toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');if(v.includes('growth'))return'growth';if(v.includes('starter'))return'starter';if(v.includes('admin'))return'admin';return'free'}
  function billing(){return String(localStorage.getItem(BILLING_KEY)||'').toLowerCase()}
  function setStatus(msg,tone){const box=qs('#onboardingStatus');if(!box)return;box.textContent=msg;box.hidden=false;box.className='rf-status-box'+(tone?' '+tone:'')}
  function initials(email){return safe(email).charAt(0).toUpperCase()||'A'}
  function renderHeader(s){
    const actions=qs('#rfOnboardingActions'),mobile=qs('#rfOnboardingMobile');
    if(!actions||!mobile)return;
    if(s&&s.userId){
      const email=s.email||'Account';
      const admin=(email||'').toLowerCase()===ADMIN;
      const quality=admin?'<a href="../quality/">Quality</a>':'';
      actions.innerHTML='<a class="rf-onboarding-action primary" href="../dashboard/">Dashboard</a><div class="rf-onboarding-account"><button class="rf-onboarding-chip" id="rfOnboardingChip" type="button" aria-haspopup="true" aria-expanded="false"><span class="rf-onboarding-avatar">'+initials(email)+'</span><span>'+email+'</span><span>⌄</span></button><div class="rf-onboarding-dropdown" id="rfOnboardingDropdown" hidden><a href="../dashboard/">Dashboard</a><a href="../settings/">Settings</a><a href="../pricing/">Pricing</a>'+quality+'<button type="button" id="rfOnboardingSignOut">Sign out</button></div></div>';
      mobile.innerHTML='<a href="../how-it-works/">How it works</a><a href="../pricing/">Pricing</a><a href="../dashboard/">Dashboard</a><a href="../settings/">Settings</a>'+quality+'<button type="button" id="rfOnboardingMobileSignOut">Sign out</button>';
    }else{
      actions.innerHTML='<a class="rf-onboarding-action" href="../login/">Log in</a><a class="rf-onboarding-action primary" href="../signup/">Start free</a>';
      mobile.innerHTML='<a href="../how-it-works/">How it works</a><a href="../pricing/">Pricing</a><a href="../login/">Log in</a><a href="../signup/">Start free</a>';
    }
    bindHeader();
  }
  function bindHeader(){
    const btn=qs('#rfOnboardingMenuBtn'),mobile=qs('#rfOnboardingMobile');
    if(btn&&mobile&&!btn.dataset.bound){btn.dataset.bound='true';btn.addEventListener('click',()=>{const open=mobile.hidden;mobile.hidden=!open;btn.setAttribute('aria-expanded',String(open))})}
    const chip=qs('#rfOnboardingChip'),drop=qs('#rfOnboardingDropdown');
    if(chip&&drop&&!chip.dataset.bound){chip.dataset.bound='true';chip.addEventListener('click',e=>{e.stopPropagation();const open=drop.hidden;drop.hidden=!open;chip.setAttribute('aria-expanded',String(open))});document.addEventListener('click',()=>{drop.hidden=true;chip.setAttribute('aria-expanded','false')})}
    ['#rfOnboardingSignOut','#rfOnboardingMobileSignOut'].forEach(sel=>{const b=qs(sel);if(b&&!b.dataset.bound){b.dataset.bound='true';b.addEventListener('click',async()=>{try{await window.rankforgeAuth?.logout()}catch(e){localStorage.removeItem(SESSION_KEY);location.href='../login/'}})}})
  }
  function setPlanUI(){
    const plan=normalizePlan(localStorage.getItem(PLAN_KEY));
    const pending=billing().includes('pending');
    const title=qs('#planTitle'), copy=qs('#planCopy'), name=qs('#planName'), depth=qs('#planDepth'), csv=qs('#csvStatus'), select=qs('#onboardingDepth');
    let label='Free', max='10', depthText='10 previews', csvText='Paid plans', planCopy='You have 1 free test search and up to 10 lead previews. CSV export is available on paid plans.';
    if(!pending&&plan==='starter'){label='Starter';max='25';depthText='25 leads';csvText='Enabled';planCopy='You have 5 search batches/month and up to 50 qualified leads/month.'}
    if(!pending&&plan==='growth'){label='Growth';max='50';depthText='50 leads';csvText='Enabled';planCopy='You have 15 search batches/month and up to 250 qualified leads/month.'}
    if(!pending&&plan==='admin'){label='Admin Unlimited';max='50';depthText='Admin limit';csvText='Enabled';planCopy='Admin Unlimited access.'}
    if(title)title.textContent=label==='Free'?'Free test search':label+' plan';
    if(copy)copy.textContent=planCopy;
    if(name)name.textContent=label;
    if(depth)depth.textContent=depthText;
    if(csv)csv.textContent=csvText;
    if(select)select.innerHTML='<option value="'+max+'">Up to '+(max==='10'?'10 previews':max+' leads per batch')+'</option>';
    if(qs('#billingPending')) qs('#billingPending').hidden=!pending;
    if(qs('#stepFourTitle')) qs('#stepFourTitle').textContent=label==='Free'||pending?'Upgrade to export':'Export prospects';
    if(qs('#stepFourCopy')) qs('#stepFourCopy').textContent=label==='Free'||pending?'Free users can preview results first.':'Export contact-ready prospects.';
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
      niche:qs('#onboardingNiche').value.trim(),target_service:qs('#onboardingNiche').value.trim(),business_type:qs('#onboardingNiche').value.trim(),
      city:qs('#onboardingCity').value.trim(),target_city:qs('#onboardingCity').value.trim(),country:(qs('#onboardingCountry').value||'United States').trim(),
      search_depth:qs('#onboardingDepth').value,max_results:qs('#onboardingDepth').value,qualification_strictness:qs('#onboardingStrictness').value,
      user_id:s&&s.userId||'',owner_user_id:s&&s.userId||'',email:s&&s.email||'',created_at:new Date().toISOString(),source:'onboarding'
    };
    localStorage.setItem(ONBOARDING_DRAFT,JSON.stringify(payload));
    setStatus('Preparing your search…','');
    const btn=qs('#startFirstSearchBtn');if(btn){btn.disabled=true;btn.textContent='Preparing your search…'}
    const params=new URLSearchParams({start:'1',niche:payload.niche,city:payload.city,country:payload.country,source:'onboarding'});
    setTimeout(function(){setStatus('Opening Searches…','success');location.href='../searches/?'+params.toString()},500);
  }
  async function init(){
    renderHeader(null);
    show(qs('#onboardingLoading'));hide(qs('#onboardingApp'));hide(qs('#onboardingSignedOut'));
    const s=await refresh();
    renderHeader(s);
    hide(qs('#onboardingLoading'));
    if(!s||!s.userId){
      hide(qs('#onboardingApp'));show(qs('#onboardingSignedOut'));
      setTimeout(function(){ if(!session()) location.href='../login/?returnTo=/onboarding/'; },850);
      return;
    }
    show(qs('#onboardingApp'));hide(qs('#onboardingSignedOut'));setPlanUI();
    const form=qs('#onboardingSearchForm');if(form&&!form.dataset.bound){form.dataset.bound='true';form.addEventListener('submit',submit)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();