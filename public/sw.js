/*
 * ごほうびねこ Service Worker
 * 通知の表示、プッシュ通知の受け取り、通知をタップしたときの処理を行う（ページのキャッシュはしない）。
 */
self.addEventListener("install", () => self.skipWaiting());

/**
 * このサイトの中のパスなら、そのまま返す。外のサイトを指すもの（"//evil.example" や、
 * ブラウザが "//" と同じに扱う "/\\evil.example" など）は fallback にする。
 */
function sameOriginPath(path, fallback) {
  if (typeof path !== "string" || !path.startsWith("/")) return fallback;
  try {
    const u = new URL(path, self.location.origin);
    return u.origin === self.location.origin ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}
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
  const url = sameOriginPath(data.url, "/tasks");
  // ねこの画像は、このアプリの画像フォルダのものだけ使う（Chrome・Edge・Android で表示される）
  const image = typeof data.image === "string" && /^\/notify\/[a-z]+\.jpg$/.test(data.image) ? data.image : undefined;
  event.waitUntil(self.registration.showNotification(title, { body, tag, image, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(sameOriginPath(event.notification.data?.url, "/tasks"), self.location.origin).href;
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
