(function(){
  'use strict';
  function clean(v){ return String(v == null ? '' : v).trim(); }
  function text(node){ return clean(node && node.textContent); }
  function findMini(label){
    var cards = Array.from(document.querySelectorAll('#leadDetailPage .rf25-mini'));
    return cards.find(function(card){ return text(card.querySelector('small')).toLowerCase().indexOf(label.toLowerCase()) > -1; });
  }
  function setTooltip(label, tooltip){
    var card = findMini(label);
    if (card) card.setAttribute('title', tooltip);
  }
  function setBadgeText(label, value, className, tooltip){
    var card = findMini(label);
    if (!card) return;
    if (tooltip) card.setAttribute('title', tooltip);
    var strong = card.querySelector('strong');
    if (!strong) return;
    strong.innerHTML = '<span class="rf25-badge ' + className + '">' + value + '</span>';
  }
  function numberFrom(label){
    var card = findMini(label);
    if (!card) return null;
    var raw = text(card.querySelector('strong'));
    var match = raw.match(/\d+/);
    return match ? Number(match[0]) : null;
  }
  function setWordProgress(){
    var card = findMini('Homepage Word Count');
    if (!card) return;
    var n = numberFrom('Homepage Word Count');
    if (!Number.isFinite(n)) return;
    var strong = card.querySelector('strong');
    if (strong) strong.textContent = n + ' / 1500 target words';
    var bar = card.querySelector('.rf25-bar i');
    if (bar) bar.style.width = Math.min(100, Math.round(n / 1500 * 100)) + '%';
    card.setAttribute('title', 'Target: around 1500 helpful words for a stronger service page.');
  }
  function setPageBadge(label, zeroText, okText, tooltip){
    var n = numberFrom(label);
    if (n === null) return;
    var value = n <= 0 ? zeroText : n + ' pages found';
    var cls = n <= 0 ? 'rf25-bad' : 'rf25-good';
    setBadgeText(label, value, cls, tooltip);
    var card = findMini(label);
    if (card) {
      var bar = card.querySelector('.rf25-bar');
      if (bar) bar.remove();
      if (!card.querySelector('.rf25-helper')) {
        var helper = document.createElement('div');
        helper.className = 'rf25-helper';
        helper.textContent = n <= 0 ? okText : 'Dedicated pages are available for SEO targeting.';
        card.appendChild(helper);
      }
    }
  }
  function setContentDepth(){
    var card = findMini('Content Depth');
    if (!card) return;
    var strong = card.querySelector('strong');
    var current = text(strong);
    if (!current || current === 'Not found' || current === 'Not returned' || current === '0') {
      setBadgeText('Content Depth', 'Not enough content detected', 'rf25-warn', 'The page does not appear to have enough useful content for strong SEO targeting.');
    }
  }
  function addContentRecommendation(){
    var contentSection = Array.from(document.querySelectorAll('#leadDetailPage .rf25-card')).find(function(card){
      return text(card.querySelector('h3')).toLowerCase().indexOf('content & pages') > -1;
    });
    if (!contentSection || contentSection.querySelector('.rf25-service-reco')) return;
    var note = document.createElement('div');
    note.className = 'rf25-note rf25-service-reco';
    note.textContent = 'Adding service pages can improve keyword targeting.';
    contentSection.appendChild(note);
  }
  function injectCss(){
    if (document.getElementById('rf25-seo-polish-css')) return;
    var style = document.createElement('style');
    style.id = 'rf25-seo-polish-css';
    style.textContent = '.rf25-helper{margin-top:8px;color:#9cc3ee;font-size:12px;line-height:1.4}.rf25-mini .rf25-bad{box-shadow:0 0 0 1px rgba(248,113,113,.08)}.rf25-service-reco{margin-top:10px!important;background:rgba(34,197,94,.07)!important;border-color:rgba(34,197,94,.22)!important;color:#bbf7d0!important}';
    document.head.appendChild(style);
  }
  function run(){
    injectCss();
    var root = document.getElementById('leadDetailPage');
    if (!root || !root.querySelector('.rf25')) return;
    setTooltip('Indexability', 'Search engines can likely index this site based on detected signals.');
    setTooltip('Title Tag Quality', 'Title doesn’t include target keyword.');
    setTooltip('Meta Description Quality', 'Missing clear service intent.');
    setTooltip('Heading Structure', 'Headings should clearly explain the service and location.');
    setTooltip('Local SEO Quality', 'No schema or location markup detected.');
    setTooltip('Content Depth', 'Checks whether the page has enough useful SEO content.');
    setContentDepth();
    setWordProgress();
    setPageBadge('Service Pages', '0 pages found', 'No dedicated service pages detected.', 'Dedicated service pages help Google understand each offer.');
    setPageBadge('Location Pages', '0 pages found', 'No dedicated location pages detected.', 'Location pages help rank for city or service-area searches.');
    addContentRecommendation();
  }
  var observer = new MutationObserver(function(){ window.requestAnimationFrame(run); });
  function boot(){
    run();
    var root = document.getElementById('leadDetailPage');
    if (root) observer.observe(root, { childList:true, subtree:true });
    setTimeout(run, 300);
    setTimeout(run, 900);
    setTimeout(run, 1600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.rankforgeLeadDetailSeoPolish = run;
})();