(function () {
  "use strict";

  var AUTO_SYNC_VERSION = "auto-sync-2-stable";
  var APP_PAGES = ["dashboard", "lists", "leads", "lead-detail", "settings"];
  var pageName = document.body && document.body.dataset ? document.body.dataset.page : "";
  var shouldRun = APP_PAGES.indexOf(pageName) >= 0;
  if (!shouldRun) return;

  var isSyncing = false;
  var lastSyncAt = 0;
  var MIN_GAP_MS = 45000;
  var ACTIVE_POLL_MS = 30000;
  var ACTIVE_POLL_DURATION_MS = 3 * 60 * 1000;
  var activePollingUntil = 0;

  function status(message) {
    var node = document.getElementById("dataStatus");
    if (node && message) node.textContent = message;
  }

  function canSync() {
    return window.rankforgeApp && typeof window.rankforgeApp.sync === "function";
  }

  async function runSync(reason) {
    if (!canSync()) return false;
    var now = Date.now();
    if (isSyncing || now - lastSyncAt < MIN_GAP_MS) return false;
    isSyncing = true;
    lastSyncAt = now;
    try {
      if (reason === "manual") status("Syncing sheets...");
      await window.rankforgeApp.sync();
      return true;
    } catch (error) {
      console.warn("RankForge auto sync failed", error);
      return false;
    } finally {
      isSyncing = false;
    }
  }

  function startActivePolling() {
    activePollingUntil = Date.now() + ACTIVE_POLL_DURATION_MS;
    status("Search sent. Refreshing results in the background...");
  }

  function wrapCreateSearch() {
    if (!window.rankforgeApp || typeof window.rankforgeApp.createSearch !== "function") return false;
    if (window.rankforgeApp.createSearch.__rankforgeAutoSyncWrapped) return true;

    var originalCreateSearch = window.rankforgeApp.createSearch;
    var wrapped = async function () {
      var result = await originalCreateSearch.apply(this, arguments);
      startActivePolling();
      window.setTimeout(function () { runSync("after-create"); }, 12000);
      window.setTimeout(function () { runSync("after-create"); }, 45000);
      return result;
    };
    wrapped.__rankforgeAutoSyncWrapped = true;
    window.rankforgeApp.createSearch = wrapped;
    return true;
  }

  function boot() {
    wrapCreateSearch();

    // Do not auto-sync immediately on page load. The initial app bootstrap already reads data.
    // Extra load-time sync calls were causing multiple redraws and inconsistent intermediate states.
    window.setInterval(function () {
      if (Date.now() < activePollingUntil) runSync("active-poll");
    }, ACTIVE_POLL_MS);

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && Date.now() < activePollingUntil) runSync("visible-active");
    });

    window.rankforgeAutoSync = {
      version: AUTO_SYNC_VERSION,
      syncNow: function () { return runSync("manual"); },
      startActivePolling: startActivePolling
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
