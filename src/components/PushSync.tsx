"use client";

import { useEffect, useRef } from "react";
import { syncPush } from "@/lib/pushClient";
import { useStore } from "@/lib/store";

/** タスクや通知の設定が変わったら、少し待ってからサーバーの登録を更新する */
export function PushSync() {
  const { game, tasks, now } = useStore();
  const timer = useRef<number | undefined>(undefined);
  const day = new Date(now).toDateString();

  useEffect(() => {
    if (!game) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void syncPush(game, tasks);
    }, 1500);
    return () => window.clearTimeout(timer.current);
    // now は日付が変わったときだけ反映する（毎分の更新では送り直さない）
  }, [game, tasks, day]);

  return null;
}
