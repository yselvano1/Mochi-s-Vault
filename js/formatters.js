    function formatRupiah(number) {
      if (number === undefined || number === null) return "Rp 0";
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
    }

    function formatUSD(number) {
      if (number === undefined || number === null) return "$0.00";
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
    }

    function formatInputRupiah(input, hiddenTargetId) {
      let val = input.value.replace(/[^0-9]/g, '');
      let numberVal = Number(val) || 0;
      input.dataset.rawValue = numberVal;
      if (hiddenTargetId) {
        const hidden = document.getElementById(hiddenTargetId);
        if (hidden) hidden.value = numberVal > 0 ? numberVal : "";
      }
      input.value = numberVal > 0 ? new Intl.NumberFormat('id-ID').format(numberVal) : "";
    }

    function formatDate(iso) {
      if (!iso) return '-';
      const datePart = String(iso).split('T')[0];
      const parts = datePart.split('-');
      if (parts.length < 3) return String(iso);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const m = parseInt(parts[1], 10);
      return `${parseInt(parts[2], 10)} ${months[m - 1] || ''} ${parts[0]}`;
    }

    function formatTime(iso) {
      if (!iso || String(iso).indexOf('T') === -1) return '';
      const timePart = String(iso).split('T')[1] || '';
      return timePart.substring(0, 5);
    }

    function formatDateWithTime(iso) {
      const d = formatDate(iso);
      const t = formatTime(iso);
      return t ? `${d} \u2022 ${t}` : d;
    }

    // Returns the y-m-d key (no time) for grouping transactions by day.
    function dateKeyOf(iso) {
      if (!iso) return '';
      return String(iso).split('T')[0];
    }

    // "Today" / "Yesterday" / formatted date label for history date dividers.
    function dateDividerLabel(iso) {
      const key = dateKeyOf(iso);
      if (!key) return '-';
      const parts = key.split('-').map(Number);
      if (parts.length < 3) return formatDate(iso);
      const trxDate = new Date(parts[0], parts[1] - 1, parts[2]);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      if (trxDate.getTime() === today.getTime()) return 'Today';
      if (trxDate.getTime() === yesterday.getTime()) return 'Yesterday';
      return formatDate(iso);
    }

    function updateScalingText(el, value) {
      if (!el) return;
      const text = formatRupiah(value);
      el.innerText = text;
      if (text.length > 17) { el.style.fontSize = '1.25rem'; el.style.lineHeight = '1.2'; }
      else if (text.length > 14) { el.style.fontSize = '1.5rem'; el.style.lineHeight = '1.2'; }
      else { el.style.fontSize = ''; el.style.lineHeight = ''; }
    }

