import type { Compartment, Order, ParcelSize } from "./types";

const SIZE_RANK: Record<ParcelSize, number> = { 小件: 1, 中件: 2, 大件: 3 };

export const PICKUP_CODE_PATTERN = /^\d{6}$/;

// 包裹尺寸不能超过格口规格
export function sizeFits(parcel: ParcelSize, compartmentSize: ParcelSize): boolean {
  return SIZE_RANK[parcel] <= SIZE_RANK[compartmentSize];
}

// 温区规则：冷链只能进冷藏格；常温包裹不占冷藏格，避免挤占冷链资源
export function zoneFits(orderZone: Order["zone"], compartmentZone: Compartment["zone"]): boolean {
  if (orderZone === "冷链") return compartmentZone === "冷藏";
  return compartmentZone === "常温";
}

// 返回 null 表示可占用，否则返回拦截原因
export function canOccupy(order: Pick<Order, "size" | "zone">, compartment: Compartment): string | null {
  if (compartment.status !== "空闲") return `格口 ${compartment.code} 未释放，不能接第二单`;
  if (!sizeFits(order.size, compartment.size)) return `格口 ${compartment.code} 放不下${order.size}`;
  if (!zoneFits(order.zone, compartment.zone)) {
    return order.zone === "冷链" ? "冷链包裹只能进冷藏格" : "常温包裹不占用冷藏格";
  }
  return null;
}

// 在指定柜机中寻找可用格口，优先刚好合身的小规格格口
export function findCompartment(
  lockerId: string,
  order: Pick<Order, "size" | "zone">,
  compartments: Compartment[]
): Compartment | null {
  const candidates = compartments
    .filter((comp) => comp.lockerId === lockerId)
    .filter((comp) => canOccupy(order, comp) === null)
    .sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size]);
  return candidates[0] ?? null;
}

export function isExpired(order: Order, nowMs: number): boolean {
  if (order.status !== "已入柜" || !order.storedAt) return false;
  return nowMs > new Date(order.storedAt).getTime() + order.keepHours * 3600_000;
}

export function generatePickupCode(taken: Set<string>): string {
  let code = "";
  do {
    code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  } while (taken.has(code));
  return code;
}
