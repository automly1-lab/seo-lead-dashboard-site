/* RankForge user isolation guard */
(function () {
  function parse(raw, fallback) { try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; } }
  function norm(v) { return String(v || "").trim(); }
  function uuidLike(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(norm(v)); }
  function currentUserId() {
    try {
      if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") {
        var s = window.rankforgeAuth.getSession();
        if (s && uuidLike(s.userId)) return norm(s.userId);
      }
    } catch (_) {}
    var stored = parse(localStorage.getItem("rankforge-auth-session-v1"), null);
    if (stored && uuidLike(stored.userId)) return norm(stored.userId);
    return "";
  }
  function cleanState() {
    var uid = currentUserId();
    if (!uid) return;
    var key = "rankforge-clean-app-state-v1";
    var state = parse(localStorage.getItem(key), null);
    if (!state || typeof state !== "object") return;
    function belongs(x) {
      var id = norm(x && (x.userId || x.user_id));
      return id && id === uid;
    }
    if (Array.isArray(state.localLists)) state.localLists = state.localLists.filter(belongs);
    if (Array.isArray(state.localLeads)) state.localLeads = state.localLeads.filter(belongs);
    if (state.remoteCache && Array.isArray(state.remoteCache.lists)) state.remoteCache.lists = state.remoteCache.lists.filter(belongs);
    if (state.remoteCache && Array.isArray(state.remoteCache.leads)) state.remoteCache.leads = state.remoteCache.leads.filter(belongs);
    state.currentUserId = uid;
    localStorage.setItem(key, JSON.stringify(state));
  }
  cleanState();
  window.addEventListener("storage", cleanState);
})();
