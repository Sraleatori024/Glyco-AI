// Service Worker for Glyco AI - Medication & Insulin Reminders and Push Notifications
const CACHE_NAME = "glyco-sw-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push notification events from server or backend Web Push
self.addEventListener("push", (event) => {
  let data = {
    title: "Lembrete de Medicamento - Glyco AI",
    body: "Está na hora de tomar sua medicação programada.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: "/?view=medicamentos" },
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || `med-reminder-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: data.data || { url: "/?view=medicamentos" },
    actions: [
      { action: "open", title: "Abrir Aplicativo" },
      { action: "dismiss", title: "Dispensar" }
    ]
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click to focus or open Glyco AI
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "NAVIGATE_VIEW", view: "medicamentos" });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/?view=medicamentos");
      }
    })
  );
});

// Handle custom messages from client app to display local background notifications
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TRIGGER_NOTIFICATION") {
    const { title, body, tag, medId } = event.data;
    const options = {
      body: body || "Está na hora de tomar seu medicamento.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [200, 100, 200],
      tag: tag || `med-${medId}-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      data: { url: "/?view=medicamentos", medId },
      actions: [
        { action: "open", title: "Ver no App" },
        { action: "dismiss", title: "OK" }
      ]
    };

    event.waitUntil(self.registration.showNotification(title || "⏰ Lembrete de Medicamento", options));
  }
});
