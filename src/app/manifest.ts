import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ごほうびねこ",
    short_name: "ごほうびねこ",
    description: "タスクを終えるとエサがもらえて、ねこが育つタスク管理アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf7f0",
    theme_color: "#f5822f",
    lang: "ja",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
