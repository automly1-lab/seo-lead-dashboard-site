(function(){
  'use strict';
  var ADMIN_EMAIL='automly1@gmail.com';
  function page(){return (document.body&&document.body.dataset&&document.body.dataset.page)||'';}
  function clean(v){return String(v==null?'':v).trim();}
  function app(){return document.body&&document.body.dataset&&document.body.dataset.auth==='protected';}
  function up(){return ['dashboard','lists','leads','lead-detail','opportunities','competitors','settings','quality'].indexOf(page())>=0?'../':'';}
  function session(){try{return window.rankforgeAuth&&window.rankforgeAuth.getSession?window.rankforgeAuth.getSession():JSON.parse(localStorage.getItem('rankforge-auth-session-v1')||'null');}catch(e){return null;}}
  function admin(){var s=session();return clean(s&&(s.email||s.userEmail)).toLowerCase()===ADMIN_EMAIL;}
  function items(){var a=[['dashboard/','Command Center','dashboard'],['lists/','Searches','lists'],['leads/','Prospects','leads'],['lead-detail/','Qualification','lead-detail'],['opportunities/','Opportunities','opportunities'],['competitors/','Competitors','competitors'],['settings/','Settings','settings']];if(admin())a.splice(6,0,['quality/','Quality','quality']);return a;}
  function renderNav(){if(!app())return;var p=up();var brand=document.querySelector('.sidebar .brand');if(brand){brand.href=p;brand.innerHTML='<span class="brand-mark">RF</span><span class="brand-copy"><strong>RankForge</strong><small>by CrestlineOps</small></span>';}var nav=document.querySelector('.sidebar-nav');if(nav){nav.innerHTML=items().map(function(x){return '<a '+(page()===x[2]?'class="active" ':'')+'href="'+p+x[0]+'">'+x[1]+'</a>';}).join('');}}
  function footer(){if(!app()||document.querySelector('.app-footer'))return;var m=document.querySelector('.dashboard-main');if(!m)return;var p=up();var f=document.createElement('footer');f.className='app-footer';f.innerHTML='<div><strong>RankForge</strong> by CrestlineOps</div><nav><a href="'+p+'dashboard/">Command Center</a><a href="'+p+'leads/">Prospects</a><a href="'+p+'opportunities/">Opportunities</a><a href="'+p+'competitors/">Competitors</a></nav>';m.appendChild(f);}
  function noise(){document.querySelectorAll('.app-brand-context,.app-back-home-link,.topbar-actions .data-status').forEach(function(n){n.remove();});document.querySelectorAll('.topbar-actions button').forEach(function(b){if(/sync/i.test(clean(b.textContent)))b.remove();});}
  function init(){renderNav();footer();noise();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();setTimeout(init,600);setTimeout(init,1400);
})();