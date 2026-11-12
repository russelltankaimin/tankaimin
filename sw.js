---
layout: null
---
// The old Pixyll theme registered a cache-first service worker, so
// returning visitors could keep seeing stale pages. This replacement
// clears those caches, unregisters itself and reloads open tabs once.
// It can be deleted entirely after a few months.
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.map(function (name) { return caches.delete(name); }));
      })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (clients) {
        clients.forEach(function (client) { client.navigate(client.url); });
      })
  );
});
