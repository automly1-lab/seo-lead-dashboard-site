(function(){
  'use strict';

  function run(){
    if(!window.rankforgeResolveEffectiveUserProfile)return Promise.resolve(null);
    return window.rankforgeResolveEffectiveUserProfile({force:false,reason:'force_apply_once'}).then(function(profile){
      if(profile&&profile.profile_source==='users_sheet'){
        profile.profile_source='force_users_sheet';
        try{
          localStorage.setItem('rankforge-user-profile-cache-v1',JSON.stringify(profile));
          localStorage.setItem('rankforge-profile-debug-v1',JSON.stringify(profile));
          window.rankforgeUserProfile=profile;
        }catch(e){}
      }
      return profile;
    });
  }

  window.rankforgeForceApplyUserPlan=run;

  function start(){
    // Run once after the main resolver has had a chance to initialize.
    // Repeated forced calls caused the dashboard to redraw several times after load.
    setTimeout(run,900);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
