window.addEventListener('DOMContentLoaded', () => {
      applyDarkModePref();
      // Set the greeting (time-of-day text + name) synchronously, first
      // thing — before anything async runs. It was previously only set
      // inside renderMochiMood(), which waits on data loading, so the
      // static "Good day / Hello, Hoo-Man" placeholder from the HTML
      // stayed on screen and flashed to the real greeting a beat later
      // on every refresh. Calling it here means the correct greeting is
      // already in place before the user sees anything.
      updateGreeting();
      lucide.createIcons();
      initVaultTilt();
      initEdgeGlow();
      document.getElementById('form-date').valueAsDate = new Date();
      ensureActiveUserSet();

      // Pulihkan tab terakhir yang dibuka
      const savedTab = localStorage.getItem('mochi_active_tab');
      if (savedTab && TABS.includes(savedTab)) {
        switchTab(savedTab);
      }

      // Reflect any writes still waiting from a previous offline session,
      // and try to flush them immediately if we're already online.
      updatePendingBadge(getPendingQueue().length);
      flushPendingQueue();

      loadAppData().then(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'add') {
          setTimeout(() => openNewTransactionForm(), 400);
        }
      });
    });
