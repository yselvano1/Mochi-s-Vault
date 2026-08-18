    function populateYearFilter() {
      const years = [...new Set((GLOBAL_DATA.transactions || []).map(t => (t.date || '').substring(0, 4)).filter(Boolean))].sort().reverse();
      const selYear = document.getElementById('filter-year');
      const selMonth = document.getElementById('filter-month');

      const now = new Date();
      const currentYear = String(now.getFullYear());
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

      selYear.innerHTML = `<option value="ALL">All Years</option>` + years.map(y => `<option value="${y}">${y}</option>`).join('');
      
      if (selYear.value === 'ALL') {
        selYear.value = years.includes(currentYear) ? currentYear : (years[0] || 'ALL');
      }
      if (selMonth.value === 'ALL') {
        selMonth.value = currentMonth;
      }
    }

    function renderHistory() {
      const filterMonth = document.getElementById('filter-month').value;
      const filterYear = document.getElementById('filter-year').value;
      const filterType = document.getElementById('filter-type').value;
      const filterUser = document.getElementById('filter-user').value;
      const searchTerm = (document.getElementById('filter-search').value || '').toLowerCase().trim();

      const filtered = (GLOBAL_DATA.transactions || []).filter(trx => {
        const d = trx.date || "";
        const year = d.length >= 4 ? d.substring(0, 4) : "";
        const month = d.length >= 7 ? d.substring(5, 7) : "";
        return (filterMonth === 'ALL' || month === filterMonth) &&
               (filterYear === 'ALL' || year === filterYear) &&
               (filterType === 'ALL' || trx.type === filterType) &&
               (filterUser === 'ALL' || trx.enteredBy === filterUser) &&
               (!searchTerm || (trx.description || '').toLowerCase().includes(searchTerm) || (trx.category || '').toLowerCase().includes(searchTerm));
      });

      let totalIncome = 0, totalExpense = 0;
      window.currentFilteredHistory = filtered; // Store for modals
      
      filtered.forEach(trx => {
        const val = Number(trx.amount) || 0;
        // Strict P&L Logic
        if (trx.type === 'Income') totalIncome += val;
        else if (trx.type === 'Expense') totalExpense += val;
      });
      document.getElementById('sum-income').innerText = '+' + formatRupiah(totalIncome);
      document.getElementById('sum-expense').innerText = '-' + formatRupiah(totalExpense);
      document.getElementById('sum-net').innerText = formatRupiah(totalIncome - totalExpense);

      const listEl = document.getElementById('history-transaction-list');
      if (filtered.length === 0) {
        listEl.innerHTML = emptyStateHtml('search-x', 'No matches found', 'Try adjusting the filter to see more of Mochi\'s records.');
        lucide.createIcons();
        return;
      }

      let lastDateKey = null;
      listEl.innerHTML = filtered.map((trx, i) => {
        const meta = getTypeMeta(trx.type);

        let accountFlowText = trx.sourceAccount || '';
        if (trx.sourceAccount && trx.targetAccount) accountFlowText += ` ➔ ${trx.targetAccount}`;
        else if (trx.targetAccount) accountFlowText = trx.targetAccount;

        const dateKey = dateKeyOf(trx.date);
        let dividerHtml = '';
        if (dateKey !== lastDateKey) {
          lastDateKey = dateKey;
          dividerHtml = `
            <div class="date-divider">
              <span class="date-divider-label">${escapeHtml(dateDividerLabel(trx.date))}</span>
              <span class="date-divider-line"></span>
            </div>
          `;
        }

        const isSettleTracked = !!(trx.relatedPayable || trx.relatedReceivable);
        const settledBadge = (isSettleTracked && trx.settled)
          ? `<span class="text-2xs font-extrabold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full ml-1.5 flex-shrink-0 inline-flex items-center gap-0.5"><i data-lucide="check" class="w-2.5 h-2.5"></i>Settled</span>`
          : '';

        return `
          ${dividerHtml}
          <div onclick="vibrate(30); currentModalBackFn = null; showTransactionDetail('${trx.transactionId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" aria-label="${escapeAttr((trx.description || trx.category) + ', ' + meta.prefix + formatRupiah(trx.amount))}" class="floating-item p-3.5 flex justify-between items-center cursor-pointer card-hover transition tap-shrink stagger-item select-none" style="animation-delay:${Math.min(i, 10) * 0.04}s">
            <div class="flex items-center space-x-3 min-w-0 flex-1 pr-2 pointer-events-none">
              ${iconChipHtml(trx.type, trx.category)}
              <div class="truncate">
                <p class="text-4xs font-bold text-main truncate flex items-center">${escapeHtml(trx.description || trx.category)}${settledBadge}</p>
                <p class="text-2xs text-faint font-semibold mt-0.5 truncate">${accountFlowText ? escapeHtml(accountFlowText) + ' • ' : ''}${formatDateWithTime(trx.date)} • ${escapeHtml(trx.enteredBy)}</p>
              </div>
            </div>
            <span class="text-4xs font-extrabold ${meta.cls} whitespace-nowrap flex-shrink-0 pointer-events-none">${meta.prefix}${formatRupiah(trx.amount)}</span>
          </div>
        `;
      }).join('');
      lucide.createIcons();
    }

    function exportPDFStatement() {
      const filterMonth = document.getElementById('filter-month').value;
      const filterYear = document.getElementById('filter-year').value;
      const filterType = document.getElementById('filter-type').value;
      const filterUser = document.getElementById('filter-user').value;

      const filtered = (GLOBAL_DATA.transactions || []).filter(trx => {
        const d = trx.date || "";
        const year = d.length >= 4 ? d.substring(0, 4) : "";
        const month = d.length >= 7 ? d.substring(5, 7) : "";
        return (filterMonth === 'ALL' || month === filterMonth) &&
               (filterYear === 'ALL' || year === filterYear) &&
               (filterType === 'ALL' || trx.type === filterType) &&
               (filterUser === 'ALL' || trx.enteredBy === filterUser);
      });

      if (filtered.length === 0) {
        showToast("No transaction data available to export.", "error");
        return;
      }

      let loadingToast = showToast("Preparing PDF statement...", "info");

      let totalIn = 0, totalOut = 0;
      filtered.forEach(t => {
        const dir = getTypeMeta(t.type).direction;
        if (dir === 'in') totalIn += Number(t.amount) || 0;
        else if (dir === 'out') totalOut += Number(t.amount) || 0;
      });

      const printContainer = document.createElement('div');
      printContainer.style.padding = '20px';
      printContainer.style.fontFamily = 'Arial, sans-serif';
      printContainer.style.color = '#241C16';

      printContainer.innerHTML = `
        <div style="border-bottom: 2px solid #B8925A; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-between: space-between; align-items: center;">
          <div>
            <h1 style="font-size: 20px; font-weight: 900; margin: 0; color: #8C6C3E; font-family: Georgia, serif;">MOCHI'S VAULT</h1>
            <p style="font-size: 11px; color: #7C6F63; margin: 4px 0 0 0;">Official Financial Statement — Yosa & Fani</p>
          </div>
          <div style="text-align: right; font-size: 10px; color: #7C6F63;">
            <p style="margin:0;">Period: <strong>${filterMonth === 'ALL' ? 'All Months' : filterMonth} / ${filterYear}</strong></p>
            <p style="margin:2px 0 0 0;">Exported: ${new Date().toLocaleDateString('en-US')}</p>
          </div>
        </div>

        <div style="background-color: #F0EAE0; border-radius: 8px; padding: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; font-size: 11px;">
          <div><span>Total Income:</span> <strong style="color: #2E6F40; display: block; font-size: 13px;">+${formatRupiah(totalIn)}</strong></div>
          <div><span>Total Expenses:</span> <strong style="color: #B93838; display: block; font-size: 13px;">-${formatRupiah(totalOut)}</strong></div>
          <div><span>Net Surplus / Deficit:</span> <strong style="color: #241C16; display: block; font-size: 13px;">${formatRupiah(totalIn - totalOut)}</strong></div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: left;">
          <thead>
            <tr style="background-color: #1E1916; color: #F7F4EE;">
              <th style="padding: 8px; border: 1px solid #ddd;">Date</th>
              <th style="padding: 8px; border: 1px solid #ddd;">By</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Category / Description</th>
              <th style="padding: 8px; border: 1px solid #ddd;">Account</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((t, idx) => {
              const meta = getTypeMeta(t.type);
              const bg = idx % 2 === 0 ? '#FFFFFF' : '#F7F4EE';
              let acc = t.sourceAccount || '';
              if (t.sourceAccount && t.targetAccount) acc += ` -> ${t.targetAccount}`;
              else if (t.targetAccount) acc = t.targetAccount;

              return `
                <tr style="background-color: ${bg};">
                  <td style="padding: 6px 8px; border: 1px solid #eee;">${formatDateWithTime(t.date)}</td>
                  <td style="padding: 6px 8px; border: 1px solid #eee;">${escapeHtml(t.enteredBy)}</td>
                  <td style="padding: 6px 8px; border: 1px solid #eee;">
                    <strong>${escapeHtml(t.description || t.category)}</strong>
                    <div style="font-size: 8px; color: #7C6F63;">${escapeHtml(t.category)}</div>
                  </td>
                  <td style="padding: 6px 8px; border: 1px solid #eee;">${escapeHtml(acc || '-')}</td>
                  <td style="padding: 6px 8px; border: 1px solid #eee; text-align: right; font-weight: bold; color: ${meta.direction === 'in' ? '#2E6F40' : (meta.direction === 'out' ? '#B93838' : '#241C16')};">
                    ${meta.prefix}${formatRupiah(t.amount)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      const opt = {
        margin:       10,
        filename:     `Mochi_Financial_Statement_${filterYear}-${filterMonth}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(printContainer).save().then(() => {
        if (loadingToast && loadingToast.parentNode) loadingToast.remove();
        showToast("PDF downloaded successfully!", "success");
      }).catch(err => {
        if (loadingToast && loadingToast.parentNode) loadingToast.remove();
        showToast("Failed to generate PDF: " + err.message, "error");
      });
    }

