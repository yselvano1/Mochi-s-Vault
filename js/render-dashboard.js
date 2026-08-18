    function renderDashboard() {
      const kpi = GLOBAL_DATA.kpi || {};
      
      let totalCashAssets = 0;
      let totalLiabilityBalance = 0;

      (GLOBAL_DATA.accounts || []).forEach(a => {
        const meta = getAccountIconMeta(a.accountName, a.accountType);
        const bal = Number(a.runningBalance) || 0;
        if (meta.isLiability) {
          totalLiabilityBalance += Math.abs(bal); // <--- KUNCI PERBAIKANNYA DI SINI
        } else {
          totalCashAssets += bal;
        }
      });

      const totalReceivables = Number(kpi['Total Receivables']) || 0;
      const totalPayablesAP = Number(kpi['Total Payables']) || 0;
      const calculatedNetWorth = totalCashAssets + totalReceivables - totalLiabilityBalance - totalPayablesAP;

      
      const monthlyDue = Number(kpi['Monthly Amount Due']) || 0; // Sisa yang belum dibayar
      const monthlyMinDue = Number(kpi['Monthly Amount Due (Min)']) || 0;
      const originalDue = Number(kpi['Original Monthly Amount Due']) || 0;
      const dsr = Number(kpi['Debt Service Ratio']) || 0;

      const dueContainer = document.getElementById('dashboard-due-container');
      if (dueContainer) {
        if (monthlyDue > 0) {
          dueContainer.innerHTML = `
            <div onclick="vibrate(30); switchTab('payables')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); this.click();}" role="button" tabindex="0" aria-label="Go to Payables" class="floating-card p-5 mb-5 space-y-3.5 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-subtle-2)] border border-[var(--border-color)] rounded-2xl shadow-sm cursor-pointer tap-shrink">
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
                  <span class="text-2xs text-muted font-extrabold uppercase block mb-0.5">Remaining Due</span>
                  <span class="text-base font-black amount-out block leading-none font-numeric">${formatRupiah(monthlyDue)}</span>
                </div>
                <div class="text-right">
                  <span class="text-2xs text-muted font-extrabold uppercase block mb-0.5">Min. Payment (CC)</span>
                  <span class="text-sm font-extrabold text-main block leading-none font-numeric">${formatRupiah(monthlyMinDue)}</span>
                </div>
              </div>
            </div>
          `;
        } else {
          dueContainer.innerHTML = '';
        }
      }

      animateNumber(document.getElementById('kpi-networth'), calculatedNetWorth);
      animateNumber(document.getElementById('kpi-disposable'), kpi['Disposable Income'] || 0);
      animateNumber(document.getElementById('kpi-cash'), totalCashAssets);
      animateNumber(document.getElementById('kpi-receivables'), totalReceivables);
      
      animateNumber(document.getElementById('kpi-payables'), Math.abs(totalPayablesAP + totalLiabilityBalance));
      animateNumber(document.getElementById('kpi-savings'), kpi['Net Operating Savings'] || 0);

      const hasPayableActive = (GLOBAL_DATA.payables || []).some(p => (p.status || '').toLowerCase() === 'active' && Number(p.remainingAmount) > 0);
      // badge-payables-nav removed

      const trxList = GLOBAL_DATA.transactions || [];
      const dashListEl = document.getElementById('dashboard-transaction-list');

      if (trxList.length === 0) {
        dashListEl.innerHTML = `<p class="text-xs text-center text-muted py-4 font-semibold">No recent transactions.</p>`;
        return;
      }

      dashListEl.innerHTML = "";
      trxList.slice(0, 5).forEach((trx, i) => {
        const meta = getTypeMeta(trx.type);
        const div = document.createElement('div');
        div.className = "floating-item p-3.5 flex justify-between items-center cursor-pointer card-hover transition tap-shrink stagger-item mb-2 last:mb-0 select-none";
        div.style.animationDelay = `${i * 0.05}s`;

        div.onclick = () => { vibrate(30); currentModalBackFn = null; showTransactionDetail(trx.transactionId); };

        let accountFlowText = trx.sourceAccount || '';
        if (trx.sourceAccount && trx.targetAccount) accountFlowText += ` ➔ ${trx.targetAccount}`;
        else if (trx.targetAccount) accountFlowText = trx.targetAccount;

        div.innerHTML = `
          <div class="flex items-center space-x-3 min-w-0 flex-1 pr-2 pointer-events-none">
            ${iconChipHtml(trx.type, trx.category)}
            <div class="truncate">
              <p class="text-4xs font-bold text-main truncate">${escapeHtml(trx.description || trx.category)}</p>
              <p class="text-2xs text-faint font-medium mt-0.5 truncate">${accountFlowText ? escapeHtml(accountFlowText) + ' • ' : ''}${formatDateWithTime(trx.date)}</p>
            </div>
          </div>
          <span class="text-4xs font-extrabold ${meta.cls} whitespace-nowrap flex-shrink-0 pointer-events-none">${meta.prefix}${formatRupiah(trx.amount)}</span>
        `;
        dashListEl.appendChild(div);
      });
      lucide.createIcons();
    }

    let categoryAnalysisExpanded = {};
    function toggleCategoryAnalysis(mainCategory) {
      vibrate(30);
      categoryAnalysisExpanded[mainCategory] = !categoryAnalysisExpanded[mainCategory];
      renderCategoryAnalysis();
    }

    let currentMochiMood = 'chill';
    let mochiBlinkTimeout = null;

    function updateGreeting() {
      const hour = new Date().getHours();
      const el = document.getElementById('greeting-subtext');
      if (el) {
        if (hour < 11) el.textContent = "Good morning";
        else if (hour < 15) el.textContent = "Good afternoon";
        else if (hour < 19) el.textContent = "Good evening";
        else el.textContent = "Good night";
      }

      const nameEl = document.getElementById('greeting-name');
      if (nameEl) {
        const user = getActiveUser();
        nameEl.textContent = `Hello, ${user || 'Hoo-Man'}`;
      }
    }

    function renderMochiMood() {
  updateGreeting();
  const kpi = GLOBAL_DATA.kpi || {};
  const income = Number(kpi["This Month's Income"]) || 0;
  const expense = Number(kpi["This Month's Consumptive Expense"]) || 0;
  const dsr = Number(kpi["Debt Service Ratio"]) || 0;

  let mood = 'chill';
  let badgeText = "Chill Mochi";
  let badgeClass = "bg-[var(--chip-info-bg)] amount-info";

  const ratio = income > 0 ? (expense / income) : (expense > 0 ? 1 : 0);
  const displayPct = Math.min(Math.round(ratio * 100), 999);

  // Evaluasi DSR: Jika DSR > 30%, Mochi berubah menjadi Anxious Mochi 😿
  if (dsr > 30 || ratio > 0.80) {
    mood = 'anxious';
    badgeText = dsr > 30 ? "High Debt Ratio" : "Anxious Mochi";
    badgeClass = "bg-[var(--chip-out-bg)] amount-out";
  } else if (ratio <= 0.40 && dsr <= 20) {
    mood = 'rich';
    badgeText = "Rich Mochi";
    badgeClass = "bg-[var(--chip-in-bg)] amount-in";
  } else {
    mood = 'chill';
    badgeText = "Chill Mochi";
    badgeClass = "bg-[var(--chip-info-bg)] amount-info";
  }

  currentMochiMood = mood;

  const imgEl = document.getElementById('mochi-mood-img');
  const badgeEl = document.getElementById('mochi-mood-badge');

  if (imgEl) imgEl.src = `mochi-${mood}-open.png`;
  if (badgeEl) {
    badgeEl.innerText = badgeText;
    badgeEl.className = `text-2xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}`;
  }

  renderMochiStateText(mood, displayPct, dsr);
  renderMochiQuip(mood, displayPct, dsr);
  startMochiBlinking();
}

// Deterministic (not randomized like the quip below) — this is the factual
// "here's your financial state" line, always the same for the same numbers,
// so it reads as a status readout rather than a random comment.
function renderMochiStateText(mood, displayPct, dsr) {
  const stateEl = document.getElementById('mochi-state-text');
  if (!stateEl) return;

  let text;
  if (mood === 'anxious' && dsr > 30) {
    text = `DSR kamu ${dsr}% bulan ini — di atas batas aman (30%).`;
  } else if (mood === 'anxious') {
    text = `${displayPct}% dari pemasukan bulan ini udah kepake buat pengeluaran.`;
  } else if (mood === 'rich') {
    text = `Cuma ${displayPct}% pemasukan yang kepake bulan ini — sisanya aman.`;
  } else {
    text = `${displayPct}% dari pemasukan bulan ini terpakai — masih stabil.`;
  }
  stateEl.textContent = text;
}

// Rule-based, not an LLM call — instant, free, and every line traces back
// to a real pattern in the actual transaction data (coffee frequency, a
// single pricey meal, DSR). Several variations per pattern so it doesn't
// feel like the same line on repeat; picked randomly each render.
function detectMochiSpendingPatterns() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const txns = GLOBAL_DATA.transactions || [];

  let coffeeCount = 0;
  let pricestMeal = null;

  txns.forEach(t => {
    if (t.type !== 'Expense') return;
    const txDate = new Date(t.date);
    const text = `${t.description || ''} ${t.category || ''}`.toLowerCase();

    if (txDate >= sevenDaysAgo && /kopi|coffee|americano|latte|espresso/.test(text)) {
      coffeeCount++;
    }
    if (txDate >= monthStart && /makan|food|resto|restaurant|dining/.test(text) && Number(t.amount) >= 150000) {
      if (!pricestMeal || Number(t.amount) > pricestMeal.amount) {
        pricestMeal = { amount: Number(t.amount), desc: t.description || t.category };
      }
    }
  });

  return { coffeeCount, pricestMeal };
}

// Last-resort local fallback — only used if the request to our own backend
// fails outright (e.g. device is offline). The backend has its own Gemini
// fallback lines for when Gemini itself is down, so this is a second,
// independent safety net purely for "can't even reach our server."
function getLocalMochiQuipFallback(mood, displayPct, dsr) {
  const patterns = detectMochiSpendingPatterns();
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  let lines;

  if (mood === 'anxious') {
    lines = dsr > 30 ? [
      `Hoo-Man... DSR-mu udah ${dsr}%! Mochi mulai keringetan nih 😿`,
      `Cicilan bulanan kita segede itu?! Mochi jagain dompet ketat-ketat ya mulai sekarang.`,
      `${dsr}% buat cicilan tiap bulan... Mochi nggak bisa tidur nyenyak kalau gini terus.`
    ] : [
      `Pengeluaran udah ${displayPct}% dari pemasukan bulan ini, Hoo-Man! Rem dulu yuk 😾`,
      `Mochi ngitung-ngitung, kita udah pakai ${displayPct}% duit bulan ini. Agak ngeri...`,
      `STOP belanja dulu deh! ${displayPct}% pemasukan udah kepake, sisanya jagain buat yang penting.`
    ];
  } else if (patterns.pricestMeal) {
    const amt = new Intl.NumberFormat('id-ID').format(patterns.pricestMeal.amount);
    lines = [
      `Rp${amt} sekali makan?! Mochi aja makannya sepiring doang tiap hari 😾`,
      `Itu makanan apa emas beneran, mahal amat Hoo-Man (Rp${amt} loh itu)`,
      `Mochi liat ada transaksi makan Rp${amt}... boleh sih, tapi jangan sering-sering ya~`
    ];
  } else if (patterns.coffeeCount >= 3) {
    lines = [
      `Kopi lagi? Ini yang ke-${patterns.coffeeCount} kalinya minggu ini loh, Hoo-Man~ 😼☕`,
      `Duit kopimu kalau ditabung, Mochi udah bisa beli tuna kalengan sebulan tau nggak sih`,
      `Aku diem-diem hitung kopimu... ${patterns.coffeeCount}x minggu ini. Mochi curiga~`
    ];
  } else if (mood === 'rich') {
    lines = [
      `Duitmu (baca: duit KITA) lagi sehat banget nih, Mochi bangga~ 😻💰`,
      `Cash flow aman terkendali, Mochi bisa tidur nyenyak di atas timbunan koin nih`,
      `${displayPct}% doang dari pemasukan yang kepake bulan ini. Good job, Hoo-Man!`
    ];
  } else {
    lines = [
      `Semua kelihatan normal-normal aja hari ini. Mochi lagi jaga-jaga aja~ 🐾`,
      `Nggak ada drama keuangan hari ini. Mochi bosen, ajakin aku ngobrol dong!`,
      `Dompet kita aman terkendali. Mochi lagi santai sambil ngintip transaksimu 👀`
    ];
  }

  return pick(lines);
}

// The quip is real AI output (see getMochiQuip in Code.gs — Gemini with a
// Groq fallback). Server-side cache normally refreshes on a random ~90–150
// min cadence, but a new transaction invalidates it immediately so Mochi
// reacts right away (see the createTransaction success handler above,
// which calls renderMochiMood() again after a save). Most calls here are
// still cheap cache hits. Only a total network failure (can't reach our
// own backend at all) falls back to the local rule-based lines below.
async function renderMochiQuip(mood, displayPct, dsr) {
  const textEl = document.getElementById('mochi-quip-text');
  const subEl = document.getElementById('mochi-quip-subtext');
  if (!textEl) return;

  try {
    const result = await postApi('getMochiQuip', { mood, displayPct, dsr });
    textEl.textContent = result.quip;
  } catch (err) {
    textEl.textContent = getLocalMochiQuipFallback(mood, displayPct, dsr);
  }

  if (subEl) subEl.textContent = "Tap untuk ngobrol sama Mochi";
}

/**
 * 2. QUICK-PAY SMART REPAYMENT TRIGGER
 * Buka modal transaksi otomatis terisi nominal pelunasan
 */
function quickPayCommitment(targetName, isAccount, defaultAmount, categoryTag) {
  vibrate(30);
  if (activeModals.includes('modalDetail')) {
    performVisualClose('modalDetail');
  }

  setTimeout(() => {
    openNewTransactionForm();

    if (categoryTag === 'RECEIVABLE') {
      document.getElementById('form-type').value = "Receive Receivable";
      updateTypeDisplay("Receive Receivable");
      handleTypeChange();
      
      document.getElementById('form-receivable').value = targetName;
      if (document.getElementById('display-receivable')) {
        document.getElementById('display-receivable').innerText = targetName;
        document.getElementById('display-receivable').classList.remove('text-faint');
      }
      document.getElementById('form-category').value = "Receive Receivable";
      const catDisplay = document.getElementById('form-category-display');
      if (catDisplay) {
        catDisplay.innerText = "Receive Receivable";
        catDisplay.classList.remove('text-faint');
      }
      document.getElementById('form-description').value = "Payment received from " + targetName;
    } else if (isAccount) {
      document.getElementById('form-type').value = "Internal Transfer";
      updateTypeDisplay("Internal Transfer");
      handleTypeChange();

      document.getElementById('form-target-account').value = targetName;
      if (document.getElementById('display-target-account')) {
        document.getElementById('display-target-account').innerText = targetName;
        document.getElementById('display-target-account').classList.remove('text-faint');
      }
      document.getElementById('form-category').value = "Internal Transfer";
      const catDisplay = document.getElementById('form-category-display');
      if (catDisplay) {
        catDisplay.innerText = "Internal Transfer";
        catDisplay.classList.remove('text-faint');
      }
      document.getElementById('form-description').value = "Payment of " + targetName;
    } else {
      document.getElementById('form-type').value = "Pay Installment";
      updateTypeDisplay("Pay Installment");
      handleTypeChange();

      document.getElementById('form-payable').value = targetName;
      if (document.getElementById('display-payable')) {
        document.getElementById('display-payable').innerText = targetName;
        document.getElementById('display-payable').classList.remove('text-faint');
      }
      document.getElementById('form-category').value = "Pay Installment";
      const catDisplay = document.getElementById('form-category-display');
      if (catDisplay) {
        catDisplay.innerText = "Pay Installment";
        catDisplay.classList.remove('text-faint');
      }
      document.getElementById('form-description').value = "Payment of " + targetName;
    }

    if (defaultAmount && defaultAmount > 0) {
      document.getElementById('form-amount-value').value = defaultAmount;
      document.getElementById('form-amount-display').value = new Intl.NumberFormat('id-ID').format(defaultAmount);
    }
  }, 350);
}
    
    function startMochiBlinking() {
      if (mochiBlinkTimeout) clearTimeout(mochiBlinkTimeout);

      mochiBlinkTimeout = setTimeout(() => {
        const imgEl = document.getElementById('mochi-mood-img');
        if (imgEl && currentMochiMood) {
          imgEl.src = `mochi-${currentMochiMood}-closed.png`;
          
          setTimeout(() => {
            if (imgEl && currentMochiMood) {
              imgEl.src = `mochi-${currentMochiMood}-open.png`;
              startMochiBlinking();
            }
          }, 2500);
        }
      }, 1500);
    }

