(function(){
  'use strict';
  function clean(v){ return String(v == null ? '' : v).trim(); }
  function textOf(node){ return clean(node && node.textContent); }
  function findValue(label){
    var rows = Array.from(document.querySelectorAll('#leadDetailPage .rf24-row'));
    var row = rows.find(function(r){ return textOf(r.querySelector('small')).toLowerCase().indexOf(label.toLowerCase()) > -1; });
    return clean(row && row.querySelector('strong') && row.querySelector('strong').textContent);
  }
  function industryPhrase(value){
    var x = clean(value).toLowerCase();
    var map = { roofer:'roofing', plumber:'plumbing', dentist:'dental', 'hvac contractor':'HVAC', hvac:'HVAC', restaurant:'restaurant', lawyer:'legal', attorney:'legal', 'estate agent':'real estate' };
    return map[x] || x || 'local';
  }
  function cityState(location, address){
    var a = clean(address);
    var match = a.match(/,\s*([^,]+),\s*([A-Z]{2})\s+\d{4,6}/);
    if (match) return clean(match[1]) + ', ' + match[2];
    var parts = clean(location).split(',').map(clean).filter(Boolean);
    if (parts.length >= 2 && parts[1].length === 2) return parts[0] + ', ' + parts[1];
    return parts[0] || clean(location) || 'local market';
  }
  function polishHeader(){
    var root = document.getElementById('leadDetailPage');
    if (!root) return;
    var title = root.querySelector('.rf24-head h2');
    if (!title) return;
    var industry = industryPhrase(findValue('Industry'));
    var loc = cityState(findValue('Location'), findValue('Address'));
    var sub = root.querySelector('.rf24-sub');
    if (sub) sub.textContent = 'Local ' + industry + ' business · ' + loc;
  }
  function patchMini(label, newText, tooltip){
    var minis = Array.from(document.querySelectorAll('#leadDetailPage .rf24-mini'));
    var card = minis.find(function(m){ return textOf(m.querySelector('small')).toLowerCase().indexOf(label.toLowerCase()) > -1; });
    if (!card) return;
    var strong = card.querySelector('strong');
    if (!strong) return;
    var old = textOf(strong);
    if (old && old !== newText) card.setAttribute('title', tooltip || ('Technical signal: ' + old));
    strong.textContent = newText;
  }
  function polishSeoText(){
    patchMini('Gap Explanation', 'Ranks outside the strongest local map positions, creating a clear local SEO opportunity.');
    patchMini('Why They Need SEO', 'This business lacks dedicated service or location pages, limiting its visibility for local searches.');
  }
  function run(){
    var root = document.getElementById('leadDetailPage');
    if (!root || !root.querySelector('.rf24')) return;
    polishHeader();
    polishSeoText();
  }
  function injectCss(){
    if (document.getElementById('rf24-polish-css')) return;
    var style = document.createElement('style');
    style.id = 'rf24-polish-css';
    style.textContent = '.rf24-head h2{font-size:25px!important;line-height:1.08!important;font-weight:800!important;letter-spacing:-.03em}.rf24-sub{margin-top:6px!important;color:#bfdbfe!important;font-size:13px!important;line-height:1.35!important}.rf24-primary{background:linear-gradient(135deg,#2f6df6,#1d4ed8 55%,#14b8a6)!important;box-shadow:0 0 0 1px rgba(96,165,250,.28),0 14px 34px rgba(37,99,235,.35),0 0 26px rgba(20,184,166,.18)!important}.rf24-primary:hover{filter:brightness(1.08);transform:translateY(-1px);box-shadow:0 0 0 1px rgba(147,197,253,.4),0 18px 42px rgba(37,99,235,.45),0 0 34px rgba(20,184,166,.24)!important}.rf24-list{gap:12px!important}.rf24-list li{line-height:1.65!important}.rf24-card h3{letter-spacing:-.015em}';
    document.head.appendChild(style);
  }
  injectCss();
  var observer = new MutationObserver(function(){ window.requestAnimationFrame(run); });
  function boot(){
    injectCss();
    run();
    var root = document.getElementById('leadDetailPage');
    if (root) observer.observe(root, { childList:true, subtree:true });
    setTimeout(run, 300);
    setTimeout(run, 900);
    setTimeout(run, 1600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.rankforgeLeadDetailPolish = run;
})();