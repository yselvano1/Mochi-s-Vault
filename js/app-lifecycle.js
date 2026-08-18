    function dismissSplashScreen(delay = 0) {
      setTimeout(() => {
        const skeleton = document.getElementById('skeleton-screen');
        const main = document.getElementById('main-content');

        if (main) main.classList.remove('hidden');
        if (skeleton) skeleton.classList.add('hidden');
      }, delay);
    }

    function showSyncIndicator(show) {
      const el = document.getElementById('top-progress-bar');
      if (!el) return;
      el.classList.toggle('show', show);
    }

    async function loadAppData(isSilentReload = false) {
      const localCache = localStorage.getItem('mochi_vault_global_data');
      const hadCache = !!localCache;

      if (localCache && !isSilentReload) {
        try {
          GLOBAL_DATA = JSON.parse(localCache);
          renderAllViews();
          dismissSplashScreen(150);
          isSilentReload = true;
        } catch(e) { console.error("Cache parse error", e); }
      } else if (!localCache) {
        const skeleton = document.getElementById('skeleton-screen');
        if (skeleton) skeleton.classList.remove('hidden');
      }

      if (isSilentReload && hadCache) showSyncIndicator(true);
      const fetchStart = performance.now();

      try {
        // GET is idempotent, so it's safe to retry a couple of times —
        // important here since this runs right after a save and the user
        // is expecting to see their change reflected without a manual pull.
        const result = await fetchJsonSafe(API_URL, { redirect: 'follow' }, 2, 1500);
        if (result.status === 'error') throw new Error(result.message);

        GLOBAL_DATA = result.data || result;
        localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));

        renderAllViews();

        if (!isSilentReload) {
          const elapsed = performance.now() - fetchStart;
          const minShow = Math.max(0, 300 - elapsed);
          dismissSplashScreen(minShow);
        } else if (hadCache) {
          showSyncIndicator(false);
        }
      } catch (err) {
        showSyncIndicator(false);
        if (!hadCache) {
          showToast("Failed to load data: " + err.message, "error");
          dismissSplashScreen();
        } else if (isSilentReload) {
          // The save/delete itself already succeeded (or its own error was
          // already shown) — this is just the follow-up view refresh
          // failing, so keep it low-key rather than an alarming error.
          showToast("Saved, but couldn't refresh the view — pull down to refresh.", "info");
        }
      }
    }

    function renderAllViews() {
      renderDashboard();
      renderMochiMood();
      renderBudgetSummaryCard();
      renderCategoryAnalysis();
      populateYearFilter();
      renderHistory();
      renderWallets();
      renderPayablesReceivables();
      populateFormDropdowns();
      lucide.createIcons();
    }

