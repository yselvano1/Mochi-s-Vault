    function handleMainCategorySelectChange() {
      const val = document.getElementById('master-main-category-select').value;
      document.getElementById('master-main-category-new-wrap').classList.toggle('hidden', val !== '__NEW__');
    }

    function handleMasterCategoryTypeChange() {
      const selectedType = document.getElementById('master-category-type').value;
      const allCategories = GLOBAL_DATA.categories || [];

      const filtered = allCategories.filter(c => (c.type || '').toLowerCase().trim() === selectedType.toLowerCase().trim());
      const mainCategories = [...new Set(filtered.map(c => c.mainCategory || c.categoryName).filter(Boolean))];

      let optHtml = `<option value="__NEW__">+ Create New Main Category</option>`;
      mainCategories.forEach(u => { optHtml += `<option value="${escapeAttr(u)}">${escapeHtml(u)}</option>`; });

      const sel = document.getElementById('master-main-category-select');
      sel.innerHTML = optHtml;
      sel.value = "__NEW__";
      handleMainCategorySelectChange();
    }

    // ===== 1. MODAL ADD/EDIT MASTER DATA HUTANG & PIUTANG =====
    // Opens the input form from a "chooser" modal (account/payable/receivable
    // type picker) and remembers which chooser to return to, so the form's
    // back button can seamlessly reopen it instead of just closing.
    function openMasterFromChooser(chooserId, type, presetType = null) {
      vibrate(30);
      window.masterModalReturnTo = chooserId;
      closeModal(chooserId);
      setTimeout(() => openMasterModal(type, false, presetType), 250);
    }

    function masterModalGoBack() {
      vibrate(30);
      const target = masterModalBackTarget;
      masterModalBackTarget = null;
      closeModal('modalMaster');
      if (target) setTimeout(() => openModal(target), 250);
    }

let masterModalBackTarget = null;
function openMasterModal(type, isEdit = false, presetType = null) {
  masterModalBackTarget = window.masterModalReturnTo || null;
  window.masterModalReturnTo = null;
  const backBtn = document.getElementById('master-back-btn');
  if (backBtn) backBtn.classList.toggle('hidden', !masterModalBackTarget);

  document.getElementById('master-type').value = type;
  if (!isEdit) document.getElementById('master-old-name').value = "";
  
  const titleEl = document.getElementById('master-title');
  const extraEl = document.getElementById('master-extra-field');
  extraEl.innerHTML = "";

  const nameLabelEl = document.getElementById('master-name-label');
  const nameInputEl = document.getElementById('master-name');
  const categoryTypeWrap = document.getElementById('master-category-type-wrap');
  const mainCategoryWrap = document.getElementById('master-main-category-wrap');
  const mainCategoryNewWrap = document.getElementById('master-main-category-new-wrap');

  categoryTypeWrap.classList.add('hidden');
  mainCategoryWrap.classList.add('hidden');
  mainCategoryNewWrap.classList.add('hidden');
  nameLabelEl.innerText = "Name";
  nameInputEl.required = true;
  nameInputEl.placeholder = "";

  if (type === 'category') {
    buildCategoryMasterModal({ isEdit, titleEl, extraEl, categoryTypeWrap, mainCategoryWrap, nameLabelEl, nameInputEl });
  } else if (type === 'account') {
    buildAccountMasterModal({ isEdit, presetType, titleEl, extraEl });
  } else if (type === 'treasury') {
    buildTreasuryMasterModal({ isEdit, titleEl, extraEl, nameLabelEl, nameInputEl });
  } else if (type === 'payable') {
    buildPayableMasterModal({ isEdit, presetType, titleEl, extraEl });
  } else if (type === 'receivable') {
    buildReceivableMasterModal({ isEdit, titleEl, extraEl });
  }
  openModal('modalMaster');
}

function buildCategoryMasterModal({ isEdit, titleEl, extraEl, categoryTypeWrap, mainCategoryWrap, nameLabelEl, nameInputEl }) {
    titleEl.innerText = isEdit ? "Edit Category" : "Add New Category";
    categoryTypeWrap.classList.remove('hidden');
    mainCategoryWrap.classList.remove('hidden');

    nameLabelEl.innerText = "Sub-Category Name (Optional)";
    nameInputEl.required = false;
    nameInputEl.placeholder = "Leave blank if this is a main category";

    const activeTrxType = document.getElementById('form-type').value || 'Expense';
    const meta = getTypeMeta(activeTrxType);
    const defaultCatType = meta.categoryType || 'Expense';
    
    document.getElementById('master-category-type').value = defaultCatType;
    handleMasterCategoryTypeChange();
}

function buildAccountMasterModal({ isEdit, presetType, titleEl, extraEl }) {
    titleEl.innerText = isEdit ? "Edit Account" : "Add New Account";
    extraEl.innerHTML = `
      <div>
        <label for="master-account-type" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="layers"></i></span><span class="field-label-text">Account Type</span></label>
        <select id="master-account-type" class="w-full ios-input cursor-pointer py-2.5">
          <option value="Bank Account">Bank</option>
          <option value="E-Wallet">E-Wallet</option>
          <option value="Cash">Cash / Tunai</option>
          <option value="Credit Card / PayLater">Credit Card / PayLater</option>
          <option value="Investment">Investment (Gold, Stocks, Crypto)</option>
          <option value="Property">Property / Fixed Asset</option>
        </select>
      </div>
      <div>
        <label for="master-account-currency" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="coins"></i></span><span class="field-label-text">Currency</span></label>
        <select id="master-account-currency" class="w-full ios-input cursor-pointer py-2.5" onchange="toggleAccountCurrencyFields()">
          <option value="IDR">Rupiah (IDR)</option>
          <option value="USD">US Dollar (USD)</option>
        </select>
        <p class="text-2xs text-muted font-semibold mt-1.5">USD is for physical cash, a bank account, or an e-wallet actually held in dollars — not for tracking daily Rupiah spending.</p>
      </div>
      <div>
        <label for="master-account-owner" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="user"></i></span><span class="field-label-text">Account Owner</span></label>
        <select id="master-account-owner" class="w-full ios-input cursor-pointer py-2.5">
          <option value="Yosa">Yosa</option>
          <option value="Fani">Fani</option>
          <option value="Yosa & Fani">Yosa & Fani (Joint)</option>
        </select>
      </div>
      <div>
        <label for="master-function-category" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="target"></i></span><span class="field-label-text">Account Function</span></label>
        <select id="master-function-category" class="w-full ios-input cursor-pointer py-2.5">
          <option value="Daily Operations">Daily Operations</option>
          <option value="Emergency Fund & Savings">Emergency Fund & Savings</option>
        </select>
      </div>
      <div>
        <label for="master-initial-balance" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="banknote"></i></span><span class="field-label-text">Initial Balance / Bill (Rp)</span></label>
        <div class="relative">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-sm">Rp</span>
          <input type="text" inputmode="numeric" id="master-initial-balance" class="w-full ios-input pl-10 py-2.5 font-extrabold text-main" placeholder="0" oninput="formatInputRupiah(this)">
        </div>
        <p class="text-2xs text-muted font-semibold mt-1.5">This is the Rupiah book value (what it cost you) — always the real accounting figure, never a market estimate.</p>
      </div>
      <div id="account-fx-initial-wrap" class="hidden">
        <label for="master-initial-fx-balance" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="dollar-sign"></i></span><span class="field-label-text">Initial USD Held</span></label>
        <div class="relative">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-sm">$</span>
          <input type="text" inputmode="decimal" id="master-initial-fx-balance" class="w-full ios-input pl-8 py-2.5 font-extrabold text-main" placeholder="0.00">
        </div>
        <p class="text-2xs text-muted font-semibold mt-1.5">Only if you already hold dollars before adding this account. New future USD comes in through Internal Transfer.</p>
      </div>
    `;
    if (presetType) setTimeout(() => { const el = document.getElementById('master-account-type'); if (el) el.value = presetType; }, 60);
    setTimeout(() => toggleAccountCurrencyFields(), 60);
}

function buildTreasuryMasterModal({ isEdit, titleEl, extraEl, nameLabelEl, nameInputEl }) {
    titleEl.innerText = isEdit ? "Edit Holding" : "Track a Holding";
    nameLabelEl.innerText = "Asset Name";
    nameInputEl.placeholder = "e.g. Emas Antam 25gr, BBCA Shares";

    const eligibleAccounts = (GLOBAL_DATA.accounts || []).filter(a => {
      const t = (a.accountType || '').toLowerCase();
      return t.includes('investment') || t.includes('property');
    });
    const linkedAccountOptions = eligibleAccounts.length
      ? eligibleAccounts.map(a => `<option value="${escapeAttr(a.accountName)}">${escapeHtml(a.accountName)} (${formatRupiah(a.runningBalance)})</option>`).join('')
      : `<option value="">— no Investment/Property account yet —</option>`;

    extraEl.innerHTML = `
      <div>
        <label for="master-treasury-account" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="link"></i></span><span class="field-label-text">Linked Account</span></label>
        <select id="master-treasury-account" class="w-full ios-input cursor-pointer py-2.5">${linkedAccountOptions}</select>
        <p class="text-2xs text-muted font-semibold mt-1.5">${eligibleAccounts.length ? 'Its Rupiah book value stays exactly this account\'s balance — this holding just adds a market-value comparison.' : 'Create an Investment or Property account first (New Account → Investment/Property), then come back here to track its quantity and price.'}</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="master-treasury-quantity" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="hash"></i></span><span class="field-label-text">Quantity</span></label>
          <input type="text" inputmode="decimal" id="master-treasury-quantity" class="w-full ios-input py-2.5 font-extrabold text-main" placeholder="0">
        </div>
        <div>
          <label for="master-treasury-unit" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="ruler"></i></span><span class="field-label-text">Unit</span></label>
          <input type="text" id="master-treasury-unit" class="w-full ios-input py-2.5" placeholder="gram, lembar, unit">
        </div>
      </div>
      <div>
        <label for="master-treasury-source" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="radio"></i></span><span class="field-label-text">Price Source</span></label>
        <select id="master-treasury-source" class="w-full ios-input cursor-pointer py-2.5" onchange="toggleTreasuryPriceFields()">
          <option value="Manual">Manual (I'll update it myself — e.g. gold)</option>
          <option value="GoogleFinance">Google Finance (live — stocks, crypto, forex)</option>
        </select>
      </div>
      <div id="treasury-ticker-wrap" class="hidden">
        <label for="master-treasury-ticker" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="tag"></i></span><span class="field-label-text">Ticker</span></label>
        <input type="text" id="master-treasury-ticker" class="w-full ios-input py-2.5" placeholder="IDX:BBCA, CURRENCY:BTCIDR">
        <p class="text-2xs text-muted font-semibold mt-1.5">Same format GOOGLEFINANCE() uses in Sheets. If this errors out, Mochi falls back to the manual price below.</p>
      </div>
      <div id="treasury-manual-price-wrap">
        <label for="master-treasury-manual-price" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="tag"></i></span><span class="field-label-text">Price per Unit (Rp)</span></label>
        <div class="relative">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-sm">Rp</span>
          <input type="text" inputmode="numeric" id="master-treasury-manual-price" class="w-full ios-input pl-10 py-2.5 font-extrabold text-main" placeholder="0" oninput="formatInputRupiah(this)">
        </div>
        <p class="text-2xs text-muted font-semibold mt-1.5">This is the "refresh" — update this number whenever you check today's gold price and it recalculates the estimate.</p>
      </div>
      <div>
        <label for="master-treasury-notes" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="file-text"></i></span><span class="field-label-text">Notes (Optional)</span></label>
        <textarea id="master-treasury-notes" rows="2" class="w-full ios-input py-2.5"></textarea>
      </div>
    `;
    setTimeout(() => toggleTreasuryPriceFields(), 60);
}

function buildPayableMasterModal({ isEdit, presetType, titleEl, extraEl }) {
    titleEl.innerText = isEdit ? "Edit Payable / Installment" : "Add New Payable / Installment";
    
    const accountOptions = (GLOBAL_DATA.accounts || []).map(a => `<option value="${escapeAttr(a.accountName)}">${escapeHtml(a.accountName)}</option>`).join('');

    extraEl.innerHTML = `
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="master-payable-type" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="credit-card"></i></span><span class="field-label-text">Payable Type</span></label>
          <select id="master-payable-type" class="w-full ios-input cursor-pointer py-2.5" onchange="togglePayableFields()">
            <option value="Informal Loan">Informal Loan</option>
            <option value="Bank/Fintech Loan">Bank / Fintech Loan</option>
          </select>
        </div>
        <div>
          <label for="master-payable-owner" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="user"></i></span><span class="field-label-text">Owner</span></label>
          <select id="master-payable-owner" class="w-full ios-input cursor-pointer py-2.5">
            <option value="Yosa">Yosa</option>
            <option value="Fani">Fani</option>
            <option value="Yosa & Fani">Yosa & Fani</option>
          </select>
        </div>
      </div>
      <div>
        <label for="master-payable-owed-to" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="landmark"></i></span><span class="field-label-text">Creditor / Lender</span></label>
        <input type="text" id="master-payable-owed-to" class="w-full ios-input py-2.5" placeholder="e.g., GoPinjam / Kredivo / BCA">
      </div>
      
      <!-- SMART HYBRID CALCULATOR -->
      <div id="payable-structured-fields" class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="master-payable-net" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="banknote"></i></span><span class="field-label-text">Net Principal</span></label>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-xs">Rp</span>
            <input type="text" inputmode="numeric" id="master-payable-net" class="w-full ios-input pl-9 py-2.5 font-extrabold text-main" placeholder="0" oninput="formatInputRupiah(this); calcSmartPayable();">
          </div>
        </div>
        <div>
          <label for="master-payable-term" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="clock"></i></span><span class="field-label-text">Tenor (Months)</span></label>
          <input type="number" id="master-payable-term" class="w-full ios-input py-2.5 font-extrabold text-main" placeholder="0" oninput="calcSmartPayable()">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-1.5">
        <div>
          <label for="master-payable-interest" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="percent"></i></span><span class="field-label-text">Interest / Month (%)</span></label>
          <input type="number" step="0.01" id="master-payable-interest" class="w-full ios-input py-2.5 font-extrabold text-main" placeholder="e.g., 2.5" oninput="calcSmartPayable()">
        </div>
        <div>
          <label for="master-payable-admin" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="receipt"></i></span><span class="field-label-text">Admin Fee (Rp)</span></label>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-xs">Rp</span>
            <input type="text" inputmode="numeric" id="master-payable-admin" class="w-full ios-input pl-9 py-2.5 font-extrabold text-main" placeholder="0" oninput="formatInputRupiah(this); calcSmartPayable();">
          </div>
        </div>
      </div>
      </div>

      <div class="border-t border-[var(--border-color)] my-3 pt-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="master-payable-total" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="banknote"></i></span><span class="field-label-text" id="master-payable-total-label">Total Debt (Principal)</span></label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-xs">Rp</span>
              <input type="text" inputmode="numeric" id="master-payable-total" class="w-full ios-input pl-9 py-2.5 font-black text-mochi" placeholder="0" oninput="formatInputRupiah(this)" required>
            </div>
          </div>
          <div>
            <label for="master-payable-installment" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="repeat"></i></span><span class="field-label-text">Monthly Installment</span></label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-xs">Rp</span>
              <input type="text" inputmode="numeric" id="master-payable-installment" class="w-full ios-input pl-9 py-2.5 font-black text-mochi" placeholder="0" oninput="formatInputRupiah(this)">
            </div>
          </div>
        </div>
      </div>
      <!-- END SMART HYBRID CALCULATOR -->

      <div class="grid grid-cols-2 gap-3 mt-2">
        <div>
          <label for="master-payable-start" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="calendar"></i></span><span class="field-label-text">Disbursed Date</span></label>
          <input type="date" id="master-payable-start" class="w-full ios-input py-2 px-2 text-xs">
        </div>
        <div>
          <label for="master-payable-due" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="calendar-clock"></i></span><span class="field-label-text">Due Date</span></label>
          <input type="date" id="master-payable-due" class="w-full ios-input py-2 px-2 text-xs">
        </div>
      </div>
      <div>
        <label for="master-payable-account" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="wallet"></i></span><span class="field-label-text">Payment Account</span></label>
        <select id="master-payable-account" class="w-full ios-input cursor-pointer py-2.5">
          <option value="">-- Select Account --</option>
          ${accountOptions}
        </select>
      </div>
      <div>
        <label for="master-payable-notes" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="align-left"></i></span><span class="field-label-text">Notes</span></label>
        <input type="text" id="master-payable-notes" class="w-full ios-input py-2.5" placeholder="Additional notes...">
      </div>
      <label class="flex items-start gap-3 mt-1 p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] cursor-pointer transition-colors">
        <span class="relative flex items-center justify-center w-5 h-5 mt-0.5 flex-shrink-0">
          <input type="checkbox" id="master-payable-skip-disbursement" class="peer sr-only">
          <span class="w-5 h-5 rounded-md border-2 border-[var(--border-color)] peer-checked:border-mochi peer-checked:bg-mochi transition-colors duration-150"></span>
          <i data-lucide="check" class="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity duration-150 pointer-events-none"></i>
        </span>
        <span class="text-xs text-muted leading-snug font-semibold">Skip auto-disbursement — this is a backdated debt already recorded manually, don't create a duplicate "Borrow Money" transaction.</span>
      </label>
    `;

    setTimeout(() => {
      document.getElementById('master-payable-start').valueAsDate = new Date();
      if (presetType) document.getElementById('master-payable-type').value = presetType;
      togglePayableFields();
    }, 50);
}

function buildReceivableMasterModal({ isEdit, titleEl, extraEl }) {
    titleEl.innerText = isEdit ? "Edit Receivable" : "Add New Receivable";

    const accountOptions = (GLOBAL_DATA.accounts || []).map(a => `<option value="${escapeAttr(a.accountName)}">${escapeHtml(a.accountName)}</option>`).join('');

    extraEl.innerHTML = `
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="master-receivable-type" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="hand-coins"></i></span><span class="field-label-text">Receivable Type</span></label>
          <select id="master-receivable-type" class="w-full ios-input cursor-pointer py-2.5" onchange="toggleReceivableFields()">
            <option value="Shopping Reimbursement">Reimbursement</option>
            <option value="Informal Loan">Informal Loan</option>
            <option value="Structured Loan">Structured Loan</option>
          </select>
        </div>
        <div>
          <label for="master-receivable-owner" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="user"></i></span><span class="field-label-text">Owner</span></label>
          <select id="master-receivable-owner" class="w-full ios-input cursor-pointer py-2.5">
            <option value="Yosa">Yosa</option>
            <option value="Fani">Fani</option>
            <option value="Yosa & Fani">Yosa & Fani</option>
          </select>
        </div>
      </div>
      <div>
        <label for="master-receivable-from" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="user-round"></i></span><span class="field-label-text">Debtor / Borrower</span></label>
        <input type="text" id="master-receivable-from" class="w-full ios-input py-2.5" placeholder="e.g., Mom / Friend">
      </div>
      
      <!-- STRUCTURED LOAN FIELDS -->
      <div id="receivable-structured-fields" class="hidden space-y-3 mt-3 border-t border-[var(--border-color)] pt-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="master-receivable-net" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="banknote"></i></span><span class="field-label-text">Net Principal</span></label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-xs">Rp</span>
              <input type="text" inputmode="numeric" id="master-receivable-net" class="w-full ios-input pl-9 py-2.5 font-extrabold text-main" placeholder="0" oninput="formatInputRupiah(this); calcSmartReceivable();">
            </div>
          </div>
          <div>
            <label for="master-receivable-term" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="clock"></i></span><span class="field-label-text">Tenor (Months)</span></label>
            <input type="number" id="master-receivable-term" class="w-full ios-input py-2.5 font-extrabold text-main" placeholder="0" oninput="calcSmartReceivable()">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mt-1.5">
          <div>
            <label for="master-receivable-interest" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="percent"></i></span><span class="field-label-text">Interest / Month (%)</span></label>
            <input type="number" step="0.01" id="master-receivable-interest" class="w-full ios-input py-2.5 font-extrabold text-main" placeholder="e.g., 2.5" oninput="calcSmartReceivable()">
          </div>
          <div>
            <label for="master-receivable-admin" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="receipt"></i></span><span class="field-label-text">Admin Fee (Rp)</span></label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-xs">Rp</span>
              <input type="text" inputmode="numeric" id="master-receivable-admin" class="w-full ios-input pl-9 py-2.5 font-extrabold text-main" placeholder="0" oninput="formatInputRupiah(this); calcSmartReceivable();">
            </div>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label for="master-receivable-total" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="banknote"></i></span><span class="field-label-text">Total Receivable Amount</span></label>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-xs">Rp</span>
            <input type="text" inputmode="numeric" id="master-receivable-total" class="w-full ios-input pl-9 py-2.5 font-black amount-info" placeholder="0" oninput="formatInputRupiah(this)" required>
          </div>
        </div>
        <div>
          <label for="master-receivable-installment" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="repeat"></i></span><span class="field-label-text">Monthly Installment</span></label>
          <div class="relative">
            <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-xs">Rp</span>
            <input type="text" inputmode="numeric" id="master-receivable-installment" class="w-full ios-input pl-9 py-2.5 font-black amount-info" placeholder="Optional" oninput="formatInputRupiah(this)">
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mt-2">
        <div>
          <label for="master-receivable-occurred" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="calendar"></i></span><span class="field-label-text">Loan Date</span></label>
          <input type="date" id="master-receivable-occurred" class="w-full ios-input py-2 px-2 text-xs">
        </div>
        <div>
          <label for="master-receivable-return" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="calendar-check"></i></span><span class="field-label-text">Target Date</span></label>
          <input type="date" id="master-receivable-return" class="w-full ios-input py-2 px-2 text-xs">
        </div>
      </div>
      <div>
        <label for="master-receivable-account" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="wallet"></i></span><span class="field-label-text">Source / Receiving Account</span></label>
        <select id="master-receivable-account" class="w-full ios-input cursor-pointer py-2.5">
          <option value="">-- Select Account --</option>
          ${accountOptions}
        </select>
      </div>
      <div>
        <label for="master-receivable-notes" class="field-label mb-1.5 cursor-pointer"><span class="field-label-icon"><i data-lucide="align-left"></i></span><span class="field-label-text">Notes</span></label>
        <textarea id="master-receivable-notes" rows="2" class="w-full ios-input py-2.5" placeholder="Reimbursement notes..."></textarea>
      </div>
      <label class="flex items-start gap-3 mt-1 p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] cursor-pointer transition-colors">
        <span class="relative flex items-center justify-center w-5 h-5 mt-0.5 flex-shrink-0">
          <input type="checkbox" id="master-receivable-skip-disbursement" class="peer sr-only">
          <span class="w-5 h-5 rounded-md border-2 border-[var(--border-color)] peer-checked:border-mochi peer-checked:bg-mochi transition-colors duration-150"></span>
          <i data-lucide="check" class="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity duration-150 pointer-events-none"></i>
        </span>
        <span class="text-xs text-muted leading-snug font-semibold">Skip auto-disbursement — this is a backdated loan already recorded manually, don't create a duplicate "Lend Money" transaction.</span>
      </label>
    `;

    setTimeout(() => {
      document.getElementById('master-receivable-occurred').valueAsDate = new Date();
    }, 50);
}


function toggleReceivableFields() {
  const type = document.getElementById('master-receivable-type').value;
  const wrap = document.getElementById('receivable-structured-fields');
  if (wrap) {
    if (type === 'Structured Loan') wrap.classList.remove('hidden');
    else wrap.classList.add('hidden');
  }
}

function calcSmartReceivable() {
  const getCleanNum = (id) => Number(document.getElementById(id).value.replace(/[^0-9]/g, '')) || 0;
  
  const net = getCleanNum('master-receivable-net');
  const term = Number(document.getElementById('master-receivable-term').value) || 0;
  const interest = Number(document.getElementById('master-receivable-interest').value) || 0;
  const admin = getCleanNum('master-receivable-admin');

  if (net > 0) {
    const totalInterest = net * (interest / 100) * term;
    const totalDebt = Math.round(net + totalInterest + admin);
    
    document.getElementById('master-receivable-total').value = new Intl.NumberFormat('id-ID').format(totalDebt);
    
    if (term > 0) {
      document.getElementById('master-receivable-installment').value = new Intl.NumberFormat('id-ID').format(Math.round(totalDebt / term));
    }
  }
}

function toggleAccountCurrencyFields() {
  const currencyEl = document.getElementById('master-account-currency');
  const wrap = document.getElementById('account-fx-initial-wrap');
  if (!currencyEl || !wrap) return;
  wrap.classList.toggle('hidden', currencyEl.value !== 'USD');
}

function toggleTreasuryPriceFields() {
  const sourceEl = document.getElementById('master-treasury-source');
  const tickerWrap = document.getElementById('treasury-ticker-wrap');
  const manualWrap = document.getElementById('treasury-manual-price-wrap');
  if (!sourceEl || !tickerWrap || !manualWrap) return;
  const isGoogleFinance = sourceEl.value === 'GoogleFinance';
  tickerWrap.classList.toggle('hidden', !isGoogleFinance);
  // Manual price stays visible either way — it's also the fallback when a
  // GoogleFinance ticker errors out, so it's never truly unused.
}

function togglePayableFields() {
  const type = document.getElementById('master-payable-type').value;
  const wrap = document.getElementById('payable-structured-fields');
  const totalLabel = document.getElementById('master-payable-total-label');
  if (wrap) {
    if (type === 'Informal Loan') {
      wrap.classList.add('hidden');
      if (totalLabel) totalLabel.textContent = 'Total Owed';
    } else {
      wrap.classList.remove('hidden');
      if (totalLabel) totalLabel.textContent = 'Total Debt (Principal)';
    }
  }
}

function calcSmartPayable() {
  const getCleanNum = (id) => Number(document.getElementById(id).value.replace(/[^0-9]/g, '')) || 0;
  
  const net = getCleanNum('master-payable-net');
  const term = Number(document.getElementById('master-payable-term').value) || 0;
  const interest = Number(document.getElementById('master-payable-interest').value) || 0;
  const admin = getCleanNum('master-payable-admin');

  if (net > 0) {
    const totalInterest = net * (interest / 100) * term;
    const totalDebt = Math.round(net + totalInterest + admin);
    
    document.getElementById('master-payable-total').value = new Intl.NumberFormat('id-ID').format(totalDebt);
    
    if (term > 0) {
      document.getElementById('master-payable-installment').value = new Intl.NumberFormat('id-ID').format(Math.round(totalDebt / term));
    }
  }
}
    
// ===== 2. OPEN EDIT PAYABLE WITH FULL FIELDS =====
