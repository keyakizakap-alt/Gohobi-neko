import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/zen-maru-gothic/500.css";
import "@fontsource/zen-maru-gothic/700.css";
import "@fontsource/zen-maru-gothic/900.css";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "ごほうびねこ",
  description: "タスクを終えるとエサがもらえて、ねこが育つ。ごほうび型のタスク管理アプリ。",
  applicationName: "ごほうびねこ",
  // iPhone で「ホーム画面に追加」したとき、アプリとして全画面で開く（プッシュ通知にも必要）
  appleWebApp: { capable: true, title: "ごほうびねこ", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf3e4",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
