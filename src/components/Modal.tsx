"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
  /** celebrate はお祝い用の装飾つき */
  variant?: "default" | "celebrate";
}

/** ネイティブ <dialog> を使ったモーダル（フォーカストラップと Esc はブラウザ任せ） */
export function Modal({ open, onClose, title, children, variant = "default" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal modal--${variant}`}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="modal__body">
          <h2 className="modal__title">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
