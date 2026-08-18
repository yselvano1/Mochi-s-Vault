function showKpiDetail(kpiName) {
      currentModalBackFn = null;
      let kpiColor = 'text-main';
      if (kpiName === 'Total Cash' || kpiName === 'Net Operating Savings' || kpiName === 'Disposable Income') kpiColor = 'amount-in';
      else if (kpiName === 'Total Receivables') kpiColor = 'amount-info';
      else if (kpiName === 'Total Payables') kpiColor = 'amount-out';

      let displayValue = GLOBAL_DATA.kpi[kpiName] || 0;

      // --- SINKRONISASI LOGIKA FRONT-END ---
      let calcTotalCash = 0;
      let calcTotalLiabilities = 0;

      (GLOBAL_DATA.accounts || []).forEach(a => {
        const meta = getAccountIconMeta(a.accountName, a.accountType);
        const bal = Number(a.runningBalance) || 0;
        if (meta.isLiability) {
          calcTotalLiabilities += Math.abs(bal);
        } else {
          calcTotalCash += bal;
        }
      });

      (GLOBAL_DATA.payables || []).forEach(p => {
        const st = (p.status || '').toLowerCase().trim();
        const rem = Math.abs(Number(p.remainingAmount) || 0);
        if ((st === 'active' || st === 'aktif') && rem > 0) calcTotalLiabilities += rem;
      });

      const calcTotalReceivables = Number(GLOBAL_DATA.kpi['Total Receivables']) || 0;
      const calcNetWorth = calcTotalCash + calcTotalReceivables - calcTotalLiabilities;

      // Timpa displayValue bawaan backend dengan hasil hitungan murni Front-end
      if (kpiName === 'Total Payables') displayValue = calcTotalLiabilities;
      else if (kpiName === 'Total Cash') displayValue = calcTotalCash;
      else if (kpiName === 'Net Worth') displayValue = calcNetWorth;

      let html = `<div class="space-y-4 pt-1">
          <div class="text-center pb-2">
            <span class="text-2xs font-bold px-3 py-1 rounded-full bg-[var(--bg-subtle-2)] text-main uppercase tracking-wider mb-2 inline-block">KPI Overview</span>
            <h3 class="text-lg font-extrabold text-main leading-tight">${escapeHtml(kpiName)}</h3>
            <p class="text-3xl font-black mt-2 ${kpiColor}">${formatRupiah(displayValue)}</p>
          </div>
          <div class="ios-input space-y-2 text-xs font-semibold text-muted py-4 px-5">
      `;
  html += buildKpiDetailBranches(kpiName, calcTotalCash, calcTotalReceivables, calcTotalLiabilities, calcNetWorth);

      html += `</div></div>`;
      document.getElementById('modal-detail-inner').innerHTML = html;
      openModal('modalDetail');
}

function buildKpiDetailBranches(kpiName, calcTotalCash, calcTotalReceivables, calcTotalLiabilities, calcNetWorth) {
  let html = '';
      if (kpiName === 'Net Worth') {
        html += `
          <p class="font-extrabold text-main mb-3 text-4xs">Net Worth Breakdown:</p>
          <div class="flex justify-between border-b border-[var(--border-color)] pb-2"><span>Total Cash & Savings:</span> <span class="font-extrabold amount-in">${formatRupiah(calcTotalCash)}</span></div>
          <div class="flex justify-between border-b border-[var(--border-color)] pb-2 mt-2"><span>Total Receivables:</span> <span class="font-extrabold amount-info">${formatRupiah(calcTotalReceivables)}</span></div>
          <div class="flex justify-between amount-out pb-2 mt-2"><span>Total Liabilities (-):</span> <span class="font-extrabold">${formatRupiah(calcTotalLiabilities)}</span></div>
          <div class="flex justify-between font-black text-main pt-3 mt-1 border-t border-[var(--border-color)] text-4xs"><span>Net Worth:</span> <span>${formatRupiah(calcNetWorth)}</span></div>
        `;
      } else if (kpiName === 'Disposable Income') {
        html += `<p class="font-extrabold text-main mb-2 text-4xs">Note:</p><p class="text-muted leading-relaxed font-semibold">Remaining daily operational cash available for consumption and savings after deducting monthly commitments.</p>`;
      } else if (kpiName === 'Total Cash') {
        html += `<p class="font-extrabold text-main mb-3 text-4xs">Account Balances:</p><div class="space-y-3 max-h-48 overflow-y-auto pr-1">`;
        (GLOBAL_DATA.accounts || []).forEach(a => { 
          const meta = getAccountIconMeta(a.accountName, a.accountType);
          if (!meta.isLiability) {
            const cls = a.runningBalance < 0 ? "amount-out" : "amount-in";
            html += `<div class="flex justify-between border-b border-[var(--border-color)] pb-2"><span>${escapeHtml(a.accountName)} (${escapeHtml(a.owner)}):</span> <span class="font-extrabold ${cls}">${formatRupiah(a.runningBalance)}</span></div>`; 
          }
        });
        html += `</div>`;
      } else if (kpiName === 'Total Receivables') {
        html += `<p class="font-extrabold text-main mb-3 text-4xs">Receivables Breakdown:</p><div class="space-y-3 max-h-48 overflow-y-auto pr-1">`;
        (GLOBAL_DATA.receivables || []).forEach(r => { html += `<div class="flex justify-between border-b border-[var(--border-color)] pb-2"><span>${escapeHtml(r.receivableName)}:</span> <span class="font-extrabold amount-info">${formatRupiah(r.remainingAmount)}</span></div>`; });
        html += `</div>`;
      } else if (kpiName === 'Total Payables') {
        html += `<p class="font-extrabold text-main mb-3 text-4xs">Payables & Credit Card Bills:</p><div class="space-y-3 max-h-56 overflow-y-auto pr-1">`;
        
        let hasPayables = false;

        (GLOBAL_DATA.accounts || []).forEach(a => {
          const meta = getAccountIconMeta(a.accountName, a.accountType);
          const rawBal = Number(a.runningBalance) || 0;
          const bal = Math.abs(rawBal);

          if (meta.isLiability && bal > 0) {
            hasPayables = true;
            let ownerTag = "";
            if (a.owner && !a.accountName.toLowerCase().includes(a.owner.toLowerCase())) {
              ownerTag = ` (${escapeHtml(a.owner)})`;
            }

            html += `<div class="flex justify-between border-b border-[var(--border-color)] pb-2">
              <span>${escapeHtml(a.accountName)}${ownerTag}:</span> 
              <span class="font-extrabold amount-out">${formatRupiah(bal)}</span>
            </div>`;
          }
        });

        (GLOBAL_DATA.payables || []).forEach(p => {
          const st = (p.status || '').toLowerCase().trim();
          const rem = Math.abs(Number(p.remainingAmount) || 0);
          if ((st === 'active' || st === 'aktif') && rem > 0) {
            hasPayables = true;
            html += `<div class="flex justify-between border-b border-[var(--border-color)] pb-2">
              <span>${escapeHtml(p.payableName)} (Installment):</span> 
              <span class="font-extrabold amount-out">${formatRupiah(rem)}</span>
            </div>`;
          }
        });

        if (!hasPayables) {
          html += `<p class="text-xs text-faint italic py-2 text-center">No active payables or credit card bills.</p>`;
        }

        html += `</div>`;
      } else if (kpiName === 'Net Operating Savings') {
        html += `<p class="font-extrabold text-main mb-2 text-4xs">Note:</p><p class="text-muted leading-relaxed font-semibold">Net difference between total operational income and operational expenses.</p>`;
      }

  return html;
}


    function showTransactionDetail(transactionId) {
      const trx = GLOBAL_DATA.transactions.find(t => t.transactionId === transactionId);
      if (!trx) return;

      const meta = getTypeMeta(trx.type);
      const m = getCategoryIconMeta(trx.category, trx.type);

      let html = `<div class="space-y-4 pt-1">`;
      if (currentModalBackFn) {
        window.isNestedModalView = true;
        html += `<button onclick="vibrate(30); window.isNestedModalView = false; currentModalBackFn()" class="tap-shrink text-xs font-extrabold text-main flex items-center mb-2 transition-colors"><i data-lucide="arrow-left" class="w-4 h-4 mr-1"></i> Back</button>`;
      } else { window.isNestedModalView = false; }

      html += `
        <div class="text-center flex flex-col items-center mb-5 pb-4 border-b border-[var(--border-color)]/60 dark:border-[var(--border-color)]">
          <span class="text-2xs font-mono font-black tracking-wider px-3 py-1 rounded-full bg-[var(--bg-subtle-2)] dark:bg-[var(--bg-subtle)] text-main mb-4 shadow-sm border border-[var(--border-color)]">REF: ${escapeHtml(trx.transactionId)}</span>
          <div class="icon-chip ${m.chip} w-14 h-14 rounded-2xl mb-3 shadow-sm border border-[var(--border-color)]"><i data-lucide="${m.icon}" class="w-6 h-6"></i></div>
          <h3 class="text-base font-extrabold text-main leading-snug px-4">${escapeHtml(trx.description || trx.category)}</h3>
          <p class="text-3xl font-black mt-1.5 tracking-tight ${meta.cls}">${meta.prefix}${formatRupiah(trx.amount)}</p>
          <span class="text-2xs font-black px-3.5 py-1 rounded-full bg-[var(--bg-subtle-2)] dark:bg-[var(--bg-subtle)] text-main mt-2.5 uppercase tracking-wider shadow-sm border border-[var(--border-color)]">${escapeHtml(trx.type)}</span>
        </div>

        <div class="bg-[var(--bg-subtle)] dark:bg-[var(--bg-subtle)] rounded-2xl p-5 border border-[var(--border-color)]/60 dark:border-[var(--border-color)] space-y-2.5 text-xs font-semibold">
          <div class="flex justify-between items-center pb-2 border-b border-[var(--border-color)]/40 dark:border-[var(--border-color)]"><span class="text-muted">Date</span><span class="font-extrabold text-main">${formatDateWithTime(trx.date)}</span></div>
          <div class="flex justify-between items-center pb-2 border-b border-[var(--border-color)]/40 dark:border-[var(--border-color)]"><span class="text-muted">Category</span><span class="font-extrabold text-main">${escapeHtml(trx.category)}</span></div>
          ${trx.sourceAccount ? `<div class="flex justify-between items-center pb-2 border-b border-[var(--border-color)]/40 dark:border-[var(--border-color)]"><span class="text-muted">Source Account</span><span class="font-extrabold text-main">${escapeHtml(trx.sourceAccount)}</span></div>` : ''}
          ${trx.targetAccount ? `<div class="flex justify-between items-center pb-2 border-b border-[var(--border-color)]/40 dark:border-[var(--border-color)]"><span class="text-muted">Target Account</span><span class="font-extrabold text-main">${escapeHtml(trx.targetAccount)}</span></div>` : ''}
          ${trx.relatedPayable ? `<div class="flex justify-between items-center pb-2 border-b border-[var(--border-color)]/40 dark:border-[var(--border-color)]"><span class="text-muted">Related Payable</span><span class="font-extrabold text-main">${escapeHtml(trx.relatedPayable)}</span></div>` : ''}
          ${trx.relatedReceivable ? `<div class="flex justify-between items-center pb-2 border-b border-[var(--border-color)]/40 dark:border-[var(--border-color)]"><span class="text-muted">Related Receivable</span><span class="font-extrabold text-main">${escapeHtml(trx.relatedReceivable)}</span></div>` : ''}
          <div class="flex justify-between items-center pt-0.5"><span class="text-muted">Input By</span><span class="font-extrabold text-main">${escapeHtml(trx.enteredBy)}</span></div>
        </div>

        ${trx.notes ? `<div class="text-xs bg-[var(--chip-info-bg)] p-3.5 rounded-2xl amount-info border border-[var(--border-color)]"><span class="font-bold block mb-0.5">Notes:</span><span class="font-medium leading-relaxed block">${escapeHtml(trx.notes)}</span></div>` : ''}

        <div class="flex space-x-3 pt-3">
          <button onclick="handleEditTransaction('${trx.transactionId}')" class="flex-1 py-3.5 bg-obsidian dark:bg-white text-white dark:text-obsidian font-extrabold rounded-xl tap-shrink text-xs shadow-md transition-colors flex items-center justify-center"><i data-lucide="edit-3" class="w-3.5 h-3.5 mr-1.5"></i> Edit</button>
          <button onclick="promptDeleteTransaction('${trx.transactionId}')" class="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-xl tap-shrink text-xs shadow-md transition-colors flex items-center justify-center border border-rose-600"><i data-lucide="trash-2" class="w-3.5 h-3.5 mr-1.5"></i> Delete</button>
        </div>
      </div>`;

      document.getElementById('modal-detail-inner').innerHTML = html;
      openModal('modalDetail');
      lucide.createIcons();
    }

        function showIncomeDetail() {
      currentModalBackFn = null;
      window.isNestedModalView = false;
      const history = window.currentFilteredHistory || [];
      const incomes = history.filter(t => t.type === 'Income');
      const total = incomes.reduce((s, t) => s + (Number(t.amount)||0), 0);

      let html = `<div class="space-y-4 pt-1">
        <div class="text-center pb-2">
          <span class="text-2xs font-bold px-3 py-1 rounded-full bg-[var(--chip-in-bg)] amount-in uppercase tracking-wider mb-2 inline-block">Real Income Insight</span>
          <h3 class="text-lg font-extrabold text-main leading-tight">Total Income</h3>
          <p class="text-3xl font-black mt-2 amount-in">+${formatRupiah(total)}</p>
        </div>
        <p class="text-xs text-muted font-semibold text-center px-4 mb-2">Only counts incoming money that is truly revenue (salary, bonus, interest, etc).</p>
        <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">`;
      
      if (incomes.length === 0) {
        html += `<p class="text-xs text-center text-muted py-6 font-semibold">No income recorded in this period.</p>`;
      } else {
        incomes.forEach(t => {
          html += `<div class="flex justify-between items-center text-xs p-3.5 floating-item border border-[var(--border-color)] select-none">
            <div class="truncate pr-2">
              <p class="font-bold text-main truncate">${escapeHtml(t.category)}</p>
              <p class="text-2xs text-faint font-semibold mt-0.5 truncate">${escapeHtml(t.description)}</p>
            </div>
            <span class="font-black amount-in whitespace-nowrap text-4xs font-numeric">+${formatRupiah(t.amount)}</span>
          </div>`;
        });
      }
      html += `</div></div>`;
      document.getElementById('modal-detail-inner').innerHTML = html;
      openModal('modalDetail');
    }

    function showExpenseDetail() {
      currentModalBackFn = null;
      window.isNestedModalView = false;
      const history = window.currentFilteredHistory || [];
      const expenses = history.filter(t => t.type === 'Expense');
      const total = expenses.reduce((s, t) => s + (Number(t.amount)||0), 0);

      const groups = {};
      expenses.forEach(t => {
        const cat = t.category || 'Others';
        groups[cat] = (groups[cat] || 0) + (Number(t.amount) || 0);
      });
      const sorted = Object.entries(groups).sort((a,b) => b[1] - a[1]);

      let html = `<div class="space-y-4 pt-1">
        <div class="text-center pb-2">
          <span class="text-2xs font-bold px-3 py-1 rounded-full bg-[var(--chip-out-bg)] amount-out uppercase tracking-wider mb-2 inline-block">Real Expense Insight</span>
          <h3 class="text-lg font-extrabold text-main leading-tight">Total Expenses</h3>
          <p class="text-3xl font-black mt-2 amount-out">-${formatRupiah(total)}</p>
        </div>
        <p class="text-xs text-muted font-semibold text-center px-4 mb-2">Only counts consumptive expenses (Paying debts / giving loans are not counted here).</p>
        <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">`;
      
      if (sorted.length === 0) {
        html += `<p class="text-xs text-center text-muted py-6 font-semibold">No expense recorded in this period.</p>`;
      } else {
        sorted.forEach(([cat, amt]) => {
          const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : 0;
          html += `<div class="flex justify-between items-center text-xs p-3.5 floating-item border border-[var(--border-color)] select-none">
            <div class="truncate pr-2">
              <p class="font-bold text-main truncate">${escapeHtml(cat)}</p>
              <p class="text-2xs text-faint font-semibold mt-0.5 truncate">${pct}% of total expenses</p>
            </div>
            <span class="font-black amount-out whitespace-nowrap text-4xs font-numeric">${formatRupiah(amt)}</span>
          </div>`;
        });
      }
      html += `</div></div>`;
      document.getElementById('modal-detail-inner').innerHTML = html;
      openModal('modalDetail');
    }

    function showNetSurplusDetail() {
      currentModalBackFn = null;
      window.isNestedModalView = false;
      const history = window.currentFilteredHistory || [];
      let realIncome = 0, realExpense = 0, otherIn = 0, otherOut = 0;
      
      history.forEach(t => {
        const amt = Number(t.amount) || 0;
        const dir = getTypeMeta(t.type).direction;
        
        if (t.type === 'Income') realIncome += amt;
        else if (t.type === 'Expense') realExpense += amt;
        else if (dir === 'in') otherIn += amt;
        else if (dir === 'out') otherOut += amt;
      });

      const netSurplus = realIncome - realExpense;
      const physicalCashChange = netSurplus + otherIn - otherOut;
      const pColor = physicalCashChange >= 0 ? 'amount-in' : 'amount-out';

      let html = `<div class="space-y-4 pt-1">
        <div class="text-center pb-2">
          <span class="text-2xs font-bold px-3 py-1 rounded-full bg-[var(--bg-subtle-2)] text-main uppercase tracking-wider mb-2 inline-block">Cashflow Bridge</span>
          <h3 class="text-lg font-extrabold text-main leading-tight">Cashflow Bridge</h3>
        </div>
        
        <div class="ios-input p-5 space-y-3 bg-[var(--bg-subtle-2)] border border-[var(--border-color)]">
          <div class="flex justify-between items-center text-xs">
            <span class="text-muted font-bold">Real Income:</span>
            <span class="font-black amount-in font-numeric">+${formatRupiah(realIncome)}</span>
          </div>
          <div class="flex justify-between items-center text-xs pb-3 border-b border-[var(--border-color)]">
            <span class="text-muted font-bold">Real Expense:</span>
            <span class="font-black amount-out font-numeric">-${formatRupiah(realExpense)}</span>
          </div>
          <div class="flex justify-between items-center text-4xs pt-1">
            <span class="text-main font-black">Net Surplus:</span>
            <span class="font-black text-main font-numeric">${formatRupiah(netSurplus)}</span>
          </div>
        </div>

        <div class="px-2">
          <p class="text-xs text-muted font-semibold text-center mb-4 leading-relaxed">Even though your Real Surplus is <strong>${formatRupiah(netSurplus)}</strong>, your physical cash (in wallet/bank) changed by the amount below due to non-P&L transactions (e.g., paying debts or receiving reimbursements).</p>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-2">
          <div class="p-3.5 bg-[var(--bg-subtle)] dark:bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)]">
            <span class="text-2xs text-muted font-bold block mb-1 uppercase tracking-wider">Physical Cash In</span>
            <span class="text-sm font-black amount-in font-numeric">+${formatRupiah(otherIn)}</span>
          </div>
          <div class="p-3.5 bg-[var(--bg-subtle)] dark:bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)]">
            <span class="text-2xs text-muted font-bold block mb-1 uppercase tracking-wider">Physical Cash Out</span>
            <span class="text-sm font-black amount-out font-numeric">-${formatRupiah(otherOut)}</span>
          </div>
        </div>
        
        <div class="flex justify-between items-center p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm">
          <span class="text-3xs font-black text-main uppercase tracking-wider">Physical Cash Change</span>
          <span class="text-lg font-black ${pColor} font-numeric">${physicalCashChange >= 0 ? '+' : ''}${formatRupiah(physicalCashChange)}</span>
        </div>

      </div>`;
      document.getElementById('modal-detail-inner').innerHTML = html;
      openModal('modalDetail');
    }


    function showAccountHistory(accountName) {
      currentModalBackFn = () => showAccountHistory(accountName);
      window.isNestedModalView = false;
      const fullHistory = (GLOBAL_DATA.transactions || []).filter(t => t.sourceAccount === accountName || t.targetAccount === accountName);
      const historyItems = fullHistory.slice(0, 50);

      let html = `
        <div class="border-b border-[var(--border-color)] pb-4 mb-4 pr-6">
          <span class="text-2xs font-bold px-3 py-1 rounded-full bg-[var(--bg-subtle-2)] text-muted uppercase tracking-wider mb-2 inline-block">Account History</span>
          <h3 class="text-lg font-extrabold text-main leading-tight">${escapeHtml(accountName)}</h3>
        </div>
        <div class="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
      `;

      if (historyItems.length === 0) {
        html += `
          <div class="text-center py-8 px-4">
            <div class="w-12 h-12 rounded-2xl bg-[var(--bg-subtle-2)] flex items-center justify-center mx-auto mb-3 border border-[var(--border-color)]">
              <i data-lucide="receipt" class="w-6 h-6 text-faint"></i>
            </div>
            <p class="text-xs font-bold text-main">No Transactions Yet</p>
            <p class="text-3xs text-faint mt-1">Transactions for this account will show up here 🐾</p>
          </div>
        `;
      } else {
        historyItems.forEach(t => {
          const meta = getTypeMeta(t.type);
          html += `
            <div onclick="vibrate(30); showTransactionDetail('${t.transactionId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" class="flex justify-between items-center text-xs p-3.5 floating-item cursor-pointer card-hover transition tap-shrink select-none">
              <div class="flex items-center space-x-3 min-w-0 flex-1 pr-2 pointer-events-none">
                <div class="truncate">
                  <p class="font-bold text-main truncate">${escapeHtml(t.description || t.category)}</p>
                  <p class="text-2xs text-faint font-semibold mt-0.5 truncate">${formatDateWithTime(t.date)}</p>
                </div>
              </div>
              <span class="font-black flex-shrink-0 whitespace-nowrap text-4xs ${meta.cls} pointer-events-none">${meta.prefix}${formatRupiah(t.amount)}</span>
            </div>
          `;
        });
      }
      html += `</div>`;
      document.getElementById('modal-detail-inner').innerHTML = html;
      openModal('modalDetail');
      lucide.createIcons();
    }

    function showPayableDetail(item, isAccount = false) {
  if (!item) return;
  const name = isAccount ? item.accountName : item.payableName;
  currentModalBackFn = () => showPayableDetail(item, isAccount);
  window.isNestedModalView = false;
  resetSettleSelectionIfNeeded(name);

  const type = isAccount ? item.accountType : (item.payableType || 'Payable');
  const rawAmt = isAccount ? item.runningBalance : item.remainingAmount;
  const amount = Math.abs(Number(rawAmt) || 0);

  const isPayLater = isAccount && (name.toLowerCase().includes('paylater') || name.toLowerCase().includes('spaylater') || type.toLowerCase().includes('paylater'));
  const isCreditCard = isAccount && !isPayLater;

  const initial = isAccount ? amount : (Number(item.initialAmount) || amount);
  const paid = Math.max(0, initial - amount);
  const pctPaid = initial > 0 ? Math.min(100, Math.round((paid / initial) * 100)) : 0;
  const minPay = isCreditCard ? Math.max(50000, Math.round(amount * 0.10)) : amount;

  // Only show the ORIGIN line items here (the money you actually fronted/lent),
  // never the resolution transactions that settle them (Pay Installment,
  // Debt Forgiven, etc). Those still get created for real — they're what
  // actually moves the remaining-balance formula — but showing them as their
  // own separate row here was confusing: an item you already see checked off
  // doesn't need a second "Collected 1 item(s): X" row next to it. The
  // resolution transactions remain fully visible in the main History tab.
  const relatedTrx = isAccount 
    ? (GLOBAL_DATA.transactions || []).filter(t => t.sourceAccount === name || t.targetAccount === name)
    : (GLOBAL_DATA.transactions || []).filter(t => t.relatedPayable === name && t.linkRole === 'OPEN');

  let html = `
    <div class="space-y-4 pt-1">
      <div class="border-b border-[var(--border-color)] pb-4 pr-6">
        <span class="text-2xs font-bold px-3 py-1 rounded-full bg-[var(--chip-out-bg)] amount-out uppercase tracking-wider mb-2 inline-block">
          ${isCreditCard ? 'Kartu Kredit' : (isPayLater ? 'PayLater • Full Payment' : 'Term Loan / Cicilan')}
        </span>
        <h3 class="text-xl font-black text-main leading-tight">${escapeHtml(name)}</h3>
        ${!isAccount ? (
          item.status === 'FORGIVEN' ? renderAgingBucketBadge('WRITTEN_OFF', 0)
          : (item.dueDate && item.remainingAmount > 0 && getAgingBucket(item.dueDate) ? (a => renderAgingBucketBadge(a.bucket, a.daysOverdue))(getAgingBucket(item.dueDate)) : '')
        ) : ''}
      </div>

      <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-[var(--shadow-item)] space-y-2.5 text-xs font-semibold text-muted p-5">
        <div class="flex justify-between border-b border-[var(--border-color)] pb-2">
          <span>Liability Category:</span> 
          <span class="font-extrabold text-main">${escapeHtml(type)}</span>
        </div>
        ${!isAccount && item.owedTo ? `<div class="flex justify-between border-b border-[var(--border-color)] pb-2"><span>Creditor / Provider:</span> <span class="font-extrabold text-main">${escapeHtml(item.owedTo)}</span></div>` : ''}
        
        <div class="flex justify-between border-b border-[var(--border-color)] pb-2">
          <span>${isAccount ? 'Billed Statement Balance:' : 'Total Principal / Initial Debt:'}</span> 
          <span class="font-extrabold text-main font-numeric">${formatRupiah(isAccount ? amount : initial)}</span>
        </div>

        ${isCreditCard ? `
          <div class="flex justify-between border-b border-[var(--border-color)] pb-2">
            <span>Minimum Payment Due:</span> 
            <span class="font-extrabold text-main font-numeric">${formatRupiah(minPay)}</span>
          </div>
        ` : ''}
        
        ${!isAccount && item.termMonths ? `<div class="flex justify-between border-b border-[var(--border-color)] pb-2"><span>Loan Term:</span> <span class="font-extrabold text-main">${item.termMonths} Months</span></div>` : ''}
        ${!isAccount && item.monthlyInstallment ? `<div class="flex justify-between border-b border-[var(--border-color)] pb-2"><span>Monthly Installment:</span> <span class="font-extrabold amount-out font-numeric">${formatRupiah(item.monthlyInstallment)}/mo</span></div>` : ''}
        ${!isAccount && item.dueDate ? `<div class="flex justify-between border-b border-[var(--border-color)] pb-2"><span>Tanggal Due Date:</span> <span class="font-extrabold text-main">${formatDate(item.dueDate)}</span></div>` : ''}

        <div class="flex justify-between pt-1 items-center">
          <span>Remaining Bill:</span> 
          <span class="font-black amount-out text-base font-numeric">${formatRupiah(amount)}</span>
        </div>
      </div>

      ${isCreditCard ? `
        <div class="p-3.5 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-3xs font-semibold border border-amber-500/20">
          💡 <strong>Credit Card Info:</strong> Paying the Minimum Payment (Rp ${formatRupiah(minPay)}) prevents late fees, but the remaining balance (Rp ${formatRupiah(amount - minPay)}) will incur an estimated revolving interest of ~1.75%/month.
        </div>
      ` : (isPayLater ? `
        <div class="p-3.5 rounded-xl bg-orange-500/10 text-orange-800 dark:text-orange-300 text-3xs font-semibold border border-orange-500/20">
          ⚠️ <strong>PayLater Info:</strong> Requires 100% full payment on the due date. Late payments will immediately incur daily penalties.
        </div>
      ` : '')}

      <!-- QUICK-PAY ACTION BUTTONS -->
      <div class="pt-2">
        <button onclick="quickPayCommitment('${escapeAttr(name)}', ${isAccount}, ${amount}, 'FULL')" class="w-full py-3 bg-mochi hover:bg-mochi-dark text-white font-extrabold rounded-xl tap-shrink text-xs shadow-sm transition-colors flex items-center justify-center mb-2">
          <i data-lucide="check-circle-2" class="w-4 h-4 mr-1.5"></i> Full Payment (${formatRupiah(amount)})
        </button>
        ${isCreditCard ? `
          <button onclick="quickPayCommitment('${escapeAttr(name)}', true, ${minPay}, 'MIN')" class="w-full py-2.5 bg-[var(--bg-subtle-2)] text-main font-bold rounded-xl tap-shrink text-xs border border-[var(--border-color)] flex items-center justify-center">
            Minimum Payment (${formatRupiah(minPay)})
          </button>
        ` : ''}
      </div>

      <div>
        <div class="flex items-center justify-between mb-2.5">
          <p class="font-bold text-2xs text-muted uppercase tracking-wider">Payment History & Related Transactions</p>
          ${!isAccount ? `<button type="button" onclick="hideSettledDetail = !hideSettledDetail; showPayableDetail(GLOBAL_DATA.payables.find(p=>p.payableName==='${escapeAttr(name)}'), false)" class="text-2xs font-bold ${hideSettledDetail ? 'text-mochi' : 'text-faint'}">${hideSettledDetail ? 'Show Settled' : 'Hide Settled'}</button>` : ''}
        </div>
        ${!isAccount ? settleBarHtml(name, false) : ''}
        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
  `;

  const visibleTrx = hideSettledDetail ? relatedTrx.filter(t => !t.settled) : relatedTrx;
  const displayTrx = detailShowAllTrx ? visibleTrx : visibleTrx.slice(0, 50);
  if (visibleTrx.length === 0) {
    html += `<p class="text-xs text-center text-muted py-6 font-semibold flex flex-col items-center"><i data-lucide="inbox" class="w-5 h-5 mb-2 text-faint"></i>${relatedTrx.length === 0 ? 'No installment transactions recorded yet.' : 'Everything here is settled.'}</p>`;
  } else {
    displayTrx.forEach(t => {
      const meta = getTypeMeta(t.type);
      // Only "Receive Payable" is an origin IOU line item that can ever need
      // settling. Everything else linked to this payable (Pay Installment,
      // Debt Forgiven — and previously, by bug, even the checklist's own
      // freshly-created settlement transaction) is a resolution record, not
      // an open item, so it gets no checkbox at all.
      const checkboxHtml = (isAccount || t.linkRole !== 'OPEN') ? '' : (
        t.settled
          ? renderCheckToggle(true, `handleSettleTogglePayable('${t.transactionId}', this.checked, '${escapeAttr(name)}', false)`, 'Unsettle')
          : renderCheckToggle(selectedForSettle[t.transactionId] !== undefined, `toggleSettleSelection('${t.transactionId}', this.checked, ${t.amount})`, 'Select to settle')
      );
      html += `
        <div class="flex justify-between items-center text-xs p-3.5 floating-item transition select-none">
          ${checkboxHtml}
          <div onclick="vibrate(30); showTransactionDetail('${t.transactionId}')" role="button" tabindex="0" class="flex items-center space-x-3 min-w-0 flex-1 pr-2 cursor-pointer">
            <div class="truncate">
              <p class="font-bold text-main truncate ${t.settled ? 'line-through opacity-50' : ''}">${escapeHtml(t.description || t.category)}</p>
              <p class="text-2xs text-faint font-semibold mt-0.5 truncate">${formatDateWithTime(t.date)}</p>
            </div>
          </div>
          <span class="font-black ${meta.cls} flex-shrink-0 whitespace-nowrap text-4xs font-numeric ${t.settled ? 'opacity-50' : ''}">${meta.prefix}${formatRupiah(t.amount)}</span>
        </div>
      `;
    });
    if (!detailShowAllTrx && visibleTrx.length > 50) {
      html += `<button type="button" onclick="detailShowAllTrx = true; showPayableDetail(${isAccount ? `GLOBAL_DATA.accounts.find(a=>a.accountName==='${escapeAttr(name)}')` : `GLOBAL_DATA.payables.find(p=>p.payableName==='${escapeAttr(name)}')`}, ${isAccount})" class="w-full text-center text-3xs font-bold text-mochi py-2.5">Show all ${visibleTrx.length - 50} more</button>`;
    }
  }

  html += `</div></div></div>`;
  const payableBlocked = !isAccount && amount > 0;
  html += `
    ${(!isAccount && item.status !== 'FORGIVEN' && amount > 0) ? `
    <button onclick="promptForgivePayable('${escapeAttr(name)}', ${amount})" class="w-full py-2.5 mt-1 bg-transparent text-slate-500 font-bold rounded-xl tap-shrink text-3xs border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
      <i data-lucide="file-check" class="w-3.5 h-3.5 mr-1.5"></i> Mark as Forgiven (Debt Written Down)
    </button>` : ''}
    ${payableBlocked ? `<p class="text-2xs text-center text-faint font-semibold pt-1">Still owes ${formatRupiah(amount)} — forgive it first to unlock Delete.</p>` : ''}
    <div class="flex space-x-3 pt-4">
      <button onclick="${isAccount ? `openEditAccountModal('${escapeAttr(name)}')` : `openEditPayableModal('${escapeAttr(name)}')`}" class="flex-1 py-3.5 bg-obsidian dark:bg-white text-white dark:text-obsidian font-extrabold rounded-xl tap-shrink text-xs shadow-md transition-colors flex items-center justify-center"><i data-lucide="edit-3" class="w-3.5 h-3.5 mr-1.5"></i> Edit Details</button>
      <button ${payableBlocked ? 'disabled' : ''} onclick="${payableBlocked ? '' : (isAccount ? `promptDeleteAccount('${escapeAttr(name)}')` : `promptDeletePayable('${escapeAttr(name)}')`)}" class="flex-1 py-3.5 ${payableBlocked ? 'bg-[var(--bg-subtle-2)] text-faint cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-600'} font-extrabold rounded-xl tap-shrink text-xs shadow-md transition-colors flex items-center justify-center"><i data-lucide="trash-2" class="w-3.5 h-3.5 mr-1.5"></i> Delete</button>
    </div>`;
  document.getElementById('modal-detail-inner').innerHTML = html;
  openModal('modalDetail');
  lucide.createIcons();
}
    function showReceivableDetail(r) {
      if (!r) return;
      currentModalBackFn = () => showReceivableDetail(r);
      window.isNestedModalView = false;

      const name = r.receivableName;
      resetSettleSelectionIfNeeded(name);
      const type = r.receivableType || 'Receivable';
      const amount = Math.abs(Number(r.remainingAmount) || 0);
      const status = r.status || 'Active';

      // Mirror of the Payable-side filter above: only Give Receivable
      // (origin items) show here, never the resolution transactions.
      const relatedTrx = (GLOBAL_DATA.transactions || []).filter(t => t.relatedReceivable === name && t.linkRole === 'OPEN');

      let html = `
        <div class="space-y-4 pt-1">
          <div class="border-b border-[var(--border-color)] pb-4 pr-6">
            <span class="text-2xs font-bold px-3 py-1 rounded-full bg-[var(--chip-info-bg)] amount-info uppercase tracking-wider mb-2 inline-block">Unpaid Receivable</span>
            <h3 class="text-lg font-extrabold text-main leading-tight">${escapeHtml(name)}</h3>
            ${
              status === 'WRITTEN_OFF' ? renderAgingBucketBadge('WRITTEN_OFF', 0)
              : (type === 'Structured Loan' && r.expectedReturn && amount > 0 && getAgingBucket(r.expectedReturn) ? (a => renderAgingBucketBadge(a.bucket, a.daysOverdue))(getAgingBucket(r.expectedReturn)) : '')
            }
          </div>

          <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-[var(--shadow-item)] space-y-2.5 text-xs font-semibold text-muted p-5">
            <div class="flex justify-between border-b border-[var(--border-color)] pb-2">
              <span>Receivable Type:</span> 
              <span class="font-extrabold text-main">${escapeHtml(type)}</span>
            </div>
            ${r.fromToWhom ? `<div class="flex justify-between border-b border-[var(--border-color)] pb-2"><span>Debtor / Borrower:</span> <span class="font-extrabold text-main">${escapeHtml(r.fromToWhom)}</span></div>` : ''}
            
            <div class="flex justify-between border-b border-[var(--border-color)] pb-2">
              <span>Total Principal / Debt:</span> 
              <span class="font-extrabold text-main font-numeric">${formatRupiah(r.initialAmount)}</span>
            </div>

            ${r.termMonths ? `<div class="flex justify-between border-b border-[var(--border-color)] pb-2"><span>Loan Term:</span> <span class="font-extrabold text-main">${r.termMonths} Months</span></div>` : ''}
            ${r.monthlyInstallment ? `<div class="flex justify-between border-b border-[var(--border-color)] pb-2"><span>Monthly Installment:</span> <span class="font-extrabold amount-info font-numeric">${formatRupiah(r.monthlyInstallment)}/mo</span></div>` : ''}
            ${r.expectedReturn ? `<div class="flex justify-between border-b border-[var(--border-color)] pb-2"><span>Target / Due Date:</span> <span class="font-extrabold text-main">${formatDate(r.expectedReturn)}</span></div>` : ''}

            <div class="flex justify-between pt-1 items-center">
              <span>Remaining Receivable:</span> 
              <span class="font-black amount-info text-base">${formatRupiah(amount)}</span>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2.5">
              <p class="font-bold text-2xs text-muted uppercase tracking-wider">Related Transaction History</p>
              <button type="button" onclick="hideSettledDetail = !hideSettledDetail; showReceivableDetail(GLOBAL_DATA.receivables.find(x=>x.receivableName==='${escapeAttr(name)}'))" class="text-2xs font-bold ${hideSettledDetail ? 'text-mochi' : 'text-faint'}">${hideSettledDetail ? 'Show Settled' : 'Hide Settled'}</button>
            </div>
            ${settleBarHtml(name, true)}
            <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
      `;

      const visibleTrx = hideSettledDetail ? relatedTrx.filter(t => !t.settled) : relatedTrx;
      const displayTrx = detailShowAllTrx ? visibleTrx : visibleTrx.slice(0, 50);
      if (visibleTrx.length === 0) {
        html += `<p class="text-xs text-center text-muted py-6 font-semibold flex flex-col items-center"><i data-lucide="inbox" class="w-5 h-5 mb-2 text-faint"></i>${relatedTrx.length === 0 ? 'No linked transactions yet.' : 'Everything here is settled.'}</p>`;
      } else {
        displayTrx.forEach(t => {
          const meta = getTypeMeta(t.type);
          // Mirror of the Payable-side fix: only "Give Receivable" is an
          // origin IOU line item. Write-Off/Receive Receivable/etc. are
          // resolution records and get no checkbox.
          const checkboxHtml = t.linkRole !== 'OPEN' ? '' : (
            t.settled
              ? renderCheckToggle(true, `handleSettleToggleReceivable('${t.transactionId}', this.checked, '${escapeAttr(name)}')`, 'Unsettle')
              : renderCheckToggle(selectedForSettle[t.transactionId] !== undefined, `toggleSettleSelection('${t.transactionId}', this.checked, ${t.amount})`, 'Select to settle')
          );
          html += `
            <div class="flex justify-between items-center text-xs p-3.5 floating-item transition select-none">
              ${checkboxHtml}
              <div onclick="vibrate(30); showTransactionDetail('${t.transactionId}')" role="button" tabindex="0" class="flex items-center space-x-3 min-w-0 flex-1 pr-2 cursor-pointer">
                <div class="truncate">
                  <p class="font-bold text-main truncate ${t.settled ? 'line-through opacity-50' : ''}">${escapeHtml(t.description || t.category)}</p>
                  <p class="text-2xs text-faint font-semibold mt-0.5 truncate">${formatDateWithTime(t.date)}</p>
                </div>
              </div>
              <span class="font-black ${meta.cls} flex-shrink-0 whitespace-nowrap text-4xs ${t.settled ? 'opacity-50' : ''}">${meta.prefix}${formatRupiah(t.amount)}</span>
            </div>
          `;
        });
        if (!detailShowAllTrx && visibleTrx.length > 50) {
          html += `<button type="button" onclick="detailShowAllTrx = true; showReceivableDetail(GLOBAL_DATA.receivables.find(x=>x.receivableName==='${escapeAttr(name)}'))" class="w-full text-center text-3xs font-bold text-mochi py-2.5">Show all ${visibleTrx.length - 50} more</button>`;
        }
      }

      html += `</div></div></div>`;
      const receivableBlocked = amount > 0;
      html += `
        ${(status !== 'WRITTEN_OFF' && amount > 0) ? `
        <button onclick="promptWriteOffReceivable('${escapeAttr(name)}', ${amount})" class="w-full py-2.5 mt-1 bg-transparent text-slate-500 font-bold rounded-xl tap-shrink text-3xs border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
          <i data-lucide="file-x" class="w-3.5 h-3.5 mr-1.5"></i> Mark as Bad Debt (Write-Off)
        </button>` : ''}
        ${receivableBlocked ? `<p class="text-2xs text-center text-faint font-semibold pt-1">Still owed ${formatRupiah(amount)} — write it off first to unlock Delete.</p>` : ''}
        <div class="flex space-x-3 pt-4">
          <button onclick="openEditReceivableModal('${escapeAttr(name)}')" class="flex-1 py-3.5 bg-obsidian dark:bg-white text-white dark:text-obsidian font-extrabold rounded-xl tap-shrink text-xs shadow-md transition-colors flex items-center justify-center"><i data-lucide="edit-3" class="w-3.5 h-3.5 mr-1.5"></i> Edit</button>
          <button ${receivableBlocked ? 'disabled' : ''} onclick="${receivableBlocked ? '' : `promptDeleteReceivable('${escapeAttr(name)}')`}" class="flex-1 py-3.5 ${receivableBlocked ? 'bg-[var(--bg-subtle-2)] text-faint cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-600'} font-extrabold rounded-xl tap-shrink text-xs shadow-md transition-colors flex items-center justify-center"><i data-lucide="trash-2" class="w-3.5 h-3.5 mr-1.5"></i> Delete</button>
        </div>`;
      document.getElementById('modal-detail-inner').innerHTML = html;
      openModal('modalDetail');
      lucide.createIcons();
    }

    let hideSettledDetail = false;
    let detailShowAllTrx = false;
    let selectedForSettle = {};
    let selectedForSettleContext = null;

    // Custom circular checkbox: visually ~20px (matches app's compact
    // aesthetic) but wrapped in a 36px tap target so it's actually easy to
    // hit with a thumb, without moving it away from the left edge where it
    // reads naturally alongside the transaction row.
