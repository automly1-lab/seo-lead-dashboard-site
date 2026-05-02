from pathlib import Path


def rw(path, fn):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    ns = fn(s)
    if ns != s:
        p.write_text(ns, encoding='utf-8')
        print('updated', path)
    else:
        print('no changes', path)


def home(s):
    reps = {
        'Evidence-based lead intelligence for SEO agencies': 'Evidence-based prospect qualification for SEO agencies',
        'Find local SEO prospects backed by real evidence.': 'Find local SEO prospects worth contacting.',
        'RankForge helps agencies discover local businesses, verify crawl-based SEO signals, qualify prospects, and export contact-ready opportunities — without making unsupported SEO claims.': 'RankForge helps agencies turn niche-and-city searches into evidence-backed prospect decisions, with verified SEO signals, contact readiness, and clear qualification states.',
        'No verified evidence means no strong SEO claim. Qualified leads consume credits; review-needed and rejected prospects do not.': 'Qualified prospects require evidence, a contact path, and opportunity fit. Leads without enough proof stay in review or are filtered out.',
        '>Start Free<': '>Start free<',
        'RankForge workspace</span>': 'Example workspace · sample data</span>',
        '<span>Qualified Leads</span><strong>18</strong>': '<span>Sample qualified leads</span><strong>18</strong>',
        '<span>Needs Review</span><strong>12</strong>': '<span>Sample needs review</span><strong>12</strong>',
        '<span>Evidence Coverage</span><strong>72%</strong>': '<span>Example evidence coverage</span><strong>72%</strong>',
        '<span>Credits Used</span><strong>18</strong>': '<span>Example credits used</span><strong>18</strong>',
        '<span class="rf-status">82 score</span>': '<span class="rf-status">Example score: 82</span>',
        '<h3>Miami Restoration Co.</h3>': '<h3>Example business profile</h3>',
        'Evidence: Verified · 6 signals<br>Contact: Phone + contact page': 'Sample evidence: Verified · 6 signals<br>Contact: Phone + contact page',
        'Most lead lists are too noisy to trust.': 'Most lead lists do not tell you who is worth contacting.',
        'SEO agencies do not just need more business names. They need prospects with a clear reason to reach out.': 'SEO agencies do not need another spreadsheet of business names. They need a clear reason to reach out, backed by evidence they can trust.',
        'Generic scraping creates weak lists': 'Raw lists create wasted outreach',
        'Raw business lists rarely explain why a company is worth contacting.': 'Business directories and scraped lists rarely explain which companies are worth your team’s time.',
        'AI can overstate SEO problems': 'Unsupported SEO claims create risk',
        'Unsupported claims damage trust. A lead should not be marked qualified without evidence.': 'A high score is not enough. Outreach should be based on evidence your team can actually review.',
        'Checking websites, contact paths, and local SEO signals by hand does not scale.': 'Checking websites, contact paths, market fit, and outreach angles by hand does not scale across cities and niches.',
        'RankForge is built to qualify opportunities, not just collect rows.': 'RankForge is built to help agencies qualify opportunities, not just collect rows.',
        'The quality rule behind every lead': 'The quality rule behind every prospect',
        '<h2>No verified evidence = no strong SEO claim.</h2>': '<h2>Claims require evidence.</h2>',
        'RankForge does not mark a business qualified just because a score is high. Verified crawl signals, evidence count, and contact path must support the decision.': 'RankForge does not mark a prospect qualified just because it looks promising. Each lead is routed through an evidence gate that checks crawl signals, contact readiness, and opportunity fit before it becomes a qualified opportunity.',
        'From search batch to qualified prospect.': 'From market search to prospect decision.',
        'Run one focused market search, verify evidence, and review only the opportunities that pass the gate.': 'Run a focused search, verify the signals, and review the prospects most likely to support a credible outreach conversation.',
        'Prospects are classified as Qualified, Needs Review, or Rejected before export.': 'Prospects are classified as Qualified, Needs Review, or Filtered Out before export.',
        'Review qualified opportunities': 'Review prospect decisions',
        'A workspace built for lead decisions, not raw spreadsheets.': 'A workspace for lead decisions, not raw spreadsheets.',
        'Filter prospects by status, evidence, contact readiness, and SEO need.': 'Filter prospects by qualification status, evidence strength, contact readiness, and opportunity fit.',
        'Qualified means evidence-backed.': 'Qualified means ready for agency review.',
        'Every prospect is routed through a qualification gate before it becomes an opportunity.': 'A prospect only becomes qualified when the evidence supports the decision.',
        'Ready for review and export': 'Ready for review and export',
        'Evidence-backed opportunities for paid-plan export.': 'Ready for review and export on eligible plans.',
        'Rejected</span><h3>Filtered out</h3>': 'Filtered Out</span><h3>Not a fit for qualified outreach</h3>',
        'Rejected prospects are filtered out and review-needed leads are clearly separated.': 'Filtered-out prospects are separated and review-needed leads are clearly held back before outreach.',
        'Explain why a lead matters': 'Know why they matter',
        'Find better local prospects': 'Know who to contact',
        'Search focused niches and cities instead of buying broad generic lists.': 'Prioritize prospects that match your niche, market, contact criteria, and evidence thresholds.',
        'Use verified signals and cautious language instead of unsupported claims.': 'Use evidence snapshots and decision reasons instead of vague “bad SEO” claims.',
        'Track usage clearly': 'Keep billing understandable',
        'Search batches and qualified lead credits are separated so billing is easier to understand.': 'Search batches and qualified lead credits are tracked separately. Review and filtered-out prospects do not consume qualified lead credits.',
        'Credits are tied to qualified opportunities, not raw rows.': 'Credits are tied to qualified opportunities, not raw rows.',
        'Qualified = verified evidence + contact path + score thresholds': 'Qualified = evidence + contact path + opportunity fit',
        '<strong>Review / Rejected</strong> no credit': '<strong>Review / Filtered Out</strong> no credit',
        'Evidence-based SEO lead intelligence for agencies.': 'Evidence-based prospect qualification for SEO agencies.',
        'Review / Rejected': 'Review / Filtered Out',
        'Do rejected prospects use credits?': 'Do filtered-out prospects use credits?',
        'No. Rejected prospects do not consume credits and do not receive detailed SEO audit claims.': 'No. Filtered-out prospects do not consume qualified lead credits.',
        'CSV export is available on Starter, Growth, and Admin plans. Free users can preview leads but cannot export CSV.': 'CSV export is available on Starter and Growth plans. Free users can preview results but cannot export CSV.',
        'RankForge helps SEO agencies find local businesses, verify SEO and contact signals, and classify prospects as Qualified, Needs Review, or Rejected.': 'RankForge helps SEO agencies find local businesses, verify available SEO and contact signals, and classify prospects as Qualified, Needs Review, or Filtered Out.',
        'A prospect must have verified SEO evidence, enough evidence signals, a usable contact path, and pass score thresholds.': 'A qualified prospect needs verified evidence, enough supporting signals, a usable contact path, relevant market fit, and score thresholds.',
        'The prospect stays in Needs Review. RankForge does not make strong SEO claims without verified evidence.': 'The prospect stays in Needs Review or is filtered out. RankForge should not make strong SEO claims without supporting evidence.',
    }
    for a,b in reps.items(): s = s.replace(a,b)
    insert_after = '''</section>\n\n    <section class="rf-section">\n      <div class="rf-container">\n        <div class="rf-section-head">\n          <p class="rf-eyebrow">Workspace</p>'''
    example = '''</section>\n\n    <section class="rf-section rf-example-output">\n      <div class="rf-container">\n        <div class="rf-section-head">\n          <p class="rf-eyebrow">Example output</p>\n          <h2>See the decision, the evidence, and the next action.</h2>\n          <p>RankForge output is structured for agency review and outreach planning — not generic audit reports.</p>\n        </div>\n        <div class="rf-example-card">\n          <div class="rf-example-label">Example lead output · sample data</div>\n          <div class="rf-example-grid">\n            <div>\n              <span class="rf-pill review">Needs Review</span>\n              <h3>Example Prospect</h3>\n              <p class="rf-example-muted">Austin roof repair company · illustrative business profile</p>\n              <h4>Decision reason</h4>\n              <p>Potential opportunity, but evidence is not strong enough yet for a qualified claim.</p>\n              <h4>Suggested next action</h4>\n              <p>Review manually before outreach. Do not export as qualified yet.</p>\n            </div>\n            <div class="rf-evidence-snapshot">\n              <h4>Sample evidence snapshot</h4>\n              <ul class="rf-checklist">\n                <li>Service pages detected</li>\n                <li>Contact page found</li>\n                <li>Local city reference found</li>\n                <li>Metadata appears thin</li>\n                <li>Evidence count below qualified threshold</li>\n              </ul>\n              <h4>Contact readiness</h4>\n              <p>Phone visible · Contact page available · Email not found</p>\n            </div>\n          </div>\n          <div class="rf-outreach-angle"><strong>Example outreach angle:</strong> “Your service pages are visible, but the current site signals may not fully support local search visibility. Worth reviewing before outreach.” <span>Example only. RankForge should only generate outreach angles from verified crawl and contact signals.</span></div>\n        </div>\n      </div>\n    </section>\n\n    <section class="rf-section">\n      <div class="rf-container">\n        <div class="rf-section-head">\n          <p class="rf-eyebrow">Workspace</p>'''
    if 'rf-example-output' not in s and insert_after in s:
        s = s.replace(insert_after, example, 1)
    return s


def pricing(s):
    reps = {
        'Evidence-based lead intelligence': 'Search batches and qualified lead credits',
        'Plans built around search batches and qualified lead credits.': 'Pricing built around qualified opportunities, not raw rows.',
        'Find local businesses worth reviewing, verify SEO evidence, and export contact-ready opportunities. Qualified leads consume credits; review-needed and rejected leads do not.': 'Start with one free test search. Upgrade when you are ready for monthly search batches, qualified lead credits, evidence review, contact readiness, and CSV export.',
        'Start free with one test search. Paid features activate only after checkout confirmation.': 'Needs Review and Filtered Out prospects do not consume qualified lead credits. Paid features activate only after checkout confirmation.',
        '>Start Free<': '>Start free<',
        'Try RankForge before paying.': 'Run one focused search and preview the workflow before upgrading.',
        'Evidence-based lead review': 'Evidence-based prospect review',
        'Verified evidence panel': 'Evidence snapshot',
        'Competitor visibility signals': 'Advanced opportunity breakdown',
        'Advanced opportunity breakdown': 'Advanced opportunity breakdown',
        'Advanced export fields</li>': 'Advanced export fields planned</li>',
        'Team and CRM features later': 'Team and CRM features planned',
        'Only qualified leads consume lead credits.': 'Only qualified prospects consume lead credits.',
        'RankForge separates search activity from qualified opportunity output, so review-needed and rejected prospects do not use lead credits.': 'RankForge separates search activity from qualified opportunity output, so review-needed and filtered-out prospects do not use qualified lead credits.',
        'No unsupported claims': 'Review-safe by design',
        'If verified evidence is missing, the prospect stays in review instead of being marked qualified.': 'If the evidence is incomplete, the prospect stays in review instead of being counted as qualified.',
        'Qualified = verified SEO evidence + contact path + score thresholds': 'Qualified = evidence + contact path + opportunity fit',
        'SEO Need': 'Opportunity Fit',
        'Crawl signals identify visible local SEO opportunity from available website data.': 'Evidence and fit signals help operators understand whether a prospect is worth agency review.',
        'No verified evidence means no strong SEO claim.': 'Claims require evidence before a prospect is treated as qualified.',
        'Lead intelligence, not raw scraping.': 'Prospect qualification, not raw scraping.',
        'Only qualified leads consume lead credits.': 'Only qualified prospects consume lead credits.',
        'review-needed and rejected prospects': 'review-needed and filtered-out prospects',
        'No verified evidence, no strong SEO claim.': 'Claims require evidence.',
        'Review-needed prospects do not consume lead credits.': 'Needs Review prospects do not consume qualified lead credits.',
        'Rejected prospects are filtered without detailed SEO audit claims.': 'Filtered Out prospects are skipped without detailed audit-style claims.',
        'Do rejected leads use credits?': 'Do Filtered Out leads use credits?',
        'No. Rejected prospects do not consume qualified lead credits.': 'No. Filtered Out prospects do not consume qualified lead credits.',
        'A qualified lead must pass the qualification gate, including verified SEO evidence, enough evidence signals, a usable contact path, and score thresholds.': 'A qualified lead must pass the qualification gate, including verified evidence, enough supporting signals, a usable contact path, relevant market fit, and score thresholds.',
        'CSV export is available on Starter, Growth, and Admin plans. Free users can preview leads but cannot export CSV.': 'CSV export is available on Starter and Growth plans. Free users can preview leads but cannot export CSV.',
        'Test a niche and city, review the evidence, and see whether RankForge can surface contact-ready SEO opportunities.': 'Test a niche and city, review the evidence, and see whether RankForge can surface contact-ready qualified opportunities.',
        'Evidence-based SEO lead intelligence for agencies.': 'Evidence-based prospect qualification for SEO agencies.',
    }
    for a,b in reps.items(): s=s.replace(a,b)
    # make Agency card clearer if duplicate wording occurs
    s=s.replace('<p>For agencies that need deeper intelligence and scale.</p>', '<p>For agencies that need deeper intelligence, higher volume, and future team workflows.</p>')
    return s


def how(s):
    reps={
        'Evidence-based SEO lead intelligence': 'Evidence-based prospect qualification',
        'How RankForge finds local businesses worth reviewing.': 'How RankForge turns local searches into prospect decisions.',
        'Start with one focused search batch, verify real website and contact signals, then review only the prospects with enough evidence to support outreach.': 'Start with one niche and city, verify real website and contact signals, then review prospects by qualification status before outreach.',
        'No verified evidence means no strong SEO claim. Qualified leads consume credits; review-needed and rejected prospects do not.': 'Qualified means evidence, contact path, and opportunity fit. Anything uncertain stays in review or gets filtered out.',
        '>Start Free<': '>Start free<',
        'Search batch workflow': 'Example workflow · illustrative only',
        '<span class="rf-outcome reject">Rejected</span>': '<span class="rf-outcome reject">Filtered Out</span>',
        'The rule that protects lead quality': 'The rule that protects prospect quality',
        '<h2>No verified evidence = no strong SEO claim.</h2>': '<h2>Claims require evidence.</h2>',
        'Evidence first. Scores second.': 'Scores support decisions. Evidence controls qualification.',
        'RankForge does not mark a business qualified just because a score is high. A prospect needs verified crawl evidence, enough SEO signals, and a usable contact path before it becomes a qualified opportunity.': 'RankForge does not mark a prospect qualified just because it looks promising. Each lead is routed through an evidence gate that checks crawl signals, contact readiness, and opportunity fit before it becomes a qualified opportunity.',
        'Rejected prospects skip detailed audit claims.': 'Filtered-out prospects skip detailed audit-style claims.',
        'From one test search to qualified prospects.': 'From one test search to qualified opportunities.',
        'Start small, judge the quality, then scale only when the results are useful.': 'RankForge helps agencies test a market, review the evidence, and decide whether the output is worth scaling.',
        'Review evidence-backed leads': 'Review the prospect decisions',
        'Check scores, contact path, and the lead detail page before outreach.': 'See which businesses are Qualified, Need Review, or were Filtered Out.',
        'Each batch moves prospects through discovery, filtering, crawl analysis, evidence extraction, and qualification.': 'Each batch moves from discovery to evidence review to a final prospect decision.',
        'An agency enters niche, business type, city, country, and score thresholds. The request is sent into the automation workflow.': 'You define the niche, location, and search intent.',
        'RankForge gathers local business candidates, removes obvious junk, and keeps real business websites for review.': 'RankForge gathers candidate businesses and removes obvious poor-fit results.',
        'Website Signal Extraction': 'Signal Verification',
        'The workflow checks homepage and contact-path signals such as title/meta quality, service pages, location pages, local indicators, content depth, accessibility, and indexability.': 'The system checks available website, local SEO, content, and contact-path signals.',
        'Verified evidence fields': 'Evidence snapshot',
        'Each candidate receives SEO need, commercial fit, contact confidence, and overall lead scores.': 'Each prospect is classified as Qualified, Needs Review, or Filtered Out.',
        'Qualified / Needs Review / Rejected': 'Qualified / Needs Review / Filtered Out',
        'Users review saved lists, inspect lead details, filter prospects, and export contact-ready records for outreach.': 'Your team reviews details, filters results, and exports qualified opportunities on eligible plans.',
        'Export-ready prospects': 'Outreach-ready list',
        'Why not every lead becomes qualified.': 'Why not every prospect becomes qualified.',
        'RankForge is designed to avoid unsupported SEO claims.': 'RankForge is designed to prevent unsupported outreach claims.',
        'Evidence-backed opportunity': 'Ready for review and export',
        'Qualified prospects are evidence-backed and may be exported if the user’s plan allows it.': 'Ready for review and export on eligible plans.',
        'Verified SEO evidence': 'Verified evidence',
        '3+ evidence signals': 'Enough supporting signals',
        'SEO need score threshold met': 'Relevant market fit',
        'Commercial fit threshold met': 'Score thresholds met',
        '<span class="rf-status-badge rejected">Rejected</span><h3>Filtered out safely</h3>': '<span class="rf-status-badge rejected">Filtered Out</span><h3>Not a fit for qualified outreach</h3>',
        'Rejected prospects do not consume credits and do not receive detailed SEO audit claims.': 'Filtered Out prospects do not consume qualified lead credits and do not receive detailed audit-style claims.',
        'High score alone is not enough. Evidence and contact path matter.': 'High score alone is not enough. Evidence and contact readiness decide whether a lead moves forward.',
        'The system checks more than whether a business exists.': 'Scores support decisions. They do not replace evidence.',
        'RankForge focuses on the signals that make a prospect worth agency attention.': 'RankForge scores help prioritize review, but qualification still depends on evidence and contact readiness.',
        'SEO Need Score': 'SEO Opportunity Signal',
        'Metadata, service pages, location pages, local mentions, content depth, crawl quality, and other available SEO signals.': 'Available website and local SEO indicators that may support an outreach reason.',
        'Used for: Opportunity signal': 'Used for: Opportunity context',
        'Commercial Fit Score': 'Commercial Fit',
        'Business category value, buyer intent, service-market relevance, and commercial opportunity indicators.': 'Whether the business category, service market, and niche are relevant for agency outreach.',
        'Used for: Market value': 'Used for: Market fit',
        'Overall score and qualification status decide whether a prospect is qualified, needs review, or rejected.': 'Evidence, contact readiness, and fit combine into a review priority.',
        'Used for: Final queue': 'Used for: Queue order',
        'Filter qualified and review-needed prospects by evidence, contact readiness, and SEO need.': 'Filter qualified and review-needed prospects by evidence, contact readiness, and opportunity fit.',
        'Credits are tied to qualified opportunities, not raw rows.': 'Credits are counted only for qualified opportunities.',
        'Search batches help you test markets. Qualified lead credits are counted only when a prospect passes the qualification gate. Review-needed and rejected prospects do not consume qualified lead credits.': 'Search batches help you test markets. Qualified lead credits are counted only when a prospect passes the qualification gate. Needs Review and Filtered Out prospects do not consume qualified lead credits.',
        'Qualified = verified evidence + contact path + score thresholds': 'Qualified = evidence + contact path + opportunity fit',
        '<strong>Rejected</strong> no credit': '<strong>Filtered Out</strong> no credit',
        'Do rejected prospects use credits?': 'Do filtered-out prospects use credits?',
        'No. Rejected prospects do not consume credits and do not receive detailed SEO audit claims.': 'No. Filtered Out prospects do not consume credits and do not receive detailed audit-style claims.',
        'The prospect stays in Needs Review. RankForge does not make strong SEO claims without verified evidence.': 'The prospect stays in Needs Review. RankForge does not make strong SEO claims without supporting evidence.',
        'Evidence-based SEO lead intelligence for agencies.': 'Evidence-based prospect qualification for SEO agencies.',
    }
    for a,b in reps.items(): s=s.replace(a,b)
    return s


def css(s):
    add='''\n/* Copy/positioning update: example lead output */\n.rf-example-card{border:1px solid var(--rf-border-subtle);border-radius:28px;background:#fff;padding:24px;box-shadow:var(--rf-shadow-md)}.rf-example-label{display:inline-flex;border-radius:999px;background:var(--rf-primary-soft);color:#1E3A8A;border:1px solid #BFDBFE;padding:6px 10px;font-size:12px;font-weight:900;margin-bottom:16px}.rf-example-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.rf-example-card h3{margin:0;font-size:24px;letter-spacing:-.03em}.rf-example-card h4{margin:16px 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--rf-text-muted)}.rf-example-card p{margin:0;color:var(--rf-text-secondary);font-size:14px;line-height:23px}.rf-example-muted{margin-top:6px!important;color:var(--rf-text-muted)!important}.rf-evidence-snapshot{border:1px solid var(--rf-border-subtle);border-radius:20px;background:#F8FAFC;padding:18px}.rf-outreach-angle{margin-top:16px;border:1px solid #FDE68A;background:var(--rf-warning-soft);border-radius:18px;padding:14px;color:#92400E;font-size:14px;line-height:23px}.rf-outreach-angle span{display:block;margin-top:6px;font-size:12px;color:#A16207;font-weight:700}@media(max-width:760px){.rf-example-grid{grid-template-columns:1fr}.rf-example-card{padding:18px}}\n'''
    if 'rf-example-card' not in s:
        s += add
    return s

rw('index.html', home)
rw('pricing/index.html', pricing)
rw('how-it-works/index.html', how)
rw('assets/home-premium.css', css)

for f in ['scripts/copy_positioning_update.py', '.github/workflows/copy-positioning.yml']:
    p=Path(f)
    if p.exists(): p.unlink()
