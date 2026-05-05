(function(){
  'use strict';

  function clean(v){return String(v==null?'':v).trim()}
  function safeJson(v,f){try{return JSON.parse(v||'')||f}catch(e){return f}}
  function loadCssOnce(href,marker){
    if(document.querySelector('link[data-'+marker+'="true"]')||document.querySelector('link[href*="'+href.split('?')[0]+'"]'))return;
    var link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.setAttribute('data-'+marker,'true');
    document.head.appendChild(link);
  }
  function loadBrand(){loadCssOnce('../assets/brand-refresh.css?v=brand-3','rf-brand-refresh')}
  function loadMobile(){loadCssOnce('./v38-dashboard-mobile.css?v=dashboard-mobile-1','rf-dashboard-mobile');loadCssOnce('./v39-mobile-app.css?v=dashboard-app-1','rf-dashboard-mobile-app')}
  function titleFromEmail(email){
    var local=clean(email).split('@')[0]||'Workspace';
    return local.replace(/[._-]+/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase()});
  }
  function initialsFrom(email,name){
    var base=clean(name)||clean(email).split('@')[0]||'RF';
    var words=base.replace(/[._-]+/g,' ').split(/\s+/).filter(Boolean);
    return words.map(function(w){return w[0]}).slice(0,2).join('').toUpperCase()||'RF';
  }
  function session(){
    try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession()||{}}catch(e){}
    var s=safeJson(localStorage.getItem('rankforge-auth-session-v1'),{})||{};
    if(s&&s.email)return s;
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i)||'';
        if(k.indexOf('sb-')!==0)continue;
        var raw=safeJson(localStorage.getItem(k),{});
        var user=raw&&raw.user||raw&&raw.currentSession&&raw.currentSession.user||raw&&raw.session&&raw.session.user;
        if(user&&user.email)return {email:user.email,userId:user.id||user.user_id,name:user.user_metadata&&user.user_metadata.name};
      }
    }catch(e){}
    return s||{};
  }
  function identity(){
    var s=session();
    var stateUser={};
    try{stateUser=(window.state&&window.state.user)||state.user||{}}catch(e){}
    var email=clean(s.email||stateUser.email||'');
    var name=clean(s.name||s.fullName||s.full_name||stateUser.name||stateUser.workspaceName||'');
    if(!name&&email)name=titleFromEmail(email);
    return {email:email,name:name||'Workspace',avatar:initialsFrom(email,name)};
  }
  function apply(){
    loadBrand();
    loadMobile();
    var id=identity();
    if(!id.email)return;

    var account=document.querySelector('.sidebar .account');
    if(account){
      var a=account.querySelector('span');
      var n=account.querySelector('strong');
      var e=account.querySelector('small');
      if(a)a.textContent=id.avatar;
      if(n)n.textContent=id.name;
      if(e)e.textContent=id.email;
    }

    var menu=document.querySelector('.workspace-menu');
    if(menu){
      var avatar=menu.querySelector('.workspace-avatar');
      var name=menu.querySelector('.workspace-identity strong');
      var email=menu.querySelector('.workspace-identity small');
      if(avatar)avatar.textContent=id.avatar;
      if(name)name.textContent=id.name;
      if(email)email.textContent=id.email;
      menu.setAttribute('data-user-email',id.email);
    }

    var topAvatar=document.querySelector('.top .avatar');
    if(topAvatar)topAvatar.textContent=id.avatar;
    document.dispatchEvent(new CustomEvent('rankforge:rendered',{detail:{reason:'identity-sync'}}));
  }
  function boot(){loadBrand();loadMobile();apply();setTimeout(apply,250);setTimeout(apply,900);setTimeout(apply,1800)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('rankforge:dashboard-session',boot);
  window.addEventListener('storage',function(e){if(e.key==='rankforge-auth-session-v1'){window.dispatchEvent(new CustomEvent('rankforge:auth-changed'));boot()}});
  setInterval(apply,3000);
  window.rankforgeUserIdentitySync={apply:apply,identity:identity};
})();