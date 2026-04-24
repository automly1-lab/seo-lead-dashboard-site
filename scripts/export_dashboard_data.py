import json
import re
import urllib.parse
import urllib.request
from pathlib import Path


SHEET_ID = "1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco"
TABS = ["searches", "raw_prospects", "seo_audits", "contacts", "final_leads"]
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "dashboard-data.json"


def safe_number(value):
    try:
        return int(round(float(value or 0)))
    except Exception:
        return 0


def title_case(value):
    return re.sub(r"\b\w", lambda m: m.group(0).upper(), str(value or "").replace("_", " "))


def fetch_sheet_rows(sheet_name: str):
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?sheet={urllib.parse.quote(sheet_name)}&tqx=out:json"
    with urllib.request.urlopen(url, timeout=30) as response:
        payload = response.read().decode("utf-8")
    cleaned = re.sub(r"^[\s\S]*?setResponse\(", "", payload)
    cleaned = re.sub(r"\);\s*$", "", cleaned)
    parsed = json.loads(cleaned)
    cols = [col.get("label") or col.get("id") for col in parsed.get("table", {}).get("cols", [])]
    rows = []
    for row in parsed.get("table", {}).get("rows", []):
      record = {}
      cells = row.get("c", [])
      for index, key in enumerate(cols):
        cell = cells[index] if index < len(cells) else None
        record[key] = "" if not cell else (cell.get("f") or cell.get("v") or "")
      rows.append(record)
    return rows


def build_runtime_data(sheet_data):
    searches = sheet_data.get("searches", [])
    raw_prospects = sheet_data.get("raw_prospects", [])
    seo_audits = sheet_data.get("seo_audits", [])
    contacts = sheet_data.get("contacts", [])
    final_leads = sheet_data.get("final_leads", [])

    prospects_by_id = {row.get("prospect_id"): row for row in raw_prospects if row.get("prospect_id")}
    contact_by_prospect = {}
    for contact in contacts:
        prospect_id = contact.get("prospect_id")
        if not prospect_id:
            continue
        existing = contact_by_prospect.get(prospect_id)
        if not existing or safe_number(contact.get("contact_confidence_score")) > safe_number(existing.get("contact_confidence_score")):
            contact_by_prospect[prospect_id] = contact

    audit_by_id = {audit.get("audit_id"): audit for audit in seo_audits if audit.get("audit_id")}
    contacts_by_id = {contact.get("contact_id"): contact for contact in contacts if contact.get("contact_id")}
    leads = []
    seen_keys = set()

    def resolve_search_id(lead=None, audit=None, prospect=None, contact=None):
        lead = lead or {}
        audit = audit or {}
        prospect = prospect or {}
        contact = contact or {}
        return lead.get("search_id") or audit.get("search_id") or prospect.get("search_id") or contact.get("search_id") or ""

    def push_lead(candidate):
        key = candidate.get("id") or f"{candidate.get('listId')}|{candidate.get('company')}|{candidate.get('website')}"
        if not candidate.get("listId") or key in seen_keys:
            return
        seen_keys.add(key)
        leads.append(candidate)

    for index, lead in enumerate(final_leads, start=1):
        audit = audit_by_id.get(lead.get("audit_id"), {})
        prospect = prospects_by_id.get(lead.get("prospect_id"), {})
        contact = contacts_by_id.get(lead.get("primary_contact_id")) or contact_by_prospect.get(lead.get("prospect_id"), {})
        push_lead({
            "id": lead.get("lead_id") or f"remote_lead_{index}",
            "listId": resolve_search_id(lead=lead, audit=audit, prospect=prospect, contact=contact),
            "userId": lead.get("user_id") or audit.get("user_id") or prospect.get("user_id") or contact.get("user_id") or "usr_mvp",
            "company": lead.get("company_name") or audit.get("company_name") or prospect.get("company_name") or "Unknown company",
            "website": lead.get("website_url") or audit.get("website_url") or prospect.get("website_url") or "",
            "decisionMaker": lead.get("decision_maker_name") or contact.get("contact_name") or None,
            "role": lead.get("decision_maker_role") or contact.get("contact_role") or None,
            "email": lead.get("decision_maker_email") or contact.get("email") or None,
            "phone": lead.get("decision_maker_phone") or contact.get("phone") or None,
            "seoScore": safe_number(lead.get("seo_need_score") or audit.get("seo_need_score")),
            "overallScore": safe_number(lead.get("overall_lead_score") or lead.get("seo_need_score") or audit.get("seo_need_score")),
            "commercialFit": safe_number(lead.get("commercial_fit_score") or audit.get("commercial_fit_score")),
            "contactConfidence": safe_number(lead.get("contact_confidence_score") or contact.get("contact_confidence_score")),
            "status": lead.get("qualification_status") or lead.get("status") or "review_needed",
            "outreachReadiness": lead.get("outreach_readiness") or ("ready" if (contact.get("email") or contact.get("phone")) else "needs_review"),
            "paidAdsDetected": str(lead.get("paid_ads_detected") or audit.get("paid_ads_detected") or "").lower() == "true",
            "primaryProblem": lead.get("primary_problem") or "",
            "secondaryProblem": lead.get("secondary_problem") or "",
            "whyItMatters": lead.get("qualification_reason") or audit.get("audit_summary") or "",
            "outreachAngle": lead.get("outreach_angle") or audit.get("recommended_outreach_angle") or "",
            "valueHypothesis": lead.get("client_value_hypothesis") or "",
            "firstLine": lead.get("first_line_personalization") or "",
            "recommendedOffer": lead.get("recommended_offer") or "",
            "recommendedChannel": lead.get("recommended_channel") or "",
        })

    for index, audit in enumerate(seo_audits, start=1):
        prospect = prospects_by_id.get(audit.get("prospect_id"), {})
        contact = contact_by_prospect.get(audit.get("prospect_id"), {})
        seo_score = safe_number(audit.get("seo_need_score"))
        contact_confidence = safe_number(contact.get("contact_confidence_score"))
        push_lead({
            "id": f"audit_{audit.get('audit_id') or index}",
            "listId": resolve_search_id(audit=audit, prospect=prospect, contact=contact),
            "userId": audit.get("user_id") or prospect.get("user_id") or contact.get("user_id") or "usr_mvp",
            "company": audit.get("company_name") or prospect.get("company_name") or "Unknown company",
            "website": audit.get("website_url") or prospect.get("website_url") or "",
            "decisionMaker": contact.get("contact_name") or None,
            "role": contact.get("contact_role") or None,
            "email": contact.get("email") or None,
            "phone": contact.get("phone") or None,
            "seoScore": seo_score,
            "overallScore": int(round((seo_score * 0.7) + (safe_number(audit.get("commercial_fit_score")) * 0.2) + (contact_confidence * 0.1))),
            "commercialFit": safe_number(audit.get("commercial_fit_score")),
            "contactConfidence": contact_confidence,
            "status": "review_needed" if seo_score >= safe_number(audit.get("min_lead_score") or 70) else "rejected",
            "outreachReadiness": "ready" if (contact.get("email") or contact.get("phone")) else "needs_review",
            "paidAdsDetected": str(audit.get("paid_ads_detected") or "").lower() == "true",
            "primaryProblem": "",
            "secondaryProblem": "",
            "whyItMatters": audit.get("audit_summary") or "",
            "outreachAngle": audit.get("recommended_outreach_angle") or "",
            "valueHypothesis": "",
            "firstLine": "",
            "recommendedOffer": "",
            "recommendedChannel": "email" if contact.get("email") else ("phone" if contact.get("phone") else ""),
        })

    def search_signature(search):
        parts = [
            search.get("user_id") or "usr_mvp",
            search.get("search_name"),
            search.get("niche"),
            search.get("business_type"),
            search.get("city"),
            search.get("country"),
        ]
        return "|".join(str(part or "").strip().lower() for part in parts)

    def search_updated_at(search):
        return (
            search.get("completed_at")
            or search.get("started_at")
            or search.get("updated_at")
            or search.get("created_at")
            or ""
        )

    latest_search_by_signature = {}
    for search in searches:
        signature = search_signature(search)
        existing = latest_search_by_signature.get(signature)
        if not existing or str(search_updated_at(search)) >= str(search_updated_at(existing)):
            latest_search_by_signature[signature] = search

    lists = []
    for search in latest_search_by_signature.values():
        search_id = search.get("search_id")
        search_prospects = [row for row in raw_prospects if row.get("search_id") == search_id]
        search_audits = [row for row in seo_audits if row.get("search_id") == search_id and row.get("status") == "completed"]
        search_contacts = [row for row in contacts if row.get("search_id") == search_id and row.get("status") != "pending"]
        search_leads = [row for row in leads if row.get("listId") == search_id]
        lists.append({
            "id": search_id,
            "userId": search.get("user_id") or "usr_mvp",
            "name": search.get("search_name") or f"{title_case(search.get('niche'))} - {search.get('city')}",
            "niche": search.get("niche") or "",
            "businessType": search.get("business_type") or "",
            "city": search.get("city") or "",
            "country": search.get("country") or "",
            "description": f"{title_case(search.get('niche'))} opportunities for {search.get('city')}, kept as a persistent saved list.",
            "status": search.get("status") or "draft",
            "lastRun": search.get("completed_at") or search.get("started_at") or search.get("updated_at") or search.get("created_at") or "",
            "discovered": len(search_prospects),
            "audited": len(search_audits),
            "enriched": len(search_contacts),
            "qualified": len([lead for lead in search_leads if str(lead.get("status") or lead.get("qualification_status") or "").lower() == "qualified"]),
            "rejected": len([lead for lead in search_leads if str(lead.get("status") or lead.get("qualification_status") or "").lower() == "rejected"]),
            "minSeoScore": safe_number(search.get("min_audit_score") or 55),
            "minLeadScore": safe_number(search.get("min_lead_score") or 70),
            "archived": False,
        })

    lists.sort(key=lambda item: str(item.get("lastRun") or ""), reverse=True)

    return {
        "lists": lists,
        "leads": leads,
        "source": "github-static-refresh",
        "meta": {
            "search_rows_read": len(searches),
            "unique_lists_exported": len(lists),
            "duplicate_search_rows_removed": max(len(searches) - len(lists), 0),
        },
    }


def main():
    sheet_data = {tab: fetch_sheet_rows(tab) for tab in TABS}
    runtime_data = build_runtime_data(sheet_data)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(runtime_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
