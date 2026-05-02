(function(){
  'use strict';

  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  function isMarketingPage(){ return document.body && (document.body.classList.contains('rf-home-page') || document.body.classList.contains('rf-pricing-page') || document.body.classList.contains('rf-how-page')); }
  function text(el, value){ if(el) el.textContent = value; }
  function html(el, value){ if(el) el.innerHTML = value; }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  const replacements = new Map([
    ['Evidence-based lead intelligence for SEO agencies','Evidence-based prospect qualification for SEO agencies'],
    ['Evidence-based SEO lead intelligence','Evidence-based prospect qualification'],
    ['Evidence-based lead intelligence','Search batches and qualified lead credits'],
    ['Evidence-based SEO lead intelligence for agencies.','Evidence-based prospect qualification for SEO agencies.'],
    ['Find local SEO prospects backed by real evidence.','Find local SEO prospects worth contacting.'],
    ['RankForge helps agencies discover local businesses, verify crawl-based SEO signals, qualify prospects, and export contact-ready opportunities — without making unsupported SEO claims.','RankForge helps agencies turn niche-and-city searches into evidence-backed prospect decisions, with verified SEO signals, contact readiness, and clear qualification states.'],
    ['No verified evidence means no strong SEO claim. Qualified leads consume credits; review-needed and rejected prospects do not.','Qualified prospects require evidence, a contact path, and opportunity fit. Leads without enough proof stay in review or are filtered out.'],
    ['Most lead lists are too noisy to trust.','Most lead lists do not tell you who is worth contacting.'],
    ['SEO agencies do not just need more business names. They need prospects with a clear reason to reach out.','SEO agencies do not need another spreadsheet of business names. They need a clear reason to reach out, backed by evidence they can trust.'],
    ['Generic scraping creates weak lists','Raw lists create wasted outreach'],
    ['Raw business lists rarely explain why a company is worth contacting.','Business directories and scraped lists rarely explain which companies are worth your team’s time.'],
    ['AI can overstate SEO problems','Unsupported SEO claims create risk'],
    ['Unsupported claims damage trust. A lead should not be marked qualified without evidence.','A high score is not enough. Outreach should be based on evidence your team can actually review.'],
    ['Checking websites, contact paths, and local SEO signals by hand does not scale.','Checking websites, contact paths, market fit, and outreach angles by hand does not scale across cities and niches.'],
    ['RankForge is built to qualify opportunities, not just collect rows.','RankForge is built to help agencies qualify opportunities, not just collect rows.'],
    ['The quality rule behind every lead','The quality rule behind every prospect'],
    ['No verified evidence = no strong SEO claim.','Claims require evidence.'],
    ['RankForge does not mark a business qualified just because a score is high. Verified crawl signals, evidence count, and contact path must support the decision.','RankForge does not mark a prospect qualified just because it looks promising. Each lead is routed through an evidence gate that checks crawl signals, contact readiness, and opportunity fit before it becomes a qualified opportunity.'],
    ['High score without evidence stays in review.','High score without evidence stays in review.'],
    ['Rejected prospects skip detailed audit claims.','Filtered-out prospects skip detailed audit-style claims.'],
    ['From search batch to qualified prospect.','From market search to prospect decision.'],
    ['Run one focused market search, verify evidence, and review only the opportunities that pass the gate.','Run a focused search, verify the signals, and review the prospects most likely to support a credible outreach conversation.'],
    ['Review qualified opportunities','Review prospect decisions'],
    ['Prospects are classified as Qualified, Needs Review, or Rejected before export.','Prospects are classified as Qualified, Needs Review, or Filtered Out before export.'],
    ['A workspace built for lead decisions, not raw spreadsheets.','A workspace for lead decisions, not raw spreadsheets.'],
    ['Filter prospects by status, evidence, contact readiness, and SEO need.','Filter prospects by qualification status, evidence strength, contact readiness, and opportunity fit.'],
    ['Qualified means evidence-backed.','Qualified means ready for agency review.'],
    ['Every prospect is routed through a qualification gate before it becomes an opportunity.','A prospect only becomes qualified when the evidence supports the decision.'],
    ['Evidence-backed opportunities for paid-plan export.','Ready for review and export on eligible plans.'],
    ['Rejected','Filtered Out'],
    ['rejected','filtered-out'],
    ['Review / Rejected','Review / Filtered Out'],
    ['Do rejected prospects use credits?','Do filtered-out prospects use credits?'],
    ['No. Rejected prospects do not consume credits and do not receive detailed SEO audit claims.','No. Filtered-out prospects do not consume qualified lead credits.'],
    ['CSV export is available on Starter, Growth, and Admin plans. Free users can preview leads but cannot export CSV.','CSV export is available on Starter and Growth plans. Free users can preview results but cannot export CSV.'],
    ['Find better local prospects','Know who to contact'],
    ['Search focused niches and cities instead of buying broad generic lists.','Prioritize prospects that match your niche, market, contact criteria, and evidence thresholds.'],
    ['Explain why a lead matters','Know why they matter'],
    ['Use verified signals and cautious language instead of unsupported claims.','Use evidence snapshots and decision reasons instead of vague “bad SEO” claims.'],
    ['Track usage clearly','Keep billing understandable'],
    ['Search batches and qualified lead credits are separated so billing is easier to understand.','Search batches and qualified lead credits are tracked separately. Review and filtered-out prospects do not consume qualified lead credits.'],
    ['Qualified = verified evidence + contact path + score thresholds','Qualified = evidence + contact path + opportunity fit'],
    ['Qualified = verified SEO evidence + contact path + score thresholds','Qualified = evidence + contact path + opportunity fit'],
    ['Plans built around search batches and qualified lead credits.','Pricing built around qualified opportunities, not raw rows.'],
    ['Find local businesses worth reviewing, verify SEO evidence, and export contact-ready opportunities. Qualified leads consume credits; review-needed and rejected leads do not.','Start with one free test search. Upgrade when you are ready for monthly search batches, qualified lead credits, evidence review, contact readiness, and CSV export.'],
    ['Start free with one test search. Paid features activate only after checkout confirmation.','Needs Review and Filtered Out prospects do not consume qualified lead credits. Paid features activate only after checkout confirmation.'],
    ['Try RankForge before paying.','Run one focused search and preview the workflow before upgrading.'],
    ['Evidence-based lead review','Evidence-based prospect review'],
    ['Verified evidence panel','Evidence snapshot'],
    ['Team and CRM features later','Team and CRM features planned'],
    ['Advanced export fields','Advanced export fields planned'],
    ['Only qualified leads consume lead credits.','Only qualified prospects consume lead credits.'],
    ['RankForge separates search activity from qualified opportunity output, so review-needed and rejected prospects do not use lead credits.','RankForge separates search activity from qualified opportunity output, so review-needed and filtered-out prospects do not use qualified lead credits.'],
    ['No unsupported claims','Review-safe by design'],
    ['If verified evidence is missing, the prospect stays in review instead of being marked qualified.','If the evidence is incomplete, the prospect stays in review instead of being counted as qualified.'],
    ['Lead intelligence, not raw scraping.','Prospect qualification, not raw scraping.'],
    ['Crawl signals identify visible local SEO opportunity from available website data.','Evidence and fit signals help operators understand whether a prospect is worth agency review.'],
    ['RankForge provides prospect intelligence for SEO agencies. It does not guarantee clients, rankings, or revenue. Leads are qualified only when evidence and contact criteria are met.','RankForge provides prospect qualification intelligence for SEO agencies. It does not guarantee clients, rankings, or revenue. Prospects are qualified only when evidence, contact readiness, and fit criteria are met.'],
    ['How RankForge finds local businesses worth reviewing.','How RankForge turns local searches into prospect decisions.'],
    ['Start with one focused search batch, verify real website and contact signals, then review only the prospects with enough evidence to support outreach.','Start with one niche and city, verify real website and contact signals, then review prospects by qualification status before outreach.'],
    ['Search batch workflow','Example workflow · illustrative only'],
    ['Evidence first. Scores second.','Scores support decisions. Evidence controls qualification.'],
    ['From one test search to qualified prospects.','From one test search to qualified opportunities.'],
    ['Start small, judge the quality, then scale only when the results are useful.','RankForge helps agencies test a market, review the evidence, and decide whether the output is worth scaling.'],
    ['Review evidence-backed leads','Review the prospect decisions'],
    ['Check scores, contact path, and the lead detail page before outreach.','See which businesses are Qualified, Need Review, or were Filtered Out.'],
    ['Each batch moves prospects through discovery, filtering, crawl analysis, evidence extraction, and qualification.','Each batch moves from discovery to evidence review to a final prospect decision.'],
    ['An agency enters niche, business type, city, country, and score thresholds. The request is sent into the automation workflow.','You define the niche, location, and search intent.'],
    ['Website Signal Extraction','Signal Verification'],
    ['Verified evidence fields','Evidence snapshot'],
    ['Each candidate receives SEO need, commercial fit, contact confidence, and overall lead scores.','Each prospect is classified as Qualified, Needs Review, or Filtered Out.'],
    ['Qualified / Needs Review / Rejected','Qualified / Needs Review / Filtered Out'],
    ['Export-ready prospects','Outreach-ready list'],
    ['Why not every lead becomes qualified.','Why not every prospect becomes qualified.'],
    ['RankForge is designed to avoid unsupported SEO claims.','RankForge is designed to prevent unsupported outreach claims.'],
    ['Evidence-backed opportunity','Ready for review and export'],
    ['Verified SEO evidence','Verified evidence'],
    ['3+ evidence signals','Enough supporting signals'],
    ['SEO Need Score','SEO Opportunity Signal'],
    ['The system checks more than whether a business exists.','Scores support decisions. They do not replace evidence.'],
    ['RankForge focuses on the signals that make a prospect worth agency attention.','RankForge scores help prioritize review, but qualification still depends on evidence and contact readiness.'],
    ['Credits are tied to qualified opportunities, not raw rows.','Credits are counted only for qualified opportunities.']
  ]);

  function replaceTextNodes(root){
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        const parent = node.parentElement;
        if(!parent || ['SCRIPT','STYLE','TITLE','TEXTAREA','INPUT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      let value=node.nodeValue;
      replacements.forEach((to, from)=>{ value = value.split(from).join(to); });
      node.nodeValue=value;
    });
  }

  function injectStyles(){
    if(document.getElementById('rf-copy-positioning-styles')) return;
    const style=document.createElement('style');
    style.id='rf-copy-positioning-styles';
    style.textContent = `
      .rf-example-card{border:1px solid var(--rf-border-subtle);border-radius:28px;background:#fff;padding:24px;box-shadow:var(--rf-shadow-md)}
      .rf-example-label{display:inline-flex;border-radius:999px;background:var(--rf-primary-soft);color:#1E3A8A;border:1px solid #BFDBFE;padding:6px 10px;font-size:12px;font-weight:900;margin-bottom:16px}
      .rf-example-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.rf-example-card h3{margin:0;font-size:24px;letter-spacing:-.03em}.rf-example-card h4{margin:16px 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--rf-text-muted)}.rf-example-card p{margin:0;color:var(--rf-text-secondary);font-size:14px;line-height:23px}.rf-example-muted{margin-top:6px!important;color:var(--rf-text-muted)!important}.rf-evidence-snapshot{border:1px solid var(--rf-border-subtle);border-radius:20px;background:#F8FAFC;padding:18px}.rf-outreach-angle{margin-top:16px;border:1px solid #FDE68A;background:var(--rf-warning-soft);border-radius:18px;padding:14px;color:#92400E;font-size:14px;line-height:23px}.rf-outreach-angle span{display:block;margin-top:6px;font-size:12px;color:#A16207;font-weight:700}
      .rf-sample-label{display:inline-flex;border-radius:999px;background:#F8FAFC;border:1px solid var(--rf-border-subtle);padding:4px 9px;color:var(--rf-text-muted);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px}
      @media(max-width:760px){.rf-example-grid{grid-template-columns:1fr}.rf-example-card{padding:18px}}
    `;
    document.head.appendChild(style);
  }

  function updateHome(){
    const hero = qs('.rf-hero');
    if(hero){
      text(qs('.rf-eyebrow', hero), 'Evidence-based prospect qualification for SEO agencies');
      text(qs('h1', hero), 'Find local SEO prospects worth contacting.');
      text(qs('.rf-hero-subtitle', hero), 'RankForge helps agencies turn niche-and-city searches into evidence-backed prospect decisions, with verified SEO signals, contact readiness, and clear qualification states.');
      text(qs('.rf-hero-note', hero), 'Qualified prospects require evidence, a contact path, and opportunity fit. Leads without enough proof stay in review or are filtered out.');
    }
    text(qs('.rf-mockup-title'), 'Example workspace · sample data');
    qsa('.rf-mini-kpi span').forEach((el,i)=>{ const labels=['Sample qualified leads','Sample needs review','Example evidence coverage','Example credits used']; if(labels[i]) el.textContent=labels[i]; });
    const lead=qs('.rf-lead-card');
    if(lead && !qs('.rf-sample-label', lead)) lead.insertAdjacentHTML('afterbegin','<div class="rf-sample-label">Example lead card · sample data</div>');
    qsa('.rf-lead-card .rf-status').forEach(el=>{ if(/score/i.test(el.textContent)) el.textContent='Example score: 82'; });
    text(qs('.rf-lead-card h3'), 'Example business profile');
    html(qs('.rf-lead-card p'), 'Sample evidence: Verified · 6 signals<br>Contact: Phone + contact page');

    if(!qs('.rf-example-output')){
      const workspaceHead = qsa('.rf-section-head').find(h => /Workspace/i.test((qs('.rf-eyebrow', h)||{}).textContent||''));
      const workspaceSection = workspaceHead && workspaceHead.closest('.rf-section');
      if(workspaceSection){
        workspaceSection.insertAdjacentHTML('beforebegin', `
          <section class="rf-section rf-example-output">
            <div class="rf-container">
              <div class="rf-section-head">
                <p class="rf-eyebrow">Example output</p>
                <h2>See the decision, the evidence, and the next action.</h2>
                <p>RankForge output is structured for agency review and outreach planning — not generic audit reports.</p>
              </div>
              <div class="rf-example-card">
                <div class="rf-example-label">Example lead output · sample data</div>
                <div class="rf-example-grid">
                  <div>
                    <span class="rf-pill review">Needs Review</span>
                    <h3>Example Prospect</h3>
                    <p class="rf-example-muted">Austin roof repair company · illustrative business profile</p>
                    <h4>Decision reason</h4>
                    <p>Potential opportunity, but evidence is not strong enough yet for a qualified claim.</p>
                    <h4>Suggested next action</h4>
                    <p>Review manually before outreach. Do not export as qualified yet.</p>
                  </div>
                  <div class="rf-evidence-snapshot">
                    <h4>Sample evidence snapshot</h4>
                    <ul class="rf-checklist">
                      <li>Service pages detected</li>
                      <li>Contact page found</li>
                      <li>Local city reference found</li>
                      <li>Metadata appears thin</li>
                      <li>Evidence count below qualified threshold</li>
                    </ul>
                    <h4>Contact readiness</h4>
                    <p>Phone visible · Contact page available · Email not found</p>
                  </div>
                </div>
                <div class="rf-outreach-angle"><strong>Example outreach angle:</strong> “Your service pages are visible, but the current site signals may not fully support local search visibility. Worth reviewing before outreach.” <span>Example only. RankForge should only generate outreach angles from verified crawl and contact signals.</span></div>
              </div>
            </div>
          </section>`);
      }
    }
  }

  function updatePricing(){
    const hero = qs('.rf-hero');
    if(hero){
      text(qs('.rf-eyebrow', hero), 'Search batches and qualified lead credits');
      text(qs('h1', hero), 'Pricing built around qualified opportunities, not raw rows.');
      text(qs('.rf-hero-subtitle', hero), 'Start with one free test search. Upgrade when you are ready for monthly search batches, qualified lead credits, evidence review, contact readiness, and CSV export.');
      text(qs('.rf-trust-line', hero), 'Needs Review and Filtered Out prospects do not consume qualified lead credits. Paid features activate only after checkout confirmation.');
    }
    qsa('.rf-plan').forEach(card=>{
      const name=(qs('h3', card)||{}).textContent||'';
      if(name==='Agency Intelligence'){
        text(qs('p', card),'For agencies that need deeper intelligence, higher volume, and future team workflows.');
        const btn=qs('a.rf-button', card); if(btn) btn.textContent='Join waitlist';
      }
      if(name==='Free') text(qs('p', card),'Run one focused search and preview the workflow before upgrading.');
    });
  }

  function updateHow(){
    const hero = qs('.rf-hero');
    if(hero){
      text(qs('.rf-eyebrow', hero), 'Evidence-based prospect qualification');
      text(qs('h1', hero), 'How RankForge turns local searches into prospect decisions.');
      text(qs('.rf-hero-subtitle', hero), 'Start with one niche and city, verify real website and contact signals, then review prospects by qualification status before outreach.');
      text(qs('.rf-hero-note', hero), 'Qualified means evidence, contact path, and opportunity fit. Anything uncertain stays in review or gets filtered out.');
    }
  }

  ready(function(){
    if(!isMarketingPage()) return;
    injectStyles();
    replaceTextNodes(document.body);
    if(document.body.classList.contains('rf-home-page')) updateHome();
    if(document.body.classList.contains('rf-pricing-page')) updatePricing();
    if(document.body.classList.contains('rf-how-page')) updateHow();
  });
})();
