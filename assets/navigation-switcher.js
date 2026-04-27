(function () {
  const STORAGE_KEY = 'rankforge-clean-app-state-v1';
  const PAGE = document.body?.dataset?.page || '';

  function parse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
  }

  function normalize(value) { return String(value || '').trim(); }

  function getSessionUserId() {
    try {
      if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === 'function') {
        const session = window.rankforgeAuth.getSession();
        if (session && session.userId) return normalize(session.userId);
      }
    } catch (_) {}
    const stored = parse(localStorage.getItem('rankforge-auth-session-v1'), null);
    return normalize(stored && stored.userId);
  }

  function loadState() {
    const state = parse(localStorage.getItem(STORAGE_KEY), {});
    if (!Array.isArray(state.localLists)) state.localLists = [];
    if (!Array.isArray(state.localLeads)) state.localLeads = [];
    if (!state.remoteCache || typeof state.remoteCache !== 'object') state.remoteCache = { lists: [], leads: [] };
    if (!Array.isArray(state.remoteCache.lists)) state.remoteCache.lists = [];
    if (!Array.isArray(state.remoteCache.leads)) state.remoteCache.leads = [];
    return state;
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function userIdOf(item) { return normalize(item && (item.userId || item.user_id)); }
  function currentUserId(state) { return getSessionUserId() || normalize(state.currentUserId); }

  function uniqueBy(items, keyFn) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
      const key = normalize(keyFn(item));
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function getLists(state) {
    const uid = currentUserId(state);
    return uniqueBy([...(state.remoteCache.lists || []), ...(state.localLists || [])], x => x.id)
      .filter(x => !uid || userIdOf(x) === uid)
      .filter(x => !(state.archivedListIds || []).includes(x.id))
      .filter(x => !(state.deletedListIds || []).includes(x.id));
  }

  function getLeads(state, listId) {
    const uid = currentUserId(state);
    return uniqueBy([...(state.remoteCache.leads || []), ...(state.localLeads || [])], x => x.id)
      .filter(x => !uid || userIdOf(x) === uid)
      .filter(x => !listId || normalize(x.listId) === normalize(listId));
  }

  function listLabel(list) {
    const market = [list.city, list.country].filter(Boolean).join(', ');
    const count = Number(list.qualified || 0) || 0;
    return `${list.name || list.id}${market ? ' — ' + market : ''}${count ? ' (' + count + ' qualified)' : ''}`;
  }

  function leadLabel(lead) {
    const score = lead.overallScore || lead.overall_lead_score || '';
    return `${lead.company || lead.company_name || lead.id}${score ? ' — score ' + score : ''}`;
  }

  function chooseList(listId) {
    const state = loadState();
    state.selectedListId = listId || null;
    state.selectedLeadId = null;
    saveState(state);
    window.location.reload();
  }

  function chooseLead(leadId) {
    const state = loadState();
    state.selectedLeadId = leadId || null;
    saveState(state);
    window.location.reload();
  }

  function insertAfterHeaderOrPanel(node) {
    const existing = document.querySelector('.rf-nav-switcher');
    if (existing) return false;

    const targets = [
      document.querySelector('.leads-panel .panel-header'),
      document.querySelector('.panel .detail-hero-panel'),
      document.querySelector('.detail-hero-panel'),
      document.querySelector('.lead-summary-bar'),
      document.querySelector('.panel-header')
    ].filter(Boolean);

    const target = targets[0];
    if (target && target.parentNode) {
      target.insertAdjacentElement('afterend', node);
      return true;
    }

    const main = document.querySelector('.dashboard-main') || document.body;
    main.insertAdjacentElement('afterbegin', node);
    return true;
  }

  function buildSelect(label, value, options, onChange) {
    const field = document.createElement('div');
    field.className = 'rf-nav-field';
    const lab = document.createElement('label');
    lab.textContent = label;
    const select = document.createElement('select');
    select.innerHTML = options.map(opt => `<option value="${String(opt.value).replace(/"/g, '&quot;')}" ${normalize(opt.value) === normalize(value) ? 'selected' : ''}>${opt.label}</option>`).join('');
    select.addEventListener('change', () => onChange(select.value));
    field.appendChild(lab);
    field.appendChild(select);
    return field;
  }

  function renderLeadsSwitcher() {
    if (PAGE !== 'leads') return;
    const state = loadState();
    const lists = getLists(state);
    if (!lists.length) return;
    const selectedId = state.selectedListId || lists[0].id;

    const box = document.createElement('div');
    box.className = 'rf-nav-switcher';
    const row = document.createElement('div');
    row.className = 'rf-nav-switcher-row';
    row.appendChild(buildSelect('Selected list', selectedId, lists.map(list => ({ value: list.id, label: listLabel(list) })), chooseList));
    box.appendChild(row);
    insertAfterHeaderOrPanel(box);
  }

  function renderLeadDetailSwitcher() {
    if (PAGE !== 'lead-detail') return;
    const state = loadState();
    const lists = getLists(state);
    if (!lists.length) return;
    const selectedListId = state.selectedListId || lists[0].id;
    const leads = getLeads(state, selectedListId);
    const selectedLeadId = state.selectedLeadId || (leads[0] && leads[0].id) || '';
    const currentIndex = leads.findIndex(lead => normalize(lead.id) === normalize(selectedLeadId));

    const box = document.createElement('div');
    box.className = 'rf-nav-switcher';
    const row = document.createElement('div');
    row.className = 'rf-nav-switcher-row';
    row.appendChild(buildSelect('Selected list', selectedListId, lists.map(list => ({ value: list.id, label: listLabel(list) })), chooseList));

    if (leads.length) {
      row.appendChild(buildSelect('Selected lead', selectedLeadId, leads.map(lead => ({ value: lead.id, label: leadLabel(lead) })), chooseLead));
      const buttons = document.createElement('div');
      buttons.className = 'rf-nav-buttons';
      const prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'rf-nav-button';
      prev.textContent = 'Previous';
      prev.disabled = currentIndex <= 0;
      prev.addEventListener('click', () => { if (currentIndex > 0) chooseLead(leads[currentIndex - 1].id); });
      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'rf-nav-button';
      next.textContent = 'Next';
      next.disabled = currentIndex < 0 || currentIndex >= leads.length - 1;
      next.addEventListener('click', () => { if (currentIndex >= 0 && currentIndex < leads.length - 1) chooseLead(leads[currentIndex + 1].id); });
      buttons.appendChild(prev);
      buttons.appendChild(next);
      row.appendChild(buttons);
    }

    box.appendChild(row);
    insertAfterHeaderOrPanel(box);
  }

  function init() {
    renderLeadsSwitcher();
    renderLeadDetailSwitcher();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Auto-sync may render after this script. Retry a few times without duplicating.
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (!document.querySelector('.rf-nav-switcher')) init();
    if (document.querySelector('.rf-nav-switcher') || tries >= 8) clearInterval(timer);
  }, 700);
})();
