"use client";

import { useEffect, useState } from "react";
import { Cat } from "@/components/Cat";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toDateKey } from "@/lib/game";
import { useStore } from "@/lib/store";

/**
 * 画面の描画中に想定外のエラーが起きたときの復旧画面。
 * 真っ白のまま操作できなくなるのを防ぎ、バックアップの保存とデータのリセットだけはできるようにする。
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const store = useStore();
  const [resetting, setResetting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    console.error(error);
  }, [error]);

  async function onExport() {
    try {
      const data = await store.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `gohobi-neko-${toDateKey(Date.now())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNote("バックアップを保存しました。");
    } catch {
      setNote("バックアップを保存できませんでした。");
    }
  }

  async function onReset() {
    setResetting(false);
    try {
      await store.resetAll();
      retry();
    } catch {
      setNote("リセットできませんでした。ブラウザの設定から、このサイトのデータを削除してください。");
    }
  }

  return (
    <div className="state" role="alert">
      <div className="state__cat">
        <Cat stage="kitten" face="hungry" animated={false} />
      </div>
      <h1 className="state__title">うまく表示できませんでした</h1>
      <p>もう一度ためしても直らないときは、バックアップを保存してから、データをリセットしてください。</p>
      {note && <p className="muted">{note}</p>}
      <div className="btn-row">
        <button type="button" className="btn btn--primary" onClick={() => retry()}>
          もう一度ためす
        </button>
        <button type="button" className="btn" onClick={onExport}>
          バックアップを保存
        </button>
        <button type="button" className="btn btn--danger" onClick={() => setResetting(true)}>
          データをリセット
        </button>
      </div>
      <ConfirmDialog open={resetting} title="すべてのデータを消しますか？" confirmLabel="すべて消す" danger onConfirm={onReset} onClose={() => setResetting(false)}>
        <p>
          タスクも ねこの成長も すべて消えます。<b>元には戻せません。</b>
        </p>
      </ConfirmDialog>
    </div>
  );
}
