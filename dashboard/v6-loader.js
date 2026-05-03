(function(){
  function loadScriptOnce(src, marker, callback){
    if(document.querySelector('script[data-'+marker+'="true"]')){ if(callback) callback(); return; }
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    script.setAttribute('data-'+marker,'true');
    script.onload=function(){ if(callback) callback(); };
    document.body.appendChild(script);
  }

  function boot(){
    document.body.dataset.auth='protected';
    loadScriptOnce('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','rf-supabase-cdn',function(){
      loadScriptOnce('../assets/supabase-config.js?v=supabase-auth-2','rf-supabase-config',function(){
        loadScriptOnce('../assets/auth.js?v=supabase-dashboard-1','rf-auth-js',function(){
          loadScriptOnce('./v6-supabase-bridge.js?v=supabase-dashboard-1','rf-dashboard-bridge');
        });
      });
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();