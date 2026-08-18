    function getAccountIconMeta(accountName, accountType) {
      const name = (accountName || '').toLowerCase().trim();
      const type = (accountType || '').toLowerCase().trim();

      const isTypeLiability = type.includes('credit card') || type.includes('paylater');
      const isNamePaylater = name.includes('paylater') || name.includes('spaylater') || name.includes('credit card') || name.includes(' cc');

      const isLiability = isTypeLiability || (isNamePaylater && !type.includes('e-wallet') && !type.includes('bank') && !type.includes('cash'));

      // Same 4 account-type icons shown in the "New Account" chooser popup,
      // used everywhere in the app for consistency. Green (chip-in) for
      // assets, red (chip-out) for the Credit Card/PayLater liability —
      // matching the color of the balance figures themselves.
      if (isLiability) {
        return { icon: 'credit-card', bg: 'bg-[var(--chip-out-bg)] amount-out', isLiability: true };
      }
      if (type.includes('e-wallet') || name.includes('gopay') || name.includes('ovo') || name.includes('dana')) {
        return { icon: 'smartphone', bg: 'bg-[var(--chip-in-bg)] amount-in', isLiability: false };
      }
      if (type.includes('cash') || name.includes('cash') || name.includes('tunai')) {
        return { icon: 'banknote', bg: 'bg-[var(--chip-in-bg)] amount-in', isLiability: false };
      }
      if (type.includes('investment')) {
        return { icon: 'gem', bg: 'bg-[var(--chip-in-bg)] amount-in', isLiability: false };
      }
      if (type.includes('property')) {
        return { icon: 'home', bg: 'bg-[var(--chip-in-bg)] amount-in', isLiability: false };
      }
      return { icon: 'landmark', bg: 'bg-[var(--chip-in-bg)] amount-in', isLiability: false };
    }

    const TYPE_META = {
      'Income':             { direction: 'in',      cls: 'amount-in',   prefix: '+', showSource: false, showTarget: true,  showPayable: false, showReceivable: false, categoryType: 'Income' },
      'Expense':            { direction: 'out',     cls: 'amount-out',  prefix: '-', showSource: true,  showTarget: false, showPayable: false, showReceivable: false, categoryType: 'Expense' },
      'Internal Transfer':  { direction: 'neutral', cls: 'amount-info', prefix: '',  showSource: true,  showTarget: true,  showPayable: false, showReceivable: false, categoryType: 'Transfer' },
      'External Transfer':  { direction: 'out',     cls: 'amount-out',  prefix: '-', showSource: true,  showTarget: false, showPayable: false, showReceivable: false, categoryType: 'Expense' },
      'Give Receivable':    { direction: 'neutral', cls: 'amount-info', prefix: '',  showSource: true,  showTarget: false, showPayable: false, showReceivable: true,  categoryType: 'Receivable' },
      'Receive Receivable': { direction: 'in',      cls: 'amount-in',   prefix: '+', showSource: false, showTarget: true,  showPayable: false, showReceivable: true,  categoryType: 'Receivable' },
      'Receive Payable':    { direction: 'in',      cls: 'amount-in',   prefix: '+', showSource: false, showTarget: true,  showPayable: true,  showReceivable: false, categoryType: 'Payable' },
      'Pay Installment':    { direction: 'out',     cls: 'amount-out',  prefix: '-', showSource: true,  showTarget: false, showPayable: true,  showReceivable: false, categoryType: 'Payable' },
      'Write-Off Receivable': { direction: 'neutral', cls: 'amount-slate', prefix: '', showSource: false, showTarget: false, showPayable: false, showReceivable: true,  categoryType: 'Receivable' },
      'Debt Forgiven':        { direction: 'neutral', cls: 'amount-slate', prefix: '', showSource: false, showTarget: false, showPayable: true,  showReceivable: false, categoryType: 'Payable' }
    };

    function getTypeMeta(type) {
      return TYPE_META[type] || { direction: 'out', cls: 'amount-out', prefix: '-', showSource: true, showTarget: false, showPayable: false, showReceivable: false, categoryType: null };
    }

    function getCategoryIconMeta(categoryName, type) {
      const k = (categoryName || '').toLowerCase().trim();

      if (type === 'Receive Receivable') return { icon: 'hand-coins', chip: 'chip-pemasukan' };
      if (type === 'Receive Payable') return { icon: 'piggy-bank', chip: 'chip-pemasukan' };
      if (type === 'Give Receivable') return { icon: 'send', chip: 'chip-info' };
      if (type === 'Pay Installment') return { icon: 'credit-card', chip: 'chip-pengeluaran' };
      if (type === 'Write-Off Receivable') return { icon: 'file-x', chip: 'chip-slate' };
      if (type === 'Debt Forgiven') return { icon: 'file-check', chip: 'chip-slate' };
      if (type === 'External Transfer') return { icon: 'arrow-up-right', chip: 'chip-pengeluaran' };
      if (type === 'Internal Transfer') return { icon: 'arrow-right-left', chip: 'chip-info' };

      if (k.includes('salary') || k.includes('gaji')) return { icon: 'banknote', chip: 'chip-pemasukan' };
      if (k.includes('bonus') || k.includes('tunjangan')) return { icon: 'gift', chip: 'chip-pemasukan' };
      if (k.includes('freelance') || k.includes('proyek')) return { icon: 'briefcase', chip: 'chip-pemasukan' };
      if (k.includes('investment') || k.includes('investasi')) return { icon: 'trending-up', chip: 'chip-pemasukan' };

      if (k.includes('checkup') || k.includes('dokter')) return { icon: 'stethoscope', chip: 'chip-pengeluaran' };
      if (k.includes('medicine') || k.includes('vitamin') || k.includes('obat')) return { icon: 'pill', chip: 'chip-pengeluaran' };
      if (k.includes('sport') || k.includes('fitness') || k.includes('gym')) return { icon: 'dumbbell', chip: 'chip-pengeluaran' };
      if (k.includes('healthcare') || k.includes('health')) return { icon: 'heart-pulse', chip: 'chip-pengeluaran' };

      if (k.includes('fuel') || k.includes('bensin')) return { icon: 'fuel', chip: 'chip-pengeluaran' };
      if (k.includes('flight') || k.includes('tiket pesawat')) return { icon: 'plane', chip: 'chip-pengeluaran' };
      if (k.includes('train') || k.includes('kereta')) return { icon: 'train-front', chip: 'chip-pengeluaran' };
      if (k.includes('grab') || k.includes('gocar') || k.includes('ojek')) return { icon: 'car-front', chip: 'chip-pengeluaran' };
      if (k.includes('vehicle maintenance') || k.includes('servis kendaraan')) return { icon: 'wrench', chip: 'chip-pengeluaran' };
      if (k.includes('transportation') || k.includes('transport')) return { icon: 'car', chip: 'chip-pengeluaran' };

      if (k.includes('electricity') || k.includes('listrik')) return { icon: 'zap', chip: 'chip-pengeluaran' };
      if (k.includes('water') || k.includes('air') || k.includes('pdam')) return { icon: 'droplet', chip: 'chip-pengeluaran' };
      if (k.includes('internet') || k.includes('wifi')) return { icon: 'wifi', chip: 'chip-pengeluaran' };
      if (k.includes('phone') || k.includes('pulsa')) return { icon: 'smartphone', chip: 'chip-pengeluaran' };
      if (k.includes('gas')) return { icon: 'flame', chip: 'chip-pengeluaran' };
      if (k.includes('tax') || k.includes('pajak')) return { icon: 'receipt', chip: 'chip-pengeluaran' };
      if (k.includes('bills & utilities') || k.includes('bills') || k.includes('utility')) return { icon: 'file-text', chip: 'chip-pengeluaran' };

      if (k.includes('houseware') || k.includes('perabot')) return { icon: 'armchair', chip: 'chip-pengeluaran' };
      if (k.includes('home maintenance') || k.includes('servis rumah')) return { icon: 'hammer', chip: 'chip-pengeluaran' };
      if (k.includes('home services') || k.includes('art')) return { icon: 'brush', chip: 'chip-pengeluaran' };
      if (k.includes('pet') || k.includes('anabul') || k.includes('kucing')) return { icon: 'paw-print', chip: 'chip-pengeluaran' };
      if (k.includes('household')) return { icon: 'home', chip: 'chip-pengeluaran' };

      if (k.includes('education') || k.includes('pendidikan')) return { icon: 'graduation-cap', chip: 'chip-pengeluaran' };
      if (k.includes('entertainment') || k.includes('hiburan')) return { icon: 'gamepad-2', chip: 'chip-pengeluaran' };
      if (k.includes('gifts & donations') || k.includes('gift') || k.includes('donation')) return { icon: 'heart', chip: 'chip-pengeluaran' };

      if (k.includes('skincare') || k.includes('makeup')) return { icon: 'sparkles', chip: 'chip-pengeluaran' };
      if (k.includes('treatment') || k.includes('salon')) return { icon: 'scissors', chip: 'chip-pengeluaran' };
      if (k.includes('personal care')) return { icon: 'sparkles', chip: 'chip-pengeluaran' };

      if (k.includes('snack') || k.includes('drink') || k.includes('minuman')) return { icon: 'cookie', chip: 'chip-pengeluaran' };
      if (k.includes('groceries') || k.includes('belanja dapur')) return { icon: 'shopping-basket', chip: 'chip-pengeluaran' };
      if (k.includes('food') || k.includes('dining') || k.includes('makan')) return { icon: 'utensils', chip: 'chip-pengeluaran' };

      if (type === 'Income') return { icon: 'trending-up', chip: 'chip-pemasukan' };
      return { icon: 'arrow-up-right', chip: 'chip-pengeluaran' };
    }

    function iconChipHtml(type, category = '') {
      const m = getCategoryIconMeta(category, type);
      return `<div class="icon-chip ${m.chip}"><i data-lucide="${m.icon}" class="w-4 h-4"></i></div>`;
    }

    const TRANSACTION_TYPE_OPTIONS = [
      { value: 'Expense', label: 'Expense (-)', icon: 'arrow-up-right', chip: 'chip-pengeluaran', badge: '🔴' },
      { value: 'Income', label: 'Income (+)', icon: 'trending-up', chip: 'chip-pemasukan', badge: '🟢' },
      { value: 'Internal Transfer', label: 'Internal Transfer', icon: 'arrow-right-left', chip: 'chip-info', badge: '🔵' },
      { value: 'External Transfer', label: 'External Transfer (-)', icon: 'arrow-up-right', chip: 'chip-pengeluaran', badge: '🔴' },
      { value: 'Give Receivable', label: 'Lend Money', icon: 'send', chip: 'chip-info', badge: '🔵' },
      { value: 'Receive Receivable', label: 'Collect Payment (+)', icon: 'hand-coins', chip: 'chip-pemasukan', badge: '🟢' },
      { value: 'Receive Payable', label: 'Borrow Money (+)', icon: 'piggy-bank', chip: 'chip-pemasukan', badge: '🟢' },
      { value: 'Pay Installment', label: 'Pay Debt (-)', icon: 'credit-card', chip: 'chip-pengeluaran', badge: '🔴' },
      { value: 'Write-Off Receivable', label: 'Write-Off (Bad Debt)', icon: 'file-x', chip: 'chip-slate', badge: '⚪' },
      { value: 'Debt Forgiven', label: 'Debt Forgiven', icon: 'file-check', chip: 'chip-slate', badge: '⚪' }
    ];

    function openTypePicker() {
      renderTypePickerList();
      openModal('modalTypePicker');
    }

    function renderTypePickerList() {
      const container = document.getElementById('type-picker-list');
      const currentVal = document.getElementById('form-type').value || 'Expense';

      container.innerHTML = TRANSACTION_TYPE_OPTIONS.map(opt => {
        const isSelected = opt.value === currentVal;
        const borderCls = isSelected ? 'border-mochi ring-2 ring-mochi/20' : 'border-[var(--border-color)]';
        return `
          <div onclick="vibrate(30); selectType('${opt.value}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" class="floating-item flex justify-between items-center px-4 py-3 cursor-pointer tap-shrink border ${borderCls} transition-all">
            <div class="flex items-center space-x-3">
              <div class="icon-chip ${opt.chip}"><i data-lucide="${opt.icon}" class="w-4 h-4"></i></div>
              <span class="font-extrabold text-main text-4xs">${opt.label}</span>
            </div>
            <span class="text-xs">${opt.badge}</span>
          </div>
        `;
      }).join('');
      lucide.createIcons();
    }

    function selectType(value) {
      document.getElementById('form-type').value = value;
      updateTypeDisplay(value);
      handleTypeChange();
      closeModal('modalTypePicker');
    }

    function findTypeOption(val) {
      return TRANSACTION_TYPE_OPTIONS.find(o => o.value === val) || TRANSACTION_TYPE_OPTIONS[0];
    }

    function updateTypeDisplay(value) {
      const opt = findTypeOption(value);
      const displayEl = document.getElementById('form-type-display');
      if (displayEl) {
        displayEl.innerHTML = `
          <div class="icon-chip ${opt.chip} w-6 h-6 rounded-md"><i data-lucide="${opt.icon}" class="w-3.5 h-3.5"></i></div>
          <span class="font-extrabold text-main text-xs">${opt.label}</span>
        `;
        lucide.createIcons();
      }
    }

    function pulseVaultSheen() {
      const card = document.getElementById('vault-card');
      if (!card) return;
      card.classList.remove('replay-sheen');
      void card.offsetWidth;
      card.classList.add('replay-sheen');
    }

    function initVaultTilt() {
      const card = document.getElementById('vault-card');
      if (!card || card.dataset.tiltBound) return;
      card.dataset.tiltBound = '1';
      const MAX_TILT = 7;
      let resetTimer = null;

      function applyTilt(clientX, clientY) {
        const rect = card.getBoundingClientRect();
        const px = (clientX - rect.left) / rect.width;
        const py = (clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * MAX_TILT * 2;
        const rotateX = (0.5 - py) * MAX_TILT * 2;
        card.classList.add('tilting');
        card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01,1.01,1.01)`;
        card.style.boxShadow = `${(-rotateY * 1.6).toFixed(1)}px ${(rotateX * 1.6 + 14).toFixed(1)}px 34px -10px rgba(16,13,11,0.45)`;
      }

      function resetTilt() {
        card.classList.remove('tilting');
        card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
        card.style.boxShadow = '';
      }

      card.addEventListener('touchmove', (e) => {
        if (!e.touches || !e.touches[0]) return;
        applyTilt(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });

      card.addEventListener('touchend', () => { clearTimeout(resetTimer); resetTimer = setTimeout(resetTilt, 60); }, { passive: true });
      card.addEventListener('touchcancel', resetTilt, { passive: true });

      card.addEventListener('mousemove', (e) => applyTilt(e.clientX, e.clientY));
      card.addEventListener('mouseleave', resetTilt);
    }

    function animateNumber(el, targetValue, duration = 700) {
      const start = 0;
      const startTime = performance.now();
      function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (targetValue - start) * eased);

        if (el.id === 'kpi-networth' || el.id === 'kpi-disposable') updateScalingText(el, current);
        else el.innerText = formatRupiah(current);

        if (progress < 1) requestAnimationFrame(tick);
        else {
          if (el.id === 'kpi-networth' || el.id === 'kpi-disposable') updateScalingText(el, targetValue);
          else el.innerText = formatRupiah(targetValue);
        }
      }
      requestAnimationFrame(tick);
    }

    // ===== Global screen-edge glow =====
    // One shared ambient layer for every "Mochi AI is active" moment —
    // opening the chat/voice sheet or scanning a receipt. `hold` keeps
    // it on until stopEdgeGlow() is called (used while a sheet is open /
    // actively listening); without `hold` it pulses briefly then fades
    // on its own. Deliberately NOT used by the generic reward overlay —
    // glow is reserved for Mochi AI activity specifically.
    //
    // The SVG's viewBox/rect/gradient coordinates are set here in real
    // screen pixels (instead of a stretched 0-100 box) so the layered
    // strokes stay crisp and even on every edge regardless of aspect
    // ratio — this is what actually made the old version look like a
    // faint uneven line.
    function initEdgeGlow() {
      const svg = document.getElementById('global-edge-glow');
      if (!svg) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.querySelectorAll('rect').forEach(r => {
        r.setAttribute('x', 0.5);
        r.setAttribute('y', 0.5);
        r.setAttribute('width', w - 1);
        r.setAttribute('height', h - 1);
      });
      const grad = document.getElementById('edgeGlowGrad');
      if (grad) {
        grad.setAttribute('x1', 0); grad.setAttribute('y1', 0);
        grad.setAttribute('x2', w); grad.setAttribute('y2', h);
        const spin = document.getElementById('edgeGlowGradSpin');
        if (spin) {
          const cx = w / 2, cy = h / 2;
          spin.setAttribute('from', `0 ${cx} ${cy}`);
          spin.setAttribute('to', `360 ${cx} ${cy}`);
        }
      }
    }
    window.addEventListener('resize', initEdgeGlow);

    let edgeGlowTimer = null;
    function triggerEdgeGlow(duration = 1400) {
      const el = document.getElementById('global-edge-glow');
      if (!el) return;
      clearTimeout(edgeGlowTimer);
      el.classList.add('active');
      edgeGlowTimer = setTimeout(() => el.classList.remove('active'), duration);
    }
    function holdEdgeGlow() {
      const el = document.getElementById('global-edge-glow');
      if (!el) return;
      clearTimeout(edgeGlowTimer);
      el.classList.add('active');
    }
    function stopEdgeGlow() {
      const el = document.getElementById('global-edge-glow');
      if (!el) return;
      clearTimeout(edgeGlowTimer);
      el.classList.remove('active');
    }

    let mochiAIMenuOpen = false;

