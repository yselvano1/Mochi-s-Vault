    function renderWallets() {
      const lists = [
        'list-bank-operational', 'list-bank-savings', 
        'list-ewallet-operational', 'list-ewallet-savings',
        'list-cash-operational', 'list-cash-savings',
        'list-cc-operational', 'list-investment-operational', 'list-property-operational'
      ];
      lists.forEach(id => document.getElementById(id).innerHTML = "");

      if (!GLOBAL_DATA.accounts || GLOBAL_DATA.accounts.length === 0) {
        document.getElementById('list-bank-operational').innerHTML = emptyStateHtml('wallet', "No wallets in the vault yet", "Add your first account and Mochi will start tracking every rupiah that moves through it.");
        return;
      }

      let counts = { bank_op: 0, bank_sv: 0, ewallet_op: 0, ewallet_sv: 0, cash_op: 0, cash_sv: 0 };

      GLOBAL_DATA.accounts.forEach((acc, i) => {
        const meta = getAccountIconMeta(acc.accountName, acc.accountType);
        const balanceColorClass = meta.isLiability ? "amount-out" : "amount-in";
        const badgeBgClass = meta.isLiability ? "bg-[var(--chip-out-bg)] amount-out" : "bg-[var(--chip-in-bg)] amount-in";
        const statusLabel = "RUNNING BALANCE";
        const ownerLabel = acc.owner ? escapeHtml(acc.owner) : 'Yosa & Fani';
        
        const typeLower = (acc.accountType || '').toLowerCase();
        const funcLower = (acc.functionCategory || '').toLowerCase();
        const isOp = funcLower.includes('daily') || funcLower.includes('operation');

        const nameHasOwner = acc.owner && acc.accountName.toLowerCase().includes(acc.owner.toLowerCase());
        const badgeText = nameHasOwner ? escapeHtml(acc.accountType) : `${escapeHtml(acc.accountType)} • ${ownerLabel}`;
        const isUSD = (acc.currency || 'IDR') === 'USD';
        const fxLineHtml = isUSD
          ? `<span class="text-3xs text-faint font-bold block mt-0.5">≈ ${formatUSD(acc.fxBalance)} <span class="opacity-70">(est.)</span></span>`
          : '';
        const usdBadgeHtml = isUSD
          ? `<span class="text-2xs font-extrabold px-1.5 py-0.5 rounded-full uppercase bg-[var(--chip-in-bg)] amount-in">USD</span>`
          : '';

        const div = document.createElement('div');
        div.className = "floating-item p-5 cursor-pointer card-hover transition stagger-item flex flex-col justify-between";
        div.style.animationDelay = `${(i % 10) * 0.05}s`;
        
        div.innerHTML = `
          <div class="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-color)]">
            <div class="flex items-center space-x-3 min-w-0 flex-1 pr-2" onclick="vibrate(30); showAccountHistory('${escapeAttr(acc.accountName)}')">
              <div class="icon-chip ${meta.bg} flex items-center justify-center flex-shrink-0 shadow-sm">
                <i data-lucide="${meta.icon}" class="w-4.5 h-4.5"></i>
              </div>
              <div class="truncate">
                <h4 class="text-4xs font-extrabold text-main leading-tight truncate pr-1">${escapeHtml(acc.accountName)}</h4>
                <div class="flex items-center space-x-1.5 mt-1">
                  <span class="text-2xs font-extrabold px-2 py-0.5 rounded-full uppercase ${badgeBgClass}">${badgeText}</span>
                  ${usdBadgeHtml}
                </div>
              </div>
            </div>

            <div class="flex items-center space-x-1 flex-shrink-0">
              <button type="button" onclick="vibrate(30); event.stopPropagation(); openEditAccountModal('${escapeAttr(acc.accountName)}')" class="p-1.5 text-faint hover:text-main transition-colors rounded-lg hover:bg-[var(--bg-subtle-2)]">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" onclick="vibrate(30); event.stopPropagation(); promptDeleteAccount('${escapeAttr(acc.accountName)}')" class="p-1.5 text-faint hover:text-rose-500 transition-colors rounded-lg hover:bg-[var(--bg-subtle-2)]">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <div onclick="vibrate(30); showAccountHistory('${escapeAttr(acc.accountName)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0">
            <span class="text-2xs text-muted font-bold uppercase tracking-wider block mb-1">${statusLabel}</span>
            <span class="text-lg font-black ${balanceColorClass} block leading-none tracking-tight">${formatRupiah(acc.runningBalance)}</span>
            ${fxLineHtml}
          </div>
        `;

        if (meta.isLiability || typeLower.includes('credit card') || typeLower.includes('paylater')) {
          document.getElementById('list-cc-operational').appendChild(div);
        } else if (typeLower.includes('investment')) {
          document.getElementById('list-investment-operational').appendChild(div);
        } else if (typeLower.includes('property')) {
          document.getElementById('list-property-operational').appendChild(div);
        } else if (typeLower.includes('e-wallet')) {
          if (isOp) { document.getElementById('list-ewallet-operational').appendChild(div); counts.ewallet_op++; }
          else { document.getElementById('list-ewallet-savings').appendChild(div); counts.ewallet_sv++; }
        } else if (typeLower.includes('cash') || typeLower.includes('tunai')) {
          if (isOp) { document.getElementById('list-cash-operational').appendChild(div); counts.cash_op++; }
          else { document.getElementById('list-cash-savings').appendChild(div); counts.cash_sv++; }
        } else {
          if (isOp) { document.getElementById('list-bank-operational').appendChild(div); counts.bank_op++; }
          else { document.getElementById('list-bank-savings').appendChild(div); counts.bank_sv++; }
        }
      });

      // Manage Dividers and Group Visibility
      const toggleDivider = (id, countOp, countSv) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', !(countOp > 0 && countSv > 0));
      };
      toggleDivider('divider-bank', counts.bank_op, counts.bank_sv);
      toggleDivider('divider-ewallet', counts.ewallet_op, counts.ewallet_sv);
      toggleDivider('divider-cash', counts.cash_op, counts.cash_sv);
      
      const hideGroup = (id, totalCount) => {
        document.getElementById(id).classList.toggle('hidden', totalCount === 0);
      };
      hideGroup('wallet-group-bank', counts.bank_op + counts.bank_sv);
      hideGroup('wallet-group-ewallet', counts.ewallet_op + counts.ewallet_sv);
      hideGroup('wallet-group-cash', counts.cash_op + counts.cash_sv);
      hideGroup('wallet-group-cc', document.getElementById('list-cc-operational').children.length);
      hideGroup('wallet-group-investment', document.getElementById('list-investment-operational').children.length);
      hideGroup('wallet-group-property', document.getElementById('list-property-operational').children.length);

      renderTreasuryHoldings();

      lucide.createIcons();
    }

    function openEditAccountModal(accountName) {
      const acc = (GLOBAL_DATA.accounts || []).find(a => a.accountName === accountName);
      if (!acc) return;

      openMasterModal('account', true);

      document.getElementById('master-old-name').value = acc.accountName || '';
      document.getElementById('master-name').value = acc.accountName || '';
      document.getElementById('master-account-type').value = acc.accountType || 'Bank Account';
      document.getElementById('master-function-category').value = acc.functionCategory || 'Daily Operations';
      document.getElementById('master-account-owner').value = acc.owner || 'Yosa & Fani';
      document.getElementById('master-initial-balance').value = acc.initialBalance || 0;
      document.getElementById('master-account-currency').value = acc.currency || 'IDR';
      document.getElementById('master-initial-fx-balance').value = acc.fxBalance || 0;
      toggleAccountCurrencyFields();
    }

    function promptDeleteAccount(accountName) {
      vibrate(40);
      const titleEl = document.getElementById('delete-modal-title');
      const descEl = document.getElementById('delete-modal-desc');
      if (titleEl) titleEl.innerText = `Delete "${accountName}"?`;
      if (descEl) descEl.innerText = "Removing this account will hide it from your Vault. Transaction history associated with this account will be preserved.";

      document.getElementById('btn-confirm-delete').onclick = async () => {
        vibrate(30);
        closeModal('modalDelete');
        showToast("Account deleted!");
        
        postApi('deleteMasterData', { accountName }, { type: 'account' })
          .then(result => {
            if (result && result.data) {
              GLOBAL_DATA = result.data;
              localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
              renderAllViews();
            }
          })
          .catch(err => {
            showToast("Couldn't delete account on server!", "error");
            loadAppData(true);
          });
      };

      openModal('modalDelete');
    }

    function openTreasuryHoldingModal() {
      vibrate(30);
      openMasterModal('treasury', false);
    }

    function openEditTreasuryModal(assetName) {
      const t = (GLOBAL_DATA.treasury || []).find(x => x.assetName === assetName);
      if (!t) return;

      openMasterModal('treasury', true);

      document.getElementById('master-old-name').value = t.assetName || '';
      document.getElementById('master-name').value = t.assetName || '';
      document.getElementById('master-treasury-account').value = t.linkedAccount || '';
      document.getElementById('master-treasury-quantity').value = t.quantity || 0;
      document.getElementById('master-treasury-unit').value = t.unit || '';
      document.getElementById('master-treasury-source').value = t.priceSource || 'Manual';
      document.getElementById('master-treasury-ticker').value = t.ticker || '';
      document.getElementById('master-treasury-manual-price').value = t.manualPrice ? new Intl.NumberFormat('id-ID').format(t.manualPrice) : '';
      document.getElementById('master-treasury-notes').value = t.notes || '';
      toggleTreasuryPriceFields();
    }

    function promptDeleteTreasury(assetName) {
      vibrate(40);
      const titleEl = document.getElementById('delete-modal-title');
      const descEl = document.getElementById('delete-modal-desc');
      if (titleEl) titleEl.innerText = `Stop tracking "${assetName}"?`;
      if (descEl) descEl.innerText = "This only removes the quantity/price tracking — the linked account and its book value/transaction history stay exactly as they are.";

      document.getElementById('btn-confirm-delete').onclick = async () => {
        vibrate(30);
        closeModal('modalDelete');
        showToast("Holding removed!");

        postApi('deleteMasterData', { assetName }, { type: 'treasury' })
          .then(result => {
            if (result && result.data) {
              GLOBAL_DATA = result.data;
              localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
              renderAllViews();
            }
          })
          .catch(err => {
            showToast("Couldn't remove holding on server!", "error");
            loadAppData(true);
          });
      };

      openModal('modalDelete');
    }

    function renderTreasuryHoldings() {
      const listEl = document.getElementById('list-treasury-holdings');
      const dashListEl = document.getElementById('dashboard-treasury-list');
      const dashWidget = document.getElementById('dashboard-treasury-widget');
      const holdings = GLOBAL_DATA.treasury || [];

      if (!listEl || !dashListEl || !dashWidget) return;

      if (holdings.length === 0) {
        listEl.innerHTML = emptyStateHtml('gem', "No holdings tracked yet", "Add an Investment/Property account, then link it here to see its estimated market value.");
        dashWidget.classList.add('hidden');
        lucide.createIcons();
        return;
      }

      dashWidget.classList.remove('hidden');
      listEl.innerHTML = "";
      dashListEl.innerHTML = "";

      holdings.forEach(t => {
        const isGain = t.unrealizedGainLoss >= 0;
        const gainCls = isGain ? 'amount-in' : 'amount-out';
        const gainBg = isGain ? 'bg-[var(--chip-in-bg)]' : 'bg-[var(--chip-out-bg)]';
        const gainSign = isGain ? '+' : '';
        const pctText = `${gainSign}${t.unrealizedGainLossPct.toFixed(1)}%`;
        const lastUpdatedText = t.lastUpdated ? formatDate(t.lastUpdated) : '-';
        const refreshBtnHtml = t.priceSource === 'Manual'
          ? `<button type="button" onclick="vibrate(30); event.stopPropagation(); openEditTreasuryModal('${escapeAttr(t.assetName)}')" class="text-2xs font-extrabold text-mochi dark:text-mochi-light hover:underline uppercase flex items-center"><i data-lucide="refresh-cw" class="w-3 h-3 mr-1"></i>Refresh</button>`
          : `<span class="text-2xs text-muted font-semibold flex items-center"><i data-lucide="zap" class="w-3 h-3 mr-1"></i>Live (Google Finance)</span>`;

        // Full card — Vault → Investments tab
        const card = document.createElement('div');
        card.className = "floating-item p-4";
        card.innerHTML = `
          <div class="flex items-start justify-between mb-2">
            <div class="min-w-0 pr-2">
              <h4 class="text-4xs font-extrabold text-main leading-tight truncate">${escapeHtml(t.assetName)}</h4>
              <p class="text-2xs text-muted font-semibold mt-0.5">${escapeHtml(t.quantity)} ${escapeHtml(t.unit)} • linked to ${escapeHtml(t.linkedAccount)}</p>
            </div>
            <div class="flex items-center space-x-1 flex-shrink-0">
              <button type="button" onclick="vibrate(30); openEditTreasuryModal('${escapeAttr(t.assetName)}')" class="p-1.5 text-faint hover:text-main transition-colors rounded-lg hover:bg-[var(--bg-subtle-2)]"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
              <button type="button" onclick="vibrate(30); promptDeleteTreasury('${escapeAttr(t.assetName)}')" class="p-1.5 text-faint hover:text-rose-500 transition-colors rounded-lg hover:bg-[var(--bg-subtle-2)]"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </div>
          </div>
          <div class="flex items-end justify-between mt-3">
            <div>
              <span class="text-2xs text-muted font-bold uppercase tracking-wider block">Book Value</span>
              <span class="text-4xs font-extrabold text-main">${formatRupiah(t.bookValue)}</span>
            </div>
            <div class="text-right">
              <span class="text-2xs text-muted font-bold uppercase tracking-wider block">Est. Market Value</span>
              <span class="text-4xs font-extrabold text-main">${formatRupiah(t.marketValue)}</span>
            </div>
          </div>
          <div class="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-color)]">
            <span class="text-2xs font-extrabold px-2 py-0.5 rounded-full ${gainBg} ${gainCls}">${gainSign}${formatRupiah(t.unrealizedGainLoss)} (${pctText})</span>
            ${refreshBtnHtml}
          </div>
          <div class="flex items-center space-x-2 mt-3">
            <button type="button" onclick="vibrate(30); openBuyHoldingModal('${escapeAttr(t.assetName)}')" class="flex-1 py-2 text-3xs font-extrabold rounded-lg bg-[var(--chip-in-bg)] amount-in tap-shrink flex items-center justify-center"><i data-lucide="plus" class="w-3 h-3 mr-1"></i>Buy More</button>
            <button type="button" onclick="vibrate(30); openSellHoldingModal('${escapeAttr(t.assetName)}')" class="flex-1 py-2 text-3xs font-extrabold rounded-lg bg-[var(--chip-out-bg)] amount-out tap-shrink flex items-center justify-center"><i data-lucide="minus" class="w-3 h-3 mr-1"></i>Sell</button>
          </div>
          <p class="text-2xs text-faint font-semibold mt-2">Last price update: ${lastUpdatedText} — estimated, not counted in Net Worth</p>
        `;
        listEl.appendChild(card);

        // Compact row — Dashboard widget
        const row = document.createElement('div');
        row.className = "flex items-center justify-between py-2 cursor-pointer";
        row.onclick = () => { vibrate(30); switchTab('wallets'); switchWalletsView('investments'); };
        row.innerHTML = `
          <div class="min-w-0 pr-2">
            <span class="text-xs font-bold text-main block truncate">${escapeHtml(t.assetName)}</span>
            <span class="text-2xs text-muted font-semibold">${formatRupiah(t.marketValue)}</span>
          </div>
          <span class="text-3xs font-extrabold px-2 py-0.5 rounded-full ${gainBg} ${gainCls} flex-shrink-0">${gainSign}${pctText}</span>
        `;
        dashListEl.appendChild(row);
      });

      lucide.createIcons();
    }

    function cashLikeAccountOptions() {
      return (GLOBAL_DATA.accounts || [])
        .filter(a => {
          const t = (a.accountType || '').toLowerCase();
          return !t.includes('investment') && !t.includes('property');
        })
        .map(a => `<option value="${escapeAttr(a.accountName)}">${escapeHtml(a.accountName)} (${formatRupiah(a.runningBalance)})</option>`)
        .join('');
    }

    function openBuyHoldingModal(assetName) {
      document.getElementById('buy-holding-asset').value = assetName;
      document.getElementById('buy-holding-asset-name').textContent = assetName;
      document.getElementById('buy-holding-quantity').value = '';
      document.getElementById('buy-holding-cost').value = '';
      document.getElementById('buy-holding-payment-account').innerHTML = cashLikeAccountOptions();
      updateBuyHoldingPreview();
      openModal('modalBuyHolding');
    }

    function updateBuyHoldingPreview() {
      const qty = parseFloat(document.getElementById('buy-holding-quantity').value) || 0;
      const cost = Number(document.getElementById('buy-holding-cost').dataset.rawValue) || 0;
      const previewEl = document.getElementById('buy-holding-preview');
      if (qty > 0 && cost > 0) {
        previewEl.textContent = `≈ ${formatRupiah(Math.round(cost / qty))} per unit — creates a new lot.`;
      } else {
        previewEl.textContent = 'Enter quantity and total paid to see the cost per unit.';
      }
    }

    function submitBuyHolding() {
      const assetName = document.getElementById('buy-holding-asset').value;
      const quantity = parseFloat(document.getElementById('buy-holding-quantity').value) || 0;
      const totalCost = Number(document.getElementById('buy-holding-cost').dataset.rawValue) || 0;
      const paymentAccount = document.getElementById('buy-holding-payment-account').value;
      if (quantity <= 0) { triggerInputError('buy-holding-quantity', 'Enter how much you bought.'); return; }
      if (totalCost <= 0) { triggerInputError('buy-holding-cost', 'Enter how much you paid.'); return; }
      if (!paymentAccount) { showToast("Pick which account paid for it.", "error"); return; }

      vibrate(30);
      closeModal('modalBuyHolding');
      showToast("Recording purchase...", "info");

      postApi('buyTreasuryLot', { assetName, quantity, totalCost, paymentAccount, date: todayDateStringLocal() })
        .then(result => {
          if (result && result.data) {
            GLOBAL_DATA = result.data;
            localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
            renderAllViews();
            showRewardAnimation("Purchase Recorded");
          }
        })
        .catch(err => {
          showToast(err.message || "Couldn't record the purchase!", "error");
          loadAppData(true);
        });
    }

    function openSellHoldingModal(assetName) {
      document.getElementById('sell-holding-asset').value = assetName;
      document.getElementById('sell-holding-asset-name').textContent = assetName;
      document.getElementById('sell-holding-quantity').value = '';
      document.getElementById('sell-holding-proceeds').value = '';
      document.getElementById('sell-holding-target-account').innerHTML = cashLikeAccountOptions();

      const t = (GLOBAL_DATA.treasury || []).find(x => x.assetName === assetName);
      const availableEl = document.getElementById('sell-holding-available');
      if (availableEl) availableEl.textContent = t ? `You have ${t.quantity} ${t.unit} available.` : '';

      updateSellHoldingPreview();
      openModal('modalSellHolding');
    }

    // Simulates the exact same FIFO consumption the backend does (oldest
    // open lot first), purely from GLOBAL_DATA.lots — so the person sees
    // the real book value / gain-loss split before committing to anything.
    function simulateFifoSale(assetName, sellQuantity) {
      const lots = (GLOBAL_DATA.lots || [])
        .filter(l => l.assetName === assetName && l.remainingQuantity > 0)
        .sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));

      const totalAvailable = lots.reduce((sum, l) => sum + l.remainingQuantity, 0);
      let remaining = sellQuantity;
      let costBasis = 0;
      const consumedLots = [];
      for (const lot of lots) {
        if (remaining <= 0) break;
        const consumeQty = Math.min(lot.remainingQuantity, remaining);
        costBasis += consumeQty * lot.costPerUnit;
        consumedLots.push({ date: lot.purchaseDate, quantity: consumeQty, costPerUnit: lot.costPerUnit });
        remaining -= consumeQty;
      }
      return { totalAvailable, costBasis, sufficient: remaining <= 0.0000001, consumedLots };
    }

    function updateSellHoldingPreview() {
      const assetName = document.getElementById('sell-holding-asset').value;
      const qty = parseFloat(document.getElementById('sell-holding-quantity').value) || 0;
      const proceeds = Number(document.getElementById('sell-holding-proceeds').dataset.rawValue) || 0;
      const previewEl = document.getElementById('sell-holding-preview');
      if (!previewEl) return;

      if (qty <= 0) {
        previewEl.className = "text-3xs font-bold rounded-xl p-3 space-y-1 bg-[var(--bg-subtle-2)] text-muted";
        previewEl.innerHTML = "Enter a quantity to see which lots this would sell from.";
        return;
      }

      const sim = simulateFifoSale(assetName, qty);
      if (!sim.sufficient) {
        previewEl.className = "text-3xs font-bold rounded-xl p-3 space-y-1 bg-[var(--chip-out-bg)] amount-out";
        previewEl.innerHTML = `Only ${sim.totalAvailable} available — you're trying to sell more than you have.`;
        return;
      }

      const gainLoss = proceeds - sim.costBasis;
      const isGain = gainLoss >= 0;
      const lotBreakdown = sim.consumedLots.map(l => `${l.quantity} unit from ${formatDate(l.date)} lot (@ ${formatRupiah(Math.round(l.costPerUnit))})`).join('; ');

      previewEl.className = `text-3xs font-bold rounded-xl p-3 space-y-1 ${isGain ? 'bg-[var(--chip-in-bg)] amount-in' : 'bg-[var(--chip-out-bg)] amount-out'}`;
      previewEl.innerHTML = `
        <p>Cost basis (from ${sim.consumedLots.length} lot${sim.consumedLots.length > 1 ? 's' : ''}): ${formatRupiah(Math.round(sim.costBasis))}</p>
        <p>${isGain ? 'Estimated gain' : 'Estimated loss'}: ${isGain ? '+' : ''}${formatRupiah(Math.round(gainLoss))}</p>
        <p class="text-2xs font-semibold opacity-80">${lotBreakdown}</p>
      `;
    }

    function submitSellHolding() {
      const assetName = document.getElementById('sell-holding-asset').value;
      const quantity = parseFloat(document.getElementById('sell-holding-quantity').value) || 0;
      const proceeds = Number(document.getElementById('sell-holding-proceeds').dataset.rawValue) || 0;
      const targetAccount = document.getElementById('sell-holding-target-account').value;

      if (quantity <= 0) { triggerInputError('sell-holding-quantity', 'Enter how much you sold.'); return; }
      if (proceeds <= 0) { triggerInputError('sell-holding-proceeds', 'Enter how much you received.'); return; }
      if (!targetAccount) { showToast("Pick where the proceeds landed.", "error"); return; }

      const sim = simulateFifoSale(assetName, quantity);
      if (!sim.sufficient) { showToast(`Only ${sim.totalAvailable} available.`, "error"); return; }

      vibrate(30);
      closeModal('modalSellHolding');
      showToast("Recording sale...", "info");

      postApi('sellTreasuryLot', { assetName, quantity, proceeds, targetAccount, date: todayDateStringLocal() })
        .then(result => {
          if (result && result.data) {
            GLOBAL_DATA = result.data;
            localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
            renderAllViews();
            showRewardAnimation("Sale Recorded");
          }
        })
        .catch(err => {
          showToast(err.message || "Couldn't record the sale!", "error");
          loadAppData(true);
        });
    }

    function todayDateStringLocal(d) {
      d = d || new Date();
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    // ===== 2. OPEN EDIT PAYABLE WITH FULL FIELDS =====
