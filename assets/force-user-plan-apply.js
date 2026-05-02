(function(){
  'use strict';

  function run(){
    if(window.rankforgeResolveEffectiveUserProfile){
      return window.rankforgeResolveEffectiveUserProfile({force:true}).then(function(profile){
        if(profile){
          profile.profile_source=profile.profile_source==='users_sheet'?'force_users_sheet':profile.profile_source;
          try{
            localStorage.setItem('rankforge-user-profile-cache-v1',JSON.stringify(profile));
            localStorage.setItem('rankforge-profile-debug-v1',JSON.stringify(profile));
            window.rankforgeUserProfile=profile;
            window.dispatchEvent(new CustomEvent('rankforge:user-profile-resolved',{detail:profile}));
          }catch(e){}
        }
        return profile;
      });
    }
    return Promise.resolve(null);
  }

  window.rankforgeForceApplyUserPlan=run;

  function start(){
    run();
    setTimeout(run,800);
    setTimeout(run,2500);
    setTimeout(run,6000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
