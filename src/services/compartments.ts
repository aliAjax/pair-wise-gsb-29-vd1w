import type { Compartment, Order, PackageSize, TempZone } from "../types";

const SIZE_RANK: Record<PackageSize, number> = { 小: 1, 中: 2, 大: 3 };

/** 包裹只能进不小于自身的格口；冷链只进冷藏格，常温只进常温格 */
export function canFit(compartment: Compartment, size: PackageSize, zone: TempZone): boolean {
  return compartment.zone === zone && SIZE_RANK[compartment.size] >= SIZE_RANK[size];
}

/** 当前被占用的格口：仅“已入柜”订单占格，回仓/取件/换柜即释放 */
export function occupiedIds(orders: Order[]): Set<string> {
  return new Set(
    orders
      .filter((order) => order.status === "已入柜" && order.compartmentId)
      .map((order) => order.compartmentId as string)
  );
}

/**
 * 在指定柜机内找最优可用格口：
 * 1) 温区必须一致（冷链→冷藏）
 * 2) 容量必须放得下（允许小包进大格，优先最贴合的）
 * 3) 未被占用（格口未释放前不接第二单）
 */
export function findAvailableCompartment(
  compartments: Compartment[],
  lockerId: string,
  size: PackageSize,
  zone: TempZone,
  orders: Order[]
): Compartment | undefined {
  const occupied = occupiedIds(orders);
  return compartments
    .filter(
      (compartment) =>
        compartment.lockerId === lockerId &&
        !occupied.has(compartment.id) &&
        canFit(compartment, size, zone)
    )
    .sort(
      (a, b) =>
        SIZE_RANK[a.size] - SIZE_RANK[b.size] ||
        a.id.localeCompare(b.id, "zh-Hans-CN")
    )[0];
}

export function countAvailable(
  compartments: Compartment[],
  lockerId: string,
  orders: Order[]
): { total: number; free: number; coldFree: number } {
  const occupied = occupiedIds(orders);
  const inLocker = compartments.filter((compartment) => compartment.lockerId === lockerId);
  return {
    total: inLocker.length,
    free: inLocker.filter((compartment) => !occupied.has(compartment.id)).length,
    coldFree: inLocker.filter(
      (compartment) => compartment.zone === "冷链" && !occupied.has(compartment.id)
    ).length
  };
}

/** 六位数字取件码，且不与当前在柜订单重复 */
export function generatePickupCode(orders: Order[]): string {
  const used = new Set(
    orders
      .filter((order) => order.status === "已入柜" && order.pickupCode)
      .map((order) => order.pickupCode as string)
  );
  for (let i = 0; i < 1000; i += 1) {
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    if (!used.has(code)) return code;
  }
  // 极端兜底：时间戳后六位
  return String(Date.now() % 1_000_000).padStart(6, "0");
}
