    function renderCheckToggle(checked, onclickJs, title) {
      return `
        <label class="relative flex items-center justify-center w-9 h-9 -ml-2 mr-0.5 flex-shrink-0 cursor-pointer" onclick="event.stopPropagation()">
          <input type="checkbox" ${checked ? 'checked' : ''} onclick="event.stopPropagation(); ${onclickJs}" class="peer sr-only" title="${title}">
          <span class="w-5 h-5 rounded-full border-2 border-[var(--border-color)] peer-checked:border-mochi peer-checked:bg-mochi transition-colors duration-150"></span>
          <i data-lucide="check" class="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity duration-150 pointer-events-none"></i>
        </label>`;
    }

    // Keeps in-progress checkbox selection alive across refreshes of the
    // SAME item (Hide Settled toggle, undo-unsettle), but clears it — and
    // the "show all" pagination expansion — the moment a different
    // Payable/Receivable is opened.
    function resetSettleSelectionIfNeeded(name) {
      if (selectedForSettleContext !== name) {
        selectedForSettle = {};
        selectedForSettleContext = name;
        detailShowAllTrx = false;
      }
    }

    function toggleSettleSelection(transactionId, checked, amount) {
      if (checked) selectedForSettle[transactionId] = amount;
      else delete selectedForSettle[transactionId];
      updateSettleBar();
    }

    function updateSettleBar() {
      const bar = document.getElementById('settle-bar');
      const label = document.getElementById('settle-bar-label');
      const countEl = document.getElementById('settle-bar-count');
      if (!bar || !label) return;
      const ids = Object.keys(selectedForSettle);
      if (ids.length === 0) { bar.classList.add('hidden'); return; }
      const sum = ids.reduce((s, id) => s + (selectedForSettle[id] || 0), 0);
      label.innerText = formatRupiah(sum);
      if (countEl) countEl.innerText = ids.length;
      bar.classList.remove('hidden');
    }

    function settleBarHtml(name, isReceivable) {
      const ids = Object.keys(selectedForSettle);
      const sum = ids.reduce((s, id) => s + (selectedForSettle[id] || 0), 0);
      const collectLabel = isReceivable ? 'Collect' : 'Pay';
      const collectIcon = isReceivable ? 'hand-coins' : 'banknote';
      const writeOffLabel = isReceivable ? 'Write Off' : 'Forgive';
      return `
        <div id="settle-bar" class="${ids.length > 0 ? '' : 'hidden'} rounded-2xl bg-[var(--bg-card)] border border-mochi/30 shadow-[var(--shadow-item)] p-4 mb-3">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <span id="settle-bar-count" class="w-7 h-7 rounded-full bg-mochi text-white flex items-center justify-center text-3xs font-black flex-shrink-0">${ids.length}</span>
              <div class="min-w-0">
                <p class="text-2xs font-bold text-muted uppercase tracking-wider leading-none mb-1">Selected</p>
                <p id="settle-bar-label" class="text-sm font-black text-main font-numeric truncate">${formatRupiah(sum)}</p>
              </div>
            </div>
            <button aria-label="Clear selection" type="button" onclick="selectedForSettle = {}; updateSettleBar()" class="tap-shrink w-7 h-7 rounded-full bg-[var(--bg-subtle-2)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0" title="Clear selection">
              <i data-lucide="x" class="w-3.5 h-3.5 text-faint"></i>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <button type="button" onclick="showSettleConfirm('${escapeAttr(name)}', ${isReceivable}, 'writeoff')" class="tap-shrink flex items-center justify-center gap-1.5 text-3xs font-extrabold text-main bg-[var(--bg-subtle-2)] border border-[var(--border-color)] py-3 rounded-xl truncate">
              <i data-lucide="file-x" class="w-3.5 h-3.5 flex-shrink-0"></i> ${writeOffLabel}
            </button>
            <button type="button" onclick="showSettleConfirm('${escapeAttr(name)}', ${isReceivable}, 'collect')" class="tap-shrink flex items-center justify-center gap-1.5 text-3xs font-extrabold text-white bg-mochi hover:bg-mochi-dark py-3 rounded-xl shadow-[0_4px_14px_0_rgba(184,146,90,0.25)] truncate">
              <i data-lucide="${collectIcon}" class="w-3.5 h-3.5 flex-shrink-0"></i> ${collectLabel}
            </button>
          </div>
          <button type="button" onclick="promptBulkMarkSettled('${escapeAttr(name)}', ${isReceivable})" class="tap-shrink w-full text-center text-2xs font-semibold text-faint underline decoration-dotted mt-2.5">Already recorded elsewhere? Mark settled only</button>
        </div>
      `;
    }

    function promptBulkMarkSettled(name, isReceivable) {
      const ids = Object.keys(selectedForSettle);
      if (ids.length === 0) return;
      vibrate(40);
      closeModal('modalDetail');

      const titleEl = document.getElementById('delete-modal-title');
      const descEl = document.getElementById('delete-modal-desc');
      if (titleEl) titleEl.innerText = `Mark ${ids.length} item(s) as settled?`;
      if (descEl) descEl.innerText = `⚠️ This does NOT reduce the remaining balance — it only crosses these items off your list. Only use this if the money was already recorded separately (a normal transaction you logged yourself). If not, use "Collect Selected" or "Write Off Selected" instead.`;

      document.getElementById('btn-confirm-delete').onclick = async () => {
        vibrate(30);
        closeModal('modalDelete');
        try {
          const result = await postApi('bulkSetSettled', { transactionIds: ids, settled: true });
          if (result && result.data) {
            GLOBAL_DATA = result.data;
            localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
            selectedForSettle = {};
            selectedForSettleContext = null;
            renderAllViews();
            showRewardAnimation(`Marked ${ids.length} Item(s) Settled`);
          }
        } catch (err) {
          showToast("Couldn't update on server!", "error");
          loadAppData(true);
        }
      };

      setTimeout(() => openModal('modalDelete'), 400);
    }

    function checkSettleAmountWarning(sum) {
      const amountEl = document.getElementById('settle-confirm-amount');
      const warnEl = document.getElementById('settle-confirm-warning');
      if (!amountEl || !warnEl) return;
      const amount = Number((amountEl.value || '').replace(/[^0-9]/g, '')) || 0;
      if (amount > 0 && amount < sum) warnEl.classList.remove('hidden');
      else warnEl.classList.add('hidden');
    }

    function showSettleConfirm(name, isReceivable, mode) {
      mode = mode || 'collect';
      const isWriteOff = mode === 'writeoff';
      vibrate(30);
      const ids = Object.keys(selectedForSettle);
      if (ids.length === 0) return;
      const sum = ids.reduce((s, id) => s + (selectedForSettle[id] || 0), 0);
      const accountOptions = (GLOBAL_DATA.accounts || []).map(a => `<option value="${escapeAttr(a.accountName)}">${escapeHtml(a.accountName)}</option>`).join('');
      const today = new Date().toISOString().slice(0, 10);

      const badgeLabel = isWriteOff ? (isReceivable ? 'Write Off (Bad Debt)' : 'Debt Forgiven') : (isReceivable ? 'Collect Payment' : 'Pay Debt');
      const badgeCls = isWriteOff ? 'bg-[var(--bg-subtle-2)] amount-slate' : (isReceivable ? 'bg-[var(--chip-info-bg)] amount-info' : 'bg-[var(--chip-out-bg)] amount-out');

      const html = `
        <div class="space-y-4 pt-1">
          <div class="border-b border-[var(--border-color)] pb-4 pr-6">
            <span class="text-2xs font-bold px-3 py-1 rounded-full ${badgeCls} uppercase tracking-wider mb-2 inline-block">${badgeLabel}</span>
            <h3 class="text-lg font-extrabold text-main leading-tight">${escapeHtml(name)}</h3>
            <p class="text-3xs text-faint font-semibold mt-1">${ids.length} item(s) selected</p>
          </div>

          <div>
            <label for="settle-confirm-amount" class="field-label mb-1.5"><span class="field-label-text">Amount ${isWriteOff ? (isReceivable ? 'to Write Off' : 'to Forgive') : ('Actually ' + (isReceivable ? 'Received' : 'Paid'))}</span></label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-xs">Rp</span>
              <input type="text" inputmode="numeric" id="settle-confirm-amount" class="w-full ios-input pl-9 py-2.5 font-black ${isWriteOff ? 'text-slate-500' : 'text-mochi'}" value="${new Intl.NumberFormat('id-ID').format(sum)}" oninput="formatInputRupiah(this); checkSettleAmountWarning(${sum})">
            </div>
            <p class="text-2xs text-faint font-semibold mt-1.5">${isWriteOff ? 'No cash account is touched — this only writes down the selected item(s).' : 'Defaults to the sum of selected items — edit if the actual transfer was rounded or partial.'}</p>
            ${isWriteOff ? '' : `<p id="settle-confirm-warning" class="text-2xs font-bold text-amber-600 mt-1.5 hidden">⚠️ Less than the selected total — the leftover stays as real outstanding debt and these item(s) still get marked Settled. Use "Write Off Selected" instead if you want to forgive the difference.</p>`}
          </div>

          ${isWriteOff ? '' : `
          <div>
            <label for="settle-confirm-account" class="field-label mb-1.5"><span class="field-label-text">${isReceivable ? 'Receiving' : 'Payment'} Account</span></label>
            <select id="settle-confirm-account" class="w-full ios-input cursor-pointer py-2.5">
              <option value="">-- Select Account --</option>
              ${accountOptions}
            </select>
          </div>`}

          <div>
            <label for="settle-confirm-date" class="field-label mb-1.5"><span class="field-label-text">Date</span></label>
            <input type="date" id="settle-confirm-date" class="w-full ios-input py-2.5" value="${today}">
          </div>

          <div>
            <label for="settle-confirm-notes" class="field-label mb-1.5"><span class="field-label-text">Notes</span></label>
            <input type="text" id="settle-confirm-notes" class="w-full ios-input py-2.5" placeholder="${isWriteOff ? 'Reason (optional)' : 'Optional'}">
          </div>

          <div class="flex space-x-3 pt-2">
            <button type="button" onclick="currentModalBackFn && currentModalBackFn()" class="flex-1 py-3.5 bg-[var(--bg-subtle-2)] text-main font-extrabold rounded-xl tap-shrink text-xs border border-[var(--border-color)]">Cancel</button>
            <button type="button" onclick="submitSettleSelected('${escapeAttr(name)}', ${isReceivable}, '${mode}')" class="flex-1 py-3.5 ${isWriteOff ? 'bg-slate-500 hover:bg-slate-600' : 'bg-mochi hover:bg-mochi-dark'} text-white font-extrabold rounded-xl tap-shrink text-xs shadow-md">Confirm</button>
          </div>
        </div>
      `;
      document.getElementById('modal-detail-inner').innerHTML = html;
      lucide.createIcons();
    }

    async function submitSettleSelected(name, isReceivable, mode) {
      mode = mode || 'collect';
      const isWriteOff = mode === 'writeoff';
      const ids = Object.keys(selectedForSettle);
      if (ids.length === 0) return;

      const amountEl = document.getElementById('settle-confirm-amount');
      const amount = Number((amountEl.value || '').replace(/[^0-9]/g, '')) || 0;
      const accountEl = document.getElementById('settle-confirm-account');
      const account = accountEl ? accountEl.value : '';
      const date = document.getElementById('settle-confirm-date').value || new Date().toISOString().slice(0, 10);
      const notes = document.getElementById('settle-confirm-notes').value;

      if (amount <= 0) { triggerInputError('settle-confirm-amount', "Amount must be greater than 0."); return; }
      if (!isWriteOff && !account) { triggerInputError('settle-confirm-account', "Account is required."); return; }

      const payload = {
        transactionIds: ids,
        amount, date, notes,
        type: isWriteOff
          ? (isReceivable ? 'Write-Off Receivable' : 'Debt Forgiven')
          : (isReceivable ? 'Receive Receivable' : 'Pay Installment'),
        description: (isWriteOff ? (isReceivable ? 'Write-off' : 'Forgiven') : (isReceivable ? 'Collected' : 'Paid')) + ' ' + ids.length + ' item(s): ' + name
      };
      if (isReceivable) { payload.relatedReceivable = name; if (!isWriteOff) payload.targetAccount = account; }
      else { payload.relatedPayable = name; if (!isWriteOff) payload.sourceAccount = account; }

      vibrate(30);
      try {
        const result = await postApi('settleSelected', payload);
        if (result && result.data) {
          GLOBAL_DATA = result.data;
          localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
          selectedForSettle = {};
          selectedForSettleContext = null;
          renderAllViews();
          showRewardAnimation(isWriteOff ? `Wrote Off ${ids.length} Item(s)` : `Settled ${ids.length} Item(s)`);
          closeModal('modalDetail');
        }
      } catch (err) {
        showToast("Couldn't save on server!", "error");
      }
    }

    async function handleSettleTogglePayable(transactionId, checked, payableName, isAccount) {
      vibrate(20);
      // A stale selection entry for this same transaction (left over from
      // the "select to settle" checkbox mode) must never survive a settled
      // state change, or the row can re-render checked again right after
      // the person unticks it — looking like the untick silently failed.
      delete selectedForSettle[transactionId];
      try {
        const result = await postApi('toggleSettled', { transactionId, settled: checked });
        if (result && result.data) {
          GLOBAL_DATA = result.data;
          localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
          renderAllViews();
          if (checked) showRewardAnimation("Marked as Paid");
          const p = isAccount
            ? (GLOBAL_DATA.accounts || []).find(x => x.accountName === payableName)
            : (GLOBAL_DATA.payables || []).find(x => x.payableName === payableName);
          if (p) showPayableDetail(p, isAccount);
        }
      } catch (err) {
        // The click already flipped the checkbox visually — if the save
        // failed, the on-screen state no longer matches the server, so we
        // re-render from the last-known-good data to snap it back rather
        // than leaving a checkbox that lies about what's actually saved.
        showToast("Couldn't update settlement status — change was not saved.", "error");
        renderAllViews();
        const p = isAccount
          ? (GLOBAL_DATA.accounts || []).find(x => x.accountName === payableName)
          : (GLOBAL_DATA.payables || []).find(x => x.payableName === payableName);
        if (p) showPayableDetail(p, isAccount);
      }
    }

    async function handleSettleToggleReceivable(transactionId, checked, receivableName) {
      vibrate(20);
      delete selectedForSettle[transactionId];
      try {
        const result = await postApi('toggleSettled', { transactionId, settled: checked });
        if (result && result.data) {
          GLOBAL_DATA = result.data;
          localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
          renderAllViews();
          if (checked) showRewardAnimation("Marked as Received");
          const r = (GLOBAL_DATA.receivables || []).find(x => x.receivableName === receivableName);
          if (r) showReceivableDetail(r);
        }
      } catch (err) {
        showToast("Couldn't update settlement status — change was not saved.", "error");
        renderAllViews();
        const r = (GLOBAL_DATA.receivables || []).find(x => x.receivableName === receivableName);
        if (r) showReceivableDetail(r);
      }
    }

    function promptWriteOffReceivable(receivableName, remainingAmount) {
      vibrate(40);
      closeModal('modalDetail');

      const titleEl = document.getElementById('delete-modal-title');
      const descEl = document.getElementById('delete-modal-desc');
      if (titleEl) titleEl.innerText = `Write off "${receivableName}"?`;
      if (descEl) descEl.innerText = `This marks the remaining ${formatRupiah(remainingAmount)} as a bad debt loss — your Net Worth drops by this amount right away. No cash account is touched, only the receivable is written down. This isn't easily undone.`;

      document.getElementById('btn-confirm-delete').onclick = async () => {
        vibrate(30);
        closeModal('modalDelete');
        showToast("Marked as bad debt.");

        postApi('createTransaction', {
          date: new Date().toISOString().slice(0, 10),
          type: 'Write-Off Receivable',
          amount: remainingAmount,
          relatedReceivable: receivableName,
          description: 'Write-off: ' + receivableName,
          notes: 'Marked as bad debt (uncollectible)'
        })
          .then(result => {
            if (result && result.data) {
              GLOBAL_DATA = result.data;
              localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
              renderAllViews();
              showRewardAnimation("Written Off");
            }
          })
          .catch(err => {
            showToast("Couldn't write off on server!", "error");
            loadAppData(true);
          });
      };

      setTimeout(() => openModal('modalDelete'), 400);
    }

    function promptForgivePayable(payableName, remainingAmount) {
      vibrate(40);
      closeModal('modalDetail');

      const titleEl = document.getElementById('delete-modal-title');
      const descEl = document.getElementById('delete-modal-desc');
      if (titleEl) titleEl.innerText = `Forgive "${payableName}"?`;
      if (descEl) descEl.innerText = `This marks the remaining ${formatRupiah(remainingAmount)} as forgiven — your Net Worth rises by this amount right away. No cash account is touched, only the debt is written down. This isn't easily undone.`;

      document.getElementById('btn-confirm-delete').onclick = async () => {
        vibrate(30);
        closeModal('modalDelete');
        showToast("Debt marked as forgiven.");

        postApi('createTransaction', {
          date: new Date().toISOString().slice(0, 10),
          type: 'Debt Forgiven',
          amount: remainingAmount,
          relatedPayable: payableName,
          description: 'Debt forgiven: ' + payableName,
          notes: 'Marked as forgiven'
        })
          .then(result => {
            if (result && result.data) {
              GLOBAL_DATA = result.data;
              localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
              renderAllViews();
              showRewardAnimation("Forgiven");
            }
          })
          .catch(err => {
            showToast("Couldn't update on server!", "error");
            loadAppData(true);
          });
      };

      setTimeout(() => openModal('modalDelete'), 400);
    }

