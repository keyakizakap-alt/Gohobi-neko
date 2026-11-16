"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { NAME_MAX, toDateKey } from "@/lib/game";
import { parseExportData } from "@/lib/repository";
import { notifyPermission, requestNotifyPermission, showNotification, type NotifyPermission } from "@/lib/notifier";
import { toMessage, useStore } from "@/lib/store";

export default function SettingsPage() {
  const store = useStore();
  const toast = useToast();
  const cat = store.game!.cat;
  const [name, setName] = useState(cat.name);
  const [pendingImport, setPendingImport] = useState<{ raw: unknown; tasks: number; name: string } | null>(null);
  const [resetting, setResetting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setName(cat.name), [cat.name]);

  const notify = store.game!.notify;
  const [permission, setPermission] = useState<NotifyPermission>("default");
  useEffect(() => setPermission(notifyPermission()), []);

  async function onToggleNotify(enabled: boolean) {
    try {
      let p = notifyPermission();
      if (enabled && p === "default") p = await requestNotifyPermission();
      setPermission(p);
      await store.setNotify({ ...notify, enabled });
      if (enabled) {
        toast.show(p === "granted" ? "期限の通知をオンにしました" : "アプリを開いているときに、画面の中でお知らせします", "success");
      }
    } catch (err) {
      toast.show(toMessage(err), "error");
    }
  }

  async function onTestNotify() {
    const ok = await showNotification("ごほうびねこ", `${cat.name}「通知のテストだにゃ」`, "test");
    if (!ok) toast.show("通知を出せませんでした。ブラウザの通知の許可を確認してください", "error");
  }

  async function onRename(e: FormEvent) {
    e.preventDefault();
    try {
      await store.renameCat(name);
      toast.show("なまえを変えました", "success");
    } catch (err) {
      toast.show(toMessage(err), "error");
    }
  }

  async function onExport() {
    try {
      const data = await store.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gohobi-neko-${toDateKey(Date.now())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.show("バックアップを保存しました", "success");
    } catch (err) {
      toast.show(toMessage(err), "error");
    }
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("too-large");
      const raw: unknown = JSON.parse(await file.text());
      const parsed = parseExportData(raw); // 置き換える前に中身を検証する
      setPendingImport({ raw, tasks: parsed.tasks.length, name: parsed.state.cat.name });
    } catch (err) {
      toast.show(err instanceof SyntaxError || (err as Error).message === "too-large" ? "バックアップファイルを読み込めませんでした" : toMessage(err), "error");
    }
  }

  async function onImport() {
    if (!pendingImport) return;
    try {
      await store.importData(pendingImport.raw);
      toast.show("バックアップから復元しました", "success");
    } catch (err) {
      toast.show(toMessage(err), "error");
    } finally {
      setPendingImport(null);
    }
  }

  async function onReset() {
    try {
      await store.resetAll();
      toast.show("データをリセットしました");
    } catch (err) {
      toast.show(toMessage(err), "error");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="page page--narrow">
      <header className="page__head">
        <div>
          <h1 className="page__title">せってい</h1>
        </div>
      </header>

      <section className="card">
        <h2 className="card__title">ねこの なまえ</h2>
        <form className="inline-form" onSubmit={onRename}>
          <input className="input" name="catName" aria-label="ねこの なまえ" value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} autoComplete="off" />
          <button type="submit" className="btn btn--primary" disabled={name.trim() === cat.name || !name.trim()}>
            変更する
          </button>
        </form>
      </section>

      <section className="card" aria-labelledby="notify-title">
        <h2 className="card__title" id="notify-title">
          期限の通知
        </h2>
        <p className="muted">期限の前日と当日に、設定した時刻を過ぎたら1回ずつお知らせします。</p>
        <div className="notify">
          <label className="switch">
            <input type="checkbox" role="switch" checked={notify.enabled} onChange={(e) => onToggleNotify(e.target.checked)} data-testid="notify-toggle" />
            <span className="switch__track" aria-hidden />
            <span>通知する</span>
          </label>
          <label className="notify__hour">
            <span>時刻</span>
            <select className="input" value={notify.hour} disabled={!notify.enabled} onChange={(e) => store.setNotify({ ...notify, hour: Number(e.target.value) }).catch(() => undefined)} aria-label="通知する時刻">
              {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </label>
        </div>
        {notify.enabled && (
          <div className="notify__status" data-testid="notify-status">
            {permission === "granted" && (
              <>
                <p>ブラウザの通知：許可されています</p>
                <button type="button" className="btn btn--sm" onClick={onTestNotify}>
                  テスト通知を送る
                </button>
              </>
            )}
            {permission === "default" && (
              <>
                <p>ブラウザの通知が、まだ許可されていません。</p>
                <button type="button" className="btn btn--sm" onClick={async () => setPermission(await requestNotifyPermission())}>
                  通知を許可する
                </button>
              </>
            )}
            {permission === "denied" && <p>ブラウザで通知がブロックされています。アドレスバーの鍵マークから、このサイトの通知を「許可」にしてください。それまでは、アプリを開いたときに画面の中でお知らせします。</p>}
            {permission === "unsupported" && <p>このブラウザは通知に対応していません。アプリを開いたときに画面の中でお知らせします。iPhone では、ホーム画面に追加したアプリで通知を受け取れます。</p>}
          </div>
        )}
        <p className="muted notify__note">サーバーを使わない仕組みのため、通知はアプリを開いているあいだ（別のタブにあるときを含む）だけ届きます。</p>
      </section>

      <section className="card">
        <h2 className="card__title">データのバックアップ</h2>
        <p className="muted">
          データはこの端末のブラウザ内（IndexedDB）だけに保存され、外部には送信されません。機種変更やブラウザのデータ削除に備えて、ファイルに保存しておけます。
        </p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={onExport}>
            ファイルに保存する
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            ファイルから復元する
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onPickFile} data-testid="import-file" />
        </div>
      </section>

      <section className="card card--danger">
        <h2 className="card__title">データのリセット</h2>
        <p className="muted">タスク・ねこの成長・ごはん・きろくを すべて消して、最初からやり直します。</p>
        <button type="button" className="btn btn--danger" onClick={() => setResetting(true)}>
          すべてのデータを消す
        </button>
      </section>

      <p className="about">ごほうびねこ v0.1.0</p>

      <ConfirmDialog open={pendingImport !== null} title="バックアップから復元しますか？" confirmLabel="復元する" onConfirm={onImport} onClose={() => setPendingImport(null)}>
        <p>
          「{pendingImport?.name}」とタスク{pendingImport?.tasks}件のデータで、いまのデータを <b>すべて置き換え</b> ます。
        </p>
      </ConfirmDialog>
      <ConfirmDialog open={resetting} title="ほんとうに すべて消しますか？" confirmLabel="すべて消す" danger onConfirm={onReset} onClose={() => setResetting(false)}>
        <p>
          {cat.name}の成長もタスクも すべて消えます。<b>元には戻せません。</b>
        </p>
        <p>残しておきたい場合は、先に「ファイルに保存する」でバックアップしてください。</p>
      </ConfirmDialog>
    </div>
  );
}
