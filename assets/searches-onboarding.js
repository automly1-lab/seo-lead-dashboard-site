(function(){
  'use strict';
  function qs(s,r){return (r||document).querySelector(s)}
  function esc(v){return String(v||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function params(){return new URLSearchParams(location.search||'')}
  function setVal(sel,v){var el=qs(sel);if(el&&v){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))}}
  function addStyles(){if(qs('#rf-searches-onboarding-styles'))return;var s=document.createElement('style');s.id='rf-searches-onboarding-styles';s.textContent='.rf-onboarding-search-banner{margin:0 0 18px;border:1px solid #BFDBFE;background:#EFF6FF;border-radius:20px;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;box-shadow:0 8px 24px rgba(15,23,42,.05)}.rf-onboarding-search-banner h2{margin:0;color:#111827;font-size:18px;letter-spacing:-.02em}.rf-onboarding-search-banner p{margin:5px 0 0;color:#374151;font-size:14px;line-height:22px}.rf-onboarding-search-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.rf-onboarding-search-meta span{display:inline-flex;border:1px solid #BFDBFE;background:#fff;border-radius:999px;padding:5px 9px;color:#1E3A8A;font-size:12px;font-weight:800}.rf-onboarding-search-banner .button{white-space:nowrap}@media(max-width:760px){.rf-onboarding-search-banner{display:grid}.rf-onboarding-search-banner .button{width:100%;justify-content:center}}';document.head.appendChild(s)}
  function init(){
    var p=params();
    if(p.get('source')!=='onboarding'&&p.get('start')!=='1')return;
    addStyles();
    var niche=p.get('niche')||'';
    var city=p.get('city')||'';
    var country=p.get('country')||'United States';
    setVal('#nicheInput',niche);setVal('#cityInput',city);setVal('#countryInput',country);
    var host=qs('.rf-searches-main')||qs('main')||document.body;
    if(qs('#rfOnboardingSearchBanner'))return;
    var banner=document.createElement('section');
    banner.id='rfOnboardingSearchBanner';
    banner.className='rf-onboarding-search-banner';
    banner.innerHTML='<div><h2>Your first search is ready.</h2><p>Review the details, then start the batch from the Command Center. RankForge will keep unsupported claims in Needs Review until evidence supports qualification.</p><div class="rf-onboarding-search-meta"><span>Service: '+esc(niche||'Not set')+'</span><span>Market: '+esc(city||'Not set')+'</span><span>Country: '+esc(country)+'</span></div></div><a class="button primary" href="../dashboard/#rfNewSearchCard">Start this search</a>';
    var header=qs('.rf-searches-header',host);
    if(header)header.insertAdjacentElement('afterend',banner);else host.prepend(banner);
  }
  ready(init);setTimeout(init,800);setTimeout(init,1800);
})();
