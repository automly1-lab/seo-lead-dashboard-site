(function(){
  'use strict';
  var FLAG='rankforge-explicit-logout-v1';
  function hasLoggedOutParam(){try{return new URLSearchParams(location.search||'').get('logged_out')==='1'}catch(e){return false}}
  function removeAuthKeys(store){
    if(!store)return;
    var remove=[];
    for(var i=0;i<store.length;i++){
      var k=store.key(i)||'';
      var low=k.toLowerCase();
      if(k==='rankforge-auth-session-v1'||
         k==='rankforge-current-user-id-v1'||
         k==='rankforge-dashboard-session-v1'||
         k==='rankforge-current-state-last-sync-v1'||
         k==='rankforge-last-results-sync-v1'||
         k.indexOf('sb-')===0||
         low.indexOf('supabase')>-1){
        remove.push(k);
      }
    }
    remove.forEach(function(k){try{store.removeItem(k)}catch(e){}});
  }
  function clearCookies(){
    try{document.cookie.split(';').forEach(function(c){document.cookie=c.replace(/^ +/,'').replace(/=.*/,'=;expires='+new Date(0).toUTCString()+';path=/')})}catch(e){}
  }
  function cleanup(){
    try{localStorage.setItem(FLAG,new Date().toISOString())}catch(e){}
    removeAuthKeys(localStorage);
    removeAuthKeys(sessionStorage);
    clearCookies();
  }
  if(hasLoggedOutParam()){
    cleanup();
    try{
      var url=new URL(location.href);
      url.searchParams.delete('logged_out');
      history.replaceState({},document.title,url.pathname+url.search+url.hash);
    }catch(e){}
  }else{
    try{if(localStorage.getItem(FLAG))cleanup()}catch(e){}
  }
  window.rankforgeLogoutGuard={cleanup:cleanup,flag:FLAG};
})();
