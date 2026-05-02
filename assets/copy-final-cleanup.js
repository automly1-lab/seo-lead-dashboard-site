(function(){
  'use strict';
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.from((r||document).querySelectorAll(s))}
  function set(el,v){if(el)el.textContent=v}
  function nested(){return /\/(how-it-works|pricing|status|privacy|terms|refund-policy|login|signup|checkout-success|checkout-cancelled|checkout-pending)\//.test(location.pathname||'')||/\/404\.html$/.test(location.pathname||'')}
  function base(p){return (nested()?'../':'')+p}
  function loadCss(href,id){if(document.getElementById(id))return;var l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
  function loadJs(src,id){if(document.getElementById(id))return;var s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.body.appendChild(s)}
  function brand(){qsa('.rf-brand-copy small').forEach(function(e){set(e,'by CrestlineOps')});qsa('.rf-public-footer strong,.rf-footer strong').forEach(function(e){set(e,'RankForge by CrestlineOps')})}
  function homeCopy(){if(!document.body.classList.contains('rf-home-page'))return;var hero=qs('.rf-hero');if(hero){set(qs('.rf-eyebrow',hero),'Evidence-based SEO lead intelligence');set(qs('h1',hero),'Find local SEO prospects backed by real evidence.');set(qs('.rf-hero-subtitle',hero),'RankForge helps SEO agencies discover local businesses, verify crawl-based signals, qualify prospects, and review contact-ready opportunities — without making unsupported SEO claims.');set(qs('.rf-hero-note',hero),'Qualified leads consume credits. Needs Review and Rejected do not.')}loadCss(base('assets/home-visual-polish.css?v=home-visual-2'),'rf-home-visual-polish-css');loadJs(base('assets/home-visual-enhance.js?v=home-visual-3'),'rf-home-visual-enhance-js')}
  function apply(){brand();homeCopy()}
  ready(function(){apply();setTimeout(apply,300);setTimeout(apply,1000)});window.addEventListener('rankforge:session-ready',function(){setTimeout(apply,80)})
})();
