import type { OrderStatus, PackageSize, TempZone } from "../types";

export const RIDERS = ["骑手A", "骑手B", "骑手C"];

export const SLOTS = [
  "08:00-10:00",
  "10:00-12:00",
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00"
];

export const SIZES: PackageSize[] = ["小", "中", "大"];

export const ZONES: TempZone[] = ["常温", "冷链"];

export const STATUS_FILTERS: Array<"全部" | OrderStatus> = [
  "全部",
  "未分配",
  "配送中",
  "已入柜",
  "已取件",
  "回仓待办",
  "已回仓"
];

export const DEFAULT_STORAGE_HOURS = 24;
