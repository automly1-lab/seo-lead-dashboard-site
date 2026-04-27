(function () {
  var STORAGE_KEY = "rankforge-clean-app-state-v1";

  function parse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state || {}));
  }

  function norm(value) {
    return String(value || "").trim();
  }

  function pageName() {
    return document.body && document.body.dataset ? document.body.dataset.page : "";
  }

  function getState() {
    var state = parse(localStorage.getItem(STORAGE_KEY), {});
    state.localLists = Array.isArray(state.localLists) ? state.localLists : [];
    state.localLeads = Array.isArray(state.localLeads) ? state.localLeads : [];
    state.remoteCache = state.remoteCache && typeof state.remoteCache === "object" ? state.remoteCache : { lists: [], leads: [] };
    state.remoteCache.lists = Array.isArray(state.remoteCache.lists) ? state.remoteCache.lists : [];
    state.remoteCache.leads = Array.isArray(state.remoteCache.leads) ? state.remoteCache.leads : [];
    return state;
  }

  function uniqueById(items) {
    var seen = new Set();
    var out = [];
    items.forEach(function (item) {
      var id = norm(item && item.id);
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(item);
    });
    return out;
  }

  function getLists(state) {
    var deleted = new Set((state.deletedListIds || []).map(norm));
    var archived = new Set((state.archivedListIds || []).map(norm));
    return uniqueById([].concat(state.remoteCache.lists || [], state.localLists || []))
      .filter(function (list) {
        var id = norm(list.id);
        return id && !deleted.has(id) && !archived.has(id);
      })
      .sort(function (a, b) {
        return String(b.lastRun || b.created_at || "").localeCompare(String(a.lastRun || a.created_at || ""));
      });
  }

  function getLeadsForList(state, listId) {
    var deleted = new Set((state.deletedListIds || []).map(norm));
    return uniqueById([].concat(state.remoteCache.leads || [], state.localLeads || []))
      .filter(function (lead) {
        return norm(lead.listId) === norm(listId) && !deleted.has(norm(lead.listId));
      })
      .filter(function (lead) {
        var status = String(lead.status || "").toLowerCase();
        return status !== "rejected";
      })
      .sort(function (a, b) {
        return Number(b.overallScore || 0) - Number(a.overallScore || 0);
      });
  }

  function setSelected(listId, leadId) {
    var state = getState();
    state.selectedListId = norm(listId) || null;
    state.selectedLeadId = norm(leadId) || null;
    save(state);
    window.location.reload();
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char];
    });
  }

  function listLabel(list) {
    var market = [list.city, list.country].filter(Boolean).join(", ");
    return [list.name || "Untitled list", market].filter(Boolean).join(" — ");
  }

  function leadLabel(lead) {
    var score = lead.overallScore || lead.seoScore || "";
    return [lead.company || "Untitled lead", score ? "Score " + score : ""].filter(Boolean).join(" — ");
  }

  function mountTarget() {
    return document.querySelector(".workspace-strip") || document.querySelector(".topbar") || document.querySelector(".dashboard-main");
  }

  function renderLeadsSwitcher() {
    var state = getState();
    var lists = getLists(state);
    if (!lists.length) return;
    var selectedListId = norm(state.selectedListId) || norm(lists[0].id);
    var selected = lists.find(function (list) { return norm(list.id) === selectedListId; }) || lists[0];
    var wrap = document.createElement("section");
    wrap.className = "rf-switcher rf-list-switcher";
    wrap.innerHTML = '<div class="rf-switcher-copy"><span>Active list</span><strong>' + escapeHtml(selected.name || "Selected list") + '</strong><small>Switch between saved search lists without going back to the Lists page.</small></div>' +
      '<label class="rf-switcher-control"><span>Choose list</span><select id="rfListSwitcher"></select></label>';
    var select = wrap.querySelector("select");
    lists.forEach(function (list) {
      var option = document.createElement("option");
      option.value = norm(list.id);
      option.textContent = listLabel(list);
      option.selected = norm(list.id) === norm(selected.id);
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      setSelected(select.value, null);
    });
    var target = mountTarget();
    if (target && target.parentNode) target.parentNode.insertBefore(wrap, target.nextSibling);
  }

  function renderLeadDetailSwitcher() {
    var state = getState();
    var lists = getLists(state);
    if (!lists.length) return;
    var selectedListId = norm(state.selectedListId) || norm(lists[0].id);
    var selectedList = lists.find(function (list) { return norm(list.id) === selectedListId; }) || lists[0];
    var leads = getLeadsForList(state, selectedList.id);
    var selectedLeadId = norm(state.selectedLeadId) || (leads[0] && norm(leads[0].id)) || "";
    var currentIndex = leads.findIndex(function (lead) { return norm(lead.id) === selectedLeadId; });
    if (currentIndex < 0) currentIndex = 0;

    var wrap = document.createElement("section");
    wrap.className = "rf-switcher rf-detail-switcher";
    wrap.innerHTML = '<div class="rf-switcher-copy"><span>Review navigator</span><strong>Switch list or lead</strong><small>Move through leads without returning to the lead table.</small></div>' +
      '<div class="rf-switcher-grid">' +
      '<label class="rf-switcher-control"><span>List</span><select id="rfDetailListSwitcher"></select></label>' +
      '<label class="rf-switcher-control"><span>Lead</span><select id="rfLeadSwitcher"></select></label>' +
      '<div class="rf-switcher-buttons"><button type="button" id="rfPrevLead">Previous</button><button type="button" id="rfNextLead">Next</button></div>' +
      '</div>';

    var listSelect = wrap.querySelector("#rfDetailListSwitcher");
    var leadSelect = wrap.querySelector("#rfLeadSwitcher");
    lists.forEach(function (list) {
      var option = document.createElement("option");
      option.value = norm(list.id);
      option.textContent = listLabel(list);
      option.selected = norm(list.id) === norm(selectedList.id);
      listSelect.appendChild(option);
    });
    leads.forEach(function (lead) {
      var option = document.createElement("option");
      option.value = norm(lead.id);
      option.textContent = leadLabel(lead);
      option.selected = norm(lead.id) === selectedLeadId;
      leadSelect.appendChild(option);
    });
    if (!leads.length) {
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "No visible leads in this list";
      leadSelect.appendChild(empty);
    }

    listSelect.addEventListener("change", function () {
      var newLeads = getLeadsForList(getState(), listSelect.value);
      setSelected(listSelect.value, newLeads[0] ? newLeads[0].id : null);
    });
    leadSelect.addEventListener("change", function () {
      setSelected(listSelect.value, leadSelect.value);
    });
    wrap.querySelector("#rfPrevLead").addEventListener("click", function () {
      if (!leads.length) return;
      var nextIndex = currentIndex <= 0 ? leads.length - 1 : currentIndex - 1;
      setSelected(selectedList.id, leads[nextIndex].id);
    });
    wrap.querySelector("#rfNextLead").addEventListener("click", function () {
      if (!leads.length) return;
      var nextIndex = currentIndex >= leads.length - 1 ? 0 : currentIndex + 1;
      setSelected(selectedList.id, leads[nextIndex].id);
    });

    var target = mountTarget();
    if (target && target.parentNode) target.parentNode.insertBefore(wrap, target.nextSibling);
  }

  function init() {
    if (document.querySelector(".rf-switcher")) return;
    var page = pageName();
    if (page === "leads") renderLeadsSwitcher();
    if (page === "lead-detail") renderLeadDetailSwitcher();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
