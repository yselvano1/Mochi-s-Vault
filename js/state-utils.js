    let GLOBAL_DATA = { kpi: {}, transactions: [], accounts: [], categories: [], payables: [], receivables: [] };
    let currentModalBackFn = null;
    let transactionToDelete = null;

    let activeModals = [];
    history.replaceState({ modal: null }, '');
    window.isNestedModalView = false;

    window.addEventListener('popstate', () => {
      if (activeModals.length > 0) {
        const topModal = activeModals[activeModals.length - 1];
        if (topModal === 'modalDetail' && window.isNestedModalView && currentModalBackFn) {
          let fn = currentModalBackFn;
          window.isNestedModalView = false;
          history.pushState({ modal: 'modalDetail' }, '');
          fn();
        } else {
          window.isNestedModalView = false;
          currentModalBackFn = null;
          performVisualClose(topModal);
        }
      }
    });

    
    function openCommandCenter() {
      vibrate(30);
      openModal('modalCommandCenter');
    }

    function vibrate(ms) {
      if (navigator.vibrate) navigator.vibrate(Math.max(ms, 25));
    }

    // Generic debounce helper — used to stop expensive re-renders (like the
    // history search filter) from firing on every single keystroke.
    function debounce(fn, delay = 250) {
      let timer = null;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    }
    const debouncedRenderHistory = debounce(() => renderHistory(), 250);

    function handleBackdropClick(event, modalId) {
      if (event.target.id === modalId) closeModal(modalId);
    }

    function triggerInputError(elementId, message) {
      vibrate(40);
      showToast(message, "error");
      const el = document.getElementById(elementId);
      if (el) {
        el.classList.add('input-error');
        setTimeout(() => el.classList.remove('input-error'), 400);
      }
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str ?? '';
      return div.innerHTML;
    }

    function emptyStateHtml(icon, title, subtitle) {
      return `
        <div class="flex flex-col items-center justify-center text-center py-10 px-6">
          <div class="relative w-16 h-16 mb-4">
            <div class="absolute inset-0 rounded-full opacity-70" style="background: radial-gradient(circle at 35% 30%, rgba(184,146,90,0.22), transparent 70%);"></div>
            <div class="relative w-16 h-16 rounded-full bg-[var(--bg-subtle-2)] flex items-center justify-center border border-[var(--border-color)]">
              <i data-lucide="${icon}" class="w-6 h-6 text-mochi"></i>
            </div>
          </div>
          <p class="font-display text-base text-main mb-1">${title}</p>
          <p class="text-xs font-semibold text-muted max-w-[220px]">${subtitle}</p>
        </div>
      `;
    }

    function escapeAttr(str) { return String(str).replace(/'/g, "\\'"); }

    function showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      const isError = type === 'error';
      const isInfo = type === 'info';

      let bgClass = isError ? 'bg-rose-500' : (isInfo ? 'bg-slate-600' : 'bg-coffee-darkest dark:bg-white');
      let textClass = (isInfo || isError) ? 'text-white' : 'text-white dark:text-coffee-darkest';
      let icon = isError ? 'alert-circle' : (isInfo ? 'loader' : 'check-circle');
      let iconSpin = isInfo ? 'animate-spin' : '';

      toast.className = `flex items-center px-4 py-3 rounded-2xl shadow-xl text-xs font-bold transform transition-all duration-500 translate-y-[-20px] opacity-0 w-full max-w-sm ${bgClass} ${textClass}`;
      toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 mr-2.5 flex-shrink-0 ${iconSpin}"></i> <span class="flex-1">${escapeHtml(message)}</span>`;

      container.appendChild(toast);
      lucide.createIcons();

      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-20px]', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
      });

      if (!isInfo) {
        setTimeout(() => {
          toast.classList.remove('translate-y-0', 'opacity-100');
          toast.classList.add('translate-y-[-20px]', 'opacity-0');
          setTimeout(() => toast.remove(), 500);
        }, 3000);
      }
      return toast;
    }

    // Toast variant with an inline action button (e.g. "Undo"). Stays up
    // longer than a normal toast since it needs to be read and acted on.
    function showActionToast(message, actionLabel, onAction, duration = 5000) {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `pointer-events-auto flex items-center px-4 py-3 rounded-2xl shadow-xl text-xs font-bold transform transition-all duration-500 translate-y-[-20px] opacity-0 w-full max-w-sm bg-coffee-darkest dark:bg-white text-white dark:text-coffee-darkest`;
      toast.innerHTML = `
        <i data-lucide="check-circle" class="w-4 h-4 mr-2.5 flex-shrink-0"></i>
        <span class="flex-1">${escapeHtml(message)}</span>
        <button type="button" class="ml-3 uppercase tracking-wider text-mochi-light dark:text-mochi-dark font-black px-2 py-1 -mr-2 tap-shrink">${escapeHtml(actionLabel)}</button>
      `;
      container.appendChild(toast);
      lucide.createIcons();

      let dismissed = false;
      const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.remove(), 500);
      };

      toast.querySelector('button').onclick = () => {
        vibrate(30);
        dismiss();
        onAction();
      };

      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-20px]', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
      });

      setTimeout(dismiss, duration);
      return toast;
    }

    // Spawns a burst of small gold/mochi confetti pieces from the center of
    // the reward overlay — randomized angle, distance, rotation and timing
    // per piece so the burst reads as organic rather than a repeating
    // pattern. Self-cleans after the last piece's animation finishes.
    function spawnRewardConfetti() {
      const field = document.getElementById('reward-confetti');
      if (!field) return;
      field.innerHTML = '';
      const colors = ['#F2D9A8', '#DFC08A', '#B8925A', '#8C6C3E', '#FFFFFF'];
      const pieceCount = 26;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < pieceCount; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece ' + (Math.random() < 0.5 ? 'is-square' : 'is-round');
        const angle = Math.random() * Math.PI * 2;
        const distance = 90 + Math.random() * 150;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance - 40; // slight upward bias before falling
        const size = 5 + Math.round(Math.random() * 6);
        piece.style.width = size + 'px';
        piece.style.height = (size * (0.6 + Math.random() * 0.8)) + 'px';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.setProperty('--tx', tx.toFixed(0) + 'px');
        piece.style.setProperty('--ty', ty.toFixed(0) + 'px');
        piece.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');
        piece.style.setProperty('--dur', (0.9 + Math.random() * 0.6).toFixed(2) + 's');
        piece.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
        frag.appendChild(piece);
      }
      field.appendChild(frag);
      setTimeout(() => { field.innerHTML = ''; }, 1700);
    }

    function showRewardAnimation(subtitleText = "Saved") {
      return new Promise(resolve => {
        const overlay = document.getElementById('reward-overlay');
        const bg = document.getElementById('reward-bg');
        const content = document.getElementById('reward-content');
        const subtitleEl = document.getElementById('reward-subtitle');

        if (subtitleEl) subtitleEl.innerText = subtitleText;

        overlay.classList.remove('hidden');
        overlay.classList.add('flex');

        requestAnimationFrame(() => {
          bg.classList.remove('opacity-0');
          bg.classList.add('opacity-100');
          content.classList.remove('scale-50', 'opacity-0');
          content.classList.add('scale-100', 'opacity-100');
          spawnRewardConfetti();
          vibrate(50);
        });

        setTimeout(() => {
          bg.classList.remove('opacity-100');
          bg.classList.add('opacity-0');
          content.classList.remove('scale-100', 'opacity-100');
          content.classList.add('scale-50', 'opacity-0');

          setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            resolve();
          }, 500);
        }, 1000);
      });
    }

    // ===== ACTIVE USER (device-local, not a login) =====
    // Persisted per device via localStorage — set once, never asked again,
    // changeable any time from Command Center. This is intentionally NOT an
    // authentication system: no password, nothing server-side. It exists so
    // the UI and Mochi AI know whose default account/enteredBy to assume.
    const ACTIVE_USER_KEY = 'mochi_active_user';

