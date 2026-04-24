## RankForge Create Search Webhook

Use this n8n webhook for dashboard-created search jobs:

`https://lastaccount1907.app.n8n.cloud/webhook/rankforge-create-search`

Expected behavior:

1. User logs into the dashboard
2. User creates a saved list on `/dashboard/`
3. The list is created locally in the workspace immediately
4. The same search payload is sent to n8n
5. n8n appends the row into the `searches` Google Sheet tab
6. The main lead intelligence workflow later reads that search and creates prospects, audits, contacts, and final leads

Required Google Sheets tab:

`searches`

Expected header:

`search_id,user_id,created_at,updated_at,status,search_name,niche,business_type,city,country,primary_keyword,secondary_keywords,discovery_query_limit,discovery_page_limit,max_results_requested,min_audit_score,min_lead_score,started_at,completed_at,failed_at,failure_reason`
