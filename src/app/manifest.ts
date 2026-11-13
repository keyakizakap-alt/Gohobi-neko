import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ごほうびねこ",
    short_name: "ごほうびねこ",
    description: "タスクを終えるとエサがもらえて、ねこが育つタスク管理アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf3e4",
    theme_color: "#fbf3e4",
    lang: "ja",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
