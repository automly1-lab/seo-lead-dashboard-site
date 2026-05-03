(function(){
  'use strict';
  if(!document.body.classList.contains('app-page-leads')) return;
  if(window.__rfProspectRenderStabilizerInstalled) return;
  window.__rfProspectRenderStabilizerInstalled=true;
  var nativeSetInterval=window.setInterval;
  window.setInterval=function(fn,delay){
    if(Number(delay)===700){
      try{
        var src=String(fn||'');
        if(src.indexOf('ticks++')>=0&&src.indexOf('render()')>=0){
          return nativeSetInterval(function(){},2147483647);
        }
      }catch(_){ }
    }
    return nativeSetInterval.apply(window,arguments);
  };
})();
