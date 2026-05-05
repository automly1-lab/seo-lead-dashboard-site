(function(){
  'use strict';
  var BASE='https://crestlineops.com/';
  var OG=BASE+'assets/og/rankforge-og.png';
  var path=(location.pathname||'/').replace(/\/+/g,'/');
  function isRoot(){return path==='/'||path==='';}
  function has(seg){return path.indexOf('/'+seg+'/')!==-1;}
  function pageKey(){
    if(isRoot())return'home';
    if(has('product'))return'product';
    if(has('features'))return'features';
    if(has('pricing'))return'pricing';
    if(has('resources'))return'resources';
    if(has('company'))return'company';
    if(has('contact'))return'contact';
    if(has('privacy'))return'privacy';
    if(has('terms'))return'terms';
    if(has('refund-policy'))return'refund';
    if(has('status'))return'status';
    if(has('login'))return'login';
    if(has('signup'))return'signup';
    if(has('dashboard'))return'dashboard';
    if(has('admin'))return'admin';
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
    home:{url:'',title:'RankForge by CrestlineOps | Evidence-Based SEO Lead Intelligence',desc:'RankForge by CrestlineOps helps SEO agencies find local businesses, verify SEO evidence, qualify prospects, and export contact-ready opportunities without unsupported claims.',index:true},
    product:{url:'product/',title:'Product | RankForge SEO Lead Intelligence',desc:'See how RankForge turns local SEO discovery into a verified prospect pipeline with search batches, evidence review, contact readiness, and lead qualification.',index:true},
    features:{url:'features/',title:'Features | RankForge by CrestlineOps',desc:'Explore RankForge features for evidence-based SEO lead qualification, crawl signal review, scoring, contact readiness, credit protection, and CSV export.',index:true},
    pricing:{url:'pricing/',title:'Pricing | RankForge Qualified Lead Credits and Search Batches',desc:'Compare RankForge plans for SEO agencies. Start free, then upgrade for monthly search batches, qualified lead credits, verified evidence, and CSV export.',index:true},
    resources:{url:'resources/',title:'Resources | RankForge SEO Prospecting Guides',desc:'Read RankForge resources for evidence-based SEO prospecting, lead qualification, outreach context, credit rules, and safer local SEO sales workflows.',index:true,type:'article'},
    company:{url:'company/',title:'Company | RankForge by CrestlineOps',desc:'Learn about RankForge by CrestlineOps, an evidence-based SEO lead intelligence platform built for agencies that want proof before outreach.',index:true},
    contact:{url:'contact/',title:'Contact | RankForge by CrestlineOps',desc:'Contact the RankForge team to ask about SEO lead intelligence, qualified lead credits, search batches, exports, billing, or agency workflows.',index:true},
    privacy:{url:'privacy/',title:'Privacy Policy | RankForge by CrestlineOps',desc:'Read the RankForge Privacy Policy to learn how CrestlineOps collects, uses, and protects information for its SEO lead intelligence product.',index:true,type:'article'},
    terms:{url:'terms/',title:'Terms of Service | RankForge by CrestlineOps',desc:'Read the RankForge Terms of Service for account usage, billing, acceptable use, disclaimers, and service conditions.',index:true,type:'article'},
    refund:{url:'refund-policy/',title:'Refund Policy | RankForge by CrestlineOps',desc:'Read the RankForge Refund Policy to understand billing, cancellations, checkout confirmation, and refund handling.',index:true,type:'article'},
    status:{url:'status/',title:'System Status | RankForge',desc:'Check RankForge system status for search batches, website crawling, evidence analysis, exports, authentication, and billing.',index:true},
    login:{url:'login/',title:'Log In | RankForge',desc:'Log in to your private RankForge workspace.',index:false},
    signup:{url:'signup/',title:'Start Free | RankForge',desc:'Create a RankForge workspace and start a free test search.',index:false},
    dashboard:{url:'dashboard/',title:'RankForge Dashboard',desc:'Private RankForge workspace.',index:false},
    admin:{url:'dashboard/',title:'RankForge Admin Console',desc:'Private RankForge admin workspace.',index:false},
    searches:{url:'searches/',title:'RankForge Searches',desc:'Private RankForge search workspace.',index:false},
    leads:{url:'leads/',title:'RankForge Prospects',desc:'Private RankForge prospect workspace.',index:false},
    'lead-detail':{url:'lead-detail/',title:'RankForge Lead Detail',desc:'Private RankForge lead detail page.',index:false},
    settings:{url:'settings/',title:'RankForge Settings',desc:'Private RankForge settings page.',index:false},
    quality:{url:'quality/',title:'RankForge Admin Quality',desc:'Private RankForge admin page.',index:false},
    'checkout-success':{url:'checkout-success/',title:'Checkout Completed | RankForge',desc:'RankForge checkout completed. Paid features activate after billing confirmation.',index:false},
    'checkout-cancelled':{url:'checkout-cancelled/',title:'Checkout Cancelled | RankForge',desc:'RankForge checkout was cancelled and no plan change was made.',index:false},
    'checkout-pending':{url:'checkout-pending/',title:'Payment Pending | RankForge',desc:'RankForge payment is pending. Paid features activate after checkout confirmation.',index:false},
    '404':{url:'404.html',title:'Page Not Found | RankForge',desc:'The RankForge page you are looking for was not found.',index:false},
    unknown:{url:'',title:'RankForge by CrestlineOps',desc:'RankForge is evidence-based SEO lead intelligence for agencies.',index:false}
  };
  var key=pageKey();var cfg=pages[key]||pages.unknown;
  function abs(u){return BASE+String(u||'').replace(/^\/+/, '');}
  function ensureMeta(name,content,attr){attr=attr||'name';var el=document.head.querySelector('meta['+attr+'="'+name+'"]');if(!el){el=document.createElement('meta');el.setAttribute(attr,name);document.head.appendChild(el);}el.setAttribute('content',content);return el;}
  function ensureLink(rel,href,extra){var selector='link[rel="'+rel+'"]';if(extra&&extra.sizes)selector+='[sizes="'+extra.sizes+'"]';var el=document.head.querySelector(selector);if(!el){el=document.createElement('link');el.setAttribute('rel',rel);document.head.appendChild(el);}el.setAttribute('href',href);if(extra){Object.keys(extra).forEach(function(k){el.setAttribute(k,extra[k]);});}return el;}
  function ensureJsonLd(id,obj){var el=document.getElementById(id);if(!el){el=document.createElement('script');el.type='application/ld+json';el.id=id;document.head.appendChild(el);}el.textContent=JSON.stringify(obj);}
  function apply(){
    document.title=cfg.title;
    ensureMeta('description',cfg.desc);
    ensureMeta('robots',cfg.index?'index, follow, max-image-preview:large':'noindex, follow');
    ensureLink('canonical',abs(cfg.url));
    ensureLink('icon',BASE+'assets/favicon.svg',{type:'image/svg+xml'});
    ensureLink('apple-touch-icon',BASE+'assets/apple-touch-icon.png');
    ensureLink('manifest',BASE+'site.webmanifest');
    ensureMeta('theme-color','#0E1726');
    ensureMeta('og:site_name','RankForge by CrestlineOps','property');
    ensureMeta('og:title',cfg.title,'property');
    ensureMeta('og:description',cfg.desc,'property');
    ensureMeta('og:type',cfg.type||'website','property');
    ensureMeta('og:url',abs(cfg.url),'property');
    ensureMeta('og:image',OG,'property');
    ensureMeta('og:image:secure_url',OG,'property');
    ensureMeta('og:image:alt','RankForge by CrestlineOps evidence-based SEO lead intelligence','property');
    ensureMeta('twitter:card','summary_large_image');
    ensureMeta('twitter:title',cfg.title);
    ensureMeta('twitter:description',cfg.desc);
    ensureMeta('twitter:image',OG);
    homepageJsonLd();
    if(key==='pricing')pricingFaqJsonLd();
    if(key==='product'||key==='features')productJsonLd();
  }
  function homepageJsonLd(){ensureJsonLd('rankforge-jsonld-main',{
    '@context':'https://schema.org','@graph':[{
      '@type':'Organization','@id':BASE+'#organization','name':'CrestlineOps','url':BASE,'brand':{'@type':'Brand','name':'RankForge'},'logo':BASE+'assets/rankforge-mark.svg'
    },{
      '@type':'SoftwareApplication','@id':BASE+'#software','name':'RankForge','applicationCategory':'BusinessApplication','operatingSystem':'Web','url':BASE,'description':pages.home.desc,'publisher':{'@id':BASE+'#organization'},'offers':[{'@type':'Offer','name':'Free','price':'0','priceCurrency':'USD'},{'@type':'Offer','name':'Starter','price':'29','priceCurrency':'USD'},{'@type':'Offer','name':'Growth','price':'79','priceCurrency':'USD'}]
    },{
      '@type':'WebSite','@id':BASE+'#website','name':'RankForge by CrestlineOps','url':BASE,'publisher':{'@id':BASE+'#organization'}
    }]
  });}
  function productJsonLd(){ensureJsonLd('rankforge-jsonld-product',{'@context':'https://schema.org','@type':'Product','name':'RankForge','brand':{'@type':'Brand','name':'RankForge'},'description':pages.product.desc,'category':'SEO lead intelligence software','url':BASE+'product/','offers':{'@type':'AggregateOffer','lowPrice':'0','highPrice':'79','priceCurrency':'USD'}});}
  function faq(items){return {'@context':'https://schema.org','@type':'FAQPage','mainEntity':items.map(function(x){return {'@type':'Question','name':x.q,'acceptedAnswer':{'@type':'Answer','text':x.a}};})};}
  function pricingFaqJsonLd(){ensureJsonLd('rankforge-jsonld-faq',faq([
    {q:'What counts as a qualified lead?',a:'A qualified lead must pass the qualification gate, including verified SEO evidence, enough evidence signals, a usable contact path, and score thresholds.'},
    {q:'Do Needs Review leads use credits?',a:'No. Needs Review prospects do not consume qualified lead credits.'},
    {q:'Do Rejected leads use credits?',a:'No. Rejected prospects do not consume qualified lead credits.'},
    {q:'What is a search batch?',a:'A search batch tests one niche and market, such as dentists in Chicago or roofers in Austin.'},
    {q:'Can I export CSV files?',a:'CSV export is available on Starter, Growth, and Admin plans. Free users can preview leads but cannot export CSV.'},
    {q:'Does RankForge guarantee clients or revenue?',a:'No. RankForge provides evidence-based prospect intelligence, not guaranteed clients, rankings, or revenue.'}
  ]));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
