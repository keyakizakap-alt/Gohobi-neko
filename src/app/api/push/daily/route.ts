import { handleCron } from "@/server/pushServer";

/** 1日1回の呼び出し用（Vercel Hobby の Cron から）。時刻に関係なく、その日の通知を送る */
export function GET(request: Request) {
  return handleCron(request, "daily");
}
