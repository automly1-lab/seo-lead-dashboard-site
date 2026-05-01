(()=>{
  const PAGE_SIZE = 10;
  const OVERRIDE_KEY = 'rankforge-admin-overrides-v1';
  const ACTIVITY_KEY = 'rankforge-admin-activity-v1';
  const pageState = { diagnosticTable: 1, usersTable: 1, billingTable: 1, feedbackTable: 1, integrityTable: 1 };
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const clean = v => String(v == null ? '' : v).trim();
  const esc = v => clean(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const parse = (raw, fallback) => { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
  const usernameFromEmail = email => clean(email).includes('@') ? clean(email).split('@')[0] : '';

  function getUserMap(){
    const map = new Map();
    $$('#usersTable tbody tr').forEach(row => {
      const first = row.cells && row.cells[0];
      const second = row.cells && row.cells[1];
      if (!first) return;
      const id = clean(first.querySelector('.rf-mono')?.textContent || first.querySelector('.rf-user-id')?.textContent || '');
      const email = clean(second?.textContent || '');
      const strong = clean(first.querySelector('strong')?.textContent || '');
      const username = strong && strong !== 'No email recorded' ? strong : usernameFromEmail(email) || (id ? id.slice(0, 16) : 'Unknown user');
      if (id) map.set(id, { username, email: email && email !== 'No email recorded' ? email : 'No email recorded' });
    });
    return map;
  }

  function normalizeUserCells(){
    const userMap = getUserMap();
    $$('#usersTable tbody tr').forEach(row => {
      if (!row.cells || row.cells.length < 2) return;
      const userCell = row.cells[0];
      const emailCell = row.cells[1];
      const id = clean(userCell.querySelector('.rf-mono')?.textContent || userCell.querySelector('.rf-user-id')?.textContent || '');
      const email = clean(emailCell.textContent || 'No email recorded');
      const username = usernameFromEmail(email) || clean(userCell.querySelector('strong')?.textContent) || (id ? id.slice(0,16) : 'Unknown user');
      userCell.classList.add('rf-admin-user-cell');
      userCell.innerHTML = `<strong>${esc(username)}</strong><span class="rf-muted">${esc(email || 'No email recorded')}</span><span class="rf-mono rf-user-id">${esc(id)}</span>${(!email || email === 'No email recorded') ? '<span class="rf-badge rf-badge-warning">Identity missing</span>' : ''}`;
    });

    $$('#billingTable tbody tr').forEach(row => {
      if (!row.cells || !row.cells[0]) return;
      const cell = row.cells[0];
      const id = clean(cell.querySelector('.rf-mono')?.textContent || '');
      const email = clean(cell.querySelector('.rf-muted')?.textContent || cell.textContent.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || 'No email recorded');
      const username = usernameFromEmail(email) || clean(cell.querySelector('strong')?.textContent) || (id ? id.slice(0,16) : 'Unknown user');
      cell.classList.add('rf-admin-user-cell');
      cell.innerHTML = `<strong>${esc(username)}</strong><span class="rf-muted">${esc(email || 'No email recorded')}</span><span class="rf-mono rf-user-id">${esc(id)}</span>`;
    });

    ['diagnosticTable','feedbackTable','integrityTable'].forEach(tableId => {
      const table = document.getElementById(tableId);
      if (!table) return;
      const userCol = tableId === 'feedbackTable' ? 2 : 1;
      $$('tbody tr', table).forEach(row => {
        const cell = row.cells && row.cells[userCol];
        if (!cell || cell.querySelector('.rf-admin-user-cell-inner')) return;
        const raw = clean(cell.textContent);
        const id = raw.split(/\s+/).find(x => userMap.has(x)) || raw;
        const user = userMap.get(id);
        if (!user) return;
        cell.innerHTML = `<div class="rf-admin-user-cell-inner"><strong>${esc(user.username)}</strong><span class="rf-muted">${esc(user.email)}</span><span class="rf-mono rf-user-id">${esc(id)}</span></div>`;
      });
    });
  }

  function ensurePager(table){
    const id = table.id;
    let pager = document.getElementById(id + 'Pager');
    if (!pager) {
      pager = document.createElement('div');
      pager.id = id + 'Pager';
      pager.className = 'rf-pagination';
      const wrap = table.closest('.rf-table-wrap');
      (wrap || table).insertAdjacentElement('afterend', pager);
    }
    return pager;
  }

  function paginateTable(tableId){
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = $$('tbody tr', table).filter(row => !row.querySelector('.rf-empty') && row.cells.length > 1);
    const pager = ensurePager(table);
    if (rows.length <= PAGE_SIZE) { rows.forEach(r => r.classList.remove('rf-page-hidden')); pager.innerHTML = ''; return; }
    const total = Math.ceil(rows.length / PAGE_SIZE);
    pageState[tableId] = Math.min(Math.max(pageState[tableId] || 1, 1), total);
    const start = (pageState[tableId] - 1) * PAGE_SIZE;
    rows.forEach((row, index) => row.classList.toggle('rf-page-hidden', index < start || index >= start + PAGE_SIZE));
    pager.innerHTML = `<button class="button small ghost" ${pageState[tableId] <= 1 ? 'disabled' : ''} data-polish-page="${tableId}:prev">Previous</button><span class="rf-pagination-meta">Page ${pageState[tableId]} of ${total} · ${rows.length} rows</span><button class="button small ghost" ${pageState[tableId] >= total ? 'disabled' : ''} data-polish-page="${tableId}:next">Next</button>`;
  }

  function addSaveButtons(){
    $$('#billingTable tbody tr').forEach(row => {
      const actionCell = row.cells && row.cells[row.cells.length - 1];
      if (!actionCell || actionCell.querySelector('[data-polish-save]')) return;
      const id = clean(row.cells[0]?.querySelector('.rf-mono')?.textContent || '');
      if (!id) return;
      const button = document.createElement('button');
      button.className = 'button small primary';
      button.type = 'button';
      button.dataset.polishSave = id;
      button.textContent = 'Save Override';
      actionCell.prepend(button);
      if (!actionCell.querySelector('.rf-action-stack')) actionCell.classList.add('rf-action-stack');
    });
  }

  function getOverrideForRow(row, userId){
    const plan = row.querySelector('[data-plan]')?.value || row.querySelector('select')?.value || '';
    const billing = row.querySelector('[data-billing]')?.value || row.querySelectorAll('select')[1]?.value || '';
    const searchAdjust = row.querySelector('[data-search-adjust]')?.value || row.querySelector('input[placeholder*="Search"]')?.value || '';
    const leadAdjust = row.querySelector('[data-lead-adjust]')?.value || row.querySelector('input[placeholder*="Lead"]')?.value || '';
    const note = row.querySelector('[data-note]')?.value || row.querySelector('input[placeholder*="note"],input[placeholder*="Reason"]')?.value || '';
    const email = clean(row.cells[0]?.querySelector('.rf-muted')?.textContent || '');
    const username = clean(row.cells[0]?.querySelector('strong')?.textContent || '');
    return { user_id:userId, username, email, plan_override:plan, billing_status_override:billing, search_credit_adjustment:searchAdjust, lead_credit_adjustment:leadAdjust, note, reason:note, updated_at:new Date().toISOString(), source:'rankforge_admin_quality' };
  }

  function saveOverride(userId){
    const button = document.querySelector(`[data-polish-save="${CSS.escape(userId)}"]`);
    const row = button?.closest('tr');
    if (!row) return;
    const overrides = parse(localStorage.getItem(OVERRIDE_KEY), {});
    const activities = parse(localStorage.getItem(ACTIVITY_KEY), []);
    const payload = getOverrideForRow(row, userId);
    overrides[userId] = payload;
    activities.unshift({ timestamp:new Date().toISOString(), user_id:userId, user_display:`${payload.username || 'Unknown user'} · ${payload.email || 'No email recorded'}`, reason:payload.note || 'Manual override saved', summary:`Plan ${payload.plan_override || 'unchanged'} · Billing ${payload.billing_status_override || 'unchanged'} · Search ${payload.search_credit_adjustment || 0} · Lead ${payload.lead_credit_adjustment || 0}` });
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities.slice(0,100)));
    const status = document.getElementById('rfAdminStatus');
    if (status) { status.textContent = 'Override saved locally. Apply through the configured admin workflow or Sheets update flow.'; status.className = 'rf-pill rf-badge-ok'; }
    renderLocalActivity(activities);
  }

  function renderLocalActivity(activities = parse(localStorage.getItem(ACTIVITY_KEY), [])){
    const box = document.getElementById('adminActivity');
    if (!box || !activities.length) return;
    box.innerHTML = activities.slice(0,20).map(a => `<article><strong>${esc(a.user_display || a.user_id)}</strong><p class="rf-muted">${esc(a.reason || 'Override saved')}</p><span class="rf-mono">${esc(a.summary || '')}</span><div class="rf-muted">${esc(new Date(a.timestamp).toLocaleString())}</div></article>`).join('');
  }

  function polish(){
    normalizeUserCells();
    addSaveButtons();
    ['diagnosticTable','usersTable','billingTable','feedbackTable','integrityTable'].forEach(paginateTable);
    renderLocalActivity();
  }

  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-polish-page]');
    if (nav) {
      const [tableId, direction] = nav.dataset.polishPage.split(':');
      pageState[tableId] = (pageState[tableId] || 1) + (direction === 'next' ? 1 : -1);
      paginateTable(tableId);
      return;
    }
    const save = event.target.closest('[data-polish-save]');
    if (save) saveOverride(save.dataset.polishSave);
  });

  const observer = new MutationObserver(() => {
    window.clearTimeout(window.__rfAdminPolishTimer);
    window.__rfAdminPolishTimer = window.setTimeout(polish, 120);
  });

  function init(){
    const root = document.getElementById('rfAdminContent') || document.body;
    observer.observe(root, { childList:true, subtree:true });
    polish();
    setInterval(polish, 1500);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
