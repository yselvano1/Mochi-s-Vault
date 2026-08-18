    function openModal(id) {
      const modal = document.getElementById(id);
      const content = document.getElementById(id + '-content');
      if (!activeModals.includes(id)) {
        activeModals.push(id);
        history.pushState({ modal: id }, '');
      }
      modal.classList.remove('hidden');
      requestAnimationFrame(() => {
        modal.classList.add('show');
        if (content) content.classList.add('show');
      });
      lucide.createIcons();
      // Any Mochi AI surface holds the ambient edge glow for as long as it's open.
      if (id === 'modalMochiChat') holdEdgeGlow();
    }

    function closeModal(id) {
      if (activeModals.includes(id)) {
        if (id === 'modalDetail') window.isNestedModalView = false;
        history.back();
      } else {
        performVisualClose(id);
      }
    }

    function performVisualClose(id) {
      const modal = document.getElementById(id);
      const content = document.getElementById(id + '-content');
      if (modal) {
        modal.classList.remove('show');
        if (content) content.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 400);
      }
      activeModals = activeModals.filter(m => m !== id);
      if (id === 'modalMochiChat') { stopEdgeGlow(); cancelMochiVoiceInput(); }
    }

    let currentWalletsView = 'accounts';
    function switchWalletsView(view) {
      if (view === currentWalletsView) return;
      vibrate(20);
      currentWalletsView = view;

      const pill = document.getElementById('wallets-seg-pill');
      const btnAccounts = document.getElementById('wallets-seg-accounts');
      const btnInvestments = document.getElementById('wallets-seg-investments');
      const viewAccounts = document.getElementById('wallets-view-accounts');
      const viewInvestments = document.getElementById('wallets-view-investments');

      pill.style.transform = view === 'investments' ? 'translateX(100%)' : 'translateX(0)';
      btnAccounts.classList.toggle('text-main', view === 'accounts');
      btnAccounts.classList.toggle('text-muted', view !== 'accounts');
      btnInvestments.classList.toggle('text-main', view === 'investments');
      btnInvestments.classList.toggle('text-muted', view !== 'investments');

      const showEl = view === 'accounts' ? viewAccounts : viewInvestments;
      const hideEl = view === 'accounts' ? viewInvestments : viewAccounts;

      hideEl.classList.add('opacity-0');
      setTimeout(() => {
        hideEl.classList.add('hidden');
        showEl.classList.remove('hidden');
        showEl.classList.add('opacity-0');
        void showEl.offsetWidth;
        requestAnimationFrame(() => showEl.classList.remove('opacity-0'));
        lucide.createIcons();
      }, 180);
    }

    let currentTab = 'dashboard';
    const TABS = ['dashboard', 'history', 'wallets', 'payables'];

    function switchTab(tabId) {
      currentTab = tabId;
      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('bg-mochi-light/20', 'text-mochi', 'dark:text-mochi-light', 'px-4', 'py-2.5', 'rounded-2xl');
        el.classList.add('text-faint', 'dark:text-[#A89B91]', 'p-2.5');
        const textSpan = el.querySelector('.nav-text');
        if (textSpan) textSpan.classList.remove('nav-text-active');
      });

      const activeBtn = document.getElementById('tab-' + tabId);
      if (activeBtn) {
        activeBtn.classList.remove('text-faint', 'dark:text-[#A89B91]', 'p-2.5');
        activeBtn.classList.add('bg-mochi-light/20', 'text-mochi', 'dark:text-mochi-light', 'px-4', 'py-2.5', 'rounded-2xl');
        const textSpan = activeBtn.querySelector('.nav-text');
        if (textSpan) textSpan.classList.add('nav-text-active');
      }

      document.querySelectorAll('main > section').forEach(el => el.classList.add('hidden'));
      const activeSection = document.getElementById('page-' + tabId);
      activeSection.classList.remove('hidden');
      activeSection.classList.remove('page-animate');
      void activeSection.offsetWidth;
      activeSection.classList.add('page-animate');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      localStorage.setItem('mochi_active_tab', tabId);
    }

    let touchStartX = 0, touchStartY = 0;
    document.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', e => {
      let dx = e.changedTouches[0].screenX - touchStartX;
      let dy = e.changedTouches[0].screenY - touchStartY;
      if (Math.abs(dx) > 60 && Math.abs(dy) < 40) {
        let isEdgeSwipe = (touchStartX < 40) || (touchStartX > window.innerWidth - 40);
        if (!isEdgeSwipe && activeModals.length === 0) {
          let currentIndex = TABS.indexOf(currentTab);
          if (dx < -60 && currentIndex < TABS.length - 1) { vibrate(30); switchTab(TABS[currentIndex + 1]); }
          else if (dx > 60 && currentIndex > 0) { vibrate(30); switchTab(TABS[currentIndex - 1]); }
        }
      }
    }, { passive: true });

    function applyDarkModePref() {
      const pref = localStorage.getItem('yf-theme');
      const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = pref ? pref === 'dark' : systemDark;
      document.documentElement.classList.toggle('dark', isDark);
      updateDarkModeIcon(isDark);
      
      const themeColor = isDark ? "#14100E" : "#F7F4EE";
      const metaTheme = document.getElementById('meta-theme-color');
      if (metaTheme) metaTheme.setAttribute("content", themeColor);
    }

    function toggleDarkMode() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('yf-theme', isDark ? 'dark' : 'light');
      updateDarkModeIcon(isDark);
      
      const themeColor = isDark ? "#14100E" : "#F7F4EE";
      const metaTheme = document.getElementById('meta-theme-color');
      if (metaTheme) metaTheme.setAttribute("content", themeColor);
    }

    function updateDarkModeIcon(isDark) {
      document.getElementById('icon-sun').classList.toggle('hidden', !isDark);
      document.getElementById('icon-moon').classList.toggle('hidden', isDark);
    }

