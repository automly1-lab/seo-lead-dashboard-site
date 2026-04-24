## Dashboard -> n8n Search Submit Workflow

Import edilecek dosya:

- [N8N_DASHBOARD_CREATE_SEARCH_WEBHOOK.template.json](C:\Users\omur_\Documents\New project\N8N_DASHBOARD_CREATE_SEARCH_WEBHOOK.template.json)

### Ne yapar

- Dashboard'daki `Create Search List` formundan gelen payload'i alir
- `searches` sheet'ine yeni satir olarak yazar
- Tarayiciya `ok: true` response doner

### Node akisi

1. `Webhook - Receive Search`
2. `Code - Normalize Search Payload`
3. `Google Sheets - Append Search`
4. `Respond to Webhook - Search Accepted`

### Webhook path

Bu workflow import edilince path su olacak:

```text
rankforge-create-search
```

Production URL genelde sunun gibi olur:

```text
https://YOUR-N8N-DOMAIN/webhook/rankforge-create-search
```

Test URL ise:

```text
https://YOUR-N8N-DOMAIN/webhook-test/rankforge-create-search
```

Dashboard'a **production webhook URL** yapistir.

### Google Sheets tab

Append edilen tab:

```text
searches
```

### searches tab icin guncel kolonlar

Ben bunu dashboard payload'ina uygun genislettim. Bence `searches` sheet header'ini su hale getir:

```text
search_id,user_id,created_at,updated_at,status,search_name,niche,business_type,city,country,primary_keyword,secondary_keywords,discovery_query_limit,discovery_page_limit,max_results_requested,min_audit_score,min_lead_score,started_at,completed_at,failed_at,failure_reason
```

### Import sonrasi kontrol etmen gereken 3 sey

1. `Google Sheets - Append Search` node'unda credential dogru mu
2. `documentId` senin dogru sheet ID mi
3. Workflow active mi

### Dashboard tarafinda ne olacak

1. Dashboard'da `Webhook URL` alanina production webhook'u yapistir
2. `Save Webhook` de
3. `Create Search List` formunu doldur
4. Submit et
5. Yeni satir `searches` tab'ina dusmeli
6. Ana n8n lead intelligence workflow bunu alip calismaya baslamali

### Not

Eger browser'da CORS hatasi gorursen:

- `Respond to Webhook - Search Accepted` node'unda su header'lar kalsin:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept
```

Dashboard'i preflight'tan kacirmak icin `text/plain` gonderir hale getirdim; bu yuzden bu akisin calisma ihtimali daha yuksek.
