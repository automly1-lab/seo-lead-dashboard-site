(function(){
  'use strict';
  var BASE='https://automly1-lab.github.io/seo-lead-dashboard-site/';
  var OG=BASE+'assets/og/rankforge-og.png';
  var OG_FALLBACK=BASE+'assets/og/rankforge-og.svg';
  var path=(location.pathname||'/').replace(/\/+/g,'/');
  function isRepoRoot(){return path==='/'||/\/seo-lead-dashboard-site\/?$/.test(path);}
  function has(seg){return path.indexOf('/'+seg+'/')!==-1;}
  function pageKey(){
    if(isRepoRoot())return'home';
    if(has('how-it-works'))return'how';
    if(has('pricing'))return'pricing';
    if(has('privacy'))return'privacy';
    if(has('terms'))return'terms';
    if(has('refund-policy'))return'refund';
    if(has('status'))return'status';
    if(has('login'))return'login';
    if(has('signup'))return'signup';
    if(has('dashboard'))return'dashboard';
    if(has('searches'))return'searches';
    if(has('leads'))return'leads';
    if(has('lead-detail'))return'lead-detail';
    if(has('settings'))return'settings';
    if(has('quality'))return'quality';
    if(has('checkout-success'))return'checkout-success';
    if(has('checkout-cancelled'))return'checkout-cancelled';
    if(has('checkout-pending'))return'checkout-pending';
    if(/404\.html$/.test(path))return'404';
    return'unknown';
  }
  var pages={
    home:{url:'',title:'RankForge — Evidence-Based SEO Lead Intelligence for Agencies',desc:'RankForge helps SEO agencies find local businesses, verify SEO evidence, qualify prospects, and export contact-ready opportunities without unsupported SEO claims.',index:true},
    how:{url:'how-it-works/',title:'How RankForge Works — From Search Batch to Qualified SEO Prospect',desc:'See how RankForge discovers local businesses, verifies crawl-based SEO signals, checks contact paths, and classifies prospects as Qualified, Needs Review, or Rejected.',index:true,type:'article'},
    pricing:{url:'pricing/',title:'RankForge Pricing — Search Batches and Qualified Lead Credits',desc:'Start free, then upgrade for monthly search batches, qualified lead credits, verified evidence panels, contact path detection, and CSV export.',index:true},
    privacy:{url:'privacy/',title:'Privacy Policy — RankForge by CrestlineOps',desc:'Read the RankForge Privacy Policy to learn how CrestlineOps collects, uses, and protects information for its SEO lead intelligence product.',index:true,type:'article'},
    terms:{url:'terms/',title:'Terms of Service — RankForge by CrestlineOps',desc:'Read the RankForge Terms of Service for account usage, billing, acceptable use, disclaimers, and service conditions.',index:true,type:'article'},
    refund:{url:'refund-policy/',title:'Refund Policy — RankForge by CrestlineOps',desc:'Read the RankForge Refund Policy to understand billing, cancellations, checkout confirmation, and refund handling.',index:true,type:'article'},
    status:{url:'status/',title:'System Status — RankForge',desc:'Check RankForge system status for search batches, website crawling, evidence analysis, exports, authentication, and billing.',index:true},
    login:{url:'login/',title:'Log In — RankForge',desc:'Log in to your RankForge workspace to review SEO prospects, search batches, verified evidence, and qualified lead opportunities.',index:true},
    signup:{url:'signup/',title:'Start Free — RankForge',desc:'Create a RankForge workspace and run one free test search to find local SEO prospects backed by verified evidence.',index:true},
    dashboard:{url:'dashboard/',title:'RankForge Dashboard',desc:'Private RankForge workspace.',index:false},
    searches:{url:'searches/',title:'RankForge Searches',desc:'Private RankForge search workspace.',index:false},
    leads:{url:'leads/',title:'RankForge Prospects',desc:'Private RankForge prospect workspace.',index:false},
    'lead-detail':{url:'lead-detail/',title:'RankForge Lead Detail',desc:'Private RankForge lead detail page.',index:false},
    settings:{url:'settings/',title:'RankForge Settings',desc:'Private RankForge settings page.',index:false},
    quality:{url:'quality/',title:'RankForge Admin Quality',desc:'Private RankForge admin page.',index:false},
    'checkout-success':{url:'checkout-success/',title:'Checkout Completed — RankForge',desc:'RankForge checkout completed. Paid features activate after billing confirmation.',index:false},
    'checkout-cancelled':{url:'checkout-cancelled/',title:'Checkout Cancelled — RankForge',desc:'RankForge checkout was cancelled and no plan change was made.',index:false},
    'checkout-pending':{url:'checkout-pending/',title:'Payment Pending — RankForge',desc:'RankForge payment is pending. Paid features activate after checkout confirmation.',index:false},
    '404':{url:'404.html',title:'Page Not Found — RankForge',desc:'The RankForge page you are looking for was not found.',index:false}
  };
  var key=pageKey();var cfg=pages[key]||pages.home;
  function abs(u){return BASE+String(u||'').replace(/^\/+/, '');}
  function ensureMeta(name,content,attr){attr=attr||'name';var el=document.head.querySelector('meta['+attr+'="'+name+'"]');if(!el){el=document.createElement('meta');el.setAttribute(attr,name);document.head.appendChild(el);}el.setAttribute('content',content);return el;}
  function ensureLink(rel,href,extra){var el=document.head.querySelector('link[rel="'+rel+'"]'+(extra&&extra.sizes?'[sizes="'+extra.sizes+'"]':''));if(!el){el=document.createElement('link');el.setAttribute('rel',rel);document.head.appendChild(el);}el.setAttribute('href',href);if(extra){Object.keys(extra).forEach(function(k){el.setAttribute(k,extra[k]);});}return el;}
  function ensureJsonLd(id,obj){var el=document.getElementById(id);if(!el){el=document.createElement('script');el.type='application/ld+json';el.id=id;document.head.appendChild(el);}el.textContent=JSON.stringify(obj);}
  function apply(){
    document.title=cfg.title;
    ensureMeta('description',cfg.desc);
    ensureMeta('robots',cfg.index?'index, follow':'noindex, follow');
    ensureLink('canonical',abs(cfg.url));
    ensureLink('icon',BASE+'assets/favicon.svg',{type:'image/svg+xml'});
    ensureLink('apple-touch-icon',BASE+'assets/favicon.svg');
    ensureLink('manifest',BASE+'site.webmanifest');
    ensureMeta('theme-color','#0E1726');
    ensureMeta('og:site_name','RankForge by CrestlineOps','property');
    ensureMeta('og:title',cfg.title,'property');
    ensureMeta('og:description',cfg.desc,'property');
    ensureMeta('og:type',cfg.type||'website','property');
    ensureMeta('og:url',abs(cfg.url),'property');
    ensureMeta('og:image',OG,'property');
    ensureMeta('og:image:secure_url',OG,'property');
    ensureMeta('og:image:alt','RankForge evidence-based SEO lead intelligence','property');
    ensureMeta('twitter:card','summary_large_image');
    ensureMeta('twitter:title',cfg.title);
    ensureMeta('twitter:description',cfg.desc);
    ensureMeta('twitter:image',OG);
    var note=document.getElementById('rankforge-og-todo');
    if(!note){note=document.createComment('TODO: create binary PNG at /assets/og/rankforge-og.png. SVG placeholder exists at /assets/og/rankforge-og.svg.');document.head.appendChild(note);}
    if(key==='home')homepageJsonLd();
    if(key==='pricing')pricingFaqJsonLd();
    if(key==='how')howFaqJsonLd();
  }
  function homepageJsonLd(){ensureJsonLd('rankforge-jsonld-main',{
    '@context':'https://schema.org','@graph':[{
      '@type':'Organization','@id':BASE+'#organization','name':'CrestlineOps','url':BASE,'brand':{'@type':'Brand','name':'RankForge'},'logo':BASE+'assets/favicon.svg'
    },{
      '@type':'SoftwareApplication','@id':BASE+'#software','name':'RankForge','applicationCategory':'BusinessApplication','operatingSystem':'Web','url':BASE,'description':pages.home.desc,'publisher':{'@id':BASE+'#organization'},'offers':[{'@type':'Offer','name':'Free','price':'0','priceCurrency':'USD'},{'@type':'Offer','name':'Starter','price':'29','priceCurrency':'USD'},{'@type':'Offer','name':'Growth','price':'79','priceCurrency':'USD'}]
    },{
      '@type':'WebSite','@id':BASE+'#website','name':'RankForge by CrestlineOps','url':BASE,'publisher':{'@id':BASE+'#organization'}
    }]
  });}
  function faq(items){return {'@context':'https://schema.org','@type':'FAQPage','mainEntity':items.map(function(x){return {'@type':'Question','name':x.q,'acceptedAnswer':{'@type':'Answer','text':x.a}};})};}
  function pricingFaqJsonLd(){ensureJsonLd('rankforge-jsonld-faq',faq([
    {q:'What counts as a qualified lead?',a:'A qualified lead must pass the qualification gate, including verified SEO evidence, enough evidence signals, a usable contact path, and score thresholds.'},
    {q:'Do review-needed leads use credits?',a:'No. Needs Review prospects do not consume qualified lead credits.'},
    {q:'Do rejected leads use credits?',a:'No. Rejected prospects do not consume qualified lead credits.'},
    {q:'What is a search batch?',a:'A search batch tests one niche and market, such as dentists in Chicago or roofers in Austin.'},
    {q:'Can I export CSV files?',a:'CSV export is available on Starter, Growth, and Admin plans. Free users can preview leads but cannot export CSV.'},
    {q:'When do paid features activate?',a:'Paid access activates after checkout confirmation. Pending payments should not unlock paid plan limits.'},
    {q:'Does RankForge guarantee clients or revenue?',a:'No. RankForge provides evidence-based prospect intelligence, not guaranteed clients, rankings, or revenue.'}
  ]));}
  function howFaqJsonLd(){ensureJsonLd('rankforge-jsonld-faq',faq([
    {q:'What is a search batch?',a:'A focused search for one niche and one market, such as plumbers in Austin.'},
    {q:'What makes a lead qualified?',a:'A prospect must have verified SEO evidence, enough evidence signals, a usable contact path, and meet score thresholds.'},
    {q:'What happens if evidence is missing?',a:'The prospect stays in Needs Review. RankForge does not make strong SEO claims without verified evidence.'},
    {q:'Do Needs Review leads use credits?',a:'No. Needs Review prospects do not consume qualified lead credits.'},
    {q:'Do rejected prospects use credits?',a:'No. Rejected prospects do not consume credits and do not receive detailed SEO audit claims.'},
    {q:'Does RankForge guarantee clients or rankings?',a:'No. RankForge provides evidence-based prospect intelligence, not guaranteed clients, rankings, or revenue.'},
    {q:'What does AI do?',a:'AI may help translate verified crawl signals into plain-language explanations, but it does not invent issues or make the final decision.'}
  ]));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
