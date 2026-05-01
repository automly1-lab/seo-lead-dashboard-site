(function(){
  'use strict';
  function isNested(){return /\/(privacy|terms|refund-policy|pricing|how-it-works|login|signup)\//.test(location.pathname||'');}
  function prefix(){return isNested()?'../':'';}
  function ensureLegalFooter(){
    if(document.querySelector('.rf-public-footer'))return;
    var old=document.querySelector('.marketing-footer'); if(old) old.remove();
    var footer=document.createElement('footer');
    footer.className='rf-public-footer';
    footer.innerHTML='<div class="rf-public-footer-inner"><div><strong>RankForge</strong><p>Evidence-based SEO lead intelligence for agencies.<br>RankForge by CrestlineOps.</p></div><nav><a href="'+prefix()+'pricing/">Pricing</a><a href="'+prefix()+'login/">Login</a><a href="'+prefix()+'signup/">Sign up</a><a href="'+prefix()+'privacy/">Privacy</a><a href="'+prefix()+'terms/">Terms</a><a href="'+prefix()+'refund-policy/">Refund Policy</a></nav></div>';
    document.body.appendChild(footer);
  }
  function normalizeHeader(){
    var brand=document.querySelector('.navbar .brand,.site-header .brand');
    if(brand){brand.href=prefix();var mark=brand.querySelector('.brand-mark');if(mark)mark.textContent='RF';var strong=brand.querySelector('strong');if(strong)strong.textContent='RankForge';var small=brand.querySelector('small');if(small)small.textContent='SEO Lead Intelligence';}
    var nav=document.querySelector('.site-nav');
    if(nav){nav.innerHTML='<a href="'+prefix()+'how-it-works/">How it works</a><a href="'+prefix()+'pricing/">Pricing</a><a href="'+prefix()+'login/">Login</a><a class="nav-cta" href="'+prefix()+'signup/">Get started</a>';}
  }
  function init(){normalizeHeader();ensureLegalFooter();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();