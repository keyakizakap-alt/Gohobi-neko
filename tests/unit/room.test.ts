import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { openNekoDb } from "@/lib/db";
import { FLOORS, FURNITURE, WALLS, defaultRoom, nextUnlock, sanitizeRoom, unlockedBetween } from "@/lib/room";
import { exportAll, loadState, parseExportData, setRoom } from "@/lib/repository";

describe("room catalog", () => {
  it("初期の部屋は Lv.1 で選べるものだけでできている", () => {
    expect(sanitizeRoom(defaultRoom(), 1)).toEqual(defaultRoom());
    for (const def of FURNITURE) {
      expect(def.items.some((i) => i.minLevel === 1) || defaultRoom().furniture[def.slot] === "none").toBe(true);
    }
  });

  it("ID はスロット内で重複しない", () => {
    expect(new Set(WALLS.map((w) => w.id)).size).toBe(WALLS.length);
    expect(new Set(FLOORS.map((f) => f.id)).size).toBe(FLOORS.length);
    for (const def of FURNITURE) expect(new Set(def.items.map((i) => i.id)).size).toBe(def.items.length);
  });

  it("知らない ID・未解放・壊れた形は初期値に戻す", () => {
    const r = sanitizeRoom({ wall: "night-star", floor: "<script>", furniture: { tower: "tall", toy: "none", rug: 42, extra: "x" } }, 1);
    expect(r.wall).toBe("cream-dot");
    expect(r.floor).toBe("oak");
    expect(r.furniture.tower).toBe("classic");
    expect(r.furniture.toy).toBe("none");
    expect(r.furniture.rug).toBe("round");
    expect(Object.keys(r.furniture).sort()).toEqual(FURNITURE.map((f) => f.slot).sort());
    expect(sanitizeRoom(null, 99)).toEqual(defaultRoom());
    expect(sanitizeRoom([1, 2], 99)).toEqual(defaultRoom());
  });

  it("解放済みなら選べる", () => {
    const r = sanitizeRoom({ wall: "night-star", floor: "carpet", furniture: { tower: "tall" } }, 12);
    expect(r).toMatchObject({ wall: "night-star", floor: "carpet", furniture: { tower: "tall" } });
  });

  it("レベルアップで増えたものと、つぎの解放を案内する", () => {
    expect(unlockedBetween(2, 3)).toEqual(expect.arrayContaining(["壁紙「" + WALLS.find((w) => w.minLevel === 3)!.name + "」"]));
    expect(unlockedBetween(5, 5)).toEqual([]);
    const n = nextUnlock(1);
    expect(n?.level).toBe(2);
    expect(n?.names.length).toBeGreaterThan(0);
    expect(nextUnlock(99)).toBeNull();
  });
});

describe("setRoom", () => {
  it("保存でき、未解放のものは保存されない。バックアップにも入る", async () => {
    const db = await openNekoDb("room-test");
    await loadState(db, Date.now());
    const s = await setRoom(db, { ...defaultRoom(), wall: "mint-stripe", furniture: { ...defaultRoom().furniture, plant: "none" } });
    expect(s.room.wall).toBe("mint-stripe");
    expect(s.room.furniture.plant).toBe("none");

    const locked = await setRoom(db, { ...s.room, wall: "wood-panel" });
    expect(locked.room.wall).toBe("cream-dot");

    const back = await setRoom(db, { ...locked.room, wall: "mint-stripe" });
    const data = parseExportData(JSON.parse(JSON.stringify(await exportAll(db))));
    expect(data.state.room.wall).toBe(back.room.wall);
    expect(data.state.room.furniture.plant).toBe("none");
  });
});
