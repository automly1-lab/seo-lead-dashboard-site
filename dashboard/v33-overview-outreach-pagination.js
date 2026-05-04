(function(){
  'use strict';

  var PAGE_SIZE = 50;
  var patching = false;
  var observerStarted = false;
  var STATUS_OPTIONS = [
    ['not_contacted','Not contacted'],
    ['contacted','Contacted'],
    ['follow_up_later','Follow up later'],
    ['replied','Replied'],
    ['not_interested','Not interested'],
    ['won','Won'],
    ['do_not_contact','Do not contact']
  ];

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function esc(v){ return clean(v).replace(/[&<>"']/g, function(x){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]; }); }
  function initials(name){ return clean(name).split(/\s+/).map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase() || 'RF'; }
  function cls(v){ return clean(v).replace(/\s+/g,''); }
  function leadId(l){ return clean(l && (l.id || l.lead_id)); }
  function userKey(){
    var email = '';
    try { email = clean((state.user && state.user.email) || ''); } catch(e) {}
    try { var s = JSON.parse(localStorage.getItem('rankforge-auth-session-v1') || 'null'); email = clean((s && (s.userId || s.id || s.email)) || email); } catch(e) {}
    return email || 'anonymous';
  }
  function storeKey(){ return 'rankforge-overview-outreach-status-v1::' + userKey(); }
  function readStatuses(){ try { return JSON.parse(localStorage.getItem(storeKey()) || '{}') || {}; } catch(e){ return {}; } }
  function writeStatuses(map){ try { localStorage.setItem(storeKey(), JSON.stringify(map || {})); } catch(e){} }
  function findLeadById(id){ try { return (state.leads || []).find(function(l){ return leadId(l) === id; }) || null; } catch(e){ return null; } }
  function getOutreach(l){
    var id = leadId(l);
    var map = readStatuses();
    return clean((id && map[id]) || l.outreach_status || l.contact_status || l.crm_contact_status || 'not_contacted');
  }
  function setOutreach(id, value){
    var map = readStatuses();
    map[id] = value;
    writeStatuses(map);
    var lead = findLeadById(id);
    if (lead) lead.outreach_status = value;
  }
  function optionLabel(value){ var found = STATUS_OPTIONS.find(function(x){ return x[0] === value; }); return found ? found[1] : 'Not contacted'; }
  function selectHtml(l){
    var val = getOutreach(l);
    return '<select class="rf33-outreach-select rf33-' + esc(val) + '" data-outreach-id="' + esc(leadId(l)) + '">' + STATUS_OPTIONS.map(function(opt){ return '<option value="' + esc(opt[0]) + '" ' + (opt[0] === val ? 'selected' : '') + '>' + esc(opt[1]) + '</option>'; }).join('') + '</select>';
  }
  function badge(s){ var label = clean(s) || 'No status'; return '<span class="badge ' + cls(label) + '">● ' + esc(label) + '</span>'; }
  function score(value){
    var n = Number(value || 0) || 0;
    return '<div class="score"><b>' + esc(String(n)) + '</b><span class="mini"><i style="width:' + Math.max(0, Math.min(100, n)) + '%"></i></span></div>';
  }
  function filteredLeads(){
    var q = (document.getElementById('search') && document.getElementById('search').value || '').toLowerCase();
    var sf = (document.getElementById('statusFilter') && document.getElementById('statusFilter').value || 'all');
    try {
      return (state.leads || []).filter(function(l){
        var statusTabOk = state.statusTab === 'all' || l.status === state.statusTab;
        var statusFilterOk = sf === 'all' || l.status === sf;
        var text = [l.business,l.company_name,l.location,l.city,l.country,l.domain,l.display_domain,l.status,optionLabel(getOutreach(l))].join(' ').toLowerCase();
        return statusTabOk && statusFilterOk && text.indexOf(q) > -1;
      });
    } catch(e){ return []; }
  }
  function ensureHeader(){
    var row = document.querySelector('#overview table thead tr');
    if (!row) return;
    var ths = Array.from(row.children).map(function(th){ return clean(th.textContent).toLowerCase(); });
    if (ths.indexOf('outreach') > -1 && row.children.length >= 9) return;
    row.innerHTML = '<th></th><th>Business</th><th>Location</th><th>SEO Score</th><th>Commercial Fit</th><th>Evidence</th><th>Status</th><th>Outreach</th><th>Added</th>';
  }
  function ensurePager(){
    var table = document.querySelector('#overview .table-panel table');
    if (!table) return null;
    var pager = document.getElementById('leadPager');
    if (!pager) { pager = document.createElement('div'); pager.id = 'leadPager'; pager.className = 'rf33-pager'; table.insertAdjacentElement('afterend', pager); }
    return pager;
  }
  function emptyRow(message){ return '<tr><td colspan="9" class="empty-cell">' + esc(message) + '</td></tr>'; }
  function renderPager(total, page, pages){
    var pager = ensurePager();
    if (!pager) return;
    if (total <= PAGE_SIZE) { pager.innerHTML = ''; return; }
    var start = page * PAGE_SIZE + 1, end = Math.min(total, (page + 1) * PAGE_SIZE), buttons = [];
    buttons.push('<button type="button" data-lead-page="prev" ' + (page <= 0 ? 'disabled' : '') + '>Previous</button>');
    var from = Math.max(0, page - 2), to = Math.min(pages - 1, page + 2);
    if (from > 0) buttons.push('<button type="button" data-lead-page="0">1</button><span>…</span>');
    for (var i = from; i <= to; i++) buttons.push('<button type="button" data-lead-page="' + i + '" class="' + (i === page ? 'active' : '') + '">' + (i + 1) + '</button>');
    if (to < pages - 1) buttons.push('<span>…</span><button type="button" data-lead-page="' + (pages - 1) + '">' + pages + '</button>');
    buttons.push('<button type="button" data-lead-page="next" ' + (page >= pages - 1 ? 'disabled' : '') + '>Next</button>');
    pager.innerHTML = '<div class="rf33-page-info">Showing ' + start + '–' + end + ' of ' + total + ' leads</div><div class="rf33-page-buttons">' + buttons.join('') + '</div>';
  }
  function renderTable(){
    if (patching) return;
    patching = true;
    try {
      ensureHeader();
      var body = document.getElementById('leadRows');
      if (!body) return;
      var rows = filteredLeads(), total = rows.length, pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      var page = Number(state.leadPage || 0);
      if (!Number.isFinite(page) || page < 0) page = 0;
      if (page > pages - 1) page = pages - 1;
      state.leadPage = page;
      var visible = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      body.innerHTML = visible.length ? visible.map(function(l){
        var id = leadId(l);
        return '<tr data-id="' + esc(id) + '" class="' + (id === state.selected ? 'selected' : '') + '">' +
          '<td><input class="pick" data-id="' + esc(id) + '" type="checkbox" ' + (state.exports && state.exports.has && state.exports.has(id) ? 'checked' : '') + '></td>' +
          '<td><div class="biz"><span class="logo">' + esc(initials(l.business || l.company_name)) + '</span><div><strong>' + esc(l.business || l.company_name || 'Untitled lead') + '</strong><br><small>' + esc(l.domain || l.display_domain || 'No domain') + '</small></div></div></td>' +
          '<td>' + esc(l.location || ([l.city,l.country].filter(Boolean).join(', ')) || '—') + '</td>' +
          '<td>' + score(l.seo || l.seo_need_score) + '</td>' +
          '<td>' + score(l.commercial || l.commercial_fit_score) + '</td>' +
          '<td>' + esc(l.evidence || l.seo_evidence_signal_count || 0) + ' signals</td>' +
          '<td>' + badge(l.status) + '</td>' +
          '<td>' + selectHtml(l) + '</td>' +
          '<td>' + esc(l.added || l.created_at || '—') + '</td>' +
        '</tr>';
      }).join('') : emptyRow('No leads yet. Create a search batch to start filling this table.');
      renderPager(total, page, pages);
    } finally { patching = false; }
  }
  function patchCurrentRowsOnly(){
    if (patching) return;
    var body = document.getElementById('leadRows');
    if (!body) return;
    var rows = Array.from(body.querySelectorAll('tr[data-id]'));
    if (!rows.length) return;
    var header = document.querySelector('#overview table thead tr');
    var hasOutreach = header && Array.from(header.children).some(function(th){ return clean(th.textContent).toLowerCase() === 'outreach'; });
    if (!hasOutreach || rows.some(function(row){ return !row.querySelector('.rf33-outreach-select'); })) renderTable();
  }
  function schedulePatch(){ requestAnimationFrame(function(){ patchCurrentRowsOnly(); }); }
  function injectCss(){
    if (document.getElementById('rf33-css')) return;
    var style = document.createElement('style');
    style.id = 'rf33-css';
    style.textContent = '#overview .rf33-outreach-select{width:150px;height:38px;border-radius:999px;border:1px solid rgba(148,163,184,.18);background:rgba(15,31,52,.82);color:#dbeafe;font-weight:800;padding:0 10px;outline:none}#overview .rf33-outreach-select:focus{border-color:rgba(96,165,250,.62);box-shadow:0 0 0 3px rgba(37,99,235,.18)}#overview .rf33-contacted,#overview .rf33-replied,#overview .rf33-won{border-color:rgba(34,197,94,.3);color:#bbf7d0;background:rgba(5,150,105,.12)}#overview .rf33-follow_up_later{border-color:rgba(245,158,11,.32);color:#fde68a;background:rgba(245,158,11,.12)}#overview .rf33-not_interested,#overview .rf33-do_not_contact{border-color:rgba(248,113,113,.32);color:#fecaca;background:rgba(127,29,29,.14)}#overview .rf33-pager{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 20px;border-top:1px solid rgba(148,163,184,.12);color:#9db7da;flex-wrap:wrap}#overview .rf33-page-info{font-size:13px;font-weight:700}#overview .rf33-page-buttons{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#overview .rf33-page-buttons button{height:34px;min-width:34px;border-radius:10px;border:1px solid rgba(148,163,184,.18);background:rgba(255,255,255,.035);color:#dbeafe;font-weight:900;cursor:pointer;padding:0 10px}#overview .rf33-page-buttons button.active{background:#2563eb;border-color:#2563eb;color:#fff}#overview .rf33-page-buttons button:disabled{opacity:.42;cursor:not-allowed}@media(max-width:1100px){#overview .rf33-outreach-select{width:130px}}';
    document.head.appendChild(style);
  }
  function resetPageAndRender(){ state.leadPage = 0; renderTable(); }
  document.addEventListener('click', function(ev){
    var pageBtn = ev.target.closest && ev.target.closest('[data-lead-page]');
    if (pageBtn) {
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      var rows = filteredLeads(), pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)), current = Number(state.leadPage || 0) || 0;
      var action = pageBtn.getAttribute('data-lead-page');
      if (action === 'prev') current -= 1; else if (action === 'next') current += 1; else current = Number(action);
      state.leadPage = Math.max(0, Math.min(pages - 1, current));
      renderTable(); return;
    }
    if (ev.target.closest && ev.target.closest('.rf33-outreach-select')) ev.stopPropagation();
  }, true);
  document.addEventListener('change', function(ev){
    var sel = ev.target.closest && ev.target.closest('.rf33-outreach-select');
    if (!sel) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    setOutreach(sel.getAttribute('data-outreach-id'), sel.value);
    sel.className = 'rf33-outreach-select rf33-' + sel.value;
  }, true);
  document.addEventListener('input', function(ev){ if (ev.target && ev.target.id === 'search') setTimeout(resetPageAndRender, 0); }, true);
  document.addEventListener('change', function(ev){ if (ev.target && ev.target.id === 'statusFilter') setTimeout(resetPageAndRender, 0); }, true);
  document.addEventListener('click', function(ev){ if (ev.target.closest && ev.target.closest('[data-tab]')) setTimeout(resetPageAndRender, 0); }, true);
  function startObserver(){
    if (observerStarted) return;
    var body = document.getElementById('leadRows');
    var head = document.querySelector('#overview table thead');
    if (!body || !head) return;
    observerStarted = true;
    var obs = new MutationObserver(function(){ if (!patching) schedulePatch(); });
    obs.observe(body, { childList:true });
    obs.observe(head, { childList:true, subtree:true });
  }
  function boot(){
    injectCss();
    window.table = renderTable;
    renderTable();
    startObserver();
    setTimeout(function(){ renderTable(); startObserver(); }, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();