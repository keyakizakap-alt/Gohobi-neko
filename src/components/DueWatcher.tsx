"use client";

import { useEffect, useRef } from "react";
import { useToast } from "./Toast";
import { registerServiceWorker, showNotification } from "@/lib/notifier";
import { getPushStatus } from "@/lib/pushClient";
import { dueReminders, reminderMessage } from "@/lib/reminders";
import { useStore } from "@/lib/store";

/**
 * 期限の近いタスクを見張り、設定した時刻を過ぎたら知らせる。
 * 状態管理が1分ごとに現在時刻を更新するので、そのたびに確認する。
 * 通知の許可がないときや、表示に失敗したときは、アプリ内のトーストで知らせる。
 */
export function DueWatcher() {
  const { game, tasks, now, markNotified } = useStore();
  const toast = useToast();
  const busy = useRef(false);

  useEffect(() => {
    if (game?.notify.enabled) void registerServiceWorker();
  }, [game?.notify.enabled]);

  useEffect(() => {
    if (!game || busy.current) return;
    const list = dueReminders(tasks, game.notify, game.notified, Date.now());
    if (list.length === 0) return;
    busy.current = true;
    const { title, body, image } = reminderMessage(list, game.cat.name, game.notify.showTitles);
    (async () => {
      // 先に記録して、別のタブと二重に知らせないようにする
      await markNotified(list.map((r) => r.key)).catch(() => undefined);
      // プッシュ通知が有効なら、システムの通知はサーバーから届くので、ここでは画面内だけで知らせる
      const shown = getPushStatus().state === "active" ? false : await showNotification(title, body, `due-${list[0]!.key}`, image);
      if (!shown || document.visibilityState === "visible") toast.show(<span className="toast__due">⏰ {title}</span>);
    })().finally(() => {
      busy.current = false;
    });
  }, [game, tasks, now, markNotified, toast]);

  return null;
}
