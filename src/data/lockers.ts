import type { Compartment, Locker, PackageSize, TempZone } from "../types";

/** 格口规则本地保存，与订单资料、存取记录分开 */
export const LOCKER_STORAGE_KEY = "hxwlfront-15-lockers-v2";

interface LockerSeed {
  locker: Locker;
  /** 每种 [温区, 大小] 的格口数量 */
  layout: Array<{ zone: TempZone; size: PackageSize; count: number }>;
}

// 3 台楼宇自提柜：每台 12 格（8 常温 + 4 冷藏）
export const LOCKER_SEED: LockerSeed[] = [
  {
    locker: { id: "A", name: "A栋大堂柜", building: "世纪华庭 A栋" },
    layout: [
      { zone: "常温", size: "小", count: 3 },
      { zone: "常温", size: "中", count: 3 },
      { zone: "常温", size: "大", count: 2 },
      { zone: "冷链", size: "小", count: 1 },
      { zone: "冷链", size: "中", count: 2 },
      { zone: "冷链", size: "大", count: 1 }
    ]
  },
  {
    locker: { id: "B", name: "B栋大堂柜", building: "世纪华庭 B栋" },
    layout: [
      { zone: "常温", size: "小", count: 3 },
      { zone: "常温", size: "中", count: 3 },
      { zone: "常温", size: "大", count: 2 },
      { zone: "冷链", size: "小", count: 2 },
      { zone: "冷链", size: "中", count: 1 },
      { zone: "冷链", size: "大", count: 1 }
    ]
  },
  {
    locker: { id: "C", name: "南门驿站柜", building: "世纪华庭南门" },
    layout: [
      { zone: "常温", size: "小", count: 4 },
      { zone: "常温", size: "中", count: 3 },
      { zone: "常温", size: "大", count: 1 },
      { zone: "冷链", size: "小", count: 1 },
      { zone: "冷链", size: "中", count: 2 },
      { zone: "冷链", size: "大", count: 1 }
    ]
  }
];

export function buildSeedCompartments(): Compartment[] {
  const result: Compartment[] = [];
  for (const seed of LOCKER_SEED) {
    for (const row of seed.layout) {
      for (let i = 1; i <= row.count; i += 1) {
        result.push({
          id: `${seed.locker.id}-${row.zone === "冷链" ? "R" : "N"}${row.size}${String(i).padStart(2, "0")}`,
          lockerId: seed.locker.id,
          size: row.size,
          zone: row.zone
        });
      }
    }
  }
  return result;
}

export function buildSeedLockers(): Locker[] {
  return LOCKER_SEED.map((seed) => seed.locker);
}
