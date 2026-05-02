from pathlib import Path
import re, json
from PIL import Image, ImageDraw, ImageFont

BASE = 'https://automly1-lab.github.io/seo-lead-dashboard-site/'
OG = BASE + 'assets/og/rankforge-og.png'

PAGES = {
 'index.html': ('RankForge — Evidence-Based SEO Lead Intelligence for Agencies','RankForge helps SEO agencies find local businesses, verify SEO evidence, qualify prospects, and export contact-ready opportunities without unsupported SEO claims.','', 'index, follow'),
 'how-it-works/index.html': ('How RankForge Works — From Search Batch to Qualified SEO Prospect','See how RankForge discovers local businesses, verifies crawl-based SEO signals, checks contact paths, and classifies prospects as Qualified, Needs Review, or Rejected.','how-it-works/', 'index, follow'),
 'pricing/index.html': ('RankForge Pricing — Search Batches and Qualified Lead Credits','Start free, then upgrade for monthly search batches, qualified lead credits, verified evidence panels, contact path detection, and CSV export.','pricing/', 'index, follow'),
 'privacy/index.html': ('Privacy Policy — RankForge by CrestlineOps','Read the RankForge Privacy Policy to learn how CrestlineOps collects, uses, and protects information for its SEO lead intelligence product.','privacy/', 'index, follow'),
 'terms/index.html': ('Terms of Service — RankForge by CrestlineOps','Read the RankForge Terms of Service for account usage, billing, acceptable use, disclaimers, and service conditions.','terms/', 'index, follow'),
 'refund-policy/index.html': ('Refund Policy — RankForge by CrestlineOps','Read the RankForge Refund Policy to understand billing, cancellations, checkout confirmation, and refund handling.','refund-policy/', 'index, follow'),
 'status/index.html': ('System Status — RankForge','Check RankForge system status for search batches, website crawling, evidence analysis, exports, authentication, and billing.','status/', 'index, follow'),
 'login/index.html': ('Log In — RankForge','Log in to your RankForge workspace to review SEO prospects, search batches, verified evidence, and qualified lead opportunities.','login/', 'index, follow'),
 'signup/index.html': ('Start Free — RankForge','Create a RankForge workspace and run one free test search to find local SEO prospects backed by verified evidence.','signup/', 'index, follow'),
 'dashboard/index.html': ('RankForge Dashboard','Private RankForge workspace.','dashboard/', 'noindex, follow'),
 'searches/index.html': ('RankForge Searches','Private RankForge search workspace.','searches/', 'noindex, follow'),
 'leads/index.html': ('RankForge Prospects','Private RankForge prospect workspace.','leads/', 'noindex, follow'),
 'lead-detail/index.html': ('RankForge Lead Detail','Private RankForge lead detail page.','lead-detail/', 'noindex, follow'),
 'settings/index.html': ('RankForge Settings','Private RankForge settings page.','settings/', 'noindex, follow'),
 'quality/index.html': ('RankForge Admin Quality','Private RankForge admin page.','quality/', 'noindex, follow'),
 'checkout-success/index.html': ('Checkout Completed — RankForge','RankForge checkout completed. Paid features activate after billing confirmation.','checkout-success/', 'noindex, follow'),
 'checkout-cancelled/index.html': ('Checkout Cancelled — RankForge','RankForge checkout was cancelled and no plan change was made.','checkout-cancelled/', 'noindex, follow'),
 'checkout-pending/index.html': ('Payment Pending — RankForge','RankForge payment is pending. Paid features activate after checkout confirmation.','checkout-pending/', 'noindex, follow'),
 '404.html': ('Page Not Found — RankForge','The RankForge page you are looking for was not found.','404.html', 'noindex, follow'),
}

def e(s): return str(s).replace('&','&amp;').replace('"','&quot;').replace('<','&lt;').replace('>','&gt;')
def canon(url): return BASE + url
def prefix(path): return '' if '/' not in path else '../'
def styles(head): return re.findall(r'<link\s+[^>]*rel=["\']stylesheet["\'][^>]*>', head, flags=re.I)
def og_type(path): return 'article' if path.startswith(('privacy/','terms/','refund-policy/','how-it-works/')) else 'website'

def new_head(path, title, desc, url, robots, old_head):
    p = prefix(path)
    lines = ['<head>','  <meta charset="utf-8">','  <meta name="viewport" content="width=device-width, initial-scale=1">',
      f'  <title>{e(title)}</title>', f'  <meta name="description" content="{e(desc)}">', f'  <meta name="robots" content="{robots}">',
      f'  <link rel="canonical" href="{canon(url)}">', f'  <link rel="icon" href="{p}assets/favicon.svg" type="image/svg+xml">',
      f'  <link rel="apple-touch-icon" href="{p}assets/apple-touch-icon.png">', f'  <link rel="manifest" href="{p}site.webmanifest">',
      '  <meta name="theme-color" content="#0E1726">', '  <meta property="og:site_name" content="RankForge by CrestlineOps">',
      f'  <meta property="og:title" content="{e(title)}">', f'  <meta property="og:description" content="{e(desc)}">',
      f'  <meta property="og:type" content="{og_type(path)}">', f'  <meta property="og:url" content="{canon(url)}">',
      f'  <meta property="og:image" content="{OG}">', f'  <meta property="og:image:secure_url" content="{OG}">',
      '  <meta property="og:image:width" content="1200">', '  <meta property="og:image:height" content="630">',
      '  <meta property="og:image:alt" content="RankForge evidence-based SEO lead intelligence">',
      '  <meta name="twitter:card" content="summary_large_image">', f'  <meta name="twitter:title" content="{e(title)}">',
      f'  <meta name="twitter:description" content="{e(desc)}">', f'  <meta name="twitter:image" content="{OG}">']
    lines += ['  ' + s.strip() for s in styles(old_head)]
    lines.append('</head>')
    return '\n'.join(lines)

for f, vals in PAGES.items():
    p = Path(f)
    if not p.exists():
        print('missing', f); continue
    html = p.read_text(encoding='utf-8')
    m = re.search(r'<head>[\s\S]*?</head>', html, flags=re.I)
    if not m: print('no head', f); continue
    html = html[:m.start()] + new_head(f, *vals, m.group(0)) + html[m.end():]
    p.write_text(html, encoding='utf-8')

def font(size, bold=False):
    fp = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    try: return ImageFont.truetype(fp, size)
    except Exception: return ImageFont.load_default()

Path('assets/og').mkdir(parents=True, exist_ok=True)
W,H=1200,630
img=Image.new('RGB',(W,H),'#0E1726'); d=ImageDraw.Draw(img)
for r,a in [(700,35),(470,45),(320,60)]:
    glow=Image.new('RGBA',(W,H),(0,0,0,0)); gd=ImageDraw.Draw(glow)
    gd.ellipse((120-r//2,70-r//2,120+r//2,70+r//2), fill=(37,99,235,a))
    img=Image.alpha_composite(img.convert('RGBA'),glow).convert('RGB'); d=ImageDraw.Draw(img)
d.rounded_rectangle((80,82,166,168), radius=24, fill='#F8FAFC')
for i,h in enumerate([18,34,50]):
    x=104+i*18; d.rounded_rectangle((x,144-h,x+10,144), radius=3, fill='#2563EB')
d.line((98,150,146,110), fill='#14B8A6', width=7); d.line((116,156,128,168), fill='#22C55E', width=6); d.line((128,168,151,142), fill='#22C55E', width=6)
d.text((190,92),'RankForge',font=font(36,True),fill='white'); d.text((190,132),'by CrestlineOps',font=font(24),fill='#CBD5E1')
d.text((80,255),'Evidence-based SEO lead intelligence.',font=font(60,True),fill='white'); d.text((80,338),'Find local SEO prospects backed by verified crawl signals.',font=font(28),fill='#CBD5E1')
px=80
for text,bg,fg in [('No evidence, no strong claim','#EFF6FF','#1E3A8A'),('Qualified-only credits','#ECFDF5','#065F46')]:
    bb=d.textbbox((0,0),text,font=font(18,True)); pw=bb[2]-bb[0]+52
    d.rounded_rectangle((px,442,px+pw,496), radius=27, fill=bg); d.ellipse((px+16,462,px+29,475), fill='#059669')
    d.text((px+42,455),text,font=font(18,True),fill=fg); px += pw + 18
img.save('assets/og/rankforge-og.png', optimize=True)

def icon(size,path):
    im=Image.new('RGB',(size,size),'#0E1726'); di=ImageDraw.Draw(im); pad=size//6
    di.rounded_rectangle((pad,pad,size-pad,size-pad), radius=size//8, fill='#F8FAFC')
    for i,h in enumerate([size*.12,size*.22,size*.32]):
        x=size*.36+i*size*.09; di.rounded_rectangle((x,size*.66-h,x+size*.05,size*.66), radius=2, fill='#2563EB')
    di.line((size*.32,size*.68,size*.70,size*.38), fill='#14B8A6', width=max(3,size//30)); im.save(path, optimize=True)
icon(180,'assets/apple-touch-icon.png'); icon(192,'assets/icon-192.png'); icon(512,'assets/icon-512.png')
Path('site.webmanifest').write_text(json.dumps({'name':'RankForge by CrestlineOps','short_name':'RankForge','description':'Evidence-based SEO lead intelligence for agencies.','start_url':'/seo-lead-dashboard-site/','scope':'/seo-lead-dashboard-site/','display':'standalone','background_color':'#F7F8FA','theme_color':'#0E1726','icons':[{'src':'/seo-lead-dashboard-site/assets/icon-192.png','sizes':'192x192','type':'image/png'},{'src':'/seo-lead-dashboard-site/assets/icon-512.png','sizes':'512x512','type':'image/png'},{'src':'/seo-lead-dashboard-site/assets/favicon.svg','sizes':'any','type':'image/svg+xml','purpose':'any maskable'}]}, indent=2), encoding='utf-8')
Path('sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://automly1-lab.github.io/seo-lead-dashboard-site/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n  <url><loc>https://automly1-lab.github.io/seo-lead-dashboard-site/how-it-works/</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>\n  <url><loc>https://automly1-lab.github.io/seo-lead-dashboard-site/pricing/</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>\n  <url><loc>https://automly1-lab.github.io/seo-lead-dashboard-site/privacy/</loc><changefreq>yearly</changefreq><priority>0.4</priority></url>\n  <url><loc>https://automly1-lab.github.io/seo-lead-dashboard-site/terms/</loc><changefreq>yearly</changefreq><priority>0.4</priority></url>\n  <url><loc>https://automly1-lab.github.io/seo-lead-dashboard-site/refund-policy/</loc><changefreq>yearly</changefreq><priority>0.4</priority></url>\n  <url><loc>https://automly1-lab.github.io/seo-lead-dashboard-site/status/</loc><changefreq>daily</changefreq><priority>0.5</priority></url>\n</urlset>\n', encoding='utf-8')
Path('robots.txt').write_text('User-agent: *\nAllow: /seo-lead-dashboard-site/\nDisallow: /seo-lead-dashboard-site/dashboard/\nDisallow: /seo-lead-dashboard-site/searches/\nDisallow: /seo-lead-dashboard-site/leads/\nDisallow: /seo-lead-dashboard-site/lead-detail/\nDisallow: /seo-lead-dashboard-site/settings/\nDisallow: /seo-lead-dashboard-site/quality/\nDisallow: /seo-lead-dashboard-site/checkout-success/\nDisallow: /seo-lead-dashboard-site/checkout-cancelled/\nDisallow: /seo-lead-dashboard-site/checkout-pending/\n\nSitemap: https://automly1-lab.github.io/seo-lead-dashboard-site/sitemap.xml\n', encoding='utf-8')
for f in ['.github/workflows/seo-hardening.yml','.github/workflows/test.yml','scripts/seo_hardening.py']:
    p=Path(f)
    if p.exists(): p.unlink()
