"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { FoodIcon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { DIFFICULTIES, DIFFICULTY_IDS, MEMO_MAX, TITLE_MAX } from "@/lib/game";
import { IMPORT_TEXT_MAX, parseImportText } from "@/lib/importTasks";
import { toMessage, useStore } from "@/lib/store";
import type { Difficulty, TaskInput } from "@/lib/types";

interface Row extends TaskInput {
  key: number;
  selected: boolean;
  duplicate: boolean;
}

const SAMPLE = `{
  "app": "gohobi-neko",
  "type": "tasks",
  "tasks": [
    { "title": "企画書を送る", "difficulty": "hard", "dueDate": "2026-11-20", "memo": "部長にもCC" },
    { "title": "牛乳を買う", "difficulty": "easy" }
  ]
}`;

const FILE_MAX = 1_000_000;

export default function ImportPage() {
  const store = useStore();
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const existing = useMemo(
    () => new Set(store.tasks.filter((t) => t.status === "todo").map((t) => t.title.replace(/\s+/g, "").toLowerCase())),
    [store.tasks],
  );

  function read(source: string) {
    setError(null);
    try {
      const r = parseImportText(source);
      let key = 0;
      setRows(
        r.tasks.map((t) => {
          const duplicate = existing.has(t.title.replace(/\s+/g, "").toLowerCase());
          return { ...t, key: key++, selected: !duplicate, duplicate };
        }),
      );
      setNotes(r.skipped);
    } catch (e) {
      setRows(null);
      setNotes([]);
      setError(toMessage(e));
    }
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > FILE_MAX) {
      setError("ファイルが大きすぎます（1MBまで）");
      return;
    }
    const body = await file.text();
    setText(body.slice(0, IMPORT_TEXT_MAX + 1));
    read(body);
  }

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs && rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const selected = rows?.filter((r) => r.selected) ?? [];
  const invalid = selected.some((r) => !r.title.trim());

  async function onAdd() {
    if (!rows || selected.length === 0 || invalid || saving) return;
    setSaving(true);
    try {
      const added = await store.addTasks(selected.map(({ title, memo, difficulty, dueDate }) => ({ title, memo, difficulty, dueDate })));
      toast.show(`${added.length}件のタスクを追加しました`, "success");
      router.push("/tasks");
    } catch (e) {
      setError(toMessage(e));
      setSaving(false);
    }
  }

  return (
    <div className="page page--narrow">
      <header className="page__head">
        <h1 className="page__title">タスクを取り込む</h1>
        <Link href="/tasks" className="btn btn--ghost btn--sm">
          タスクに戻る
        </Link>
      </header>

      {!rows && (
        <section className="card">
          <h2 className="card__title">貼り付け または ファイル</h2>
          <p className="muted">
            1行に1つずつ書いたメモや、プラグイン（AI）が出力したタスクの一覧を貼り付けてください。「11/20まで」「明日」「金曜」などは期限として読み取ります。
          </p>
          <textarea
            className="input input--area import__text"
            name="importText"
            aria-label="取り込むテキスト"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={"例）\n・企画書を送る 11/20まで\n・牛乳を買う\n・明日 歯医者の予約"}
          />
          {error && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}
          <div className="btn-row">
            <button type="button" className="btn btn--primary" disabled={!text.trim()} onClick={() => read(text)}>
              読み取る
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              ファイルを選ぶ
            </button>
            <input ref={fileRef} type="file" accept=".json,.txt,.md,application/json,text/plain,text/markdown" hidden onChange={onPickFile} data-testid="import-tasks-file" />
          </div>
          <details className="import__help">
            <summary>プラグイン用の形式（JSON）</summary>
            <p className="muted">
              title だけが必須です。difficulty は easy / normal / hard、dueDate は YYYY-MM-DD。一度に100件まで取り込めます。
            </p>
            <pre className="import__sample">{SAMPLE}</pre>
          </details>
        </section>
      )}

      {rows && (
        <section className="card">
          <div className="card__head">
            <h2 className="card__title">
              読み取ったタスク <small className="card__sub">（{rows.length}件）</small>
            </h2>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRows(null)}>
              やり直す
            </button>
          </div>
          {notes.length > 0 && (
            <ul className="import__notes">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          <ul className="import__list">
            {rows.map((r) => (
              <li key={r.key} className={`import__row${r.selected ? "" : " is-off"}`} data-testid="import-row">
                <label className="import__check">
                  <input type="checkbox" checked={r.selected} onChange={(e) => update(r.key, { selected: e.target.checked })} aria-label={`「${r.title}」を追加する`} />
                </label>
                <div className="import__fields">
                  <input
                    className="input import__title"
                    value={r.title}
                    maxLength={TITLE_MAX}
                    onChange={(e) => update(r.key, { title: e.target.value })}
                    aria-label="タスク名"
                    aria-invalid={r.selected && !r.title.trim() ? true : undefined}
                  />
                  {r.duplicate && <p className="import__dup">同じ名前のタスクがすでにあります</p>}
                  <div className="import__meta">
                    <div className="import__diff" role="radiogroup" aria-label="むずかしさ">
                      {DIFFICULTY_IDS.map((id) => (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={r.difficulty === id}
                          className={`import__chip chip--${id}${r.difficulty === id ? " is-on" : ""}`}
                          onClick={() => update(r.key, { difficulty: id as Difficulty })}
                        >
                          <FoodIcon food={DIFFICULTIES[id].food} size={16} />
                          {DIFFICULTIES[id].label}
                        </button>
                      ))}
                    </div>
                    <input
                      className="input import__date"
                      type="date"
                      value={r.dueDate ?? ""}
                      onChange={(e) => update(r.key, { dueDate: e.target.value || null })}
                      aria-label="期限"
                    />
                  </div>
                  {r.memo && <p className="import__memo">{r.memo.slice(0, MEMO_MAX)}</p>}
                </div>
              </li>
            ))}
          </ul>
          {error && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}
          <div className="import__foot">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRows((rs) => rs && rs.map((r) => ({ ...r, selected: !rs.every((x) => x.selected) })))}>
              {rows.every((r) => r.selected) ? "すべて外す" : "すべて選ぶ"}
            </button>
            <button type="button" className="btn btn--primary" disabled={selected.length === 0 || invalid || saving} onClick={onAdd}>
              {selected.length}件を追加する
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
