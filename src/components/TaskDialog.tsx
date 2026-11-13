"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { FoodIcon } from "./Icons";
import { useToast } from "./Toast";
import { DIFFICULTIES, DIFFICULTY_IDS, FOODS, MEMO_MAX, TITLE_MAX } from "@/lib/game";
import { toMessage, useStore } from "@/lib/store";
import type { Difficulty, Task } from "@/lib/types";

interface Props {
  open: boolean;
  /** 編集対象。null なら新規追加 */
  task: Task | null;
  onClose(): void;
}

export function TaskDialog({ open, task, onClose }: Props) {
  const store = useStore();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 開くたびにフォームを初期化する
  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setMemo(task?.memo ?? "");
    setDifficulty(task?.difficulty ?? "normal");
    setDueDate(task?.dueDate ?? "");
    setError(null);
    setSaving(false);
  }, [open, task]);

  const locked = task?.rewardClaimed ?? false;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const input = { title, memo, difficulty, dueDate: dueDate || null };
    try {
      if (task) {
        await store.editTask(task.id, input);
        toast.show("タスクを更新しました", "success");
      } else {
        await store.addTask(input);
        toast.show("タスクを追加しました", "success");
      }
      onClose();
    } catch (err) {
      setError(toMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? "タスクを編集" : "あたらしいタスク"}>
      <form className="form" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span className="field__label">やること</span>
          <input
            className="input"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            placeholder="例：洗濯物をたたむ"
            autoComplete="off"
            autoFocus
            required
            aria-invalid={error ? true : undefined}
          />
        </label>

        <fieldset className="field" disabled={locked}>
          <legend className="field__label">むずかしさ と ごほうび</legend>
          <div className="choice">
            {DIFFICULTY_IDS.map((id) => {
              const d = DIFFICULTIES[id];
              return (
                <label key={id} className={`choice__item${difficulty === id ? " is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="difficulty"
                    value={id}
                    checked={difficulty === id}
                    onChange={() => setDifficulty(id)}
                  />
                  <FoodIcon food={d.food} size={38} />
                  <span className="choice__name">{d.label}</span>
                  <span className="choice__hint">{FOODS[d.food].name}</span>
                </label>
              );
            })}
          </div>
          {locked && <p className="field__note">ごほうびを受け取ったタスクは、むずかしさを変えられません。</p>}
        </fieldset>

        <div className="form__row">
          <label className="field">
            <span className="field__label">
              期限 <small>（なくてもOK）</small>
            </span>
            <input className="input" type="date" name="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span className="field__label">
            メモ <small>（なくてもOK）</small>
          </span>
          <textarea
            className="input input--area"
            name="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={MEMO_MAX}
            rows={2}
          />
        </label>

        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}

        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            やめる
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {task ? "保存する" : "追加する"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
