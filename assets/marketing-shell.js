(function(){
  'use strict';
  function isNested(){return /\/(privacy|terms|refund-policy|pricing|how-it-works)\//.test(location.pathname||'');}
  function prefix(){return isNested()?'../':'';}
  function ensureLegalFooter(){
    if(document.querySelector('.marketing-footer'))return;
    var p=prefix();
    var footer=document.createElement('footer');
    footer.className='marketing-footer';
    footer.innerHTML='<div><strong>RankForge</strong> by CrestlineOps · SEO lead intelligence</div><nav><a href="'+p+'">Home</a><a href="'+p+'how-it-works/">How it works</a><a href="'+p+'pricing/">Pricing</a><a href="'+p+'privacy/">Privacy</a><a href="'+p+'terms/">Terms</a><a href="'+p+'refund-policy/">Refund Policy</a></nav>';
    document.body.appendChild(footer);
  }
  function normalizeLegalHeader(){
    var header=document.querySelector('.site-header');
    if(!header)return;
    var brand=header.querySelector('.brand');
    if(brand){brand.href=prefix();var mark=brand.querySelector('.brand-mark');if(mark)mark.textContent='RF';var small=brand.querySelector('small');if(small)small.textContent='RankForge Lead Intelligence';}
    var nav=header.querySelector('.site-nav');
    if(nav){var p=prefix();nav.innerHTML='<a href="'+p+'how-it-works/">How it works</a><a href="'+p+'pricing/">Pricing</a><a href="'+p+'login/">Login</a><a class="nav-cta" href="'+p+'signup/">Get started</a>';}
  }
  function init(){normalizeLegalHeader();ensureLegalFooter();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
