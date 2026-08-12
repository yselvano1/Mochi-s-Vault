const APP_VERSION = "v46"; // Bump versi ini setiap kali index.html berubah agar HP memperbarui cache
const CACHE_NAME = "mochis-vault-" + APP_VERSION;

// Aset same-origin: HARUS berhasil semua, ini yang bikin app tetap jalan offline.
const LOCAL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./mochi-logo-new.png",
  "./mochi-rich-open.png",
  "./mochi-rich-closed.png",
  "./mochi-chill-open.png",
  "./mochi-chill-closed.png",
  "./mochi-anxious-open.png",
  "./mochi-anxious-closed.png",
  "./assets/cat-paw-3d.png"
];

// Aset pihak ketiga (CDN): dicoba tapi tidak boleh menggagalkan seluruh
// instalasi kalau salah satu gagal (mis. offline saat install pertama, atau
// respons tanpa header CORS yang bikin cache.addAll() melempar error).
const CDN_ASSETS = [
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/lucide@0.469.0",
  "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(LOCAL_ASSETS);
      await Promise.all(
        CDN_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn("Precache CDN gagal (akan dicoba lagi saat online):", url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Never cache responses from the Apps Script backend — financial data must
  // always be fresh, never served stale from cache.
  if (e.request.url.includes('script.google.com')) {
    return; // Request API Google Apps Script jangan pernah dicache!
  }

  // Stale-while-revalidate strategy
  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request)
        .then((response) => {
          if (response && response.status === 200) cache.put(e.request, response.clone());
          return response;
        })
        .catch(() => null);

      if (cached) return cached;
      return (await networkFetch) || cache.match("./index.html");
    })
  );
});
