/**
 * ブラウザの通知を出す部分（画面側）。
 * Android の Chrome は `new Notification()` を使えないため、Service Worker 経由で表示する。
 */
export type NotifyPermission = "unsupported" | "default" | "granted" | "denied";

export function notifyPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission as NotifyPermission;
}

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

/** Service Worker を登録する（1回だけ）。登録できない環境では null */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registration) return registration;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(null);
  registration = navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then(() => navigator.serviceWorker.ready)
    .catch(() => null);
  return registration;
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (notifyPermission() === "unsupported") return "unsupported";
  const result = await Notification.requestPermission();
  if (result === "granted") await registerServiceWorker();
  return result as NotifyPermission;
}

/** 通知を出す。出せたら true */
export async function showNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (notifyPermission() !== "granted") return false;
  const options: NotificationOptions = { body, tag, icon: "/icon.svg", badge: "/icon.svg", data: { url: "/tasks" } };
  const reg = await registerServiceWorker();
  try {
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
