(function(){
  'use strict';
  function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.from((r||document).querySelectorAll(s))}
  function setupMenu(){
    var nav=qs('header.nav');
    if(!nav||qs('.rf-mobile-menu-toggle',nav))return;
    var btn=document.createElement('button');
    btn.type='button';
    btn.className='rf-mobile-menu-toggle';
    btn.setAttribute('aria-label','Open navigation menu');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML='☰';
    nav.appendChild(btn);
    function setOpen(open){
      nav.classList.toggle('rf-menu-open',open);
      document.body.classList.toggle('rf-mobile-menu-open',open);
      btn.setAttribute('aria-expanded',open?'true':'false');
      btn.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
      btn.innerHTML=open?'×':'☰';
    }
    btn.addEventListener('click',function(){setOpen(!nav.classList.contains('rf-menu-open'))});
    qsa('a',nav).forEach(function(a){a.addEventListener('click',function(){setOpen(false)})});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')setOpen(false)});
    window.addEventListener('resize',function(){if(window.innerWidth>860)setOpen(false)});
  }
  function boot(){setupMenu();document.documentElement.classList.add('rf-mobile-ready')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
