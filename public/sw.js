/*
 * ごほうびねこ Service Worker
 * 通知の表示、プッシュ通知の受け取り、通知をタップしたときの処理を行う（ページのキャッシュはしない）。
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// サーバーからのプッシュ通知（アプリを閉じていても届く）
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "ごほうびねこ", body: event.data ? event.data.text() : "" };
  }
  const title = typeof data.title === "string" ? data.title.slice(0, 80) : "ごほうびねこ";
  const body = typeof data.body === "string" ? data.body.slice(0, 300) : "";
  const tag = typeof data.tag === "string" ? data.tag.slice(0, 64) : "due";
  // 同じサイト内のパスだけを開く
  const url = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/tasks";
  event.waitUntil(self.registration.showNotification(title, { body, tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url;
  const url = new URL(typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/tasks", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
