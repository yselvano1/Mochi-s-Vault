# Mochi's Vault

Household finance tracker PWA (Yosa & Fani). Frontend statis (hosting terpisah dari backend), backend di Google Apps Script.

## Struktur

```
index.html              Markup + urutan <script src> (urutan penting — lihat catatan di bawah)
css/
  styles.css             Semua styling (dulunya inline di index.html)
js/
  api.js                 fetchJsonSafe, postApi, offline queue
  state-utils.js         GLOBAL_DATA + modal/toast/confetti helpers
  auth-user.js           Login switcher Yosa/Fani
  modal-tabs-theme.js    openModal/closeModal, switchTab, dark mode
  formatters.js          formatRupiah, formatDate, dll
  ui-visuals.js          Icon meta, tilt effect, edge glow
  mochi-ai.js            Chat, quick ask, voice input, receipt scan
  transactions-form.js   Tambah/edit/hapus transaksi
  app-lifecycle.js       loadAppData, splash screen, renderAllViews
  render-dashboard.js    Dashboard utama + mood Mochi
  budget-category.js     Budget summary, kategori
  render-history.js      Riwayat transaksi + export PDF
  render-wallets-treasury.js  Wallets, treasury/investasi
  payables-receivables.js     Hutang/piutang
  form-pickers.js        Category picker, FX field logic
  detail-modals.js       Modal detail (KPI, transaksi, akun, dll)
  settle-flow.js         Alur pelunasan hutang/piutang
  master-modal.js        Modal tambah/edit master data (akun, kategori, dll)
  app-init.js            Entry point — window DOMContentLoaded
sw.js                    Service worker (offline cache)
manifest.json            PWA manifest
Code.gs                  Backend Google Apps Script (doGet/doPost API)
```

## ⚠️ Urutan `<script src>` di index.html WAJIB dijaga

File-file di atas masih pakai global scope klasik (belum ES modules), jadi
beberapa file bergantung pada variabel (`GLOBAL_DATA`, `TABS`, dll) yang
dideklarasikan di file yang dimuat lebih dulu. Jangan acak urutannya tanpa
cek dependency dulu.

## Riwayat

- **v1 (pre-split)**: `index.html` monolitik, 8.103 baris, semua CSS & JS
  (190 function) dalam satu `<script>` tag.
- **v2 (commit ini)**: Dipecah jadi 19 file JS + 1 file CSS by domain,
  tanpa mengubah logic apapun — verified byte-identical terhadap versi asli
  sebelum dipecah. `index.html` sekarang 1.325 baris.

## Deploy checklist

1. Upload semua file (jaga struktur folder `css/` dan `js/`).
2. `sw.js` versi cache (`APP_VERSION`) harus dinaikkan tiap kali ada
   perubahan di `index.html`, `css/`, atau `js/` — supaya HP user
   memperbarui cache-nya.
