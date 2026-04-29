(function(){
  'use strict';
  var ADMIN_EMAIL='automly1@gmail.com';
  function page(){return document.body&&document.body.dataset&&document.body.dataset.page||'';}
  function clean(v){return String(v==null?'':v).trim();}
  function isApp(){return document.body&&document.body.dataset&&document.body.dataset.auth==='protected';}
  function prefix(){return ['dashboard','lists','leads','lead-detail','settings','quality'].indexOf(page())>=0?'../':'';}
  function session(){try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();return JSON.parse(localStorage.getItem('rankforge-auth-session-v1')||'null');}catch(e){return null;}}
  function isAdmin(){var s=session();return clean(s&&(s.email||s.userEmail)).toLowerCase()===ADMIN_EMAIL;}
  function navHtml(){
    var p=prefix();
    var items=[['dashboard/','Dashboard'],['lists/','Saved Lists'],['leads/','Leads'],['lead-detail/','Lead Detail'],['settings/','Settings']];
    if(isAdmin())items.splice(4,0,['quality/','Quality']);
    return items.map(function(item){var key=item[0].replace('/','');var active=(page()==='lead-detail'&&key==='lead-detail')||page()===key;return '<a '+(active?'class="active" ':'')+'href="'+p+item[0]+'">'+item[1]+'</a>';}).join('');
  }
  function normalizeNav(){
    if(!isApp())return;
    var brand=document.querySelector('.sidebar .brand');
    if(brand){brand.href=prefix();brand.innerHTML='<span class="brand-mark">RF</span><span class="brand-copy"><strong>RankForge</strong><small>by CrestlineOps</small></span>';}
    var nav=document.querySelector('.sidebar-nav');
    if(nav)nav.innerHTML=navHtml();
    if(nav&&!document.querySelector('.sidebar-site-link')){
      var home=document.createElement('a');home.className='sidebar-site-link';home.href=prefix();home.textContent='CrestlineOps site';nav.insertAdjacentElement('afterend',home);
    }
  }
  function addFooter(){
    if(!isApp()||document.querySelector('.app-footer'))return;
    var main=document.querySelector('.dashboard-main');if(!main)return;
    var p=prefix();
    var footer=document.createElement('footer');
    footer.className='app-footer';
    footer.innerHTML='<div><strong>RankForge</strong> by CrestlineOps · SEO lead intelligence workspace</div><nav><a href="'+p+'dashboard/">Dashboard</a><a href="'+p+'leads/">Leads</a><a href="'+p+'settings/">Settings</a><a href="'+p+'">CrestlineOps site</a></nav>';
    main.appendChild(footer);
  }
  function removeNoise(){
    document.querySelectorAll('.app-brand-context,.app-back-home-link,.topbar-actions .data-status').forEach(function(n){n.remove();});
    document.querySelectorAll('.topbar-actions button').forEach(function(btn){if(/sync/i.test(clean(btn.textContent)))btn.remove();});
  }
  function init(){normalizeNav();addFooter();removeNoise();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setTimeout(init,500);setTimeout(init,1200);
})();
