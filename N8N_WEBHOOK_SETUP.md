## n8n Search Submit Webhook

Dashboard'daki `Create Search List` formu, bir n8n webhook URL'ine JSON POST atmak icin hazirlandi.

Beklenen payload:

```json
{
  "search_id": "srch_miami_restoration_1713955344000",
  "user_id": "usr_dashboard",
  "created_at": "2026-04-24T12:15:44.000Z",
  "updated_at": "2026-04-24T12:15:44.000Z",
  "status": "active",
  "search_name": "Miami Restoration Companies",
  "niche": "home restoration",
  "business_type": "restoration contractor",
  "city": "Miami",
  "country": "United States",
  "primary_keyword": "home restoration Miami",
  "secondary_keywords": "",
  "discovery_query_limit": 1,
  "discovery_page_limit": 1,
  "max_results_requested": 20,
  "min_audit_score": 60,
  "min_lead_score": 70,
  "started_at": "",
  "completed_at": "",
  "failed_at": "",
  "failure_reason": ""
}
```

### n8n tarafinda en pratik kurulum

1. `Webhook` node ekle
2. `Respond to Webhook` node ekle
3. Araya `Google Sheets -> Append` node koy
4. Append edecegin sheet: `searches`
5. Yukaridaki alanlari ayni kolon adlariyla yaz

### Onemli

- Webhook URL public olmali
- n8n tarafinda `Access-Control-Allow-Origin` acik olmali, yoksa GitHub Pages uzerinden CORS hatasi alirsin
- Dashboard'da webhook URL bir kere kaydedilince localStorage'da saklanir
