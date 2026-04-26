(function () {
  "use strict";

  var AUTO_SYNC_VERSION = "auto-sync-1";
  var APP_PAGES = ["dashboard", "lists", "leads", "lead-detail", "settings"];
  var pageName = document.body && document.body.dataset ? document.body.dataset.page : "";
  var shouldRun = APP_PAGES.indexOf(pageName) >= 0;
  if (!shouldRun) return;

  var isSyncing = false;
  var lastSyncAt = 0;
  var MIN_GAP_MS = 12000;
  var NORMAL_POLL_MS = 60000;
  var ACTIVE_POLL_MS = 15000;
  var ACTIVE_POLL_DURATION_MS = 6 * 60 * 1000;
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
      if (reason === "auto") status("Auto syncing sheets...");
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
    status("Search sent. Auto-refreshing results...");
  }

  function wrapCreateSearch() {
    if (!window.rankforgeApp || typeof window.rankforgeApp.createSearch !== "function") return false;
    if (window.rankforgeApp.createSearch.__rankforgeAutoSyncWrapped) return true;

    var originalCreateSearch = window.rankforgeApp.createSearch;
    var wrapped = async function () {
      var result = await originalCreateSearch.apply(this, arguments);
      startActivePolling();
      window.setTimeout(function () { runSync("after-create"); }, 8000);
      window.setTimeout(function () { runSync("after-create"); }, 25000);
      window.setTimeout(function () { runSync("after-create"); }, 60000);
      return result;
    };
    wrapped.__rankforgeAutoSyncWrapped = true;
    window.rankforgeApp.createSearch = wrapped;
    return true;
  }

  function boot() {
    wrapCreateSearch();
    window.setTimeout(function () { runSync("auto"); }, 900);

    window.setInterval(function () {
      var active = Date.now() < activePollingUntil;
      if (!active) return;
      runSync("active-poll");
    }, ACTIVE_POLL_MS);

    window.setInterval(function () {
      runSync("normal-poll");
    }, NORMAL_POLL_MS);

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) runSync("visible");
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
