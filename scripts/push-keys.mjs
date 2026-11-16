// プッシュ通知に必要な鍵を作る。出力された値を Vercel の環境変数に登録する（リポジトリには入れない）。
//   node scripts/push-keys.mjs
import webpush from "web-push";
import { randomBytes } from "node:crypto";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log(`CRON_SECRET=${randomBytes(32).toString("hex")}`);
console.log("VAPID_SUBJECT=https://<公開したアプリのURL>");
