"use client";

import { useState, type FormEvent } from "react";
import { Cat } from "./Cat";
import { Modal } from "./Modal";
import { NAME_MAX } from "@/lib/game";
import { toMessage, useStore } from "@/lib/store";

/** 初回起動時に、ねこの名前を決めてもらう */
export function Onboarding() {
  const { game, renameCat } = useStore();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!game || game.onboarded) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await renameCat(name);
      // リセット後に再表示されたとき、前の名前が残らないようにする
      setName("");
      setError(null);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  return (
    <Modal open onClose={() => undefined} title="こねこが やってきた！" variant="celebrate">
      <div className="onboard">
        <div className="onboard__cat">
          <Cat stage="kitten" face="happy" />
        </div>
        <p className="onboard__lead">
          やることを終わらせると、ごはんがもらえます。
          <br />
          ごはんをあげて、ねこを育てましょう。
        </p>
        <form className="form" onSubmit={onSubmit} noValidate>
          <label className="field">
            <span className="field__label">ねこの なまえ</span>
            <input
              className="input"
              name="catName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder="例：たま"
              autoComplete="off"
              autoFocus
            />
          </label>
          {error && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block">
            いっしょに はじめる
          </button>
        </form>
      </div>
    </Modal>
  );
}
