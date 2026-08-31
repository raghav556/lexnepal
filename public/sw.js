/*
 * Local compatibility worker.
 *
 * Older builds registered /sw.js. Keeping this lightweight response prevents
 * Next.js from compiling its not-found route for stale browser registrations,
 * then removes the obsolete worker so it cannot intercept current app assets.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.unregister());
});
