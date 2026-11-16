// Gênio Play: service worker do app (instalação + avisos no celular).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Sem cache: a área sempre busca o conteúdo novo. O handler existe para o navegador oferecer a instalação.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Gênio Play", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Gênio Play", {
      body: data.body || "Novidade na sua área.",
      icon: "/membros/app/icone-192.png",
      badge: "/membros/app/badge-96.png",
      tag: data.tag || undefined,
      data: { url: data.url || self.registration.scope },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  // Link de fora (live no YouTube/Instagram, grupo): abre direto, sem trocar a área de lugar.
  if (!url.startsWith(self.location.origin)) {
    event.waitUntil(self.clients.openWindow(url));
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url).catch(() => undefined);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
