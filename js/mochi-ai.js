    function toggleMochiAIMenu() {
      mochiAIMenuOpen ? closeMochiAIMenu() : openMochiAIMenu();
    }

    function openMochiAIMenu() {
      mochiAIMenuOpen = true;
      document.getElementById('mochi-ai-menu').classList.remove('hidden');
      document.getElementById('mochi-ai-backdrop').classList.remove('hidden');
      const fab = document.getElementById('mochi-ai-fab');
      if (fab) { fab.style.transform = 'rotate(45deg)'; fab.classList.add('glow-active'); }
    }

    function closeMochiAIMenu() {
      mochiAIMenuOpen = false;
      document.getElementById('mochi-ai-menu').classList.add('hidden');
      document.getElementById('mochi-ai-backdrop').classList.add('hidden');
      const fab = document.getElementById('mochi-ai-fab');
      if (fab) { fab.style.transform = ''; fab.classList.remove('glow-active'); }
    }

    // "Chat" and "Suara" open the lightweight Quick Ask card (Apple
    // Intelligence–style floating answer) instead of jumping straight into
    // the full sheet — same mochiChat backend, just a faster surface for a
    // one-off question. The full modalMochiChat is still reachable by
    // tapping the reply card, or via the dashboard "Mochi AI" widget for an
    // ongoing conversation.
    function mochiAIAction(kind) {
      closeMochiAIMenu();
      // Shortcut to the exact same action as Command Center's "Force
      // Sync Data" — same delay, no extra toast in between, so it
      // feels just as instant/reliable rather than its own thing.
      if (kind === 'sync') { setTimeout(() => loadAppData(), 300); return; }
      if (kind === 'chat') { openMochiQuickAsk(); return; }
      if (kind === 'add') { openNewTransactionForm(); return; }
      if (kind === 'scan') { triggerEdgeGlow(1600); document.getElementById('receipt-file-input').click(); return; }
      if (kind === 'voice') { openMochiQuickAsk(); setTimeout(() => toggleMochiQuickVoice(), 250); return; }
    }

    let mochiChatHistory = [];
    let mochiChatFullscreen = false;
    let mochiSheetDrag = null; // { startY, startHeight, wasFullscreen }

    function openMochiChatModal() {
      exitMochiFullscreen(true); // always reopen compact, like Gemini's overlay
      openModal('modalMochiChat');
      const chatAvatarEl = document.getElementById('mochi-chat-avatar');
      if (chatAvatarEl && currentMochiMood) chatAvatarEl.src = `assets/mochi-${currentMochiMood}-open.png`;
      if (mochiChatHistory.length === 0) mochiChatHistory.push({ role: 'welcome' });
      renderMochiChatMessages(); // always re-render — history may already hold a Quick Ask exchange
      setTimeout(() => updateMochiChatSheetHeight(), 50);
      setTimeout(() => document.getElementById('mochi-chat-input').focus(), 200);
    }

    // ---- Quick Ask (Apple Intelligence–style floating answer) ----
    // Shares mochiChatHistory and the same mochiChat backend call as the
    // full sheet, so a question asked here already exists in history if
    // the person later opens the full conversation — nothing is re-sent.
    function openMochiQuickAsk() {
      const backdrop = document.getElementById('mochi-quick-ask-backdrop');
      backdrop.classList.remove('hidden');
      document.getElementById('mochi-quick-ask').classList.remove('hidden');
      document.getElementById('mochi-quick-thinking').classList.add('hidden');

      // Default state: show the reply card with a greeting instead of
      // hiding it — same card used for real replies (image 2's asset),
      // just pre-filled so there's never an empty gap above the input.
      // If there's already an exchange this session, show that reply
      // instead of overwriting it with the greeting again.
      const lastMochiMsg = [...mochiChatHistory].reverse().find(m => m.role === 'mochi');
      showMochiQuickAnswer(lastMochiMsg ? lastMochiMsg.text : "Hi, I'm Mochi! How can I help you today? 🐾");

      requestAnimationFrame(() => backdrop.classList.add('show'));
      holdEdgeGlow();
      setTimeout(() => document.getElementById('mochi-quick-input').focus(), 150);
    }

    function closeMochiQuickAsk() {
      if (mochiQuickListening && mochiQuickRecognition) mochiQuickRecognition.abort();
      const backdrop = document.getElementById('mochi-quick-ask-backdrop');
      backdrop.classList.remove('show');
      document.getElementById('mochi-quick-ask').classList.add('hidden');
      document.getElementById('mochi-quick-input').value = '';
      setTimeout(() => backdrop.classList.add('hidden'), 300);
      stopEdgeGlow();
    }

    // Tapping the reply card hands off to the full sheet — same history,
    // so it opens already showing this exchange plus anything earlier.
    function expandMochiQuickAsk() {
      vibrate(30);
      const backdrop = document.getElementById('mochi-quick-ask-backdrop');
      backdrop.classList.remove('show');
      document.getElementById('mochi-quick-ask').classList.add('hidden');
      document.getElementById('mochi-quick-input').value = '';
      setTimeout(() => backdrop.classList.add('hidden'), 300);
      openMochiChatModal();
    }

    function sendMochiQuickMessage() {
      const input = document.getElementById('mochi-quick-input');
      const message = input.value.trim();
      if (!message) return;

      const promptSentAt = new Date().toISOString();
      mochiChatHistory.push({ role: 'user', text: message });
      input.value = '';

      document.getElementById('mochi-quick-answer-card').classList.add('hidden');
      document.getElementById('mochi-quick-thinking').classList.remove('hidden');

      const historyForApi = mochiChatHistory.filter(m => m.role === 'user' || m.role === 'mochi').slice(-6);

      postApi('mochiChat', { message, history: historyForApi, activeUser: getActiveUser() })
        .then(result => {
          const action = result.action || null;
          if (action) action.promptTimestamp = promptSentAt;
          mochiChatHistory.push({ role: 'mochi', text: result.reply, action });
          showMochiQuickAnswer(result.reply);
        })
        .catch(err => {
          const fallback = "Ngeong? Koneksi ke otak AI-ku lagi bermasalah 🙀 Coba lagi ya.";
          mochiChatHistory.push({ role: 'mochi', text: fallback });
          showMochiQuickAnswer(fallback);
        });
    }

    function showMochiQuickAnswer(text) {
      document.getElementById('mochi-quick-thinking').classList.add('hidden');
      const card = document.getElementById('mochi-quick-answer-card');
      document.getElementById('mochi-quick-answer-text').textContent = text;
      card.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    // Same on-device Web Speech API as the full sheet's voice bar, just
    // targeting the quick input instead of #mochi-chat-input.
    let mochiQuickRecognition = null;
    let mochiQuickListening = false;
    function toggleMochiQuickVoice() {
      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        showToast("Input suara belum didukung di browser ini (coba Chrome di Android).", "error");
        return;
      }
      if (mochiQuickListening) { mochiQuickRecognition.stop(); return; }

      mochiQuickRecognition = new SpeechRecognitionCtor();
      mochiQuickRecognition.lang = 'id-ID';
      mochiQuickRecognition.interimResults = false;
      mochiQuickRecognition.maxAlternatives = 1;

      const btn = document.getElementById('mochi-quick-voice-btn');
      mochiQuickRecognition.onstart = () => {
        mochiQuickListening = true;
        if (btn) btn.classList.add('glow-active');
      };
      mochiQuickRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('mochi-quick-input');
        if (input) { input.value = transcript; input.focus(); }
      };
      mochiQuickRecognition.onend = () => {
        mochiQuickListening = false;
        if (btn) btn.classList.remove('glow-active');
      };
      mochiQuickRecognition.onerror = () => {
        mochiQuickListening = false;
        if (btn) btn.classList.remove('glow-active');
      };
      mochiQuickRecognition.start();
    }

    // Tapping the input to type a longer message feels natural in the
    // full-height view, same as Gemini expanding when you start typing —
    // so we grow the sheet a bit further (not full fullscreen, just roomier).
    function mochiChatInputFocused() {
      if (!mochiChatFullscreen) updateMochiChatSheetHeight();
    }

    // Measures how tall the sheet WANTS to be based on its content (header +
    // messages + input bar), then clamps it between a compact minimum and an
    // 82vh cap. This is what makes the sheet start small and grow with the
    // conversation instead of always taking up 75% of the screen.
    function updateMochiChatSheetHeight() {
      const content = document.getElementById('modalMochiChat-content');
      if (!content || mochiChatFullscreen) return;
      const header = content.querySelector('.relative.flex-shrink-0.overflow-hidden.z-10');
      const messagesEl = document.getElementById('mochi-chat-messages');
      const inputBar = content.querySelector('.border-t');
      const headerH = header ? header.offsetHeight : 76;
      const inputH = inputBar ? inputBar.offsetHeight : 68;
      const dragHandleH = 20;
      const naturalMsgH = messagesEl ? messagesEl.scrollHeight + 24 : 0;

      const minCompact = 300;
      const maxCap = Math.round(window.innerHeight * 0.82);
      const wanted = headerH + inputH + dragHandleH + naturalMsgH;
      const clamped = Math.max(minCompact, Math.min(wanted, maxCap));
      content.style.height = clamped + 'px';
    }

    function toggleMochiFullscreen() {
      mochiChatFullscreen ? exitMochiFullscreen() : enterMochiFullscreen();
    }

    function enterMochiFullscreen() {
      mochiChatFullscreen = true;
      vibrate(25);
      const content = document.getElementById('modalMochiChat-content');
      if (content) {
        content.classList.remove('mochi-chat-dragging');
        content.style.transform = '';
        content.classList.add('mochi-chat-fullscreen');
      }
      const glow = document.getElementById('mochi-ambient-glow');
      if (glow) glow.classList.add('active');
      const icon = document.querySelector('#mochi-chat-expand-btn i');
      if (icon) icon.setAttribute('data-lucide', 'chevron-down');
      lucide.createIcons();
    }

    function exitMochiFullscreen(silent) {
      const wasFullscreen = mochiChatFullscreen;
      mochiChatFullscreen = false;
      const content = document.getElementById('modalMochiChat-content');
      if (content) {
        content.classList.remove('mochi-chat-dragging');
        content.style.transform = '';
        content.classList.remove('mochi-chat-fullscreen');
      }
      const glow = document.getElementById('mochi-ambient-glow');
      if (glow) glow.classList.remove('active');
      const icon = document.querySelector('#mochi-chat-expand-btn i');
      if (icon) icon.setAttribute('data-lucide', 'chevron-up');
      if (!silent) { vibrate(20); lucide.createIcons(); }
      if (wasFullscreen) setTimeout(() => updateMochiChatSheetHeight(), 20);
    }

    // Swipe-up-to-expand / swipe-down-to-collapse on the drag handle & header,
    // mirroring Gemini's overlay gesture. A firm downward swipe from the
    // compact (non-fullscreen) state closes the sheet entirely.
    function mochiSheetDragStart(e) {
      const content = document.getElementById('modalMochiChat-content');
      if (!content) return;
      mochiSheetDrag = {
        startY: e.touches[0].clientY,
        startHeight: content.getBoundingClientRect().height,
        wasFullscreen: mochiChatFullscreen
      };
      content.classList.add('mochi-chat-dragging');
    }

    function mochiSheetDragMove(e) {
      if (!mochiSheetDrag) return;
      const content = document.getElementById('modalMochiChat-content');
      if (!content) return;
      const deltaY = e.touches[0].clientY - mochiSheetDrag.startY;

      if (mochiSheetDrag.wasFullscreen) {
        // Dragging down out of fullscreen: follow the finger.
        if (deltaY > 0) content.style.transform = `translateY(${deltaY}px)`;
      } else {
        // Dragging up grows the sheet live; dragging down shrinks/previews close.
        const next = Math.max(140, Math.min(mochiSheetDrag.startHeight - deltaY, window.innerHeight));
        content.style.height = next + 'px';
      }
    }

    function mochiSheetDragEnd(e) {
      if (!mochiSheetDrag) return;
      const content = document.getElementById('modalMochiChat-content');
      const deltaY = (e.changedTouches ? e.changedTouches[0].clientY : mochiSheetDrag.startY) - mochiSheetDrag.startY;
      content.classList.remove('mochi-chat-dragging');
      content.style.transform = '';

      if (mochiSheetDrag.wasFullscreen) {
        if (deltaY > 120) exitMochiFullscreen();
        else enterMochiFullscreen();
      } else {
        if (deltaY < -80) enterMochiFullscreen();
        else if (deltaY > 90) closeModal('modalMochiChat');
        else updateMochiChatSheetHeight();
      }
      mochiSheetDrag = null;
    }

    window.addEventListener('resize', () => {
      if (!document.getElementById('modalMochiChat').classList.contains('hidden') && !mochiChatFullscreen) {
        updateMochiChatSheetHeight();
      }
    });

    function renderMochiChatMessages() {
      const el = document.getElementById('mochi-chat-messages');
      if (!el) return;
      const avatarSrc = `assets/mochi-${currentMochiMood || 'chill'}-open.png`;
      const mochiAvatarHtml = `<img src="${avatarSrc}" alt="Mochi" class="w-7 h-7 rounded-full object-contain bg-[var(--bg-card)] border border-[var(--border-color)] p-0.5 flex-shrink-0 self-end">`;

      el.innerHTML = mochiChatHistory.map((m, idx) => {
        if (m.role === 'welcome') {
          return `<div class="chat-bubble-in bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[1.75rem] p-5 space-y-4 shadow-sm">
            <div class="flex items-center gap-2.5">
              <img src="assets/mochi-chill-open.png" alt="Mochi" class="w-10 h-10 rounded-full object-contain bg-[var(--bg-subtle-2)] border border-[var(--border-color)] p-0.5 flex-shrink-0">
              <div class="min-w-0">
                <h4 class="text-base font-black text-main leading-tight tracking-tight">Hai, aku Mochi 🐾</h4>
                <p class="text-[10.5px] text-muted font-semibold">Asisten keuangan harian kamu</p>
              </div>
            </div>
            <div class="space-y-3.5">
              <div class="flex items-start justify-between gap-3">
                <p class="text-[12.5px] text-main leading-snug flex-1"><span class="font-extrabold">Scan struk.</span> Foto struk belanja, Mochi otomatis baca &amp; catat transaksinya.</p>
                <button type="button" onclick="vibrate(30); document.getElementById('receipt-file-input').click();" class="tap-shrink flex-shrink-0 text-[10.5px] font-extrabold text-mochi dark:text-mochi-light bg-[var(--chip-accent-bg)] px-3 py-1.5 rounded-full">Coba</button>
              </div>
              <div class="flex items-start justify-between gap-3">
                <p class="text-[12.5px] text-main leading-snug flex-1"><span class="font-extrabold">Ngobrol bebas.</span> Tanya soal keuanganmu, atau bilang aja transaksinya — misal "kopi 25rb dari cash".</p>
              </div>
              <div class="flex items-start justify-between gap-3">
                <p class="text-[12.5px] text-main leading-snug flex-1"><span class="font-extrabold">Mode suara.</span> Tap ikon mic dan ngobrol langsung tanpa ngetik.</p>
                <button type="button" onclick="vibrate(30); toggleMochiVoiceInput();" class="tap-shrink flex-shrink-0 text-[10.5px] font-extrabold text-mochi dark:text-mochi-light bg-[var(--chip-accent-bg)] px-3 py-1.5 rounded-full">Coba</button>
              </div>
            </div>
          </div>`;
        }
        if (m.role === 'user') {
          return `<div class="flex justify-end chat-bubble-in"><div class="bg-gradient-to-br from-mochi-light to-mochi text-white text-4xs font-semibold rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] shadow-[0_2px_10px_-2px_rgba(184,146,90,0.4)]">${escapeHtml(m.text)}</div></div>`;
        }
        if (m.role === 'typing') {
          return `<div class="flex justify-start items-end space-x-2 chat-bubble-in">${mochiAvatarHtml}<div class="bg-[var(--bg-card)] border border-[var(--border-color)] text-muted rounded-2xl rounded-bl-md px-4 py-3.5 shadow-sm flex items-center space-x-1.5">
            <span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span>
          </div></div>`;
        }
        let actionHtml = '';
        if (m.action) {
          actionHtml = renderMochiActionCard(m.action, idx);
        }
        return `<div class="flex justify-start items-end space-x-2 chat-bubble-in">${mochiAvatarHtml}<div class="bg-[var(--bg-card)] border border-[var(--border-color)] text-main text-4xs font-semibold rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] space-y-2 shadow-sm">
          <p class="leading-snug">${escapeHtml(m.text)}</p>
          ${actionHtml}
        </div></div>`;
      }).join('');
      el.scrollTop = el.scrollHeight;
      lucide.createIcons();

      // Mochi "thinking" (typing bubble visible) gets the same glow treatment
      // as Gemini's active-listening/thinking state, recolored to the app's
      // gold palette — on the avatar ring and, in fullscreen, the ambient wash.
      const isThinking = mochiChatHistory.some(m => m.role === 'typing');
      const avatarWrap = document.getElementById('mochi-chat-avatar-wrap');
      if (avatarWrap) avatarWrap.classList.toggle('glow-active', isThinking);
      const ambientGlow = document.getElementById('mochi-ambient-glow');
      if (ambientGlow && mochiChatFullscreen) ambientGlow.classList.toggle('active', true);

      if (!mochiChatFullscreen) updateMochiChatSheetHeight();
    }

    function renderMochiActionCard(action, msgIdx) {
      if (action.confirmed) {
        return `<div class="bg-[var(--chip-in-bg)] amount-in rounded-xl px-3 py-2.5 text-3xs font-extrabold flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>Tersimpan!</div>`;
      }
      if (action.cancelled) {
        return `<div class="bg-[var(--bg-subtle-2)] text-faint rounded-xl px-3 py-2.5 text-3xs font-bold">Dibatalkan.</div>`;
      }

      // Reuses the exact same TYPE_META the manual transaction form uses
      // (defined once, earlier in this file) — this is what lets Mochi's
      // chat handle Give Receivable / Receive Payable / Pay Installment
      // correctly, instead of only ever offering Income/Expense/Transfer.
      const type = action.transactionType || 'Expense';
      const meta = getTypeMeta(type);
      // Bookkeeping-only adjustments (no cash movement) stay manual-only —
      // too easy to fat-finger via chat, they belong in the deliberate
      // Payable/Receivable detail screens instead.
      const chatTypeOptions = Object.keys(TYPE_META).filter(t => t !== 'Write-Off Receivable' && t !== 'Debt Forgiven');
      const typeSelectOptions = chatTypeOptions
        .map(t => `<option value="${escapeAttr(t)}" ${t === type ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');

      const catOptions = (GLOBAL_DATA.categories || [])
        .filter(c => c.type === meta.categoryType)
        .map(c => `<option value="${escapeAttr(c.categoryName)}" ${c.categoryName === action.category ? 'selected' : ''}>${escapeHtml(c.categoryName)}</option>`).join('');

      const buildAcctOptions = (selectedName) => (GLOBAL_DATA.accounts || [])
        .map(a => `<option value="${escapeAttr(a.accountName)}" ${a.accountName === selectedName ? 'selected' : ''}>${escapeHtml(a.accountName)}</option>`).join('');
      // action.account is the AI's resolved source account (e.g. it matched
      // "akun yosa" to "BCA Yosa" via the owner field); action.targetAccount
      // is the destination for Income/Transfer. Pre-selecting these means
      // the user only has to confirm, not re-pick, when Mochi got it right.
      const sourceAcctOptions = buildAcctOptions(action.account);
      const targetAcctOptions = buildAcctOptions(action.targetAccount);

      const activePayables = (GLOBAL_DATA.payables || []).filter(p => (p.status || '').toLowerCase() === 'active');
      const activeReceivables = (GLOBAL_DATA.receivables || []).filter(r => !['settled', 'written_off'].includes((r.status || '').toLowerCase()));
      const payableOptions = activePayables
        .map(p => `<option value="${escapeAttr(p.payableName)}" ${p.payableName === action.relatedPayable ? 'selected' : ''}>${escapeHtml(p.payableName)}</option>`).join('');
      const receivableOptions = activeReceivables
        .map(r => `<option value="${escapeAttr(r.receivableName)}" ${r.receivableName === action.relatedReceivable ? 'selected' : ''}>${escapeHtml(r.receivableName)}</option>`).join('');

      return `
        <div class="bg-[var(--bg-subtle-2)] rounded-2xl p-3.5 space-y-2.5 mt-1 border border-[var(--border-color)]">
          <p class="text-2xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5"><i data-lucide="receipt-text" class="w-3 h-3"></i>Konfirmasi Transaksi</p>
          <select id="mochi-action-type-${msgIdx}" onchange="handleMochiActionTypeChange(${msgIdx})" class="w-full ios-input py-2 text-xs">${typeSelectOptions}</select>
          <input type="text" id="mochi-action-amount-${msgIdx}" value="${action.amount || ''}" placeholder="Jumlah (Rp)" class="w-full ios-input py-2 text-xs font-bold" inputmode="numeric">
          ${catOptions ? `<select id="mochi-action-category-${msgIdx}" class="w-full ios-input py-2 text-xs">${catOptions}</select>` : ''}
          ${meta.showSource ? `<select id="mochi-action-source-${msgIdx}" class="w-full ios-input py-2 text-xs"><option value="">Dari akun...</option>${sourceAcctOptions}</select>` : ''}
          ${meta.showTarget ? `<select id="mochi-action-target-${msgIdx}" class="w-full ios-input py-2 text-xs"><option value="">Ke akun...</option>${targetAcctOptions}</select>` : ''}
          ${meta.showPayable ? `<select id="mochi-action-payable-${msgIdx}" class="w-full ios-input py-2 text-xs"><option value="">Terkait hutang...</option>${payableOptions}</select>` : ''}
          ${meta.showReceivable ? `<select id="mochi-action-receivable-${msgIdx}" class="w-full ios-input py-2 text-xs"><option value="">Terkait piutang...</option>${receivableOptions}</select>` : ''}
          <input type="text" id="mochi-action-desc-${msgIdx}" value="${escapeAttr(action.description || '')}" placeholder="Deskripsi" class="w-full ios-input py-2 text-xs">
          <div class="flex space-x-2 pt-1">
            <button type="button" onclick="cancelMochiAction(${msgIdx})" class="tap-shrink flex-1 py-2.5 text-3xs font-extrabold rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-muted">Batal</button>
            <button type="button" onclick="confirmMochiAction(${msgIdx})" class="tap-shrink flex-1 py-2.5 text-3xs font-extrabold rounded-xl bg-gradient-to-br from-mochi-light to-mochi hover:from-mochi hover:to-mochi-dark text-white shadow-[0_4px_12px_-2px_rgba(184,146,90,0.4)]">Simpan</button>
          </div>
        </div>
      `;
    }

    // Switching type mid-confirmation (e.g. Mochi guessed "Expense" but it
    // was actually "Pay Installment") needs the card's fields to change
    // shape — re-render, but first persist whatever the user already typed
    // so amount/description survive the re-render.
    function handleMochiActionTypeChange(msgIdx) {
      const action = mochiChatHistory[msgIdx] && mochiChatHistory[msgIdx].action;
      if (!action) return;
      action.transactionType = document.getElementById(`mochi-action-type-${msgIdx}`).value;
      const amountEl = document.getElementById(`mochi-action-amount-${msgIdx}`);
      if (amountEl) action.amount = amountEl.value;
      const descEl = document.getElementById(`mochi-action-desc-${msgIdx}`);
      if (descEl) action.description = descEl.value;
      renderMochiChatMessages();
    }

    function cancelMochiAction(msgIdx) {
      vibrate(20);
      mochiChatHistory[msgIdx].action.cancelled = true;
      renderMochiChatMessages();
    }

    function confirmMochiAction(msgIdx) {
      const action = mochiChatHistory[msgIdx] && mochiChatHistory[msgIdx].action;
      if (!action) return;

      const type = document.getElementById(`mochi-action-type-${msgIdx}`).value;
      const meta = getTypeMeta(type);
      const amount = parseFloat((document.getElementById(`mochi-action-amount-${msgIdx}`).value || '').replace(/[^0-9.]/g, '')) || 0;
      const categoryEl = document.getElementById(`mochi-action-category-${msgIdx}`);
      const category = categoryEl ? categoryEl.value : '';
      const description = document.getElementById(`mochi-action-desc-${msgIdx}`).value;
      const sourceEl = document.getElementById(`mochi-action-source-${msgIdx}`);
      const targetEl = document.getElementById(`mochi-action-target-${msgIdx}`);
      const payableEl = document.getElementById(`mochi-action-payable-${msgIdx}`);
      const receivableEl = document.getElementById(`mochi-action-receivable-${msgIdx}`);

      if (amount <= 0) { showToast("Jumlahnya belum diisi.", "error"); return; }
      if (meta.showSource && (!sourceEl || !sourceEl.value)) { showToast("Pilih akun sumbernya dulu.", "error"); return; }
      if (meta.showTarget && (!targetEl || !targetEl.value)) { showToast("Pilih akun tujuannya dulu.", "error"); return; }
      if (meta.showPayable && (!payableEl || !payableEl.value)) { showToast("Pilih hutang yang terkait dulu.", "error"); return; }
      if (meta.showReceivable && (!receivableEl || !receivableEl.value)) { showToast("Pilih piutang yang terkait dulu.", "error"); return; }

      // Dated to when the prompt actually came in (captured in
      // sendMochiChatMessage), not the moment "Simpan" is tapped — so a
      // transaction typed at 08:03 but confirmed at 08:11 still records 08:03.
      const promptedAt = action.promptTimestamp ? new Date(action.promptTimestamp) : new Date();
      const dateStr = todayDateStringLocal(promptedAt);
      const timeStr = promptedAt.toTimeString().substring(0, 5);

      const payload = {
        type, amount, category, description,
        date: dateStr,
        time: timeStr,
        enteredBy: action.enteredBy || getActiveUser() || "Yosa",
        sourceAccount: meta.showSource ? sourceEl.value : '',
        targetAccount: meta.showTarget ? targetEl.value : '',
        relatedPayable: meta.showPayable ? payableEl.value : '',
        relatedReceivable: meta.showReceivable ? receivableEl.value : ''
      };

      vibrate(30);

      // OPTIMISTIC UI — same pattern as the manual transaction form: drop
      // it into the transaction list and mark the chat card "Tersimpan!"
      // immediately, then sync to Sheets in the background. This is what
      // makes Mochi feel snappy instead of waiting on an Apps Script +
      // Sheets round-trip before responding.
      const tempId = "TRX-TEMP-" + Date.now();
      const newTrx = {
        transactionId: tempId,
        date: payload.date + "T" + timeStr + ":00",
        month: payload.date.substring(0, 7),
        type: payload.type,
        sourceAccount: payload.sourceAccount,
        targetAccount: payload.targetAccount,
        category: payload.category,
        description: payload.description,
        amount: payload.amount,
        enteredBy: payload.enteredBy,
        relatedPayable: payload.relatedPayable,
        relatedReceivable: payload.relatedReceivable,
        notes: '',
        mainCategory: payload.category
      };
      GLOBAL_DATA.transactions.unshift(newTrx);
      GLOBAL_DATA.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      renderHistory();
      renderDashboard();

      action.confirmed = true;
      renderMochiChatMessages();
      showToast("Transaksi tersimpan!");
      showRewardAnimation("Saved via Mochi AI");

      postApi('createTransaction', payload)
        .then(result => {
          if (result && result.data) {
            GLOBAL_DATA = result.data;
            localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
            renderAllViews();
          }
        })
        .catch(err => {
          if (err.isNetworkError) {
            // Confirmed the request never reached the server — safe to
            // queue for automatic retry, same as the manual form.
            enqueuePending('createTransaction', payload, {}, tempId);
            showToast("Offline — tersimpan lokal, akan disinkron otomatis.", "info");
          } else {
            // Server actually rejected it — roll back the optimistic
            // insert and let the user know, instead of leaving a phantom
            // "Tersimpan!" for a transaction that never really saved.
            const idx = GLOBAL_DATA.transactions.findIndex(t => t.transactionId === tempId);
            if (idx !== -1) GLOBAL_DATA.transactions.splice(idx, 1);
            renderHistory();
            renderDashboard();
            action.confirmed = false;
            renderMochiChatMessages();
            showToast(err.message || "Gagal menyimpan transaksi.", "error");
          }
        });
    }

    function sendMochiChatMessage() {
      const input = document.getElementById('mochi-chat-input');
      const message = input.value.trim();
      if (!message) return;

      // Captured now — this is the timestamp that ends up on the saved
      // transaction, not whenever the user later taps "Simpan" on the
      // confirmation card (which could be minutes later).
      const promptSentAt = new Date().toISOString();

      mochiChatHistory.push({ role: 'user', text: message });
      mochiChatHistory.push({ role: 'typing' });
      renderMochiChatMessages();
      input.value = '';

      const historyForApi = mochiChatHistory.filter(m => m.role === 'user' || m.role === 'mochi').slice(-6);

      postApi('mochiChat', { message, history: historyForApi, activeUser: getActiveUser() })
        .then(result => {
          mochiChatHistory = mochiChatHistory.filter(m => m.role !== 'typing');
          const action = result.action || null;
          if (action) action.promptTimestamp = promptSentAt;
          mochiChatHistory.push({ role: 'mochi', text: result.reply, action });
          renderMochiChatMessages();
        })
        .catch(err => {
          mochiChatHistory = mochiChatHistory.filter(m => m.role !== 'typing');
          mochiChatHistory.push({ role: 'mochi', text: "Ngeong? Koneksi ke otak AI-ku lagi bermasalah 🙀 Coba lagi ya." });
          renderMochiChatMessages();
        });
    }

    // Receipts are read into the SAME chat + action-card flow as a typed
    // message — Mochi "sees" the photo, replies with a comment, and if it
    // could read a total, offers the exact same editable confirm card
    // (with the same TYPE_META-aware fields) used everywhere else. No
    // separate modal, no separate save path, no auto-save.
    function handleReceiptFileSelected(event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = ''; // allow re-selecting the same file next time
      if (!file) return;

      openMochiChatModal();
      mochiChatHistory.push({ role: 'user', text: '📷 Foto struk' });
      mochiChatHistory.push({ role: 'typing' });
      renderMochiChatMessages();

      const promptSentAt = new Date().toISOString();

      compressImageToBase64(file, 1280, 0.7)
        .then(({ base64, mimeType }) => postApi('scanReceipt', { imageBase64: base64, mimeType }))
        .then(result => {
          mochiChatHistory = mochiChatHistory.filter(m => m.role !== 'typing');
          let action = null;
          if (result.amount > 0) {
            action = {
              type: 'add_transaction',
              transactionType: 'Expense',
              amount: result.amount,
              category: result.category || '',
              description: result.merchant || 'Belanja',
              promptTimestamp: promptSentAt
            };
          }
          let replyText = result.note || "Ini yang Mochi baca dari strukmu!";
          if (result.date) replyText += ` (Tanggal di struk: ${formatDate(result.date)} — Mochi tetap catat hari ini, edit manual kalau perlu ya)`;
          mochiChatHistory.push({ role: 'mochi', text: replyText, action });
          renderMochiChatMessages();
        })
        .catch(err => {
          mochiChatHistory = mochiChatHistory.filter(m => m.role !== 'typing');
          mochiChatHistory.push({ role: 'mochi', text: "Ngeong? Mochi nggak bisa baca strukmu — ada gangguan koneksi 🙀 Coba lagi atau isi manual ya." });
          renderMochiChatMessages();
        });
    }

    // Resizes + re-encodes as JPEG client-side before upload — a raw phone
    // photo can be 5-10MB, which is slow to upload and unnecessarily
    // expensive to send to Gemini. 1280px is plenty for reading a receipt.
    function compressImageToBase64(file, maxWidth, quality) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
        };
        img.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Voice → text happens entirely on-device via the browser's Web Speech
    // API (no audio ever leaves the phone, no backend involved) — the
    // transcript just lands in the chat input for the person to review and
    // send, going through the exact same mochiChat parsing as if they'd
    // typed it. NOTE: this API isn't implemented in Safari/iOS at all
    // (Apple's WebKit doesn't ship SpeechRecognition), so voice input is
    // Android/Chrome-only for now — the mic button quietly won't work
    // there instead of pretending to.
    let mochiRecognition = null;
    let mochiListening = false;

    // Builds the little live waveform inside the voice bar — a fistful of
    // bars each with its own randomized height/speed so the bounce looks
    // organic (like an audio level meter) instead of a single repeating tick.
    function buildMochiVoiceWave() {
      const wave = document.getElementById('mochi-voice-wave');
      if (!wave) return;
      wave.innerHTML = '';
      const barCount = 26;
      for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('span');
        bar.className = 'voice-wave-bar';
        const baseHeight = 8 + Math.round(Math.random() * 20);
        bar.style.height = baseHeight + 'px';
        bar.style.animationDuration = (0.6 + Math.random() * 0.6).toFixed(2) + 's';
        bar.style.animationDelay = (Math.random() * 0.8).toFixed(2) + 's';
        wave.appendChild(bar);
      }
    }

    function showMochiVoiceBar() {
      const row = document.getElementById('mochi-chat-input-row');
      const bar = document.getElementById('mochi-voice-bar');
      if (row) row.classList.add('mochi-input-slot-inactive');
      if (bar) bar.classList.remove('mochi-input-slot-inactive');
      buildMochiVoiceWave();
    }

    function hideMochiVoiceBar() {
      const row = document.getElementById('mochi-chat-input-row');
      const bar = document.getElementById('mochi-voice-bar');
      if (bar) bar.classList.add('mochi-input-slot-inactive');
      if (row) row.classList.remove('mochi-input-slot-inactive');
    }

    function cancelMochiVoiceInput() {
      if (mochiListening && mochiRecognition) mochiRecognition.abort();
      hideMochiVoiceBar();
    }

    function toggleMochiVoiceInput() {
      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        showToast("Input suara belum didukung di browser ini (coba Chrome di Android).", "error");
        return;
      }

      if (mochiListening) {
        mochiRecognition.stop();
        return;
      }

      mochiRecognition = new SpeechRecognitionCtor();
      mochiRecognition.lang = 'id-ID';
      mochiRecognition.interimResults = false;
      mochiRecognition.maxAlternatives = 1;

      const btn = document.getElementById('mochi-voice-btn');

      mochiRecognition.onstart = () => {
        mochiListening = true;
        showMochiVoiceBar();
        holdEdgeGlow();
      };

      mochiRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('mochi-chat-input');
        if (input) { input.value = transcript; input.focus(); }
      };

      mochiRecognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          showToast("Mochi nggak bisa dengar dengan jelas, coba lagi ya.", "error");
        }
      };

      mochiRecognition.onend = () => {
        mochiListening = false;
        if (btn) btn.className = "tap-shrink w-8 h-8 text-muted hover:text-mochi flex items-center justify-center flex-shrink-0 mochi-glow-ring";
        hideMochiVoiceBar();
        // The chat sheet itself is still open, so keep its own ambient glow;
        // just drop back from "listening" intensity to the sheet-open hold.
        if (document.getElementById('modalMochiChat').classList.contains('show')) {
          holdEdgeGlow();
        } else {
          stopEdgeGlow();
        }
      };

      mochiRecognition.start();
    }

