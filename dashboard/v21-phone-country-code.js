(function(){
  'use strict';
  var COUNTRY_CODES={
    'united states':'+1','usa':'+1','us':'+1','canada':'+1','ca':'+1',
    'united kingdom':'+44','uk':'+44','great britain':'+44','england':'+44',
    'turkey':'+90','türkiye':'+90','turkiye':'+90',
    'australia':'+61','new zealand':'+64','ireland':'+353','germany':'+49','france':'+33','spain':'+34','italy':'+39','netherlands':'+31','belgium':'+32','switzerland':'+41','austria':'+43','sweden':'+46','norway':'+47','denmark':'+45','finland':'+358','poland':'+48','portugal':'+351','mexico':'+52','brazil':'+55','argentina':'+54','colombia':'+57','chile':'+56','india':'+91','singapore':'+65','uae':'+971','united arab emirates':'+971','south africa':'+27'
  };
  function clean(v){return String(v==null?'':v).trim()}
  function digits(v){return clean(v).replace(/[^0-9]/g,'')}
  function getState(){try{return typeof state!=='undefined'?state:window.state}catch(e){return window.state||null}}
  function selectedLead(){var s=getState();if(!s||!Array.isArray(s.leads))return null;var id=sessionStorage.getItem('rankforge-last-lead')||s.selected;return s.leads.find(function(l){return l.id===id||l.lead_id===id})||s.leads[0]||null}
  function countryFromPage(){
    var l=selectedLead();
    if(l&&clean(l.country))return clean(l.country);
    var text=(document.querySelector('.agency-hero p')||document.querySelector('#leadDetailPage p')||{}).textContent||'';
    var parts=text.split('•').pop().split(',').map(function(x){return clean(x)}).filter(Boolean);
    return parts[parts.length-1]||'';
  }
  function codeFor(country){return COUNTRY_CODES[clean(country).toLowerCase()]||''}
  function hasPlus(phone){return /^\s*\+/.test(clean(phone))}
  function normalizePhone(phone,country){
    var raw=clean(phone); if(!raw||/^no phone/i.test(raw))return raw;
    if(hasPlus(raw))return raw;
    var d=digits(raw); if(!d)return raw;
    var code=codeFor(country);
    if(!code)return raw;
    var countryDigits=digits(code);
    if(d.indexOf(countryDigits)===0&&d.length>countryDigits.length+5)return '+'+d;
    if(code==='+1'&&d.length===11&&d.charAt(0)==='1')return '+1 '+formatUs(d.slice(1));
    if(code==='+1'&&d.length===10)return '+1 '+formatUs(d);
    if(code==='+44'&&d.charAt(0)==='0')d=d.slice(1);
    if(code==='+90'&&d.charAt(0)==='0')d=d.slice(1);
    return code+' '+d;
  }
  function formatUs(d){return '('+d.slice(0,3)+') '+d.slice(3,6)+'-'+d.slice(6)}
  function apply(){
    var root=document.getElementById('leadDetailPage'); if(!root)return;
    var country=countryFromPage();
    var cards=root.querySelectorAll('.contact-card');
    cards.forEach(function(card){
      var label=(card.querySelector('small')||{}).textContent||'';
      if(!/best phone/i.test(label))return;
      var strong=card.querySelector('strong'); if(!strong)return;
      var link=strong.querySelector('a');
      var current=clean(link?link.textContent:strong.textContent);
      var normalized=normalizePhone(current,country);
      if(!normalized||normalized===current)return;
      var tel='tel:'+normalized.replace(/[^+0-9]/g,'');
      if(link){link.textContent=normalized;link.setAttribute('href',tel)}else{strong.innerHTML='<a href="'+tel+'">'+normalized+'</a>'}
      card.querySelectorAll('a.mini-btn').forEach(function(a){if(/call/i.test(a.textContent||''))a.setAttribute('href',tel)});
    });
  }
  window.rankforgeNormalizePhones=apply;
  var obs=new MutationObserver(function(){apply()});
  function boot(){apply();var root=document.getElementById('leadDetailPage');if(root)obs.observe(root,{childList:true,subtree:true});setTimeout(apply,500);setTimeout(apply,1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();