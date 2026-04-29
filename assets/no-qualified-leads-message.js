(function(){
  'use strict';
  var MESSAGE='This market did not produce enough qualified SEO opportunities under the current filters. Try a broader niche, another city, or lower thresholds.';
  function clean(v){return String(v==null?'':v).trim();}
  function isZeroText(v){return /^0(\s|$)/.test(clean(v));}
  function ensurePanel(){
    var existing=document.querySelector('.rf-no-qualified-guidance');
    if(existing)return existing;
    var panel=document.createElement('section');
    panel.className='rf-no-qualified-guidance';
    panel.style.display='none';
    panel.innerHTML='<strong>No qualified leads yet</strong><p>'+MESSAGE+'</p>';
    var anchor=document.querySelector('.rf-search-progress-panel')||document.querySelector('.workspace-strip')||document.querySelector('.metrics-grid');
    if(anchor&&anchor.parentNode)anchor.insertAdjacentElement('afterend',panel);
    return panel;
  }
  function hasActiveSearch(){
    var active=clean(document.getElementById('activeListName')&&document.getElementById('activeListName').textContent).toLowerCase();
    if(!active||active==='no saved list yet')return false;
    return true;
  }
  function shouldShow(){
    if(!hasActiveSearch())return false;
    var qualified=document.getElementById('metricQualified');
    var visible=document.getElementById('visibleLeadCount');
    var activeSummary=document.getElementById('activeLeadSummary');
    var qZero=qualified?isZeroText(qualified.textContent):false;
    var visibleZero=visible?isZeroText(visible.textContent):false;
    var summary=clean(activeSummary&&activeSummary.textContent).toLowerCase();
    var status=clean(document.getElementById('activeListStatus')&&document.getElementById('activeListStatus').textContent).toLowerCase();
    return qZero&&(visibleZero||/0 lead|no active|no lead|empty|completed_no_qualified|no_qualified/.test(summary+' '+status));
  }
  function update(){
    var panel=ensurePanel();
    if(!panel)return;
    panel.style.display=shouldShow()?'block':'none';
    var status=document.getElementById('createSearchStatus')||document.getElementById('dataStatus');
    if(shouldShow()&&status&&!/market did not produce/.test(status.textContent))status.textContent=MESSAGE;
  }
  function addStyles(){
    if(document.getElementById('rfNoQualifiedGuidanceStyles'))return;
    var s=document.createElement('style');
    s.id='rfNoQualifiedGuidanceStyles';
    s.textContent='.rf-no-qualified-guidance{margin:0 0 16px;padding:18px 20px;border:1px solid rgba(245,158,11,.25);border-radius:22px;background:linear-gradient(135deg,rgba(245,158,11,.10),rgba(255,255,255,.95));box-shadow:0 14px 30px rgba(15,23,42,.06)}.rf-no-qualified-guidance strong{display:block;color:#92400e;font-size:17px;margin-bottom:5px}.rf-no-qualified-guidance p{margin:0;color:#667085;line-height:1.55}';
    document.head.appendChild(s);
  }
  function init(){addStyles();update();setInterval(update,2500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
