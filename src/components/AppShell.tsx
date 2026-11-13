"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Cat } from "./Cat";
import { BookIcon, GearIcon, HomeIcon, ListIcon } from "./Icons";
import { Onboarding } from "./Onboarding";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/", label: "ホーム", Icon: HomeIcon },
  { href: "/tasks", label: "タスク", Icon: ListIcon },
  { href: "/records", label: "きろく", Icon: BookIcon },
  { href: "/settings", label: "せってい", Icon: GearIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status, errorMessage, game, tasks } = useStore();
  const todoCount = tasks.filter((t) => t.status === "todo").length;

  return (
    <div className="shell">
      <nav className="nav" aria-label="メインメニュー">
        <Link href="/" className="nav__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="nav__logo" src="/icon.svg" alt="" width={52} height={52} />
          <span className="nav__name">
            ごほうび<b>ねこ</b>
          </span>
        </Link>
        <ul className="nav__list">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link href={href} className={`nav__link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                  <Icon />
                  <span>{label}</span>
                  {href === "/tasks" && todoCount > 0 && (
                    <span className="nav__badge" aria-label={`やること${todoCount}件`}>
                      {todoCount > 99 ? "99+" : todoCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="nav__foot">やることを終えると、ねこのごはんがもらえます。</p>
      </nav>

      <main className="main">
        {status === "loading" && (
          <div className="state" role="status">
            <div className="state__cat">
              <Cat stage="kitten" face="happy" />
            </div>
            <p>よみこみ中…</p>
          </div>
        )}
        {status === "error" && (
          <div className="state" role="alert">
            <div className="state__cat">
              <Cat stage="kitten" face="hungry" animated={false} />
            </div>
            <h1 className="state__title">データを開けませんでした</h1>
            <p>{errorMessage}</p>
            <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
              もう一度ためす
            </button>
          </div>
        )}
        {status === "ready" && game && (
          <>
            {children}
            <Onboarding />
          </>
        )}
      </main>
    </div>
  );
}
