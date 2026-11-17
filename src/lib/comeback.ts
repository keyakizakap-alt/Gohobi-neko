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

/** 呼びかけの通知の文面。期限の近いタスクがあれば、その件数もそえる */
export function comebackMessage(catName: string, away: number, due: { today: number; tomorrow: number }): { title: string; body: string } {
  const title = away >= 5 ? `${catName}が さみしそうに待ってるにゃ…` : `${catName}が おなかを空かせて待ってるにゃ`;
  const lines: string[] = [];
  if (due.today) lines.push(`今日までのタスクが${due.today}件あるにゃ`);
  else if (due.tomorrow) lines.push(`明日までのタスクが${due.tomorrow}件あるにゃ`);
  lines.push(away >= 5 ? `${away - 1}日も会えてないにゃ。かんたんなタスク1つからでいいにゃ` : "きのうは会えなかったにゃ。タスクを1つ終わらせて、ごはんをちょうだい");
  return { title, body: lines.join("\n") };
}

/** 久しぶりに開いたときの、ねこのひとこと。前に開いた日からまる1日以上あいていなければ null */
export function welcomeBackLine(lastOpen: string | null, today: string): string | null {
  if (!lastOpen) return null;
  const away = daysBetween(lastOpen, today);
  if (away === null || away < 2) return null;
  return away >= 5 ? `おかえりにゃ！ ${away}日ぶり…ずっと待ってたにゃ` : "おかえりにゃ！ 待ってたにゃ〜";
}
