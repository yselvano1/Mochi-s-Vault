    function openNewTransactionForm() {
      document.getElementById('formTransaction').reset();
      document.getElementById('form-transaction-id').value = "";
      const now = new Date();
      document.getElementById('form-date').valueAsDate = now;
      document.getElementById('form-time').value = now.toTimeString().slice(0, 5);
      document.getElementById('form-amount-value').value = "";

      const catDisplay = document.getElementById('form-category-display');
      catDisplay.innerText = "Select Category...";
      catDisplay.classList.add('text-faint');

      // --- TAMBAHAN FIX 1: Hapus "Sisa Ingatan" Akun ---
      ['source-account', 'target-account', 'payable', 'receivable'].forEach(id => {
        document.getElementById('form-' + id).value = "";
        const disp = document.getElementById('display-' + id);
        if (disp) {
          disp.innerText = "Select...";
          disp.classList.add('text-faint');
        }
      });
      // --------------------------------------------------

      document.getElementById('modal-title-transaction').innerText = "New Transaction";
      document.getElementById('btn-submit-transaction').innerText = "Save Transaction";

      document.getElementById('form-type').value = "Expense";
      updateTypeDisplay("Expense");

      const activeUser = getActiveUser();
      if (activeUser) document.getElementById('form-user').value = activeUser;

      handleTypeChange();
      openModal('modalTransactionForm');
    }

    function handleEditTransaction(transactionId) {
      vibrate(30);
      const trx = GLOBAL_DATA.transactions.find(t => t.transactionId === transactionId);
      if (!trx) return;

      closeModal('modalDetail');

      setTimeout(() => {
        document.getElementById('form-transaction-id').value = trx.transactionId;
        document.getElementById('form-user').value = trx.enteredBy;
        document.getElementById('form-date').value = (trx.date || "").split('T')[0];
        document.getElementById('form-time').value = formatTime(trx.date) || "00:00";

        const typeVal = trx.type || "Expense";
        document.getElementById('form-type').value = typeVal;
        updateTypeDisplay(typeVal);

        handleTypeChange();

        const setField = (id, val) => {
          document.getElementById('form-' + id).value = val || "";
          const disp = document.getElementById('display-' + id);
          if (disp) {
            disp.innerText = val || "Select...";
            disp.classList.toggle('text-faint', !val);
          }
        };
        setField('source-account', trx.sourceAccount);
        setField('target-account', trx.targetAccount);
        setField('payable', trx.relatedPayable);
        setField('receivable', trx.relatedReceivable);

        document.getElementById('form-category').value = trx.category || "";
        const catDisplay = document.getElementById('form-category-display');
        if (trx.category) {
          catDisplay.innerText = trx.category;
          catDisplay.classList.remove('text-faint');
        } else {
          catDisplay.innerText = "Select Category...";
          catDisplay.classList.add('text-faint');
        }

        document.getElementById('form-amount-value').value = trx.amount;
        document.getElementById('form-amount-display').value = new Intl.NumberFormat('id-ID').format(trx.amount);

        document.getElementById('form-description').value = trx.description || "";
        document.getElementById('form-notes').value = trx.notes || "";

        document.getElementById('modal-title-transaction').innerText = "Edit Transaction";
        document.getElementById('btn-submit-transaction').innerText = "Update Transaction";

        openModal('modalTransactionForm');
      }, 400);
    }

    function promptDeleteTransaction(transactionId) {
      vibrate(40);
      transactionToDelete = transactionId;
      closeModal('modalDetail');

      const trx = GLOBAL_DATA.transactions.find(t => t.transactionId === transactionId);

      const titleEl = document.getElementById('delete-modal-title');
      const descEl = document.getElementById('delete-modal-desc');
      if (titleEl) titleEl.innerText = "Delete Transaction?";
      if (descEl) {
        if (trx) {
          // Show exactly what's about to be deleted so the confirmation
          // isn't a blind click — description was already off-screen since
          // the detail modal just closed above.
          const parts = [trx.category, formatRupiah(trx.amount), formatDate(trx.date)].filter(Boolean);
          descEl.innerHTML = `<span class="font-bold text-main">${escapeHtml(trx.description || trx.type || 'This transaction')}</span><br>${escapeHtml(parts.join(' · '))}<br><span class="text-3xs">This action cannot be undone once confirmed.</span>`;
        } else {
          descEl.innerText = "This action cannot be undone. Data will be permanently removed.";
        }
      }

      document.getElementById('btn-confirm-delete').onclick = async () => {
        if (!transactionToDelete) return;
        vibrate(30);
        await handleDeleteTransaction(transactionToDelete);
      };

      setTimeout(() => openModal('modalDelete'), 400);
    }

    async function handleDeleteTransaction(transactionId) {
      closeModal('modalDelete');

      // Keep a copy so we can restore it locally if the user hits Undo, or
      // if the background sync fails outright.
      const idx = GLOBAL_DATA.transactions.findIndex(t => t.transactionId === transactionId);
      const removedTrx = idx !== -1 ? GLOBAL_DATA.transactions[idx] : null;
      const removedIdx = idx;

      // OPTIMISTIC UI: Hapus dari lokal instan
      GLOBAL_DATA.transactions = GLOBAL_DATA.transactions.filter(t => t.transactionId !== transactionId);
      renderHistory();
      renderDashboard();
      showRewardAnimation("Deleted");

      let undone = false;

      showActionToast("Transaction deleted", "Undo", () => {
        undone = true;
        if (removedTrx) {
          const restoreAt = Math.min(removedIdx, GLOBAL_DATA.transactions.length);
          GLOBAL_DATA.transactions.splice(restoreAt, 0, removedTrx);
          renderHistory();
          renderDashboard();
        }
      });

      // Give the Undo toast a moment to be seen/clicked before we actually
      // sync the delete to the server — avoids deleting-then-recreating on
      // the backend for the common case where the user changes their mind.
      setTimeout(() => {
        if (undone) return;

        // Deleting a transaction that's still sitting in the offline queue
        // as an unsynced 'createTransaction' — it never reached the server,
        // so the correct "delete" is just dropping it from the queue, not
        // sending a deleteTransaction for an id the server never assigned.
        if (removePendingCreate(transactionId)) return;

        postApi('deleteTransaction', { transactionId })
          .then(result => {
            if (result && result.data) {
              GLOBAL_DATA = result.data;
              localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
            }
          })
          .catch(err => {
            if (err.isNetworkError) {
              enqueuePending('deleteTransaction', { transactionId });
              showToast("You're offline — deletion will sync automatically.", "info");
            } else {
              showToast("Connection failed! Couldn't delete from server.", "error");
              loadAppData(true); // Rollback
            }
          });
      }, 1200);
    }

    async function handleSaveTransaction(event) {
      event.preventDefault();

      const type = document.getElementById('form-type').value;
      const amount = Number(document.getElementById('form-amount-value').value) || 0;
      const category = document.getElementById('form-category').value;

      if (amount <= 0) { triggerInputError('form-amount-display', "Transaction amount cannot be empty."); return; }
      if (!category) { triggerInputError('form-category-display', "Please select a category first."); return; }

      const transactionId = document.getElementById('form-transaction-id').value;
      const isEdit = !!transactionId;

      // 1. Ambil aturan meta (aturan mana yang boleh tampil dan mana yang tidak)
      const meta = getTypeMeta(type);

      // 2. Ambil nilai dari form
      let sourceAcc = document.getElementById('form-source-account').value;
      let targetAcc = document.getElementById('form-target-account').value;
      let relatedPay = document.getElementById('form-payable').value;
      let relatedRec = document.getElementById('form-receivable').value;

      // 3. GERBANG PENJAGA MUTLAK: Kosongkan paksa jika tidak sesuai dengan tipenya!
      if (!meta.showSource) sourceAcc = "";
      if (!meta.showTarget) targetAcc = "";
      if (!meta.showPayable) relatedPay = "";
      if (!meta.showReceivable) relatedRec = "";

      // --- TAMBAHAN FIX 2: Cegah Transaksi Bodong (Tanpa Akun) ---
      if (meta.showSource && !sourceAcc) {
        triggerInputError('wrap-source-account', "Please select a Source Account."); return;
      }
      if (meta.showTarget && !targetAcc) {
        triggerInputError('wrap-target-account', "Please select a Target Account."); return;
      }
      if (meta.showPayable && !relatedPay) {
        triggerInputError('wrap-payable', "Please select a Related Payable."); return;
      }
      if (meta.showReceivable && !relatedRec) {
        triggerInputError('wrap-receivable', "Please select a Related Receivable."); return;
      }
      // -------------------------------------------------------------

      // 4. Susun Payload yang sudah bersih dari "data siluman"
      const payload = {
        date: document.getElementById('form-date').value,
        time: document.getElementById('form-time').value || "00:00",
        type: type,
        sourceAccount: sourceAcc,
        targetAccount: targetAcc,
        category: category,
        description: document.getElementById('form-description').value,
        amount: amount,
        enteredBy: document.getElementById('form-user').value,
        relatedPayable: relatedPay,
        relatedReceivable: relatedRec,
        notes: document.getElementById('form-notes').value
      };

      const fxWrap = document.getElementById('wrap-fx-amount');
      if (fxWrap && !fxWrap.classList.contains('hidden')) {
        const fxVal = parseFloat(document.getElementById('form-fx-amount').value) || 0;
        if (fxVal > 0) payload.fxAmount = fxVal;
      }
      
      if (isEdit) payload.transactionId = transactionId;

      const btn = document.getElementById('btn-submit-transaction');
      btn.disabled = true;
      
      // OPTIMISTIC UI: Update lokal instan
      const exactTime = payload.time && /^\d{1,2}:\d{2}$/.test(payload.time) ? payload.time : "00:00";
      const newTrx = {
        transactionId: isEdit ? transactionId : "TRX-TEMP-" + Date.now(),
        date: payload.date + "T" + exactTime + ":00",
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
        notes: payload.notes,
        mainCategory: payload.category 
      };

      if (isEdit) {
        const idx = GLOBAL_DATA.transactions.findIndex(t => t.transactionId === transactionId);
        if (idx !== -1) GLOBAL_DATA.transactions[idx] = newTrx;
      } else {
        GLOBAL_DATA.transactions.unshift(newTrx);
      }
      GLOBAL_DATA.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Tutup modal dan render history secara instan
      closeModal('modalTransactionForm');
      renderHistory();
      renderDashboard();

      showRewardAnimation(isEdit ? "Transaction Updated" : "Saved");

      // Editing a transaction that's still sitting in the offline queue as
      // an unsynced 'createTransaction' (TRX-TEMP-* id, never reached the
      // server) — rewrite that queued payload in place instead of sending
      // an update for an id the server has never heard of.
      if (isEdit && updatePendingCreatePayload(transactionId, payload)) {
        btn.disabled = false;
        return;
      }

      // Lakukan sync di background murni tanpa memblokir atau menampilkan loading
      postApi(isEdit ? 'updateTransaction' : 'createTransaction', payload)
        .then(result => {
          if (result && result.data) {
            GLOBAL_DATA = result.data;
            localStorage.setItem('mochi_vault_global_data', JSON.stringify(GLOBAL_DATA));
            // Transaksi baru (bukan edit) sudah men-invalidate cache quip
            // di backend — panggil ulang renderMochiMood di sini supaya
            // Mochi langsung bereaksi ke transaksi ini tanpa nunggu buka
            // app lagi. Untuk edit dilewati karena bukan event "baru".
            if (!isEdit) renderMochiMood();
          }
        })
        .catch(err => {
          if (err.isNetworkError) {
            // Confirmed the request never reached the server — safe to queue
            // for automatic retry instead of discarding the user's input.
            enqueuePending(isEdit ? 'updateTransaction' : 'createTransaction', payload, {}, isEdit ? null : newTrx.transactionId);
            showToast("You're offline — saved locally, will sync automatically.", "info");
          } else {
            showToast("Connection failed! Transaction wasn't saved to server.", "error");
            loadAppData(true); // Rollback state
          }
        })
        .finally(() => {
          btn.disabled = false;
        });
    }

