    function getActiveUser() {
      const val = localStorage.getItem(ACTIVE_USER_KEY);
      return (val === 'Yosa' || val === 'Fani') ? val : null;
    }

    function setActiveUser(name) {
      localStorage.setItem(ACTIVE_USER_KEY, name);
      updateActiveUserUI();
    }

    function updateActiveUserUI() {
      const user = getActiveUser();
      const nameEl = document.getElementById('command-center-user-name');
      const avatarEl = document.getElementById('command-center-user-avatar');
      if (nameEl) nameEl.innerText = user || 'Belum diset';
      if (avatarEl) avatarEl.innerText = user ? user.charAt(0) : '?';

      // Default the manual transaction form's "By" field to whoever this
      // device belongs to, so it doesn't have to be picked every time.
      const formUserEl = document.getElementById('form-user');
      if (formUserEl && user) formUserEl.value = user;

      // Keep the top-bar greeting ("Hello, Yosa/Fani") in sync whenever the
      // active user is set or switched, not just on the next mood render.
      const greetingNameEl = document.getElementById('greeting-name');
      if (greetingNameEl) greetingNameEl.textContent = `Hello, ${user || 'Hoo-Man'}`;
    }

    function ensureActiveUserSet() {
      if (!getActiveUser()) {
        // First run only (no active user saved yet — fresh install, or
        // storage got cleared). Plays the full splash → welcome/login
        // sequence. Every later app open, reload or refresh skips this
        // entirely and goes straight to updateActiveUserUI() below,
        // since getActiveUser() will already return a name.
        runSplashLoginSequence();
      } else {
        updateActiveUserUI();
      }
    }

    function runSplashLoginSequence() {
      const screen = document.getElementById('splashLoginScreen');
      const copy = document.getElementById('splashWelcomeCopy');
      const buttons = document.getElementById('splashLoginButtons');
      if (!screen) return;

      screen.classList.remove('hidden');
      screen.classList.add('flex');

      // Pure brand moment first — just the logo, nothing else — then
      // the welcome copy and the Yosa/Fani buttons fade + rise in
      // around it. The logo itself never moves or resizes.
      setTimeout(() => copy && copy.classList.add('show'), 650);
      setTimeout(() => buttons && buttons.classList.add('show'), 1000);
    }

    function chooseSplashUser(name) {
      vibrate(30);
      setActiveUser(name);

      const screen = document.getElementById('splashLoginScreen');
      if (screen) {
        screen.classList.add('exit');
        setTimeout(() => {
          screen.classList.remove('flex', 'exit');
          screen.classList.add('hidden');
        }, 450);
      }

      showToast(`Got it! This phone is now set to ${name} 🐾`);
    }

    function chooseActiveUser(name) {
      vibrate(30);
      setActiveUser(name);
      if (activeModals.includes('modalActiveUserPicker')) {
        closeModal('modalActiveUserPicker');
      } else {
        const modal = document.getElementById('modalActiveUserPicker');
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
      }
      showToast(`Got it! This phone is now set to ${name} 🐾`);
    }

    function openActiveUserSwitcher() {
      // Reuses the same picker UI for switching later — same buttons, just
      // already-visible from Command Center instead of a first-run gate.
      openModal('modalActiveUserPicker');
    }

