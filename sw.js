const APP_VERSION = "v17.8";
const CACHE_NAME = "mochis-vault-" + APP_VERSION;

const ASSETS = [
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
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/lucide@0.469.0"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .catch((err) => console.error("Failed to precache initial assets:", err))
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
  if (e.request.url.includes("script.google.com")) {
    return;
  }

  // Stale-while-revalidate: serve the cached copy immediately if we have one
  // (fast), while quietly refreshing the cache from the network in the
  // background. Falls back to the cached app shell if totally offline and
  // nothing matched.
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
