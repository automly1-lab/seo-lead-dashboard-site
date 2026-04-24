# RankForge SEO SaaS

Clean SEO-only MVP workspace for the RankForge lead intelligence product.

## What is included

- Static multi-page dashboard
- Lightweight local auth scaffold
- Google Sheets sync for searches, audits, contacts, and leads
- n8n create-search webhook integration
- n8n workflow templates under `n8n/`

## Main pages

- `/dashboard/`
- `/lists/`
- `/leads/`
- `/lead-detail/`
- `/login/`
- `/signup/`

## Important product rules

- This is not a generic scraper
- Saved lists stay visible until manually archived
- Data is scoped by `user_id`
- Google Sheets is the current MVP backend
- n8n webhook is configurable and can be changed later

## Current sheet ID

`1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco`

## Current create-search webhook

`https://lastaccount1907.app.n8n.cloud/webhook/rankforge-create-search`

## n8n files

- `n8n/n8n-seo-agency-lead-intelligence.template.json`
- `n8n/N8N_DASHBOARD_CREATE_SEARCH_WEBHOOK.template.json`
- `n8n/N8N_DASHBOARD_CREATE_SEARCH_WEBHOOK_SETUP.md`
