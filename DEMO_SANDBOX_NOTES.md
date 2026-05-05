# RankForge Demo Sandbox Hardening

Branch: `demo/sandbox-hardening`

## Demo frontend config

The dashboard uses `dashboard/rankforge-config.js` as the single demo environment source of truth.

```js
window.RANKFORGE_CONFIG = {
  ENV: "demo",
  N8N_BASE_URL: "https://rankforge1907.app.n8n.cloud",
  WEBHOOKS: {
    CREATE_SEARCH: "/webhook/rankforge-demo-create-search",
    CURRENT_STATE: "/webhook/rankforge-demo-current-state",
    SEARCH_RESULTS: "/webhook/rankforge-demo-search-results"
  },
  ADMIN_EMAIL: "automly1@gmail.com",
  CREDIT_RULE: "Credits are consumed ONLY when a lead is marked as Qualified."
};
```

## Demo n8n workflow target

Workflow name: `[DEMO] RankForge MVP Memory Safe`

Webhook paths:

- `/webhook/rankforge-demo-create-search`
- `/webhook/rankforge-demo-current-state`
- `/webhook/rankforge-demo-search-results`

Google Sheet ID for demo, confirmed by owner:

- `1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco`

The demo workflow should remain inactive until explicitly enabled in n8n.

## Security notes

- Do not edit the production n8n workflow.
- Do not push API keys, tokens, service role keys, or bearer values into this repository.
- Existing n8n credential references should be preserved when duplicating the workflow inside n8n.
- If an exported workflow contains hardcoded secret values, do not commit them. Report only: `secret value exists in node; not printed`.

## Demo hardening behavior

`dashboard/rankforge-sandbox-hardening.js` enforces demo routing and dashboard isolation:

- Rewrites RankForge webhook calls to the demo webhook paths.
- Stores sandbox data in user-scoped keys:
  - `rankforge:${user_id}:leads`
  - `rankforge:${user_id}:searches`
  - `rankforge:${user_id}:outreach`
- Rejects current-state/search-results payloads that do not match the current `user_id`, `email`, or known `search_id`.
- Clears RankForge session keys and Supabase `sb-*` tokens during logout.
- Shows admin UI only for `automly1@gmail.com`.
- Displays admin usage as unlimited.
- Keeps the credit rule visible: `Credits are consumed ONLY when a lead is marked as Qualified.`

## Credit guard

Search creation is blocked unless the user is admin when:

- `remaining_search_batches <= 0`
- `remaining_lead_credits <= 0`

Credit usage rule:

- Qualified = 1 credit
- Needs Review = 0 credit
- Rejected = 0 credit
