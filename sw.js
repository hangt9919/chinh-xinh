// Chỉnh Xinh — lưu đệm để mở nhanh & dùng khi mất mạng
const V = "chinh-xinh-v4";
const SHELL = ["./", "index.html", "style.css", "js/app.js", "js/engine.js", "js/face.js", "js/layers.js", "js/stickers.js", "js/heal.js", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png"];
const CDN = ["cdn.jsdelivr.net", "storage.googleapis.com", "unpkg.com"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (CDN.includes(u.hostname)) {
    // thư viện & model: lấy từ đệm trước
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r;
    }));
  } else if (u.origin === location.origin && u.pathname.includes("/models/")) {
    // model AI lớn, không đổi: lấy từ đệm trước
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r;
    }));
  } else if (u.origin === location.origin) {
    // file của app: lấy bản mới, mất mạng thì dùng đệm
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cl = r.clone(); caches.open(V).then(c => c.put(e.request, cl)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  }
});
