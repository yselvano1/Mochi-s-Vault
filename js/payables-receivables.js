function openEditPayableModal(payableName) {
  const p = (GLOBAL_DATA.payables || []).find(x => x.payableName === payableName);
  if (!p) return;

  closeModal('modalDetail');
  setTimeout(() => {
    openMasterModal('payable', true);
    document.getElementById('master-old-name').value = p.payableName || '';
    document.getElementById('master-name').value = p.payableName || '';
    document.getElementById('master-payable-type').value = p.payableType || 'Informal Loan';
    if (document.getElementById('master-payable-owner')) document.getElementById('master-payable-owner').value = p.owner || 'Yosa';
    if (document.getElementById('master-payable-owed-to')) document.getElementById('master-payable-owed-to').value = p.owedTo || '';
    document.getElementById('master-payable-total').value = p.initialAmount || 0;
    if (document.getElementById('master-payable-start')) document.getElementById('master-payable-start').value = p.startDate || '';
    if (document.getElementById('master-payable-term')) document.getElementById('master-payable-term').value = p.termMonths || '';
    if (document.getElementById('master-payable-due')) document.getElementById('master-payable-due').value = p.dueDate || '';
    if (document.getElementById('master-payable-installment')) document.getElementById('master-payable-installment').value = p.monthlyInstallment || '';
    if (document.getElementById('master-payable-account')) document.getElementById('master-payable-account').value = p.paymentAccount || '';
    document.getElementById('master-payable-notes').value = p.notes || '';
    if (document.getElementById('master-payable-interest')) document.getElementById('master-payable-interest').value = p.interestRate || '';
    if (document.getElementById('master-payable-admin')) document.getElementById('master-payable-admin').value = p.adminFee || '';
    if (document.getElementById('master-payable-net')) document.getElementById('master-payable-net').value = p.netPrincipal || '';
    togglePayableFields();
  }, 400);
}

// ===== 3. SAVE MASTER DATA WITH FULL PAYABLE/RECEIVABLE PAYLOAD =====
async function handleSaveMaster(event) {
  event.preventDefault();
  const type = document.getElementById('master-type').value;
  const oldName = document.getElementById('master-old-name').value;
  const name = document.getElementById('master-name').value.trim();

  let payload = { oldName: oldName };

  // Fungsi kecil untuk membersihkan "Rp" dan titik pemisah ribuan
  const cleanNum = (id) => {
    const el = document.getElementById(id);
    return el ? (Number(el.value.replace(/[^0-9]/g, '')) || 0) : 0;
  };

  if (type === 'account') {
    if (!name) { triggerInputError('master-name', "Account name is required."); return; }

    const isDuplicate = (GLOBAL_DATA.accounts || []).some(a => 
      a.accountName.toLowerCase().trim() === name.toLowerCase() && 
      a.accountName.toLowerCase().trim() !== oldName.toLowerCase().trim()
    );

    if (isDuplicate) {
      triggerInputError('master-name', `Account name '${name}' is already in use!`);
      return;
    }
    payload.accountName = name;
    payload.accountType = document.getElementById('master-account-type').value;
    payload.owner = document.getElementById('master-account-owner').value;
    payload.functionCategory = document.getElementById('master-function-category').value;
    payload.initialBalance = cleanNum('master-initial-balance'); // <-- PAKAI cleanNum
    payload.currency = document.getElementById('master-account-currency').value;
    payload.initialFXBalance = payload.currency === 'USD' ? (parseFloat(document.getElementById('master-initial-fx-balance').value) || 0) : 0;
  } else if (type === 'treasury') {
    if (!name) { triggerInputError('master-name', "Asset name is required."); return; }
    const linkedAccount = document.getElementById('master-treasury-account').value;
    if (!linkedAccount) { triggerInputError('master-treasury-account', "Link this to an Investment/Property account first."); return; }

    const isDuplicate = (GLOBAL_DATA.treasury || []).some(t =>
      t.assetName.toLowerCase().trim() === name.toLowerCase() &&
      t.assetName.toLowerCase().trim() !== oldName.toLowerCase().trim()
    );
    if (isDuplicate) {
      triggerInputError('master-name', `Asset name '${name}' is already in use!`);
      return;
    }
    payload.assetName = name;
    payload.linkedAccount = linkedAccount;
    payload.quantity = parseFloat(document.getElementById('master-treasury-quantity').value) || 0;
    payload.unit = document.getElementById('master-treasury-unit').value.trim() || 'unit';
    payload.priceSource = document.getElementById('master-treasury-source').value;
    payload.ticker = document.getElementById('master-treasury-ticker').value.trim();
    payload.manualPrice = cleanNum('master-treasury-manual-price');
    payload.notes = document.getElementById('master-treasury-notes').value;
  } else if (type === 'category') {
    const mainSel = document.getElementById('master-main-category-select').value;
    const mainCategory = mainSel === '__NEW__' ? document.getElementById('master-main-category-new').value.trim() : mainSel;
    if (!mainCategory) { triggerInputError('master-main-category-new', "Main category name is required."); return; }
    payload.mainCategory = mainCategory;
    payload.subCategory = name;
    payload.categoryName = name || mainCategory;
    payload.type = document.getElementById('master-category-type').value;
  } else if (type === 'payable') {
    if (!name) { triggerInputError('master-name', "Payable name is required."); return; }
    payload.payableName = name;
    payload.payableType = document.getElementById('master-payable-type').value;
    payload.owner = document.getElementById('master-payable-owner') ? document.getElementById('master-payable-owner').value : "Yosa & Fani";
    payload.owedTo = document.getElementById('master-payable-owed-to') ? document.getElementById('master-payable-owed-to').value.trim() : "";
    payload.initialAmount = cleanNum('master-payable-total'); // <-- PAKAI cleanNum
    payload.startDate = document.getElementById('master-payable-start') ? document.getElementById('master-payable-start').value : "";
    payload.termMonths = Number(document.getElementById('master-payable-term').value) || "";
    payload.monthlyInstallment = cleanNum('master-payable-installment') || ""; // <-- PAKAI cleanNum
    payload.dueDate = document.getElementById('master-payable-due') ? document.getElementById('master-payable-due').value : "";
    payload.paymentAccount = document.getElementById('master-payable-account') ? document.getElementById('master-payable-account').value : "";
    payload.notes = document.getElementById('master-payable-notes').value;
    payload.interestRate = Number(document.getElementById('master-payable-interest').value) || 0;
    payload.adminFee = cleanNum('master-payable-admin'); // <-- PAKAI cleanNum
    payload.netPrincipal = cleanNum('master-payable-net'); // <-- PAKAI cleanNum
    payload.skipDisbursement = document.getElementById('master-payable-skip-disbursement') ? document.getElementById('master-payable-skip-disbursement').checked : false;
  } else if (type === 'receivable') {
    if (!name) { triggerInputError('master-name', "Receivable name is required."); return; }
    payload.receivableName = name;
    payload.receivableType = document.getElementById('master-receivable-type').value;
    payload.owner = document.getElementById('master-receivable-owner') ? document.getElementById('master-receivable-owner').value : "Yosa & Fani";
    payload.fromToWhom = document.getElementById('master-receivable-from') ? document.getElementById('master-receivable-from').value.trim() : "";
    payload.initialAmount = cleanNum('master-receivable-total'); // <-- PAKAI cleanNum
    payload.dateOccurred = document.getElementById('master-receivable-occurred') ? document.getElementById('master-receivable-occurred').value : "";
    payload.expectedReturn = document.getElementById('master-receivable-return') ? document.getElementById('master-receivable-return').value : "";
    payload.relatedAccount = document.getElementById('master-receivable-account') ? document.getElementById('master-receivable-account').value : "";
    payload.notes = document.getElementById('master-receivable-notes').value;
    if (payload.receivableType === 'Structured Loan') {
      payload.termMonths = Number(document.getElementById('master-receivable-term').value) || "";
      payload.monthlyInstallment = cleanNum('master-receivable-installment') || ""; // <-- PAKAI cleanNum
      payload.interestRate = Number(document.getElementById('master-receivable-interest').value) || 0;
      payload.adminFee = cleanNum('master-receivable-admin'); // <-- PAKAI cleanNum
      payload.netPrincipal = cleanNum('master-receivable-net'); // <-- PAKAI cleanNum
    } else {
      payload.termMonths = "";
      payload.monthlyInstallment = "";
      payload.interestRate = 0;
      payload.adminFee = 0;
      payload.netPrincipal = 0;
    }
    payload.skipDisbursement = document.getElementById('master-receivable-skip-disbursement') ? document.getElementById('master-receivable-skip-disbursement').checked : false;
  }

  closeModal('modalMaster');
  showToast(oldName ? "Master data updated!" : "Master data added!");
  
  // Background sync
  postApi(oldName ? 'editMasterData' : 'addMasterData', payload, { type })
    .then(result => {
      if (result && result.data) {
        GLOBAL_DATA = result.data;
        localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
        renderAllViews(); 
      }
    })
    .catch(err => {
      showToast("Couldn't save to server!", "error");
      loadAppData(true);
    });
}

    function openEditReceivableModal(receivableName) {
      const r = (GLOBAL_DATA.receivables || []).find(x => x.receivableName === receivableName);
      if (!r) return;

      closeModal('modalDetail');
      setTimeout(() => {
        openMasterModal('receivable', true);
        document.getElementById('master-old-name').value = r.receivableName || '';
        document.getElementById('master-name').value = r.receivableName || '';
        document.getElementById('master-receivable-type').value = r.receivableType || 'Informal Loan';
        document.getElementById('master-receivable-total').value = r.initialAmount || 0;
        document.getElementById('master-receivable-notes').value = r.notes || '';
        if (document.getElementById('master-receivable-term')) document.getElementById('master-receivable-term').value = r.termMonths || '';
        if (document.getElementById('master-receivable-installment')) document.getElementById('master-receivable-installment').value = r.monthlyInstallment || '';
        if (document.getElementById('master-receivable-interest')) document.getElementById('master-receivable-interest').value = r.interestRate || '';
        if (document.getElementById('master-receivable-admin')) document.getElementById('master-receivable-admin').value = r.adminFee || '';
        if (document.getElementById('master-receivable-net')) document.getElementById('master-receivable-net').value = r.netPrincipal || '';
        toggleReceivableFields();
      }, 400);
    }

    function promptDeletePayable(payableName) {
      vibrate(40);
      closeModal('modalDetail');

      const p = (GLOBAL_DATA.payables || []).find(x => x.payableName === payableName);
      const relatedCount = (GLOBAL_DATA.transactions || []).filter(t => t.relatedPayable === payableName).length;
      const remaining = p ? Math.abs(Number(p.remainingAmount) || 0) : 0;

      const titleEl = document.getElementById('delete-modal-title');
      const descEl = document.getElementById('delete-modal-desc');
      if (titleEl) titleEl.innerText = `Delete "${payableName}"?`;
      if (descEl) {
        if (relatedCount === 0) {
          descEl.innerText = "This payable has no transactions yet — safe to delete.";
        } else if (remaining > 0) {
          descEl.innerText = `This payable still has ${formatRupiah(remaining)} outstanding across ${relatedCount} transaction(s). Deleting only hides it from AP/R — the transactions stay in History but become disconnected. Consider "Forgive" instead if you want this properly closed. If you ever create a new payable with the exact same name later, these old transactions will silently reattach and skew its numbers.`;
        } else {
          descEl.innerText = `This payable is already settled, but has ${relatedCount} transaction(s) in its history that will stay in History but become disconnected. If you ever reuse the exact same name later, they'll silently reattach and skew the new item's numbers.`;
        }
      }

      document.getElementById('btn-confirm-delete').onclick = async () => {
        vibrate(30);
        closeModal('modalDelete');

        postApi('deleteMasterData', { payableName }, { type: 'payable' })
          .then(result => {
            if (result && result.data) {
              GLOBAL_DATA = result.data;
              localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
              renderAllViews();
              showToast("Payable deleted!");
            }
          })
          .catch(err => {
            showToast(err && err.message ? err.message : "Couldn't delete on server!", "error");
            loadAppData(true);
          });
      };
      openModal('modalDelete');
    }

    function promptDeleteReceivable(receivableName) {
      vibrate(40);
      closeModal('modalDetail');

      const r = (GLOBAL_DATA.receivables || []).find(x => x.receivableName === receivableName);
      const relatedCount = (GLOBAL_DATA.transactions || []).filter(t => t.relatedReceivable === receivableName).length;
      const remaining = r ? Math.abs(Number(r.remainingAmount) || 0) : 0;

      const titleEl = document.getElementById('delete-modal-title');
      const descEl = document.getElementById('delete-modal-desc');
      if (titleEl) titleEl.innerText = `Delete "${receivableName}"?`;
      if (descEl) {
        if (relatedCount === 0) {
          descEl.innerText = "This receivable has no transactions yet — safe to delete.";
        } else if (remaining > 0) {
          descEl.innerText = `This receivable still has ${formatRupiah(remaining)} outstanding across ${relatedCount} transaction(s). Deleting only hides it from AP/R — the transactions stay in History but become disconnected. Consider "Write Off" instead if you want this properly closed. If you ever create a new receivable with the exact same name later, these old transactions will silently reattach and skew its numbers.`;
        } else {
          descEl.innerText = `This receivable is already settled, but has ${relatedCount} transaction(s) in its history that will stay in History but become disconnected. If you ever reuse the exact same name later, they'll silently reattach and skew the new item's numbers.`;
        }
      }

      document.getElementById('btn-confirm-delete').onclick = async () => {
        vibrate(30);
        closeModal('modalDelete');

        postApi('deleteMasterData', { receivableName }, { type: 'receivable' })
          .then(result => {
            if (result && result.data) {
              GLOBAL_DATA = result.data;
              localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
              renderAllViews();
              showToast("Receivable deleted!");
            }
          })
          .catch(err => {
            showToast(err && err.message ? err.message : "Couldn't delete on server!", "error");
            loadAppData(true);
          });
      };

      setTimeout(() => openModal('modalDelete'), 400);
    }

function renderPayablesReceivables() {
  const payableEl = document.getElementById('list-payables-active');
  const receivableEl = document.getElementById('list-receivables-active');
  payableEl.innerHTML = "";
  receivableEl.innerHTML = "";

  const kpi = GLOBAL_DATA.kpi || {};

  renderDueThisMonthWidget(payableEl, kpi);

  let hasActivePayables = false;
  if (renderRevolvingCreditItems(payableEl)) hasActivePayables = true;
  if (renderTermLoanItems(payableEl)) hasActivePayables = true;

  if (!hasActivePayables) {
    payableEl.insertAdjacentHTML('beforeend', emptyStateHtml('party-popper', "All clear!", "No payables or credit card bills outstanding. Mochi's tail is doing a happy wiggle."));
  }

  renderReceivablesList(receivableEl);

  lucide.createIcons();
}

function renderDueThisMonthWidget(payableEl, kpi) {
  const monthlyDue = Number(kpi['Monthly Amount Due']) || 0;
  const monthlyMinDue = Number(kpi['Monthly Amount Due (Min)']) || 0;
  const dsr = Number(kpi['Debt Service Ratio']) || 0;

  const widgetHtml = `
    <div class="floating-card p-5 mb-5 space-y-3.5 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-subtle-2)] border border-[var(--border-color)] rounded-2xl shadow-sm">
      <div class="flex justify-between items-center pb-2.5 border-b border-[var(--border-color)]">
        <div class="flex items-center space-x-2">
          <div class="icon-chip-sm bg-[var(--chip-out-bg)] amount-out flex items-center justify-center">
            <i data-lucide="calendar-clock" class="w-4 h-4"></i>
          </div>
          <h3 class="text-xs font-black uppercase tracking-wider text-main">Due This Month</h3>
        </div>
        <span class="text-2xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${dsr > 30 ? 'bg-rose-500/15 amount-out' : 'bg-emerald-500/15 amount-in'}">
          DSR: ${dsr}%
        </span>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <span class="text-2xs text-muted font-extrabold uppercase block mb-0.5">Total Amount Due</span>
          <span class="text-base font-black amount-out block leading-none font-numeric">${formatRupiah(monthlyDue)}</span>
        </div>
        <div class="text-right">
          <span class="text-2xs text-muted font-extrabold uppercase block mb-0.5">Min. Payment (CC)</span>
          <span class="text-sm font-extrabold text-main block leading-none font-numeric">${formatRupiah(monthlyMinDue)}</span>
        </div>
      </div>
    </div>
  `;
  
  payableEl.insertAdjacentHTML('beforeend', widgetHtml);
}

function renderRevolvingCreditItems(payableEl) {
  let hasActivePayables = false;
  // --- B. RENDER REVOLVING CREDIT (PAYLATER & KARTU KREDIT) ---
  (GLOBAL_DATA.accounts || []).forEach((acc, i) => {
    const accName = acc.accountName || '';
    const accType = acc.accountType || '';
    const rawBal = Number(acc.runningBalance) || 0;
    const bal = Math.abs(rawBal);

    const isPayLater = accName.toLowerCase().includes('paylater') || accName.toLowerCase().includes('spaylater') || accType.toLowerCase().includes('paylater');
    const isCreditCard = (accType.toLowerCase().includes('credit card') || accName.toLowerCase().includes('cc ') || accName.toLowerCase().includes('credit')) && !isPayLater;

    if ((isPayLater || isCreditCard) && bal > 0) {
      hasActivePayables = true;
      const minPay = isCreditCard ? Math.max(50000, Math.round(bal * 0.10)) : bal;

      const div = document.createElement('div');
      div.className = "floating-item p-5 cursor-pointer card-hover transition stagger-item mb-3 overflow-hidden select-none space-y-3";
      div.style.animationDelay = `${i * 0.05}s`;
      div.onclick = () => { vibrate(30); showPayableDetail(acc, true); };

      div.innerHTML = `
        <div class="pb-3 border-b border-[var(--border-color)] flex justify-between items-start">
          <div>
            <h4 class="text-4xs font-extrabold text-main leading-snug pr-1">${escapeHtml(accName)}</h4>
            <span class="text-2xs ${isPayLater ? 'amount-warn bg-orange-500/15' : 'amount-out bg-[var(--chip-out-bg)]'} px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider mt-1.5 inline-block">
              ${isPayLater ? 'PayLater • Full Payment' : 'Credit Card • Revolving'}
            </span>
          </div>
          <span class="text-2xs font-extrabold px-2.5 py-1 rounded-full bg-[var(--bg-subtle-2)] dark:bg-[var(--bg-subtle-2)] text-muted">This Month's Bill</span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <span class="text-2xs text-muted font-bold uppercase tracking-wider block mb-0.5">STATEMENT BALANCE</span>
            <span class="text-base font-black amount-out block leading-none font-numeric">${formatRupiah(bal)}</span>
          </div>
          ${isCreditCard ? `
            <div class="text-right">
              <span class="text-2xs text-muted font-bold uppercase tracking-wider block mb-0.5">MINIMUM PAYMENT</span>
              <span class="text-sm font-extrabold text-main block leading-none font-numeric">${formatRupiah(minPay)}</span>
            </div>
          ` : `
            <div class="text-right">
              <span class="text-2xs text-orange-600 dark:text-orange-400 font-bold uppercase block mb-0.5">STRICT DATED</span>
              <span class="text-3xs font-extrabold text-orange-600 dark:text-orange-400 block leading-none">100% Full Payment</span>
            </div>
          `}
        </div>

        <!-- QUICK-PAY BUTTONS -->
        <div class="pt-2 flex space-x-2 border-t border-[var(--border-color)]">
          <button type="button" onclick="vibrate(30); event.stopPropagation(); quickPayCommitment('${escapeAttr(accName)}', true, ${bal}, 'FULL')" class="flex-1 py-2 bg-mochi hover:bg-mochi-dark text-white font-extrabold text-xs rounded-xl tap-shrink shadow-sm flex items-center justify-center">
            <i data-lucide="check-circle-2" class="w-3.5 h-3.5 mr-1"></i> Pay Full (${formatRupiah(bal)})
          </button>
          ${isCreditCard ? `
            <button type="button" onclick="vibrate(30); event.stopPropagation(); quickPayCommitment('${escapeAttr(accName)}', true, ${minPay}, 'MIN')" class="py-2 px-3 bg-[var(--bg-subtle-2)] text-main font-bold text-xs rounded-xl tap-shrink border border-[var(--border-color)] hover:bg-[var(--bg-subtle-2)]">
              Pay Min (${formatRupiah(minPay)})
            </button>
          ` : ''}
        </div>
      `;
      payableEl.appendChild(div);
    }
  });
  return hasActivePayables;
}

function renderTermLoanItems(payableEl) {
  let hasActivePayables = false;
  const activePayables = (GLOBAL_DATA.payables || [])
    .filter(p => {
      const st = (p.status || '').toLowerCase().trim();
      return (st === 'active' || st === 'aktif') && Number(p.remainingAmount) > 0;
    })
    .sort((a, b) => b.remainingAmount - a.remainingAmount);

  activePayables.forEach((p, i) => {
    hasActivePayables = true;
    const initial = Number(p.initialAmount) || 0;
    const rem = Math.abs(Number(p.remainingAmount) || 0);
    const paid = Math.max(0, initial - rem);
    const pctPaid = initial > 0 ? Math.min(100, Math.round((paid / initial) * 100)) : 0;
    const instAmt = p.monthlyInstallment > 0 ? p.monthlyInstallment : Math.min(rem, Math.round(initial / (p.termMonths || 1)));

    const div = document.createElement('div');
    div.className = "floating-item p-5 cursor-pointer card-hover transition stagger-item mb-3 overflow-hidden select-none space-y-3";
    div.style.animationDelay = `${i * 0.05}s`;
    div.onclick = () => { vibrate(30); showPayableDetail(p, false); };

    div.innerHTML = `
      <div class="pb-3 border-b border-[var(--border-color)] flex justify-between items-start">
        <div>
          <h4 class="text-4xs font-extrabold text-main leading-snug pr-1">${escapeHtml(p.payableName)}</h4>
          <div class="flex items-center space-x-1.5 mt-1.5">
            <span class="text-2xs amount-out bg-[var(--chip-out-bg)] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">${escapeHtml(p.payableType || 'Term Loan')}</span>
            ${p.owedTo ? `<span class="text-2xs text-faint font-extrabold">• ${escapeHtml(p.owedTo)}</span>` : ''}
          </div>
        </div>
        ${p.termMonths ? `<span class="text-2xs font-black px-2.5 py-1 rounded-full bg-[var(--bg-subtle-2)] text-main border border-[var(--border-color)]">${p.termMonths} Months Term</span>` : ''}
      </div>
      ${p.dueDate && getAgingBucket(p.dueDate) ? `<div>${(a => renderAgingBucketBadge(a.bucket, a.daysOverdue))(getAgingBucket(p.dueDate))}</div>` : ''}

      <div class="grid grid-cols-2 gap-2">
        <div>
          <span class="text-2xs text-muted font-bold uppercase tracking-wider block mb-0.5">REMAINING PRINCIPAL</span>
          <span class="text-base font-black amount-out block leading-none font-numeric">${formatRupiah(rem)}</span>
        </div>
        <div class="text-right">
          <span class="text-2xs text-muted font-bold uppercase tracking-wider block mb-0.5">THIS MONTH'S INSTALLMENT</span>
          <span class="text-sm font-extrabold text-main block leading-none font-numeric">${formatRupiah(instAmt)}</span>
        </div>
      </div>

      <!-- PROGRESS BAR PELUNASAN -->
      ${initial > 0 ? `
        <div class="space-y-1 pt-1">
          <div class="flex justify-between text-2xs font-extrabold text-muted">
            <span>Paid: ${pctPaid}%</span>
            <span>Principal: ${formatRupiah(initial)}</span>
          </div>
          <div class="w-full bg-[var(--bg-subtle-2)] rounded-full h-2 overflow-hidden">
            <div class="bg-gradient-to-r from-mochi-light to-mochi h-full rounded-full transition-all duration-700" style="width: ${pctPaid}%"></div>
          </div>
        </div>
      ` : ''}

      <!-- QUICK-PAY BUTTON -->
      <div class="pt-2 border-t border-[var(--border-color)]">
        <button type="button" onclick="vibrate(30); event.stopPropagation(); quickPayCommitment('${escapeAttr(p.payableName)}', false, ${instAmt}, 'INSTALLMENT')" class="w-full py-2 bg-mochi hover:bg-mochi-dark text-white font-extrabold text-xs rounded-xl tap-shrink shadow-sm flex items-center justify-center">
          <i data-lucide="credit-card" class="w-3.5 h-3.5 mr-1"></i> Pay Monthly Installment (${formatRupiah(instAmt)})
        </button>
      </div>
    `;
    payableEl.appendChild(div);
  });
  return hasActivePayables;
}

function renderReceivablesList(receivableEl) {
  const activeReceivables = (GLOBAL_DATA.receivables || [])
    .filter(r => {
      const st = (r.status || '').toLowerCase().trim();
      return (st === 'active' || st === 'unsettled' || st === 'aktif' || st === 'belum lunas') && Number(r.remainingAmount) > 0;
    });

  if (activeReceivables.length === 0) {
    receivableEl.innerHTML = emptyStateHtml('party-popper', "All collected!", "Every receivable has been paid back. Nothing left for Mochi to chase.");
  } else {
    let monthlyReceivableDue = 0;
    let expectedCount = 0;
    const currentYM = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    const today = new Date();
    today.setHours(0,0,0,0);

    activeReceivables.forEach(r => {
      const isStructured = r.receivableType === 'Structured Loan' || r.termMonths > 0;
      const rem = Math.abs(Number(r.remainingAmount) || 0);

      if (isStructured) {
        const initial = Math.abs(Number(r.initialAmount) || 0);
        const instAmt = r.monthlyInstallment > 0 ? r.monthlyInstallment : (r.termMonths > 0 ? Math.min(rem, Math.round(initial / r.termMonths)) : rem);
        monthlyReceivableDue += Math.min(rem, instAmt);
        expectedCount++;
      } else if (r.expectedReturn) {
        const dueDate = new Date(r.expectedReturn);
        dueDate.setHours(0,0,0,0);
        const dueYM = dueDate.getFullYear() + '-' + String(dueDate.getMonth() + 1).padStart(2, '0');
        if (dueYM === currentYM || dueDate < today) {
          monthlyReceivableDue += rem;
          expectedCount++;
        }
      }
    });

    if (monthlyReceivableDue > 0) {
      const recWidgetHtml = `
        <div class="floating-card p-5 mb-5 space-y-3.5 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-subtle-2)] border border-[var(--border-color)] rounded-2xl shadow-sm">
          <div class="flex justify-between items-center pb-2.5 border-b border-[var(--border-color)]">
            <div class="flex items-center space-x-2">
              <div class="icon-chip-sm bg-[var(--chip-info-bg)] amount-info flex items-center justify-center">
                <i data-lucide="hand-coins" class="w-4 h-4"></i>
              </div>
              <h3 class="text-xs font-black uppercase tracking-wider text-main">Expected Inflow This Month</h3>
            </div>
            <span class="text-2xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[var(--chip-info-bg)] amount-info">
              ${expectedCount} Bills
            </span>
          </div>

          <div>
            <span class="text-2xs text-muted font-extrabold uppercase block mb-0.5">Total Receivable Due</span>
            <span class="text-base font-black amount-info block leading-none font-numeric">${formatRupiah(monthlyReceivableDue)}</span>
          </div>
        </div>
      `;
      receivableEl.insertAdjacentHTML('beforeend', recWidgetHtml);
    }

    activeReceivables.forEach((r, i) => {
      const initial = Math.abs(Number(r.initialAmount) || 0);
      const rem = Math.abs(Number(r.remainingAmount) || 0);
      const collected = Math.max(0, initial - rem);
      const pctCollected = initial > 0 ? Math.min(100, Math.round((collected / initial) * 100)) : 0;

      const isStructured = r.receivableType === 'Structured Loan' || r.termMonths > 0;

      let dueBadgeHtml = '';
      if (r.expectedReturn) {
        const dueDate = new Date(r.expectedReturn);
        const today = new Date();
        today.setHours(0,0,0,0);
        dueDate.setHours(0,0,0,0);
        const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          // Structured Loan overdue = real bad-debt risk, use the same
          // tiered risk badge as Payable's aging system. Informal
          // reimbursements (Shopping Reimbursement etc.) get the plain,
          // low-alarm "Overdue X Days" treatment — Mama forgetting to pay
          // back groceries isn't a credit risk.
          const aging = isStructured ? getAgingBucket(r.expectedReturn) : null;
          dueBadgeHtml = aging
            ? renderAgingBucketBadge(aging.bucket, aging.daysOverdue)
            : `<span class="text-2xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">Overdue ${Math.abs(diffDays)} Days</span>`;
        } else if (diffDays === 0) {
          dueBadgeHtml = `<span class="text-2xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">Due Today</span>`;
        } else {
          dueBadgeHtml = `<span class="text-2xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Due in ${diffDays} Days</span>`;
        }
      }

      const instAmt = isStructured && r.monthlyInstallment > 0 ? r.monthlyInstallment : (r.termMonths > 0 ? Math.min(rem, Math.round(initial / r.termMonths)) : rem);

      const div = document.createElement('div');
      div.className = "floating-item p-5 cursor-pointer card-hover transition stagger-item mb-3 overflow-hidden select-none space-y-3";
      div.style.animationDelay = `${i * 0.05}s`;
      div.onclick = () => { vibrate(30); showReceivableDetail(r); };

      div.innerHTML = `
        <div class="pb-3 border-b border-[var(--border-color)] flex justify-between items-start">
          <div>
            <h4 class="text-4xs font-extrabold text-main leading-snug pr-1">${escapeHtml(r.receivableName)}</h4>
            <div class="flex items-center space-x-1.5 mt-1.5">
              <span class="text-2xs amount-info bg-[var(--chip-info-bg)] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">${escapeHtml(r.receivableType || 'RECEIVABLE')}</span>
              ${r.fromToWhom ? `<span class="text-2xs text-faint font-extrabold">• ${escapeHtml(r.fromToWhom)}</span>` : ''}
            </div>
          </div>
          ${isStructured && r.termMonths ? `<span class="text-2xs font-black px-2.5 py-1 rounded-full bg-[var(--bg-subtle-2)] text-main border border-[var(--border-color)]">${r.termMonths} Months Term</span>` : dueBadgeHtml}
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <span class="text-2xs text-muted font-bold uppercase tracking-wider block mb-0.5">REMAINING RECEIVABLE</span>
            <span class="text-base font-black amount-info block leading-none tracking-tight font-numeric">${formatRupiah(rem)}</span>
          </div>
          <div class="text-right">
            <span class="text-2xs text-muted font-bold uppercase tracking-wider block mb-0.5">${isStructured ? "MONTHLY INSTALLMENT" : "TARGET DATE"}</span>
            <span class="text-4xs font-extrabold text-main block leading-none">${isStructured ? formatRupiah(instAmt) : (r.expectedReturn ? formatDate(r.expectedReturn) : 'No Target')}</span>
          </div>
        </div>

        <!-- PROGRESS BAR PELUNASAN -->
        ${initial > 0 ? `
          <div class="space-y-1 pt-1">
            <div class="flex justify-between text-2xs font-extrabold text-muted">
              <span>Collected: ${pctCollected}%</span>
              <span>Total Loan: ${formatRupiah(initial)}</span>
            </div>
            <div class="w-full bg-[var(--bg-subtle-2)] rounded-full h-2 overflow-hidden">
              <div class="bg-gradient-to-r from-sky-400 to-sky-600 h-full rounded-full transition-all duration-700" style="width: ${pctCollected}%"></div>
            </div>
          </div>
        ` : ''}

        <!-- QUICK-PAY BUTTON -->
        <div class="pt-2 border-t border-[var(--border-color)]">
          <button type="button" onclick="vibrate(30); event.stopPropagation(); quickPayCommitment('${escapeAttr(r.receivableName)}', false, ${isStructured ? instAmt : rem}, 'RECEIVABLE')" class="w-full py-2 bg-[var(--chip-info-bg)] text-sky-700 dark:text-sky-300 font-extrabold text-xs rounded-xl tap-shrink shadow-sm flex items-center justify-center hover:bg-sky-500/20">
            <i data-lucide="download" class="w-3.5 h-3.5 mr-1"></i> Receive Payment (${formatRupiah(isStructured ? instAmt : rem)})
          </button>
        </div>
      `;
      receivableEl.appendChild(div);
    });
  }
}

    // =======================================================
// FINTECH FRONT-END UI COMPONENTS
// =======================================================

/**
 * 1. RINGKASAN TAGIHAN BERJALAN (REVOLVING CREDIT STATEMENT CARD)
 */
function renderRevolvingStatementCard(acc) {
  const currentBal = Number(acc.currentBalance) || 0;
  const billedBal = Number(acc.billedStatementBalance) || 0;
  const unbilledBal = Number(acc.unbilledBalance) || 0;
  const availCredit = Number(acc.availableCredit) || 0;
  const minPayment = Number(acc.minPaymentDue) || 0;
  
  return `
    <div class="floating-card p-5 space-y-4 border border-[var(--border-color)] bg-card rounded-2xl">
      <div class="flex justify-between items-center pb-3 border-b border-[var(--border-color)]">
        <div>
          <h4 class="text-sm font-black text-main">${escapeHtml(acc.accountName)}</h4>
          <span class="text-2xs font-bold text-muted uppercase">Statement Overview</span>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20">Revolving Credit</span>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="p-3 rounded-xl bg-[var(--bg-subtle-2)]">
          <span class="text-2xs font-bold text-muted uppercase block">Billed Statement</span>
          <span class="text-sm font-black amount-out font-numeric">${formatRupiah(billedBal)}</span>
        </div>
        <div class="p-3 rounded-xl bg-[var(--bg-subtle-2)]">
          <span class="text-2xs font-bold text-muted uppercase block">Unbilled (Current)</span>
          <span class="text-sm font-black text-main font-numeric">${formatRupiah(unbilledBal)}</span>
        </div>
      </div>

      <div class="space-y-2 text-xs font-semibold text-muted">
        <div class="flex justify-between">
          <span>Available Credit Limit:</span>
          <span class="font-bold text-main font-numeric">${formatRupiah(availCredit)}</span>
        </div>
        <div class="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
          <span class="font-bold text-rose-600 dark:text-rose-400">Minimum Payment Due:</span>
          <span class="font-black text-rose-600 dark:text-rose-400 font-numeric text-sm">${formatRupiah(minPayment)}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * 2. PROGRESS BAR ALOKASI WATERFALL (LATE FEE -> INTEREST -> PRINCIPAL)
 */
function renderWaterfallProgressBar(lateFeePaid, lateFeeDue, interestPaid, interestDue, principalPaid, principalDue) {
  const totalDue = lateFeeDue + interestDue + principalDue;
  const totalPaid = lateFeePaid + interestPaid + principalPaid;
  
  const lateFeePct = totalDue > 0 ? (lateFeePaid / totalDue) * 100 : 0;
  const interestPct = totalDue > 0 ? (interestPaid / totalDue) * 100 : 0;
  const principalPct = totalDue > 0 ? (principalPaid / totalDue) * 100 : 0;
  
  return `
    <div class="space-y-2 p-4 rounded-2xl bg-[var(--bg-subtle-2)] border border-[var(--border-color)]">
      <div class="flex justify-between text-xs font-extrabold">
        <span class="text-main">Waterfall Payment Allocation</span>
        <span class="font-numeric text-mochi">${formatRupiah(totalPaid)} / ${formatRupiah(totalDue)}</span>
      </div>
      
      <!-- Multi-Color Segmented Progress Bar -->
      <div class="w-full bg-[var(--bg-subtle-2)] rounded-full h-3 overflow-hidden flex">
        <div class="bg-rose-500 h-full transition-all" style="width: ${lateFeePct}%" title="Late Fees Paid"></div>
        <div class="bg-amber-500 h-full transition-all" style="width: ${interestPct}%" title="Interest/Admin Paid"></div>
        <div class="bg-emerald-500 h-full transition-all" style="width: ${principalPct}%" title="Principal Paid"></div>
      </div>

      <div class="grid grid-cols-3 gap-1 text-2xs font-bold text-center pt-1">
        <span class="text-rose-600">● Denda: ${formatRupiah(lateFeePaid)}</span>
        <span class="text-amber-600">● Bunga: ${formatRupiah(interestPaid)}</span>
        <span class="text-emerald-600">● Pokok: ${formatRupiah(principalPaid)}</span>
      </div>
    </div>
  `;
}

/**
 * 3. INDICATOR BADGES AGING BUCKETS & WRITE-OFF (Receivables)
 */
function renderAgingBucketBadge(bucket, daysOverdue) {
  let badgeCls = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  let label = "Current";

  switch (bucket) {
    case "1-30_DAYS":
      badgeCls = "bg-amber-500/10 text-amber-600 border-amber-500/20";
      label = `Overdue ${daysOverdue}d (1-30d Warning)`;
      break;
    case "31-60_DAYS":
      badgeCls = "bg-orange-500/10 text-orange-600 border-orange-500/20";
      label = `Overdue ${daysOverdue}d (31-60d Caution)`;
      break;
    case "61-90_DAYS":
      badgeCls = "bg-rose-500/10 text-rose-600 border-rose-500/20";
      label = `Overdue ${daysOverdue}d (61-90d High Risk)`;
      break;
    case "90PLUS_NPL":
      badgeCls = "bg-rose-600 text-white border-rose-700 animate-pulse";
      label = `Overdue ${daysOverdue}d (90+ NPL Candidate)`;
      break;
    case "WRITTEN_OFF":
      badgeCls = "bg-slate-700 text-slate-200 border-slate-800";
      label = "Written-Off (Bad Debt)";
      break;
  }

  return `<span class="px-2.5 py-0.5 rounded-full text-2xs font-black uppercase tracking-wider border ${badgeCls}">${label}</span>`;
}

// Computes which aging bucket a due date falls into, given today's date.
// Returns null if not overdue (nothing to show — a current item needs no
// badge cluttering the card). Used for both Payable.dueDate and
// Receivable.expectedReturn — same math, same buckets, either direction.
function getAgingBucket(dueDateStr) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const daysOverdue = Math.round((today - due) / 86400000);
  if (daysOverdue <= 0) return null;
  let bucket = "1-30_DAYS";
  if (daysOverdue > 90) bucket = "90PLUS_NPL";
  else if (daysOverdue > 60) bucket = "61-90_DAYS";
  else if (daysOverdue > 30) bucket = "31-60_DAYS";
  return { bucket, daysOverdue };
}

