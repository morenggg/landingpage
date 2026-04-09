self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  // aktuell keine spezielle Cache-Logik
});