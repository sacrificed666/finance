// Keeps static files, shows an offline page when a page cannot load, shows pushes
const STATIC = "finances-static-v2";
const OFFLINE = "offline-v1";
const MAX_ENTRIES = 250;
const DAY = 24 * 60 * 60 * 1000;
const LOCALES = ["en", "uk", "cs", "de", "es", "fr", "it", "nl", "pl", "pt"];

// The address of the offline page in a language
const pageOf = (locale) => `/offline/${locale}`;

// Keeps the offline page of a language, refreshed daily, and drops the rest
const remember = async (locale) => {
  if (!LOCALES.includes(locale)) return;
  const cache = await caches.open(OFFLINE);
  const cached = await cache.match(pageOf(locale));
  if (!cached || Date.now() - Date.parse(cached.headers.get("date") ?? "") >= DAY) await cache.add(pageOf(locale));
  const kept = await cache.keys();
  await Promise.all(kept.filter((request) => !request.url.endsWith(pageOf(locale))).map((request) => cache.delete(request)));
};

// The kept offline page, the one of the browser's language, or a browser error
const fallback = async () => {
  const cache = await caches.open(OFFLINE);
  const [first] = await cache.keys();
  if (first) return (await cache.match(first)) ?? Response.error();
  const language = self.navigator.language.slice(0, 2).toLowerCase();
  return fetch(pageOf(LOCALES.includes(language) ? language : "en")).catch(() => Response.error());
};

// Drops the oldest static files once there are too many
const trim = async (cache) => {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map((key) => cache.delete(key)));
};

// A static file from the cache, fetched and kept the first time
const fromCacheFirst = async (request) => {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    void trim(cache);
  }
  return response;
};

// An icon from the cache at once, refreshed in the background for the next time
const fromCacheThenRefresh = async (event) => {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(event.request);
  const fresh = fetch(event.request).then(async (response) => {
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  });
  if (!hit) return fresh;
  event.waitUntil(fresh.catch(() => {}));
  return hit;
};

// Takes over right away instead of waiting for every tab to close
self.addEventListener("install", () => self.skipWaiting());

// Drops older caches and starts page loads early
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== STATIC && name !== OFFLINE).map((name) => caches.delete(name)));
      await self.registration.navigationPreload?.enable();
      await self.clients.claim();
    })(),
  );
});

// The page says its language, so the offline page matches it
self.addEventListener("message", (event) => {
  if (event.data?.type === "locale") event.waitUntil(remember(event.data.locale).catch(() => {}));
});

// Built files from the cache, icons refreshed behind it, pages from the network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(fromCacheFirst(request));
    return;
  }

  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(fromCacheThenRefresh(event));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) ?? (await fetch(request));
        } catch {
          return fallback();
        }
      })(),
    );
  }
});

// Shows a push from the server
self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(message.title || "Finances", {
      body: message.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: message.tag,
      data: { url: message.url || "/" },
    }),
  );
});

// Opens the page a notification points to, in a tab of the app when there is one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (!open) return self.clients.openWindow(url);
      return open.focus().then((client) => (client.url === url ? client : client.navigate(url)));
    }),
  );
});
