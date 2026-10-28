/* 체험첵! — 화면 파일을 저장해 두었다가 인터넷이 약한 체험학습 장소에서도 열리게 함.
   화면은 늘 새로 받아 보고(업데이트 바로 반영), 안 되면 저장해 둔 것으로 엶.
   체험학습 자료(파이어베이스)는 건드리지 않음. */
const CACHE = "fieldcheck-v1.1.5";
const SHELL = ["./", "./index.html", "./survey.html", "./packing.html", "./safety.html", "./rollcall.html", "./report.html", "./sheet.html", "./schedule.html", "./privacy.html",
  "./store.js", "./xlsx-export.js", "./wx.js", "./kakao-config.js", "./config.js", "./manifest.webmanifest", "./logo.png",
  "./icon-64.png", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const mine = url.origin === location.origin;
  const lib = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === "cdnjs.cloudflare.com"
    || (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/"));
  if (!mine && !lib) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok || res.type === "opaque") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(mine && req.mode === "navigate" ? url.origin + url.pathname : req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(hit => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined)))
  );
});
