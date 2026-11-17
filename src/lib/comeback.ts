/**
 * 「しばらくアプリを開いていない人を、ねこが呼ぶ」ための共通ロジック（純粋関数）。
 * ToDo アプリは数日で開かなくなりがちなので、開かなかった日が続いたら、ねこから声をかける。
 */

/** 何日あいたら呼ぶか（最後に開いた日からの日数）。2日目＝まる1日開かなかった翌朝、5日目に、もう一度だけ */
export const COMEBACK_STEPS = [2, 5] as const;

/** YYYY-MM-DD どうしの日数の差（b − a）。形式がおかしければ null */
export function daysBetween(a: string, b: string): number | null {
  const re = /^(\d{4})-(\d{2})-(\d{2})$/;
  const ma = re.exec(a);
  const mb = re.exec(b);
  if (!ma || !mb) return null;
  const ta = Date.UTC(Number(ma[1]), Number(ma[2]) - 1, Number(ma[3]));
  const tb = Date.UTC(Number(mb[1]), Number(mb[2]) - 1, Number(mb[3]));
  return Math.round((tb - ta) / 86_400_000);
}

/** いま呼ぶべき段階（2 または 5）。まだ呼ぶほどでなければ null */
export function comebackStep(lastOpen: string, today: string): number | null {
  const away = daysBetween(lastOpen, today);
  if (away === null) return null;
  let step: number | null = null;
  for (const s of COMEBACK_STEPS) if (away >= s) step = s;
  return step;
}

/**
 * 呼びかけの通知の文面と、通知にそえるねこの画像（対応している端末だけに表示される）。
 * 2日目はしょんぼり、5日目はすねている。期限の近いタスクがあれば、その件数もそえる。
 */
export function comebackMessage(catName: string, away: number, due: { overdue?: number; today: number; tomorrow: number }): { title: string; body: string; image: string } {
  const lonely = away < 5;
  const title = lonely ? `${catName}が しょんぼりしてるにゃ…` : `${catName}が すねちゃったにゃ`;
  const lines: string[] = [];
  if (due.overdue) lines.push(`期限が過ぎたタスクが${due.overdue}件あるにゃ`);
  else if (due.today) lines.push(`今日までのタスクが${due.today}件あるにゃ`);
  else if (due.tomorrow) lines.push(`明日までのタスクが${due.tomorrow}件あるにゃ`);
  lines.push(lonely ? "きのうは会えなかったにゃ。タスクを1つ終わらせて、ごはんをちょうだい" : `${away - 1}日も会えてないにゃ。かんたんなタスク1つで、きげんを直してほしいにゃ`);
  return { title, body: lines.join("\n"), image: lonely ? NOTIFY_IMAGE.lonely : NOTIFY_IMAGE.grumpy };
}

/** 通知にそえるねこの画像（横長。Chrome・Edge・Android の通知で表示され、iPhone・Firefox では表示されない） */
export const NOTIFY_IMAGE = {
  welcome: "/notify/welcome.jpg",
  lonely: "/notify/lonely.jpg",
  grumpy: "/notify/grumpy.jpg",
  joy: "/notify/joy.jpg",
} as const;

/** 久しぶりに開いたときの、ねこのひとこと。前に開いた日からまる1日以上あいていなければ null */
export function welcomeBackLine(lastOpen: string | null, today: string): string | null {
  if (!lastOpen) return null;
  const away = daysBetween(lastOpen, today);
  if (away === null || away < 2) return null;
  return away >= 5 ? `おかえりにゃ！ ${away}日ぶり…ずっと待ってたにゃ` : "おかえりにゃ！ 待ってたにゃ〜";
}
