    function renderBudgetSummaryCard() {
      const container = document.getElementById('dashboard-budget-summary');
      if (!container) return;

      const budgets = getCustomBudgets();
      const activeBudgets = Object.entries(budgets).filter(([cat, limit]) => Number(limit) > 0);

      if (activeBudgets.length === 0) {
        container.innerHTML = emptyStateHtml('piggy-bank', "Mochi hasn't set any limits yet", "Set a monthly budget per category and Mochi will start watching your spending for you.");
        return;
      }

      const now = new Date();
      const currentYM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      const allTrx = GLOBAL_DATA.transactions || [];
      const categories = GLOBAL_DATA.categories || [];
      const trxThisMonth = allTrx.filter(t => t.type === 'Expense' && t.date && t.date.substring(0, 7) === currentYM);

      const spentMap = {};
      trxThisMonth.forEach(t => {
        const catMatch = categories.find(c => c.categoryName === t.category || c.subCategory === t.category);
        // REVISI: Utamakan matching kategori JavaScript agar selalu merujuk ke MainCategory yang benar
        const main = (catMatch ? catMatch.mainCategory : null) || t.mainCategory || t.category || 'Others';
        spentMap[main] = (spentMap[main] || 0) + (Number(t.amount) || 0);
      });

      container.innerHTML = activeBudgets.map(([cat, limitNum]) => {
        const limit = Number(limitNum) || 0;
        const spent = spentMap[cat] || 0;
        const remaining = limit - spent;
        const pct = Math.min((spent / limit) * 100, 100);
        const isOver = remaining < 0;

        const catMeta = getCategoryIconMeta(cat, 'Expense');
        
        let barColor = "from-emerald-400 to-emerald-600";
        let dotColor = "bg-emerald-500";
        let statusText = "On Track";
        let badgeBg = "bg-emerald-500/10 dark:bg-emerald-500/20";
        let badgeText = "text-emerald-700 dark:text-emerald-400";
        let badgeBorder = "border-emerald-500/20";

        if (isOver || pct >= 90) {
          barColor = "from-rose-400 to-rose-600";
          dotColor = "bg-rose-500";
          statusText = isOver ? "Over Budget" : "Near Limit";
          badgeBg = "bg-rose-500/10 dark:bg-rose-500/20";
          badgeText = "text-rose-600 dark:text-rose-400";
          badgeBorder = "border-rose-500/20";
        } else if (pct >= 70) {
          barColor = "from-amber-400 to-amber-500";
          dotColor = "bg-amber-500";
          statusText = "Caution";
          badgeBg = "bg-amber-500/10 dark:bg-amber-500/20";
          badgeText = "text-amber-700 dark:text-amber-400";
          badgeBorder = "border-amber-500/20";
        }

        const remainingBadge = isOver 
          ? `Over ${formatRupiah(Math.abs(remaining))}` 
          : `Left ${formatRupiah(remaining)}`;

        return `
          <div onclick="vibrate(30); showBudgetDetail('${escapeAttr(cat)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" class="p-5 bg-transparent rounded-2xl border border-[var(--border-color)] cursor-pointer card-hover transition tap-shrink space-y-3.5 mb-3.5 select-none">
            <div class="flex justify-between items-center pb-3 border-b border-[var(--border-color)]">
              <div class="flex items-center space-x-3 min-w-0 pr-2">
                <div class="icon-chip bg-[var(--bg-subtle-2)] flex items-center justify-center flex-shrink-0 border border-[var(--border-color)]">
                  <i data-lucide="${catMeta.icon}" class="w-4.5 h-4.5 text-mochi dark:text-mochi-light"></i>
                </div>
                <span class="text-sm font-extrabold text-main truncate">${escapeHtml(cat)}</span>
              </div>
              <button type="button" onclick="vibrate(30); event.stopPropagation(); openBudgetEditorModal();" class="w-8 h-8 rounded-full bg-[var(--bg-subtle-2)] flex items-center justify-center text-muted hover:text-main transition border border-[var(--border-color)] flex-shrink-0 tap-shrink">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <div class="flex items-center space-x-2 text-3xs font-extrabold">
              <span class="px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle-2)] text-main flex items-center border border-[var(--border-color)]">
                <span class="w-2 h-2 rounded-full ${dotColor} mr-1.5 animate-pulse"></span>
                ${statusText}
              </span>
              <span class="px-2.5 py-0.5 rounded-full ${badgeBg} ${badgeText} border ${badgeBorder} whitespace-nowrap">
                ${remainingBadge}
              </span>
            </div>

            <div class="space-y-1">
              <div class="w-full bg-[var(--bg-subtle-2)] rounded-full h-2.5 overflow-hidden">
                <div class="bg-gradient-to-r ${barColor} h-full rounded-full transition-all duration-1000 ease-out" style="width: ${pct}%"></div>
              </div>
            </div>

            <div class="flex justify-between items-center text-xs font-bold pt-3 border-t border-[var(--border-color)]">
              <div class="flex items-center space-x-3 text-muted">
                <span class="text-3xs">
                  Spent: <strong class="text-main font-black">${formatRupiah(spent)}</strong>
                </span>
                <span class="text-3xs text-faint">|</span>
                <span class="text-3xs">
                  Limit: <strong class="text-main font-black">${formatRupiah(limit)}</strong>
                </span>
              </div>
              <span class="text-xs font-black text-mochi dark:text-mochi-light flex items-center pl-2">
                Details <i data-lucide="chevron-right" class="w-3.5 h-3.5 ml-0.5"></i>
              </span>
            </div>
          </div>
        `;
      }).join('');

      lucide.createIcons();
    }
    
    function showBudgetDetail(catName) {
      currentModalBackFn = null;
      window.isNestedModalView = false;

      const budgets = getCustomBudgets();
      const limit = Number(budgets[catName]) || 0;

      const now = new Date();
      const currentYM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      const allTrx = GLOBAL_DATA.transactions || [];
      const categories = GLOBAL_DATA.categories || [];

      const categoryTrx = allTrx.filter(t => {
        if (t.type !== 'Expense' || !t.date || t.date.substring(0, 7) !== currentYM) return false;
        const catMatch = categories.find(c => c.categoryName === t.category || c.subCategory === t.category);
        const main = (catMatch ? catMatch.mainCategory : null) || t.mainCategory || t.category || 'Others';
        return main === catName;
      });

      let totalSpent = 0;
      const subMap = {};

      categoryTrx.forEach(t => {
        const amt = Number(t.amount) || 0;
        totalSpent += amt;
        const subName = t.category || catName;
        subMap[subName] = (subMap[subName] || 0) + amt;
      });

      const remaining = limit - totalSpent;
      const isOver = remaining < 0;
      const pct = limit > 0 ? Math.min((totalSpent / limit) * 100, 100) : 0;

      let statusBadge = isOver 
        ? `<span class="px-3 py-1 bg-rose-500/15 text-rose-500 font-extrabold text-xs rounded-full border border-rose-500/20">Over Budget ${formatRupiah(Math.abs(remaining))}</span>`
        : `<span class="px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs rounded-full border border-emerald-500/20">Remaining ${formatRupiah(remaining)}</span>`;

      const subEntries = Object.entries(subMap).sort((a, b) => b[1] - a[1]);
      let subBreakdownHtml = "";
      if (subEntries.length === 0) {
        subBreakdownHtml = `<p class="text-xs text-faint italic py-2">No expenses for this category this month.</p>`;
      } else {
        subBreakdownHtml = subEntries.map(([sub, amt]) => {
          const subPct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(0) : 0;
          return `
            <div class="flex justify-between items-center text-xs py-2 border-b border-[var(--border-color)] last:border-0">
              <div class="truncate pr-2">
                <span class="font-extrabold text-main block truncate">${escapeHtml(sub)}</span>
                <span class="text-2xs text-faint font-semibold">${subPct}% of total spent</span>
              </div>
              <span class="font-black text-main whitespace-nowrap">${formatRupiah(amt)}</span>
            </div>
          `;
        }).join('');
      }

      let recentTrxHtml = "";
      if (categoryTrx.length === 0) {
        recentTrxHtml = `<p class="text-xs text-faint italic py-2">No transaction history.</p>`;
      } else {
        recentTrxHtml = categoryTrx.slice(0, 5).map(t => `
          <div onclick="vibrate(30); showTransactionDetail('${t.transactionId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" class="flex justify-between items-center text-xs p-3.5 rounded-xl bg-[var(--bg-subtle-2)] cursor-pointer card-hover transition mb-1.5 last:mb-0">
            <div class="truncate pr-2">
              <p class="font-bold text-main truncate">${escapeHtml(t.description || t.category)}</p>
              <p class="text-2xs text-faint font-medium mt-0.5">${formatDateWithTime(t.date)} • ${escapeHtml(t.sourceAccount || '-')}</p>
            </div>
            <span class="font-extrabold amount-out whitespace-nowrap">-${formatRupiah(t.amount)}</span>
          </div>
        `).join('');
      }

      let html = `
        <div class="space-y-5 pt-1">
          <div class="text-center pb-3 border-b border-[var(--border-color)]/60 dark:border-[var(--border-color)]">
            <span class="text-2xs font-bold px-3 py-1 rounded-full bg-[var(--bg-subtle-2)] text-muted uppercase tracking-wider mb-3 inline-block">Monthly Budget Overview</span>
            <h3 class="text-xl font-black text-main leading-tight mb-2">${escapeHtml(catName)}</h3>
            <div class="mt-2">${statusBadge}</div>
          </div>

          <div class="ios-input p-5 space-y-3 bg-[var(--bg-subtle-2)] border border-[var(--border-color)]">
            <div class="flex justify-between items-center text-xs">
              <span class="text-muted font-bold">Total Spent:</span>
              <span class="font-black text-main text-sm">${formatRupiah(totalSpent)}</span>
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-muted font-bold">Budget Limit:</span>
              <span class="font-extrabold text-main">${formatRupiah(limit)}</span>
            </div>
            <div class="w-full bg-[var(--bg-subtle-2)] rounded-full h-2 overflow-hidden mt-1">
              <div class="bg-mochi h-2 rounded-full" style="width: ${pct}%"></div>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-black text-main uppercase tracking-wider mb-2.5 flex items-center">
              <i data-lucide="pie-chart" class="w-3.5 h-3.5 mr-1.5 text-mochi"></i> Sub-Category Breakdown
            </h4>
            <div class="bg-card p-4 rounded-2xl border border-[var(--border-color)] space-y-1">
              ${subBreakdownHtml}
            </div>
          </div>

          <div>
            <h4 class="text-xs font-black text-main uppercase tracking-wider mb-2.5 flex items-center">
              <i data-lucide="history" class="w-3.5 h-3.5 mr-1.5 text-mochi"></i> Recent Transactions (${categoryTrx.length})
            </h4>
            <div class="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              ${recentTrxHtml}
            </div>
          </div>
        </div>
      `;

      document.getElementById('modal-detail-inner').innerHTML = html;
      openModal('modalDetail');
      lucide.createIcons();
    }

    function getCustomBudgets() {
      if (GLOBAL_DATA.budgets && Object.keys(GLOBAL_DATA.budgets).length > 0) {
        return GLOBAL_DATA.budgets;
      }
      const saved = localStorage.getItem('mochi_custom_budgets');
      return saved ? JSON.parse(saved) : {};
    }

    function getExpenseMainCategories() {
      const categories = GLOBAL_DATA.categories || [];
      const expenseCats = categories.filter(c => (c.type || '').toLowerCase() === 'expense');
      const mainSet = new Set(expenseCats.map(c => c.mainCategory || c.categoryName).filter(Boolean));
      return Array.from(mainSet);
    }

    function openBudgetEditorModal() {
      const currentBudgets = getCustomBudgets();
      const container = document.getElementById('budget-inputs-container');
      if (!container) return;

      const categories = getExpenseMainCategories();
      if (categories.length === 0) {
        container.innerHTML = `<p class="text-xs text-muted text-center py-4 font-semibold">No expense categories available.</p>`;
        openModal('modalBudgetEditor');
        return;
      }
      
      container.innerHTML = categories.map(cat => {
        const val = currentBudgets[cat] || 0;
        return `
          <div>
            <label class="font-bold text-main block mb-1 text-xs">${escapeHtml(cat)}</label>
            <div class="relative">
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-main text-xs">Rp</span>
              <input type="text" inputmode="numeric" data-budget-category="${escapeAttr(cat)}" value="${val > 0 ? new Intl.NumberFormat('id-ID').format(val) : ''}" oninput="formatInputRupiah(this)" placeholder="0" class="w-full ios-input pl-9 text-xs font-extrabold text-main">
            </div>
          </div>
        `;
      }).join('');

      openModal('modalBudgetEditor');
    }

    async function handleSaveCustomBudgets(event) {
      event.preventDefault();
      const inputs = document.querySelectorAll('[data-budget-category]');
      const updatedBudgets = {};

      inputs.forEach(input => {
        const cat = input.getAttribute('data-budget-category');
        const numVal = Number(input.value.replace(/[^0-9]/g, '')) || 0;
        updatedBudgets[cat] = numVal;
      });

      let loadingToast = showToast("Saving budgets...", "info");

      try {
        await postApi('updateBudgets', updatedBudgets);

        GLOBAL_DATA.budgets = updatedBudgets;
        localStorage.setItem('mochi_custom_budgets', JSON.stringify(updatedBudgets));

        if (loadingToast && loadingToast.parentNode) loadingToast.remove();
        closeModal('modalBudgetEditor');
        
        await showRewardAnimation("Budgets Updated");
        renderBudgetSummaryCard();
        renderCategoryAnalysis();
        renderMochiMood();
      } catch (err) {
        if (loadingToast && loadingToast.parentNode) loadingToast.remove();
        showToast("Failed to save budgets: " + err.message, "error");
      }
    }

    const DONUT_PALETTE = ['#8C6C3E', '#B8925A', '#CBA671', '#DFC08A', '#EAD3A6', '#F1E1C3', '#DDD2C0'];

    function renderCategoryDonut(container, sortedMain, groups, grandTotal) {
      if (!grandTotal || grandTotal <= 0) { container.innerHTML = ""; return; }

      const MAX_SLICES = 6;
      let slices = sortedMain.slice(0, MAX_SLICES).map(main => ({ label: main, value: groups[main].total }));
      if (sortedMain.length > MAX_SLICES) {
        const otherTotal = sortedMain.slice(MAX_SLICES).reduce((s, m) => s + groups[m].total, 0);
        slices.push({ label: 'Other', value: otherTotal });
      }

      const size = 168, stroke = 20, r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
      const circumference = 2 * Math.PI * r;

      let cumulative = 0;
      const arcs = slices.map((s, i) => {
        const frac = s.value / grandTotal;
        const len = frac * circumference;
        const offset = circumference - cumulative;
        cumulative += len;
        const color = DONUT_PALETTE[i % DONUT_PALETTE.length];
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
                  stroke-dasharray="${len} ${circumference - len}" stroke-dashoffset="${circumference}"
                  data-final-offset="${offset}" stroke-linecap="butt"
                  style="transition: stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1); transition-delay:${i * 70}ms"></circle>`;
      }).join('');

      const legend = slices.map((s, i) => {
        const pct = grandTotal > 0 ? (s.value / grandTotal * 100) : 0;
        return `
          <div class="flex items-center justify-between text-3xs py-0.5">
            <span class="flex items-center min-w-0 pr-2">
              <span class="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" style="background:${DONUT_PALETTE[i % DONUT_PALETTE.length]}"></span>
              <span class="text-muted font-semibold truncate">${escapeHtml(s.label)}</span>
            </span>
            <span class="font-numeric font-extrabold text-main flex-shrink-0">${pct.toFixed(0)}%</span>
          </div>`;
      }).join('');

      container.innerHTML = `
        <div class="flex items-center gap-5 mb-5">
          <div class="relative flex-shrink-0" style="width:${size}px;height:${size}px">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg)">
              <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-subtle-2)" stroke-width="${stroke}"></circle>
              ${arcs}
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center px-2">
              <span class="text-2xs font-bold text-faint uppercase tracking-wider">Spent</span>
              <span class="font-numeric text-sm font-bold text-main text-center leading-tight mt-0.5">${formatRupiah(grandTotal)}</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">${legend}</div>
        </div>`;

      requestAnimationFrame(() => {
        container.querySelectorAll('[data-target-width]').forEach(bar => { bar.style.width = bar.getAttribute('data-target-width'); });
      });
    }

    function renderCategoryAnalysis() {
  const el = document.getElementById('dashboard-category-analysis');
  if (!el) return;

  const now = new Date();
  const currentYM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYM = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0');

  const allTrx = GLOBAL_DATA.transactions || [];
  const categories = GLOBAL_DATA.categories || [];

  const trxThisMonth = allTrx.filter(t => t.type === 'Expense' && t.date && t.date.substring(0, 7) === currentYM);
  const trxLastMonth = allTrx.filter(t => t.type === 'Expense' && t.date && t.date.substring(0, 7) === prevYM);

  const totalThisMonth = trxThisMonth.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalLastMonth = trxLastMonth.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const donutEl = document.getElementById('dashboard-category-donut');

  if (trxThisMonth.length === 0) {
    el.innerHTML = emptyStateHtml('coffee', "Nothing spent yet this month", "Mochi's tail is still. Log an expense and this space fills in with where it went.");
    if (donutEl) donutEl.innerHTML = "";
    return;
  }

  const groups = {};
  let grandTotal = 0;

  trxThisMonth.forEach(t => {
    const categoryName = t.category || '';
    const catMatch = categories.find(c => c.categoryName === categoryName || c.subCategory === categoryName);
    const main = (catMatch ? catMatch.mainCategory : null) || t.mainCategory || categoryName || 'Others';
    const subKey = categoryName || main;
    const amount = Number(t.amount) || 0;

    grandTotal += amount;
    if (!groups[main]) groups[main] = { total: 0, subs: {} };
    groups[main].total += amount;
    groups[main].subs[subKey] = (groups[main].subs[subKey] || 0) + amount;
  });

  const sortedMain = Object.keys(groups).sort((a, b) => groups[b].total - groups[a].total);
  if (donutEl) renderCategoryDonut(donutEl, sortedMain, groups, grandTotal);

  let html = "";
  sortedMain.forEach((main, index) => {
    const g = groups[main];
    const expensePct = grandTotal > 0 ? (g.total / grandTotal * 100) : 0;
    const displayText = `${formatRupiah(g.total)} (${expensePct.toFixed(0)}%)`;
    const barColor = "from-mochi-light to-mochi";

    const isExpanded = !!categoryAnalysisExpanded[main];
    const subKeys = Object.keys(g.subs).sort((a, b) => g.subs[b] - g.subs[a]);
    const hasMultipleSubs = subKeys.length > 1 || (subKeys.length === 1 && subKeys[0] !== main);

    html += `<div class="mb-4 last:mb-0 stagger-item" style="animation-delay: ${index * 0.05}s">
      <div ${hasMultipleSubs ? `onclick="toggleCategoryAnalysis('${escapeAttr(main)}')" class="cursor-pointer group"` : ''}>
        <div class="flex justify-between items-center mb-1.5 gap-2">
          <span class="text-xs font-extrabold text-main flex items-center group-hover:text-mochi dark:group-hover:text-mochi-light transition-colors truncate">
            ${hasMultipleSubs ? `<i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" class="w-3.5 h-3.5 mr-1 text-faint flex-shrink-0"></i>` : ''}
            <span class="truncate">${escapeHtml(main)}</span>
          </span>
          <span class="text-xs font-black text-main flex-shrink-0 text-right">${displayText}</span>
        </div>
        <div class="w-full bg-[var(--bg-subtle-2)] rounded-full h-1.5 overflow-hidden">
          <div class="bg-gradient-to-r ${barColor} h-1.5 rounded-full transition-all duration-1000 ease-out" style="width:0%" data-target-width="${expensePct}%"></div>
        </div>
      </div>`;

    if (hasMultipleSubs) {
      html += `<div class="${isExpanded ? '' : 'hidden'} mt-2.5 pl-4 border-l-2 border-[var(--border-color)] space-y-1.5">`;
      subKeys.forEach(sub => {
        html += `<div class="flex justify-between items-center text-3xs">
          <span class="text-muted font-semibold truncate pr-2">${escapeHtml(sub)}</span>
          <span class="font-extrabold text-main flex-shrink-0">${formatRupiah(g.subs[sub])}</span>
        </div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  });

  el.innerHTML = html;
  lucide.createIcons();

  setTimeout(() => {
    el.querySelectorAll('[data-target-width]').forEach(bar => { bar.style.width = bar.getAttribute('data-target-width'); });
  }, 50);
}
    
