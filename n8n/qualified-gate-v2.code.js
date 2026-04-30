// RankForge Qualified Gate v2
// n8n Code node
// Purpose: decide qualified / review_needed / rejected using score + contact + verified SEO evidence.
// Rule: High score without verified evidence is review_needed, not qualified.

function clean(value) { return String(value ?? '').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function num(value) { const n = Number(value || 0); return Number.isFinite(n) ? Math.round(n) : 0; }
function bool(value) { return ['true','yes','1','verified','high','found','detected'].includes(lower(value)); }
function hasContact(input) {
  return !!clean(input.decision_maker_email || input.email || input.raw_email || input.decision_maker_phone || input.phone || input.raw_phone);
}
function isRejectedBeforeGate(input) {
  const text = lower([
    input.rejection_reason,
    input.qualification_status,
    input.status,
    input.pre_filter_status,
    input.candidate_status
  ].filter(Boolean).join(' '));
  return /rejected|wrong niche|wrong city|directory|franchise|duplicate|no website|no usable website|not a business/i.test(text);
}

return items.map((item) => {
  const input = item.json || {};
  const reasons = [];
  const seo = num(input.seo_need_score);
  const commercial = num(input.commercial_fit_score);
  const contactConfidence = num(input.contact_confidence_score);
  const overall = num(input.overall_lead_score);
  const evidenceVerified = bool(input.seo_claims_verified);
  const evidenceSignals = num(input.seo_evidence_signal_count);
  const contactReady = hasContact(input);

  if (isRejectedBeforeGate(input)) {
    return {
      json: {
        ...input,
        qualification_status: 'rejected',
        lead_priority: 'do_not_use',
        qualified_gate_version: 'qualified_gate_v2_rejected_pre_filter',
        qualification_reason: clean(input.rejection_reason || 'Rejected before detailed SEO audit.'),
        lead_credit_counted: false
      }
    };
  }

  if (!contactReady) reasons.push('No usable email or phone contact path was confirmed.');
  if (!evidenceVerified) reasons.push('SEO evidence is not verified enough for a strong SEO claim.');
  if (evidenceSignals < 3) reasons.push('Fewer than 3 SEO evidence signals were captured.');
  if (seo < 65) reasons.push(`SEO need score is below threshold (${seo}/100).`);
  if (commercial < 65) reasons.push(`Commercial fit is below threshold (${commercial}/100).`);
  if (overall < 70) reasons.push(`Overall lead score is below threshold (${overall}/100).`);
  if (contactConfidence < 60) reasons.push(`Contact confidence is below threshold (${contactConfidence}/100).`);

  const qualified = contactReady && evidenceVerified && evidenceSignals >= 3 && seo >= 65 && commercial >= 65 && overall >= 70 && contactConfidence >= 60;
  const clearlyWeak = !contactReady || seo < 45 || commercial < 45 || overall < 50;

  let status = 'review_needed';
  let priority = 'review';
  if (qualified) {
    status = 'qualified';
    priority = overall >= 85 ? 'high' : 'standard';
  } else if (clearlyWeak && !evidenceVerified) {
    status = 'review_needed';
    priority = 'low_review';
  }

  const reason = qualified
    ? `Qualified because verified SEO evidence, contact path, SEO need (${seo}/100), commercial fit (${commercial}/100), and overall score (${overall}/100) meet the gate.`
    : `Needs review: ${reasons.join(' ') || 'Evidence is not strong enough for automatic qualification.'}`;

  return {
    json: {
      ...input,
      qualification_status: status,
      lead_priority: priority,
      qualification_reason: reason,
      seo_claims_verified: evidenceVerified,
      seo_evidence_signal_count: evidenceSignals,
      lead_credit_counted: status === 'qualified',
      qualified_gate_version: 'qualified_gate_v2'
    }
  };
});
