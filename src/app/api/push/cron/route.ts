import { handleCron } from "@/server/pushServer";

/** 1時間ごとの呼び出し用（Vercel Pro の Cron や GitHub Actions から）。端末で設定した時刻を守る */
export function GET(request: Request) {
  return handleCron(request, "hourly");
}
