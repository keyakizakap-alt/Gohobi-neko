"use client";

import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { ToastProvider } from "./Toast";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </StoreProvider>
  );
}
