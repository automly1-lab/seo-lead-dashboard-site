/* RankForge SEO evidence language polish
   Add after seo-evidence-panel.js on lead-detail/index.html.
*/
(function(){
  'use strict';
  if(((document.body||{}).dataset||{}).page!=='lead-detail')return;

  function clean(v){return String(v||'').trim();}

  function confidenceFor(type){
    type=clean(type).toLowerCase();
    if(/title|meta|h1|schema|https|noindex|mobile/.test(type)) return 'direct evidence';
    if(/service|location|target|thin|contact/.test(type)) return 'crawl-based';
    return 'weak signal';
  }

  function run(){
    var panel=document.getElementById('rfSeoEvidencePanel');
    if(!panel)return;

    panel.querySelectorAll('.rf-issue strong').forEach(function(node){
      var text=clean(node.textContent);
      text=text
        .replace('Dedicated service pages were not confirmed','Dedicated service pages were not found from the homepage crawl')
        .replace('Dedicated location or service-area pages were not confirmed','Location/service-area pages were not found from the homepage crawl')
        .replace('Target city was not confirmed in the available crawl','Target city was not found in the available crawl')
        .replace('Target service was not confirmed in the available crawl','Target service was not found in the available crawl')
        .replace('Review or testimonial signals were not confirmed','Review or testimonial signals were not found in the available crawl')
        .replace('Contact page was not confirmed','Contact page was not found in the available crawl')
        .replace('Clear contact CTA was not confirmed','Clear contact CTA was not found in the available crawl')
        .replace(/were not confirmed/ig,'were not found in the available crawl')
        .replace(/was not confirmed/ig,'was not found in the available crawl')
        .replace(/not confirmed/ig,'not found in the available crawl');
      node.textContent=text;
    });

    panel.querySelectorAll('.rf-issue p').forEach(function(node){
      var text=clean(node.textContent);
      if(text==='0 service page(s) detected') node.textContent='0 service-like internal links found from the homepage crawl';
      if(text==='0 location page(s) detected') node.textContent='0 location/service-area internal links found from the homepage crawl';
    });

    panel.querySelectorAll('.rf-meta').forEach(function(meta){
      if(meta.querySelector('.rf-confidence'))return;
      var typeNode=meta.querySelector('span:nth-child(2)');
      var span=document.createElement('span');
      span.className='rf-confidence';
      span.textContent=confidenceFor(typeNode?typeNode.textContent:'');
      meta.appendChild(span);
    });
  }

  function style(){
    var old=document.getElementById('rfSeoEvidenceCopyPolishCss');
    if(old)old.remove();
    var css=document.createElement('style');
    css.id='rfSeoEvidenceCopyPolishCss';
    css.textContent='\
      .rf-confidence{color:#2563EB;font-weight:700}\
      html,body,.dashboard-shell,.dashboard-main{overflow-x:hidden!important}\
      #rfSeoEvidencePanel,#rfSeoEvidencePanel *{box-sizing:border-box!important;max-width:100%!important;min-width:0!important}\
      #rfSeoEvidencePanel{overflow-x:hidden!important}\
      #rfSeoEvidencePanel .rf-seo-v4-card,#rfSeoEvidencePanel .rf-seo-v3-card{overflow-x:hidden!important;max-width:100%!important}\
      #rfSeoEvidencePanel .rf-list,#rfSeoEvidencePanel .rf-grid,#rfSeoEvidencePanel .rf-contact-wrap{max-width:100%!important;overflow-x:hidden!important}\
      #rfSeoEvidencePanel .rf-issue,#rfSeoEvidencePanel .rf-fact,#rfSeoEvidencePanel .rf-src,#rfSeoEvidencePanel .rf-warn,#rfSeoEvidencePanel .rf-seo-summary{white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;max-width:100%!important;overflow-x:hidden!important}\
      #rfSeoEvidencePanel .rf-issue strong,#rfSeoEvidencePanel .rf-issue p,#rfSeoEvidencePanel .rf-fact strong,#rfSeoEvidencePanel .rf-src{white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important}\
      #rfSeoEvidencePanel a,#rfSeoEvidencePanel code,#rfSeoEvidencePanel pre{white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;max-width:100%!important;overflow-x:hidden!important}\
      .app-page-lead-detail .detail-section,.app-page-lead-detail .detail-story-card,.app-page-lead-detail .detail-contact-card,.app-page-lead-detail .detail-matrix-premium>div{overflow-x:hidden!important;max-width:100%!important}\
      .app-page-lead-detail .rf-qualification-layout,.app-page-lead-detail .rf-qualification-main,.app-page-lead-detail .rf-qualification-side{min-width:0!important;max-width:100%!important;overflow-x:hidden!important}\
    ';
    document.head.appendChild(css);
  }

  function start(){style();run();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(start,1400);});
  else setTimeout(start,1400);
  setTimeout(start,2400);
  setTimeout(start,3600);
  setTimeout(start,5200);
})();
