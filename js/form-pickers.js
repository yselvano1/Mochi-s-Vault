    function populateFormDropdowns() {
      // Just resets display on load
      resetCategoryPicker();
      ['source-account', 'target-account', 'payable', 'receivable'].forEach(id => {
        const disp = document.getElementById('display-' + id);
        if (disp) { disp.innerText = "Select..."; disp.classList.add('text-faint'); }
      });
      handleTypeChange();
    }

    let categoryPickerExpanded = {};

    function resetCategoryPicker() {
      document.getElementById('form-category').value = "";
      const displayEl = document.getElementById('form-category-display');
      if (displayEl) {
        displayEl.innerText = "Select Category...";
        displayEl.classList.add('text-faint');
      }
    }

    function isCategoryMatchingType(categoryObj, transactionType) {
      if (!categoryObj || !transactionType) return true;
      const meta = getTypeMeta(transactionType);
      if (!meta.categoryType) return true;
      const catType = (categoryObj.type || '').trim();
      if (!catType) return true;
      return catType.toLowerCase() === meta.categoryType.toLowerCase();
    }

    function groupCategoryData() {
      const activeType = document.getElementById('form-type').value || 'Expense';
      const groups = {};
      const order = [];

      const allCategories = GLOBAL_DATA.categories || [];
      let filtered = allCategories.filter(c => isCategoryMatchingType(c, activeType));
      if (filtered.length === 0) filtered = allCategories;

      filtered.forEach(c => {
        const main = c.mainCategory || c.categoryName;
        if (!groups[main]) { groups[main] = { type: c.type, items: [] }; order.push(main); }
        groups[main].items.push(c);
      });
      return { groups, order };
    }

    
    function openItemPicker(type) {
      vibrate(30);
      const listEl = document.getElementById('item-picker-list');
      const titleEl = document.getElementById('item-picker-title');
      listEl.innerHTML = '';
      
      let html = '';
      
      if (type === 'source-account' || type === 'target-account') {
        titleEl.innerText = type === 'source-account' ? 'Select Source Account' : 'Select Target Account';
        
        const groups = { 'Bank Accounts': [], 'E-Wallets': [], 'Physical Cash': [], 'Credit Cards & PayLater': [] };
        
        (GLOBAL_DATA.accounts || []).forEach(acc => {
          const typeLower = (acc.accountType || '').toLowerCase();
          const meta = getAccountIconMeta(acc.accountName, acc.accountType);
          acc._meta = meta;
          
          if (meta.isLiability || typeLower.includes('credit card') || typeLower.includes('paylater')) {
            groups['Credit Cards & PayLater'].push(acc);
          } else if (typeLower.includes('e-wallet')) {
            groups['E-Wallets'].push(acc);
          } else if (typeLower.includes('cash') || typeLower.includes('tunai')) {
            groups['Physical Cash'].push(acc);
          } else {
            groups['Bank Accounts'].push(acc);
          }
        });
        
        Object.entries(groups).forEach(([gName, items]) => {
          if (items.length > 0) {
            html += `<div class="mb-2 floating-item border border-[var(--border-color)] overflow-hidden">
              <div class="px-4 py-2.5 bg-[var(--bg-subtle)] dark:bg-[var(--bg-subtle)] text-2xs font-bold text-muted uppercase tracking-wider">${gName}</div>
              <div class="bg-[var(--bg-card)]">`;
            items.forEach(acc => {
              html += `
                <div onclick="selectItemPicker('${type}', '${escapeAttr(acc.accountName)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" class="px-4 py-3 hover:bg-[var(--bg-subtle-2)]/50 dark:hover:bg-[var(--bg-subtle-2)] cursor-pointer text-main font-semibold tap-shrink transition text-4xs flex items-center border-t border-[var(--border-color)] first:border-0">
                  <div class="icon-chip-sm ${acc._meta.bg} flex items-center justify-center mr-3"><i data-lucide="${acc._meta.icon}" class="w-3.5 h-3.5"></i></div>
                  <div class="flex-1 truncate">
                    <span class="block truncate">${escapeHtml(acc.accountName)}</span>
                    <span class="text-2xs text-faint">${escapeHtml(acc.owner || 'Joint')}</span>
                  </div>
                </div>`;
            });
            html += `</div></div>`;
          }
        });
        
      } else if (type === 'payable') {
        titleEl.innerText = 'Select Payable';
        const activePayables = (GLOBAL_DATA.payables || []).filter(p => {
          const st = (p.status || '').toLowerCase().trim();
          return (st === 'active' || st === 'aktif') && Number(p.remainingAmount) > 0;
        });
        
        if (activePayables.length === 0) {
          html = `<p class="text-xs text-center text-muted py-4">No active payables found.</p>`;
        } else {
          html += `<div class="floating-item border border-[var(--border-color)] overflow-hidden bg-[var(--bg-card)]">`;
          activePayables.forEach(p => {
            html += `
              <div onclick="selectItemPicker('${type}', '${escapeAttr(p.payableName)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" class="px-4 py-3 hover:bg-[var(--bg-subtle-2)]/50 dark:hover:bg-[var(--bg-subtle-2)] cursor-pointer text-main font-semibold tap-shrink transition text-4xs flex items-center justify-between border-t border-[var(--border-color)] first:border-0">
                <div class="flex items-center space-x-3 truncate">
                  <div class="icon-chip-sm bg-[var(--chip-out-bg)] amount-out flex items-center justify-center"><i data-lucide="credit-card" class="w-3.5 h-3.5"></i></div>
                  <span class="truncate">${escapeHtml(p.payableName)}</span>
                </div>
                <span class="text-2xs font-bold text-muted">${formatRupiah(p.remainingAmount)}</span>
              </div>`;
          });
          html += `</div>`;
        }
      } else if (type === 'receivable') {
        titleEl.innerText = 'Select Receivable';
        const activeReceivables = (GLOBAL_DATA.receivables || []).filter(r => {
          const st = (r.status || '').toLowerCase().trim();
          return (st === 'active' || st === 'unsettled' || st === 'aktif' || st === 'belum lunas') && Number(r.remainingAmount) > 0;
        });
        
        if (activeReceivables.length === 0) {
          html = `<p class="text-xs text-center text-muted py-4">No unsettled receivables found.</p>`;
        } else {
          html += `<div class="floating-item border border-[var(--border-color)] overflow-hidden bg-[var(--bg-card)]">`;
          activeReceivables.forEach(r => {
            html += `
              <div onclick="selectItemPicker('${type}', '${escapeAttr(r.receivableName)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" class="px-4 py-3 hover:bg-[var(--bg-subtle-2)]/50 dark:hover:bg-[var(--bg-subtle-2)] cursor-pointer text-main font-semibold tap-shrink transition text-4xs flex items-center justify-between border-t border-[var(--border-color)] first:border-0">
                <div class="flex items-center space-x-3 truncate">
                  <div class="icon-chip-sm bg-[var(--chip-info-bg)] amount-info flex items-center justify-center"><i data-lucide="hand-coins" class="w-3.5 h-3.5"></i></div>
                  <span class="truncate">${escapeHtml(r.receivableName)}</span>
                </div>
                <span class="text-2xs font-bold text-muted">${formatRupiah(r.remainingAmount)}</span>
              </div>`;
          });
          html += `</div>`;
        }
      }
      
      listEl.innerHTML = html;
      lucide.createIcons();
      openModal('modalItemPicker');
    }

    function selectItemPicker(type, value) {
      vibrate(20);
      document.getElementById('form-' + type).value = value;
      const displayEl = document.getElementById('display-' + type);
      if (displayEl) {
        displayEl.innerText = value;
        displayEl.classList.remove('text-faint');
      }
      if (type === 'source-account' || type === 'target-account') updateFxAmountFieldVisibility();
      closeModal('modalItemPicker');
    }

    function openCategoryPicker() {
      try {
        renderCategoryPickerList();
        openModal('modalCategoryPicker');
      } catch (err) {
        showToast("Failed to open category picker", "error");
      }
    }

    function renderCategoryPickerList() {
      const { groups, order } = groupCategoryData();
      const listEl = document.getElementById('category-picker-list');
      if (!listEl) return;

      let html = "";
      order.forEach(main => {
        const group = groups[main];
        const isExpanded = !!categoryPickerExpanded[main];
        const isIncome = (group.type || '').toLowerCase() === 'income';
        const badgeColor = isIncome ? 'amount-in bg-[var(--chip-in-bg)]' : 'amount-out bg-[var(--chip-out-bg)]';
        const onlyMainItem = group.items.length === 1 && (!group.items[0].subCategory || group.items[0].subCategory === group.items[0].categoryName);

        const mMain = getCategoryIconMeta(main, group.type);

        if (onlyMainItem) {
          html += `
            <div onclick="vibrate(30); selectCategory('${escapeAttr(group.items[0].categoryName)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" class="floating-item flex justify-between items-center px-4 py-3 mb-2 cursor-pointer tap-shrink border border-[var(--border-color)] transition-colors">
              <div class="flex items-center space-x-3">
                <div class="icon-chip ${mMain.chip}"><i data-lucide="${mMain.icon}" class="w-4 h-4"></i></div>
                <span class="font-extrabold text-main text-4xs">${escapeHtml(main)}</span>
              </div>
              <span class="text-2xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${badgeColor}">${escapeHtml(group.type)}</span>
            </div>`;
        } else {
          html += `
            <div class="mb-2 floating-item border border-[var(--border-color)] overflow-hidden">
              <div onclick="vibrate(30); toggleCategoryGroup('${escapeAttr(main)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" class="flex justify-between items-center px-4 py-3 bg-[var(--bg-subtle)] dark:bg-[var(--bg-subtle)] cursor-pointer transition tap-shrink">
                <div class="flex items-center space-x-3">
                  <div class="icon-chip ${mMain.chip}"><i data-lucide="${mMain.icon}" class="w-4 h-4"></i></div>
                  <span class="font-extrabold text-main text-4xs">${escapeHtml(main)}</span>
                </div>
                <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" class="w-4 h-4 text-faint"></i>
              </div>
              <div class="${isExpanded ? '' : 'hidden'} border-t border-[var(--border-color)] bg-[var(--bg-card)]">`;

          group.items.forEach((item, idx) => {
            const label = (item.subCategory && item.subCategory !== item.categoryName) ? item.subCategory : item.categoryName;
            const borderCls = idx !== group.items.length - 1 ? 'border-b border-[var(--border-color)]' : '';
            const mSub = getCategoryIconMeta(label, group.type);

            html += `
              <div onclick="vibrate(30); selectCategory('${escapeAttr(item.categoryName)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" class="px-4 py-3 hover:bg-[var(--bg-subtle-2)]/50 dark:hover:bg-[var(--bg-subtle-2)] cursor-pointer text-main font-semibold tap-shrink transition text-4xs flex items-center justify-between ${borderCls}">
                <div class="flex items-center space-x-3">
                  <div class="icon-chip ${mSub.chip} w-7 h-7"><i data-lucide="${mSub.icon}" class="w-3.5 h-3.5"></i></div>
                  <span class="text-main">${escapeHtml(label)}</span>
                </div>
              </div>`;
          });
          html += `</div></div>`;
        }
      });

      listEl.innerHTML = html;
      lucide.createIcons();
    }

    function toggleCategoryGroup(main) {
      categoryPickerExpanded[main] = !categoryPickerExpanded[main];
      renderCategoryPickerList();
    }

    function selectCategory(categoryName) {
      document.getElementById('form-category').value = categoryName;
      const displayEl = document.getElementById('form-category-display');
      if (displayEl) {
        displayEl.innerText = categoryName;
        displayEl.classList.remove('text-faint');
      }
      closeModal('modalCategoryPicker');
    }

    function getAccountCurrency(accountName) {
      const acc = (GLOBAL_DATA.accounts || []).find(a => a.accountName === accountName);
      return acc ? (acc.currency || 'IDR') : 'IDR';
    }

    // Internal Transfer is the only place a USD account gets funded or
    // drawn down. Rupiah amount always drives the real ledger (Net Worth
    // never touches this field) — the USD figure here is purely the
    // foreign-currency unit count for that one transfer, used later to
    // show "≈ $X held" on the account card.
    // Any transaction that actually moves money into/out of a USD account
    // needs this — not just Internal Transfer. Being handed USD cash or
    // paid in USD is an Income straight into the USD account (no Rupiah
    // account on the other side); paying for something out of USD cash is
    // an Expense straight out of it. Rupiah amount always drives the real
    // ledger (Net Worth never touches this field) — for Income specifically,
    // that Rupiah figure is the fair-value book value at the rate on the
    // day you received it, same principle as recording any gift-in-kind.
    function updateFxAmountFieldVisibility() {
      const type = document.getElementById('form-type').value;
      const meta = getTypeMeta(type);
      const wrap = document.getElementById('wrap-fx-amount');
      if (!wrap) return;
      const sourceCur = meta.showSource ? getAccountCurrency(document.getElementById('form-source-account').value) : 'IDR';
      const targetCur = meta.showTarget ? getAccountCurrency(document.getElementById('form-target-account').value) : 'IDR';
      const involvesUSD = sourceCur === 'USD' || targetCur === 'USD';
      wrap.classList.toggle('hidden', !involvesUSD);

      const labelEl = document.getElementById('fx-amount-label');
      const hintEl = document.getElementById('fx-amount-hint');
      const liveRate = getPlausibleUsdIdrRate();
      if (labelEl && hintEl) {
        if (type === 'Income') {
          labelEl.textContent = 'USD Received';
          hintEl.textContent = liveRate > 0
            ? `Rupiah amount above will auto-fill using today's reference rate (${formatRupiah(Math.round(liveRate))}/USD) — adjust it if the rate you actually got was different.`
            : 'Fill in the Rupiah amount above as the fair value on the day you received it (your best estimate) — that becomes this money\'s book value going forward.';
        } else if (type === 'Expense') {
          labelEl.textContent = 'USD Spent';
          hintEl.textContent = '';
        } else {
          labelEl.textContent = 'USD Amount';
          hintEl.textContent = '';
        }
      }

      if (!involvesUSD) {
        document.getElementById('form-fx-amount').value = '';
        document.getElementById('fx-rate-display').textContent = '';
      } else {
        updateFxRateDisplay();
      }
    }

    // A USD/IDR rate outside this window means Ref_Summary's USD_IDR_Rate
    // cell is broken (wrong GOOGLEFINANCE ticker/formula, manual typo, a
    // #N/A that got overwritten with junk) — not a real market move. Better
    // to fall back to manual entry than silently multiply by garbage and
    // put a wrong book value into the ledger. Range is intentionally wide
    // so it won't need touching for years of normal rate drift.
    function getPlausibleUsdIdrRate() {
      const raw = (GLOBAL_DATA.kpi && GLOBAL_DATA.kpi['USD_IDR_Rate']) || 0;
      return (raw >= 5000 && raw <= 30000) ? raw : 0;
    }

    // Auto-suggests the Rupiah amount from a live USD/IDR rate pulled via
    // GOOGLEFINANCE (a formula cell in Ref_Summary, read like any other KPI
    // — no extra backend code needed). Only fills in when the Rupiah field
    // is still empty, so it never overwrites a real amount you typed
    // (e.g. what a money changer actually gave you). Always editable —
    // this is a starting estimate, not a locked value.
    function handleFxAmountInput() {
      const liveRate = getPlausibleUsdIdrRate();
      const usd = parseFloat(document.getElementById('form-fx-amount').value) || 0;
      const currentRupiah = Number(document.getElementById('form-amount-value').value) || 0;
      const hintEl = document.getElementById('fx-amount-hint');
      if (liveRate > 0 && usd > 0 && currentRupiah === 0) {
        const suggested = Math.round(usd * liveRate);
        document.getElementById('form-amount-display').value = new Intl.NumberFormat('id-ID').format(suggested);
        document.getElementById('form-amount-value').value = suggested;
      } else if (usd > 0 && currentRupiah === 0 && hintEl && document.getElementById('form-type').value === 'Income') {
        const rawRate = (GLOBAL_DATA.kpi && GLOBAL_DATA.kpi['USD_IDR_Rate']) || 0;
        if (rawRate > 0) {
          hintEl.textContent = `Reference rate (${formatRupiah(Math.round(rawRate))}/USD) looks off — please fill in the Rupiah amount manually to be safe.`;
        }
      }
      updateFxRateDisplay();
    }

    function updateFxRateDisplay() {
      const rupiah = Number(document.getElementById('form-amount-value').value) || 0;
      const usd = parseFloat(document.getElementById('form-fx-amount').value) || 0;
      const rateEl = document.getElementById('fx-rate-display');
      if (!rateEl) return;
      if (rupiah > 0 && usd > 0) {
        rateEl.textContent = `Implied rate: ${formatRupiah(Math.round(rupiah / usd))} / USD`;
      } else {
        rateEl.textContent = 'Enter the Rupiah amount above and the USD you actually got/gave, and the rate works itself out.';
      }
    }

  function handleTypeChange() {
  const type = document.getElementById('form-type').value;
  const meta = getTypeMeta(type);

  // 1. Logika untuk membersihkan data jika field disembunyikan (Mencegah Nilai Siluman)
  if (!meta.showSource) {
    document.getElementById('form-source-account').value = "";
    const disp = document.getElementById('display-source-account');
    if (disp) { disp.innerText = "Select Account..."; disp.classList.add('text-faint'); }
  }
  if (!meta.showTarget) {
    document.getElementById('form-target-account').value = "";
    const disp = document.getElementById('display-target-account');
    if (disp) { disp.innerText = "Select Account..."; disp.classList.add('text-faint'); }
  }
  if (!meta.showPayable) {
    document.getElementById('form-payable').value = "";
    const disp = document.getElementById('display-payable');
    if (disp) { disp.innerText = "Select Payable..."; disp.classList.add('text-faint'); }
  }
  if (!meta.showReceivable) {
    document.getElementById('form-receivable').value = "";
    const disp = document.getElementById('display-receivable');
    if (disp) { disp.innerText = "Select Receivable..."; disp.classList.add('text-faint'); }
  }

  // 2. Logika bawaan untuk menampilkan/menyembunyikan elemen form
  const show = (id, isShow) => {
    const el = document.getElementById(id);
    if (isShow) el.classList.remove('hidden'); else el.classList.add('hidden');
  };
  
  show('wrap-source-account', meta.showSource);
  show('wrap-target-account', meta.showTarget);
  show('wrap-payable', meta.showPayable);
  show('wrap-receivable', meta.showReceivable);
  updateFxAmountFieldVisibility();

  // 3. Logika bawaan untuk memvalidasi/reset kategori jika tidak cocok dengan tipe transaksi
  const selectedCategoryName = document.getElementById('form-category').value;
  if (selectedCategoryName) {
    const currentCategoryObj = (GLOBAL_DATA.categories || []).find(c => c.categoryName === selectedCategoryName);
    if (currentCategoryObj && !isCategoryMatchingType(currentCategoryObj, type)) {
      resetCategoryPicker();
    }
  }
}
