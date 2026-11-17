/**
 * 部屋のもようがえ（純粋関数とカタログ）。
 * 壁紙・床・家具を選べる。新しいものは、ねこのレベルが上がると解放される。
 */

export type WallId = "cream-dot" | "mint-stripe" | "pink-check" | "sky" | "night-star" | "wood-panel";
export type FloorId = "oak" | "tatami" | "tile" | "walnut" | "carpet";
export type FurnitureSlot = "tower" | "plant" | "lamp" | "cushion" | "rug" | "toy" | "frame";

export interface RoomConfig {
  wall: WallId;
  floor: FloorId;
  /** 各場所に置く家具の ID。"none" はしまう */
  furniture: Record<FurnitureSlot, string>;
}

export interface CatalogItem<Id extends string = string> {
  id: Id;
  name: string;
  /** このレベルになると選べる */
  minLevel: number;
}

export const WALLS: CatalogItem<WallId>[] = [
  { id: "cream-dot", name: "クリームのドット", minLevel: 1 },
  { id: "mint-stripe", name: "ミントのストライプ", minLevel: 1 },
  { id: "pink-check", name: "ピンクのチェック", minLevel: 3 },
  { id: "sky", name: "そらいろ", minLevel: 6 },
  { id: "night-star", name: "よぞらの星", minLevel: 9 },
  { id: "wood-panel", name: "木の板張り", minLevel: 12 },
];

export const FLOORS: CatalogItem<FloorId>[] = [
  { id: "oak", name: "明るい木目", minLevel: 1 },
  { id: "tatami", name: "たたみ", minLevel: 2 },
  { id: "tile", name: "白いタイル", minLevel: 5 },
  { id: "walnut", name: "こげ茶の木目", minLevel: 8 },
  { id: "carpet", name: "みどりのカーペット", minLevel: 11 },
];

export interface SlotDef {
  slot: FurnitureSlot;
  name: string;
  items: CatalogItem[];
}

export const FURNITURE: SlotDef[] = [
  { slot: "tower", name: "キャットタワー", items: [{ id: "classic", name: "ふつうのタワー", minLevel: 1 }, { id: "tall", name: "2段タワー", minLevel: 7 }] },
  { slot: "plant", name: "つりさげ鉢", items: [{ id: "green", name: "グリーン", minLevel: 1 }, { id: "flower", name: "花のつりかご", minLevel: 4 }] },
  { slot: "lamp", name: "あかり", items: [{ id: "floor", name: "フロアランプ", minLevel: 1 }, { id: "andon", name: "あんどん", minLevel: 9 }] },
  { slot: "cushion", name: "クッション", items: [{ id: "pink", name: "ピンク", minLevel: 1 }, { id: "blue", name: "ブルー", minLevel: 3 }, { id: "box", name: "段ボール箱", minLevel: 5 }] },
  { slot: "rug", name: "ラグ", items: [{ id: "round", name: "丸いクリーム", minLevel: 1 }, { id: "stripe", name: "しましま", minLevel: 6 }, { id: "heart", name: "ハート", minLevel: 10 }] },
  { slot: "toy", name: "おもちゃ", items: [{ id: "ball", name: "ボール", minLevel: 1 }, { id: "fish", name: "さかなのぬいぐるみ", minLevel: 3 }, { id: "mouse", name: "ねずみのおもちゃ", minLevel: 8 }] },
  { slot: "frame", name: "かべかざり", items: [{ id: "photo", name: "ねこの写真", minLevel: 2 }, { id: "clock", name: "かべ時計", minLevel: 6 }] },
];

export const SLOTS = FURNITURE.map((s) => s.slot);

export function defaultRoom(): RoomConfig {
  return {
    wall: "cream-dot",
    floor: "oak",
    furniture: { tower: "classic", plant: "green", lamp: "floor", cushion: "pink", rug: "round", toy: "ball", frame: "none" },
  };
}

export const isUnlocked = (item: { minLevel: number }, level: number) => level >= item.minLevel;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * 保存データやバックアップから読んだ部屋の設定を、正しい形に直す。
 * 知らない ID や、まだ解放されていないものは、初期の内容に戻す。
 */
export function sanitizeRoom(raw: unknown, level: number): RoomConfig {
  const base = defaultRoom();
  if (!isObj(raw)) return base;
  const pick = <T extends CatalogItem>(list: T[], id: unknown, fallback: T["id"]): T["id"] => {
    const found = list.find((i) => i.id === id);
    return found && isUnlocked(found, level) ? found.id : fallback;
  };
  const furniture = { ...base.furniture };
  const f = isObj(raw.furniture) ? raw.furniture : {};
  for (const def of FURNITURE) {
    const v = f[def.slot];
    if (v === "none") furniture[def.slot] = "none";
    else if (typeof v === "string") furniture[def.slot] = pick(def.items, v, base.furniture[def.slot]);
  }
  return { wall: pick(WALLS, raw.wall, base.wall), floor: pick(FLOORS, raw.floor, base.floor), furniture };
}

/** レベルが上がって、新しく選べるようになったもの */
export function unlockedBetween(before: number, after: number): string[] {
  const names: string[] = [];
  const hit = (i: CatalogItem) => i.minLevel > before && i.minLevel <= after;
  for (const w of WALLS) if (hit(w)) names.push(`壁紙「${w.name}」`);
  for (const f of FLOORS) if (hit(f)) names.push(`床「${f.name}」`);
  for (const s of FURNITURE) for (const i of s.items) if (hit(i)) names.push(`${s.name}「${i.name}」`);
  return names;
}

/** つぎに解放されるもの（もようがえ画面の案内用） */
export function nextUnlock(level: number): { level: number; names: string[] } | null {
  const all = [...WALLS, ...FLOORS, ...FURNITURE.flatMap((s) => s.items)].filter((i) => i.minLevel > level);
  if (all.length === 0) return null;
  const next = Math.min(...all.map((i) => i.minLevel));
  return { level: next, names: unlockedBetween(next - 1, next) };
}
