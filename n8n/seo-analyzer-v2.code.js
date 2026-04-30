// RankForge SEO Analyzer v2 - deterministic, evidence-based
// Rule: no evidence = no strong SEO claim. Rejected prospects skip detailed audit.

const TRACKING_PARAMS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','gclid','gbraid','wbraid','gad_source','fbclid','msclkid'];

function clean(v) { return String(v ?? '').trim(); }
function lower(v) { return clean(v).toLowerCase(); }
function clamp(n, min = 0, max = 100) {
  n = Number(n || 0);
  return Math.max(min, Math.min(max, Number.isFinite(n) ? Math.round(n) : 0));
}
function bool(v) {
  return ['true','yes','1','found','detected','ok','200','accessible'].includes(lower(v));
}
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [v];
  }
}
function cleanUrl(v) {
  const raw = clean(v);
  if (!raw) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    TRACKING_PARAMS.forEach((p) => u.searchParams.delete(p));
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return raw.split('?')[0].split('#')[0].replace(/\/$/, '');
  }
}
function domainFromUrl(v) {
  const raw = clean(v);
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    const m = raw.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i);
    return m ? m[1].replace(/^www\./i, '').toLowerCase() : '';
  }
}
function decodeHtml(s) {
  return clean(s)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}
function stripHtml(html) {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function wordCount(text) {
  const m = clean(text).match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9']+/g);
  return m ? m.length : 0;
}
function firstMatch(html, re) {
  const m = clean(html).match(re);
  return m ? stripHtml(m[1] || '') : '';
}
function titleOf(html) { return firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i); }
function metaDescriptionOf(html) {
  const h = clean(html);
  let m = h.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  if (m) return clean(m[1]);
  m = h.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  return m ? clean(m[1]) : '';
}
function h1sOf(html) {
  return [...clean(html).matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripHtml(m[1])).filter(Boolean);
}
function linksOf(html, baseUrl) {
  const links = [];
  for (const m of clean(html).matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = clean(m[1]);
    const text = stripHtml(m[2]);
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    let url = href;
    try { url = new URL(href, baseUrl || undefined).toString(); } catch {}
    links.push({ url: cleanUrl(url), text });
  }
  return links;
}
function termsFrom(v) {
  return clean(v).split(/[\s,|/+-]+/).map((x) => lower(x)).filter((x) => x.length >= 3);
}
function includesAny(text, terms) {
  const hay = lower(text);
  return terms.some((t) => t && hay.includes(lower(t)));
}
function detectServicePages(links, targetService, niche) {
  const terms = [...termsFrom(targetService), ...termsFrom(niche), 'service', 'services', 'treatments', 'solutions', 'practice areas'];
  return [...new Map(
    links.filter((l) => includesAny(`${l.url} ${l.text}`, terms) && !/privacy|terms|refund|login|signup|facebook|instagram|linkedin/i.test(`${l.url} ${l.text}`))
      .map((l) => [l.url, l])
  ).values()].slice(0, 10);
}
function detectLocationPages(links, targetCity) {
  const terms = [lower(targetCity), 'location', 'locations', 'service area', 'areas served', 'near me', 'contact'];
  return [...new Map(
    links.filter((l) => includesAny(`${l.url} ${l.text}`, terms) && !/privacy|terms|refund|login|signup/i.test(`${l.url} ${l.text}`))
      .map((l) => [l.url, l])
  ).values()].slice(0, 10);
}
function detectContactPage(links) {
  return links.find((l) => /contact|appointment|book|schedule|quote|consultation|get-started|get started/i.test(`${l.url} ${l.text}`)) || null;
}
function detectPhone(text) { return /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(text); }
function detectEmail(text) { return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text); }
function detectJsonLdSchema(html) {
  const types = new Set();
  for (const m of clean(html).matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      const flat = [];
      nodes.forEach((node) => {
        if (node && Array.isArray(node['@graph'])) flat.push(...node['@graph']);
        else flat.push(node);
      });
      flat.forEach((node) => {
        const type = node && node['@type'];
        if (Array.isArray(type)) type.forEach((t) => types.add(String(t)));
        else if (type) types.add(String(type));
      });
    } catch {}
  }
  return [...types];
}
function latestDateFromText(text) {
  const matches = [...clean(text).matchAll(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g)]
    .map((m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => b - a);
  return matches[0] ? matches[0].toISOString().slice(0, 10) : '';
}
function isFresh(dateText, months = 12) {
  if (!dateText) return false;
  const d = new Date(dateText);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return d >= cutoff;
}
function addIssue(issues, condition, key, label, weight, evidence) {
  if (condition) issues.push({ key, label, weight, evidence: clean(evidence) });
}
function commercialFitFallback(input) {
  const existing = Number(input.commercial_fit_score || input.commercialFit || 0);
  if (existing) return clamp(existing);
  let score = 55;
  if (input.phone_visible || input.email_visible || input.contact_page_found) score += 10;
  if (input.service_page_count || input.location_page_count) score += 5;
  return clamp(score);
}
function contactConfidence(input) {
  const existing = Number(input.contact_confidence_score || input.contactConfidence || 0);
  if (existing) return clamp(existing);
  let score = 0;
  if (input.email_visible) score += 40;
  if (input.phone_visible) score += 35;
  if (input.contact_page_found) score += 15;
  if (input.contact_cta_found) score += 10;
  return clamp(score);
}

return items.map((item) => {
  const input = item.json || {};
  const rejection = lower(input.rejection_reason || input.qualification_status || input.status || '');
  const rejected = /rejected|wrong niche|wrong city|directory|franchise|duplicate|no website|no usable website|no contact/i.test(rejection);
  const sourceUrl = cleanUrl(input.final_url || input.clean_website_url || input.website_url || input.url || input.place_website || '');
  const displayDomain = domainFromUrl(sourceUrl);

  if (rejected) {
    return { json: {
      ...input,
      clean_website_url: sourceUrl,
      display_domain: displayDomain,
      seo_claims_verified: false,
      seo_confidence: 'not_a_candidate',
      seo_evidence_signal_count: 0,
      seo_issue_count: 0,
      seo_top_issues: '',
      seo_verified_claims: '',
      seo_evidence_summary: 'Detailed SEO audit skipped because this prospect was rejected before the audit stage.',
      seo_manual_review_reason: clean(input.rejection_reason || 'Rejected before SEO audit.'),
      qualified_gate_version: 'seo_analyzer_v2_skip_rejected'
    }};
  }

  const htmlCandidates = [
    ['homepage_html', input.homepage_html],
    ['html', input.html],
    ['html_compact', input.html_compact],
    ['homepage_compact', input.homepage_compact],
    ['body', input.body],
    ['data', input.data],
    ['content', input.content],
    ['response_body', input.response_body]
  ];
  const selectedHtml = htmlCandidates.find(([_, v]) => clean(v).length > 80) || ['', ''];
  const htmlSourceField = selectedHtml[0] || '';
  const html = clean(selectedHtml[1] || '');
  const status = clean(input.http_status || input.homepage_http_status || input.statusCode || input.status_code || '');
  const textCandidates = [input.homepage_text, input.text, input.body_text, input.text_compact, input.content_text, input.extracted_text];
  const selectedText = textCandidates.find((v) => clean(v).length > 80) || '';
  const baseText = clean(selectedText) || stripHtml(html);
  const targetCity = clean(input.target_city || input.city || '');
  const targetService = clean(input.target_service || input.business_type || input.niche || '');
  const niche = clean(input.niche || input.business_type || '');
  const title = clean(input.title_tag || titleOf(html));
  const meta = clean(input.meta_description || metaDescriptionOf(html));
  const h1s = h1sOf(html);
  const links = linksOf(html, sourceUrl);
  const serviceLinks = detectServicePages(links, targetService, niche);
  const locationLinks = detectLocationPages(links, targetCity);
  const contactLink = detectContactPage(links);
  const schemaTypes = detectJsonLdSchema(html);
  const fullText = `${baseText} ${asArray(input.contact_page_html).map(stripHtml).join(' ')} ${asArray(input.service_page_htmls).map(stripHtml).join(' ')} ${asArray(input.location_page_htmls).map(stripHtml).join(' ')}`;
  const crawlAccessible = !!(html || baseText) && (!status || /^2\d\d$/.test(status) || status === '200') && baseText.length > 80;
  const robotsBlocked = /robots|blocked by robots|access denied/i.test(clean(input.crawl_error || input.fetch_error || ''));
  const noindexFound = /name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html) || /content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  const canonicalUrl = canonicalMatch ? cleanUrl(canonicalMatch[1]) : '';
  const titleHasCity = !!targetCity && includesAny(title, [targetCity]);
  const titleHasService = !!targetService && includesAny(title, termsFrom(targetService));
  const metaHasCity = !!targetCity && includesAny(meta, [targetCity]);
  const metaHasService = !!targetService && includesAny(meta, termsFrom(targetService));
  const wc = wordCount(baseText);
  const h1Text = h1s.join(' | ');
  const h1HasCity = !!targetCity && includesAny(h1Text, [targetCity]);
  const h1HasService = !!targetService && includesAny(h1Text, termsFrom(targetService));
  const targetCityFound = !!targetCity && includesAny(fullText, [targetCity]);
  const targetServiceFound = !!targetService && includesAny(fullText, termsFrom(targetService));
  const contactPageFound = !!contactLink || bool(input.contact_page_found);
  const phoneVisible = detectPhone(fullText) || bool(input.phone_visible);
  const emailVisible = detectEmail(fullText) || bool(input.email_visible);
  const contactCtaFound = /contact|call|book|schedule|appointment|quote|consultation|get a free|request/i.test(fullText) || bool(input.contact_cta_found);
  const localBusinessSchemaFound = schemaTypes.some((t) => /LocalBusiness|Dentist|MedicalBusiness|HomeAndConstructionBusiness|ProfessionalService|Store|Restaurant|LegalService/i.test(t));
  const organizationSchemaFound = schemaTypes.some((t) => /Organization|Corporation|LocalBusiness/i.test(t));
  const reviewsSignalFound = /review|reviews|testimonial|testimonials|rated|stars|google reviews/i.test(fullText);
  const blogFound = links.some((l) => /blog|articles|resources|news/i.test(`${l.url} ${l.text}`));
  const blogLatestDate = latestDateFromText(fullText);
  const freshContentSignal = isFresh(blogLatestDate, 12);
  const imageCount = (html.match(/<img\b/gi) || []).length;
  const scriptCount = (html.match(/<script\b/gi) || []).length;
  const internalLinkCount = links.filter((l) => domainFromUrl(l.url) === displayDomain).length;
  const mobileViewportFound = /<meta[^>]+name=["']viewport["']/i.test(html);
  const sslHttpsFound = /^https:\/\//i.test(sourceUrl);
  const largeAssetSignal = imageCount > 35 || scriptCount > 35;

  const issues = [];
  addIssue(issues, !crawlAccessible, 'crawl_not_accessible', 'Website was not accessible enough for a reliable SEO audit', 0, status || 'No valid homepage content returned');
  addIssue(issues, robotsBlocked, 'robots_blocked', 'Crawler access appears blocked', 0, 'Robots/access block detected');
  addIssue(issues, noindexFound, 'noindex_found', 'Noindex tag detected', 18, 'Robots meta noindex found');
  addIssue(issues, crawlAccessible && (!title || title.length < 25 || title.length > 70), 'weak_title_length', 'Title tag is missing, too short, or too long', 8, title || 'No title tag captured');
  addIssue(issues, crawlAccessible && targetCity && !titleHasCity, 'title_missing_city', 'Title tag does not confirm the target city', 8, title || 'No title tag captured');
  addIssue(issues, crawlAccessible && targetService && !titleHasService, 'title_missing_service', 'Title tag does not confirm the target service', 8, title || 'No title tag captured');
  addIssue(issues, crawlAccessible && (!meta || meta.length < 80 || meta.length > 170), 'weak_meta_description', 'Meta description is missing or outside a useful length range', 8, meta ? `${meta.length} chars` : 'No meta description captured');
  addIssue(issues, crawlAccessible && targetCity && meta && !metaHasCity, 'meta_missing_city', 'Meta description does not confirm the target city', 4, meta);
  addIssue(issues, crawlAccessible && targetService && meta && !metaHasService, 'meta_missing_service', 'Meta description does not confirm the target service', 4, meta);
  addIssue(issues, crawlAccessible && wc < 450, 'thin_homepage_content', 'Homepage content appears thin for a local service business', 10, `${wc} words detected`);
  addIssue(issues, crawlAccessible && h1s.length !== 1, 'weak_h1_structure', 'H1 structure is missing or unclear', 6, `${h1s.length} H1 tag(s) detected`);
  addIssue(issues, crawlAccessible && serviceLinks.length === 0, 'no_service_pages_found', 'Dedicated service pages were not confirmed', 14, '0 service pages found in homepage links');
  addIssue(issues, crawlAccessible && locationLinks.length === 0, 'no_location_pages_found', 'Dedicated location or service-area pages were not confirmed', 12, '0 location pages found in homepage links');
  addIssue(issues, crawlAccessible && targetCity && !targetCityFound, 'target_city_not_found', 'Target city was not confirmed in the available crawl', 10, targetCity);
  addIssue(issues, crawlAccessible && targetService && !targetServiceFound, 'target_service_not_found', 'Target service was not confirmed in the available crawl', 10, targetService);
  addIssue(issues, crawlAccessible && !localBusinessSchemaFound, 'no_local_business_schema', 'LocalBusiness structured data was not detected', 7, schemaTypes.join(', ') || 'No JSON-LD business schema detected');
  addIssue(issues, crawlAccessible && !contactPageFound, 'no_contact_page_found', 'Contact page was not confirmed', 6, 'No contact/appointment link found');
  addIssue(issues, crawlAccessible && !contactCtaFound, 'weak_contact_cta', 'Clear contact CTA was not confirmed', 5, 'No clear CTA phrase detected');
  addIssue(issues, crawlAccessible && !reviewsSignalFound, 'no_review_signal', 'Review or testimonial signals were not confirmed', 3, 'No review/testimonial text detected');
  addIssue(issues, crawlAccessible && blogFound && !freshContentSignal, 'stale_content_signal', 'Recent educational/blog content was not confirmed', 3, blogLatestDate || 'No recent date detected');
  addIssue(issues, crawlAccessible && largeAssetSignal, 'large_asset_signal', 'Page may be asset-heavy', 3, `${imageCount} images, ${scriptCount} scripts detected`);
  addIssue(issues, crawlAccessible && !mobileViewportFound, 'mobile_viewport_missing', 'Mobile viewport tag was not detected', 4, 'No viewport meta tag found');
  addIssue(issues, crawlAccessible && !sslHttpsFound, 'https_not_confirmed', 'HTTPS was not confirmed on the final URL', 5, sourceUrl);

  const seoNeedScore = crawlAccessible ? clamp(issues.reduce((sum, i) => sum + i.weight, 0)) : 0;
  const issueCount = issues.filter((i) => i.weight > 0).length;
  const evidenceSignalCount = [crawlAccessible, status, title, meta || meta === '', wc, h1s.length || h1Text, serviceLinks.length, locationLinks.length, contactPageFound, phoneVisible || emailVisible, schemaTypes.length, typeof targetCityFound === 'boolean', typeof targetServiceFound === 'boolean'].filter(Boolean).length;
  const verified = crawlAccessible && evidenceSignalCount >= 5 && issueCount >= 2;
  const confidence = verified && evidenceSignalCount >= 8 ? 'high' : verified ? 'medium' : evidenceSignalCount >= 4 ? 'partial' : 'low';
  const topIssues = issues.filter((i) => i.weight > 0).sort((a, b) => b.weight - a.weight).slice(0, 6);
  const verifiedClaims = verified ? topIssues.map((i) => `${i.label} (${i.evidence})`).join(' | ') : '';
  const evidenceSummary = verified
    ? `From the available crawl, ${displayDomain || 'the website'} shows ${issueCount} SEO opportunity signal(s), including ${topIssues.slice(0, 3).map((i) => i.label.toLowerCase()).join(', ')}.`
    : 'SEO evidence is not verified enough for a strong claim. Keep this lead in review unless the website is manually checked.';
  const commercialFitScore = commercialFitFallback({ ...input, phone_visible: phoneVisible, email_visible: emailVisible, contact_page_found: contactPageFound, service_page_count: serviceLinks.length, location_page_count: locationLinks.length });
  const contactScore = contactConfidence({ ...input, phone_visible: phoneVisible, email_visible: emailVisible, contact_page_found: contactPageFound, contact_cta_found: contactCtaFound });
  const overallLeadScore = clamp(Math.round((seoNeedScore * 0.45) + (commercialFitScore * 0.25) + (contactScore * 0.30)));

  return { json: {
    ...input,
    clean_website_url: sourceUrl,
    display_domain: displayDomain,
    crawl_source_field: htmlSourceField,
    homepage_html_bytes_analyzed: html.length,
    homepage_text_words_analyzed: wc,
    seo_score_source: 'deterministic_crawl_v2',
    crawl_debug: `source_field=${htmlSourceField || 'none'}; html_chars=${html.length}; text_words=${wc}; status=${status || 'unknown'}; issues=${issueCount}; signals=${evidenceSignalCount}`,
    crawl_accessible: crawlAccessible,
    http_status: status || (crawlAccessible ? '200' : ''),
    indexability_status: noindexFound ? 'noindex_found' : robotsBlocked ? 'robots_or_access_blocked' : crawlAccessible ? 'indexable_from_available_signals' : 'not_verified',
    robots_blocked: robotsBlocked,
    noindex_found: noindexFound,
    canonical_url: canonicalUrl,
    title_tag: title,
    title_length: title.length,
    title_has_city: titleHasCity,
    title_has_service: titleHasService,
    meta_description: meta,
    meta_description_length: meta.length,
    meta_has_city: metaHasCity,
    meta_has_service: metaHasService,
    homepage_word_count: wc,
    h1_count: h1s.length,
    h1_text: h1Text,
    h1_has_city: h1HasCity,
    h1_has_service: h1HasService,
    service_page_count: serviceLinks.length,
    service_pages_found: serviceLinks.map((l) => l.url).join(' | '),
    location_page_count: locationLinks.length,
    location_pages_found: locationLinks.map((l) => l.url).join(' | '),
    contact_page_found: contactPageFound,
    phone_visible: phoneVisible,
    email_visible: emailVisible,
    contact_cta_found: contactCtaFound,
    local_business_schema_found: localBusinessSchemaFound,
    organization_schema_found: organizationSchemaFound,
    schema_types_found: schemaTypes.join(' | '),
    reviews_signal_found: reviewsSignalFound,
    blog_found: blogFound,
    blog_latest_date: blogLatestDate,
    fresh_content_signal: freshContentSignal,
    internal_link_count: internalLinkCount,
    image_count: imageCount,
    script_count: scriptCount,
    large_asset_signal: largeAssetSignal,
    mobile_viewport_found: mobileViewportFound,
    ssl_https_found: sslHttpsFound,
    target_city_found: targetCityFound,
    target_service_found: targetServiceFound,
    seo_issue_count: issueCount,
    seo_top_issues: topIssues.map((i) => `${i.key}: ${i.label}`).join(' | '),
    seo_verified_claims: verifiedClaims,
    seo_evidence_summary: evidenceSummary,
    seo_claims_verified: verified,
    seo_confidence: confidence,
    seo_manual_review_reason: verified ? '' : 'Evidence was not strong enough to make a confident SEO claim from the available crawl.',
    evidence_source_url: sourceUrl,
    seo_evidence_signal_count: evidenceSignalCount,
    seo_need_score: seoNeedScore,
    commercial_fit_score: commercialFitScore,
    contact_confidence_score: contactScore,
    overall_lead_score: overallLeadScore,
    qualified_gate_version: 'seo_analyzer_v2'
  }};
});
