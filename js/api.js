    const API_URL = "https://script.google.com/macros/s/AKfycbwHCQ2m26t3uo1lMDYL_izn5YqALyoxw1gbVNUfTGx68MKaCY9Xvlm3jpt5rJz983as7Q/exec";

    // Google Apps Script occasionally returns an HTML error/interstitial page
    // instead of JSON (cold start, quota hiccup, brief overload) instead of
    // waiting for the script to actually finish. `retries` controls how many
    // EXTRA attempts are made after a parse/network failure — pass 0 for
    // anything that writes data (create/update/delete), since retrying a
    // write that may have already succeeded server-side just fires a
    // duplicate request that then queues up behind the still-running
    // original and times out with a false "busy" error. Reads (GET) are
    // safe to retry freely.
    async function fetchJsonSafe(url, options, retries = 0, retryDelay = 1500) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        let res;
        try {
          res = await fetch(url, options);
        } catch (networkErr) {
          // fetch() itself threw, meaning the request never reached the
          // server (offline, DNS failure, connection dropped mid-request).
          // Unlike UNCONFIRMED_RESPONSE below, this case is safe to know as
          // "definitely did not happen" — flagged so callers can queue
          // writes for retry instead of treating them as ambiguous.
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, retryDelay));
            continue;
          }
          const e = new Error("NETWORK_UNREACHABLE");
          e.isNetworkError = true;
          throw e;
        }
        const raw = await res.text();
        try {
          return JSON.parse(raw);
        } catch (parseErr) {
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, retryDelay));
            continue;
          }
          throw new Error("UNCONFIRMED_RESPONSE");
        }
      }
    }

    // Single-attempt by design — see fetchJsonSafe's note on why writes
    // should never be silently auto-retried within a single call. A separate,
    // explicit offline queue (below) handles the one case where retrying is
    // actually safe: a request that never left the device.
    async function postApi(action, payload, extra = {}) {
      let result;
      try {
        result = await fetchJsonSafe(API_URL, {
          method: 'POST', redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, payload, ...extra })
        }, 0);
      } catch (err) {
        if (err.message === "UNCONFIRMED_RESPONSE") {
          throw new Error("Couldn't confirm this went through — it may still be processing. Check History in a few seconds before trying again.");
        }
        if (err.isNetworkError) {
          const e = new Error("You're offline — this will sync automatically once you're back online.");
          e.isNetworkError = true;
          throw e;
        }
        throw err;
      }
      if (result.status === 'error') throw new Error(result.message);
      return result;
    }

    // --- Offline outbox -----------------------------------------------
    // Only ever holds writes that failed with a confirmed NETWORK_UNREACHABLE
    // error (see fetchJsonSafe) — i.e. we know for certain they never reached
    // the server, so replaying them later cannot create a duplicate. Ambiguous
    // failures (UNCONFIRMED_RESPONSE, server-side errors) are deliberately
    // NOT queued here; those still surface as an error for the user to check
    // manually, exactly as before.
    const PENDING_QUEUE_KEY = 'mochi_vault_pending_queue';

    function getPendingQueue() {
      try { return JSON.parse(localStorage.getItem(PENDING_QUEUE_KEY)) || []; }
      catch (e) { return []; }
    }

    function savePendingQueue(queue) {
      localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
      updatePendingBadge(queue.length);
    }

    function enqueuePending(action, payload, extra = {}, clientTempId = null) {
      const queue = getPendingQueue();
      // clientTempId links a queued 'createTransaction' back to the local
      // TRX-TEMP-* id shown in the UI before the server assigns a real one —
      // it's local bookkeeping only and is never sent to the server (unlike
      // `extra`, which gets merged into the request body).
      queue.push({ id: 'PEND-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), action, payload, extra, clientTempId, queuedAt: Date.now() });
      savePendingQueue(queue);
    }

    // Finds a still-unsynced 'createTransaction' in the queue by its local
    // temp id. Used to let edit/delete act on the queue entry directly
    // instead of sending an update/delete for an id the server has never
    // seen — sending one would silently no-op once the create finally syncs
    // under a different, server-assigned id.
    function findPendingCreateByTempId(tempId) {
      if (!tempId || !String(tempId).startsWith('TRX-TEMP-')) return null;
      const queue = getPendingQueue();
      const index = queue.findIndex(item => item.action === 'createTransaction' && item.clientTempId === tempId);
      return index === -1 ? null : { queue, index, item: queue[index] };
    }

    function updatePendingCreatePayload(tempId, newPayload) {
      const found = findPendingCreateByTempId(tempId);
      if (!found) return false;
      found.queue[found.index].payload = newPayload;
      savePendingQueue(found.queue);
      return true;
    }

    function removePendingCreate(tempId) {
      const found = findPendingCreateByTempId(tempId);
      if (!found) return false;
      found.queue.splice(found.index, 1);
      savePendingQueue(found.queue);
      return true;
    }

    function updatePendingBadge(count) {
      const badge = document.getElementById('pending-sync-badge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    let isFlushingQueue = false;
    async function flushPendingQueue() {
      if (isFlushingQueue || !navigator.onLine) return;
      const queue = getPendingQueue();
      if (queue.length === 0) return;

      isFlushingQueue = true;
      showSyncIndicator(true);
      let synced = 0;
      const skippedMessages = [];

      while (true) {
        const current = getPendingQueue();
        if (current.length === 0) break;
        const item = current[0];
        try {
          const result = await postApi(item.action, item.payload, item.extra);
          if (result && result.data) {
            GLOBAL_DATA = result.data;
            localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
          }
          current.shift();
          savePendingQueue(current);
          synced++;
        } catch (err) {
          if (err.isNetworkError) {
            // Still offline — stop here, this item and everything queued
            // behind it stays put for the next trigger (online event / app
            // foreground).
            break;
          }
          // Non-network failure: the server actively rejected this specific
          // write (e.g. a queued delete/update for a transaction that no
          // longer exists — already removed by another synced action). This
          // exact item can never succeed as-is, and leaving it at the front
          // would jam every other queued item behind it forever. Drop just
          // this one and keep going.
          current.shift();
          savePendingQueue(current);
          skippedMessages.push(err.message);
        }
      }

      isFlushingQueue = false;
      showSyncIndicator(false);
      if (synced > 0) {
        showToast(synced === 1 ? "1 offline change synced." : `${synced} offline changes synced.`, "success");
      }
      if (skippedMessages.length > 0) {
        showToast(
          skippedMessages.length === 1
            ? `1 offline change couldn't be applied and was skipped: ${skippedMessages[0]}`
            : `${skippedMessages.length} offline changes couldn't be applied and were skipped — please check History.`,
          "error"
        );
      }
      if (synced > 0 || skippedMessages.length > 0) {
        loadAppData(true); // Re-sync from server so local state matches reality
      }
    }

    window.addEventListener('online', flushPendingQueue);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') flushPendingQueue();
    });


